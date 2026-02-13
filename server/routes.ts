import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSocketServer } from "./api";
import { hasuraClient } from "./hasura-client";
import { 
  loadPipelinePositions, 
  savePipelinePositions, 
  loadPipelineYAML, 
  savePipelineYAML,
  convertHasuraToPipelineYAML,
  isPipelineYAMLUpToDate
} from "./yaml-manager";
import { PipelineTemplateManager } from "../client/src/lib/pipeline-template-manager";
import { parseSchedulerFile } from "./schedule-parser";
import { z } from "zod";

const frequencyTypeEnum = z.enum(["daily", "weekly", "monthly"]);

const insertScheduleConfigSchema = z.object({
  label: z.string(),
  timeOfDay: z.string(),
  timezone: z.string().optional(),
  frequencyType: frequencyTypeEnum,
  daysOfWeek: z.string().optional(),
  daysOfMonth: z.string().optional(),
  enabled: z.boolean().optional()
});

const insertScheduleTargetSchema = z.object({
  scheduleId: z.number(),
  pipelineId: z.string(),
  pipelineName: z.string().optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
  enabled: z.boolean().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up socket.io server for real-time updates
  setupSocketServer(httpServer);
  
  // Proxy Hasura GraphQL API requests
  app.post('/api/graphql', async (req, res) => {
    try {
      const { query, variables } = req.body;
      
      // Security check: ensure this is a read-only query or an allowed mutation
      const isReadOnly = isReadOnlyQuery(query);
      const isAllowedMutation = isAgentCreationMutation(query);
      
      if (!isReadOnly && !isAllowedMutation) {
        console.log('Forbidden non-read-only query detected:', query.slice(0, 100) + '...');
        return res.status(403).json({
          error: "Forbidden: Only read-only queries or agent creation are allowed"
        });
      }
      
      // Define estructura general para cualquier respuesta de Hasura
      interface HasuraGraphQLResponse {
        data?: any;
        errors?: Array<{ message: string }>;
      }
      
      const result = await hasuraClient.query(query, variables) as HasuraGraphQLResponse;
      res.json(result);
    } catch (error) {
      console.error('GraphQL query error:', error);
      res.status(500).json({
        error: "Failed to execute GraphQL query",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get SFTP links
  app.get('/api/sftp-links', async (req, res) => {
    try {
      const result = await hasuraClient.query(`
        query GetSFTPLinks {
          merlin_agent_SFTPLink(limit: 100) {
            id
            name
            server
            port
            user
            created_at
            updated_at
          }
        }
      `);
      
      if (result.errors) {
        console.error('Error fetching SFTP links:', result.errors);
        return res.status(500).json({ error: 'Failed to fetch SFTP links' });
      }
      
      res.json(result.data?.merlin_agent_SFTPLink || []);
    } catch (error) {
      console.error('Error in /api/sftp-links:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get SQL connections
  app.get('/api/sql-connections', async (req, res) => {
    try {
      const result = await hasuraClient.query(`
        query GetSQLConnections {
          merlin_agent_SQLConn(limit: 100) {
            id
            name
            driver
            connstring
            created_at
            updated_at
          }
        }
      `);
      
      if (result.errors) {
        console.error('Error fetching SQL connections:', result.errors);
        return res.status(500).json({ error: 'Failed to fetch SQL connections' });
      }
      
      res.json(result.data?.merlin_agent_SQLConn || []);
    } catch (error) {
      console.error('Error in /api/sql-connections:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get pipeline templates
  app.get('/api/pipeline-templates', (req, res) => {
    try {
      const templateManager = PipelineTemplateManager.getInstance();
      const templates = templateManager.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching pipeline templates:", error);
      res.status(500).json({
        error: "Failed to fetch pipeline templates",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get a specific pipeline template by ID
  app.get('/api/pipeline-templates/:id', (req, res) => {
    try {
      const { id } = req.params;
      const templateManager = PipelineTemplateManager.getInstance();
      const template = templateManager.getTemplateById(id);
      
      if (!template) {
        return res.status(404).json({
          error: "Template not found"
        });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching pipeline template:", error);
      res.status(500).json({
        error: "Failed to fetch pipeline template",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get agents for pipeline studio
  app.get('/api/agents', async (req, res) => {
    try {
      const result = await hasuraClient.query(`
        query GetAgents {
          merlin_agent_AgentPassport {
            id
            name
            is_healthy
          }
        }
      `);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      res.json(result.data.merlin_agent_AgentPassport);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({
        error: "Failed to fetch agents",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get all pipelines
  app.get('/api/pipelines', async (req, res) => {
    try {
      const result = await hasuraClient.query(`
        query GetAllPipelines {
          pipelines: merlin_agent_Pipeline {
            id
            name
            description
            abort_on_error
            agent_passport_id
            disposable
            created_at
            updated_at
          }
        }
      `);
      
      if (result.errors) {
        console.error('Error fetching pipelines:', result.errors);
        return res.status(500).json({ error: 'Failed to fetch pipelines' });
      }
      
      res.json(result.data.pipelines);
    } catch (error) {
      console.error('Error in /api/pipelines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get a specific pipeline by ID
  app.get('/api/pipelines/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await hasuraClient.query(`
        query GetPipeline($id: uuid!) {
          pipeline: merlin_agent_Pipeline_by_pk(id: $id) {
            id
            name
            description
            abort_on_error
            agent_passport_id
            disposable
            created_at
            updated_at
          }
        }
      `, { id });
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      if (!result.data.pipeline) {
        return res.status(404).json({
          error: "Pipeline not found"
        });
      }
      
      // Get pipeline units
      const unitsResult = await hasuraClient.query(`
        query GetPipelineUnits($pipelineId: uuid!) {
          units: merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
            id
            comment
            command_id
            query_queue_id
            sftp_downloader_id
            sftp_uploader_id
            zip_id
            unzip_id
            call_pipeline
            continue_on_error
            retry_count
            retry_after_milliseconds
            timeout_milliseconds
            abort_on_timeout
            posx
            posy
            created_at
            updated_at
          }
        }
      `, { pipelineId: id });
      
      if (unitsResult.errors) {
        throw new Error(unitsResult.errors[0].message);
      }
      
      // Combine pipeline and its units
      const pipelineWithUnits = {
        ...result.data.pipeline,
        units: unitsResult.data.units
      };
      
      res.json(pipelineWithUnits);
    } catch (error) {
      console.error("Error fetching pipeline:", error);
      res.status(500).json({
        error: "Failed to fetch pipeline",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get server status
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      readonly: true,
      createAgentsAllowed: true
    });
  });
  
  // Special endpoint for agent health status analysis
  app.get('/api/agent-health-analysis', async (req, res) => {
    try {
      // Query para contar agentes por estado de salud (versión simplificada)
      const healthyQuery = `
        query GetAgentHealthStatusCounts {
          healthy: merlin_agent_AgentPassport_aggregate(where: {is_healthy: {_eq: true}}) {
            aggregate { count }
          }
          unhealthy: merlin_agent_AgentPassport_aggregate(where: {is_healthy: {_eq: false}}) {
            aggregate { count }
          }
          total: merlin_agent_AgentPassport_aggregate {
            aggregate { count }
          }
          agents: merlin_agent_AgentPassport {
            id
            name
            is_healthy
          }
        }
      `;
      
      // Define la estructura del resultado esperado
      interface HasuraResponse {
        data?: {
          healthy?: { aggregate?: { count?: number } },
          unhealthy?: { aggregate?: { count?: number } },
          total?: { aggregate?: { count?: number } },
          agents?: Array<{ id: string, name: string, is_healthy: boolean }>
        },
        errors?: Array<{ message: string }>
      }
      
      const result = await hasuraClient.query(healthyQuery) as HasuraResponse;
      
      if (result.errors) {
        return res.status(500).json({
          error: "Failed to fetch agent health data",
          details: result.errors[0].message
        });
      }
      
      // Extraer los conteos básicos
      const healthyCount = result.data?.healthy?.aggregate?.count || 0;
      const unhealthyCount = result.data?.unhealthy?.aggregate?.count || 0;
      const totalCount = result.data?.total?.aggregate?.count || 0;
      
      res.json({
        counts: {
          healthy: healthyCount,
          unhealthy: unhealthyCount,
          total: totalCount
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error analyzing agent health:', error);
      res.status(500).json({
        error: "Failed to analyze agent health status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Get dashboard preferences
  app.get('/api/preferences', async (req, res) => {
    try {
      // For now, return default preferences
      // In a real app, you would get user preferences from storage
      res.json({
        theme: 'light',
        sidebarCollapsed: false,
        refreshInterval: 30,
        lastViewedAgent: null,
        lastViewedPipeline: null
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({
        error: "Failed to fetch user preferences"
      });
    }
  });
  
  // Save dashboard preferences
  app.post('/api/preferences', async (req, res) => {
    try {
      const preferences = req.body;
      // In a real app, you would save preferences to storage
      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({
        error: "Failed to save user preferences"
      });
    }
  });
  
  // Rutas para manejo de archivos YAML de pipelines
  
  // Obtener posiciones guardadas para un pipeline
  app.get("/api/pipeline/:id/positions", async (req, res) => {
    try {
      const { id } = req.params;
      const positions = await loadPipelinePositions(id);
      res.json({ positions });
    } catch (error) {
      console.error('Error loading pipeline positions:', error);
      res.status(500).json({ error: 'Failed to load pipeline positions' });
    }
  });

  // Guardar posiciones de un pipeline
  app.post("/api/pipeline/:id/positions", async (req, res) => {
    try {
      const { id } = req.params;
      const { positions } = req.body;
      await savePipelinePositions(id, positions);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving pipeline positions:', error);
      res.status(500).json({ error: 'Failed to save pipeline positions' });
    }
  });

  // Obtener YAML completo de un pipeline
  app.get("/api/pipeline/:id/yaml", async (req, res) => {
    try {
      const { id } = req.params;
      const yamlData = await loadPipelineYAML(id);
      res.json({ yaml: yamlData });
    } catch (error) {
      console.error('Error loading pipeline YAML:', error);
      res.status(500).json({ error: 'Failed to load pipeline YAML' });
    }
  });

  // Generar/actualizar YAML desde Hasura
  app.post("/api/pipeline/:id/sync-yaml", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener datos del pipeline desde Hasura
      const query = `
        query GetPipelineForYAML($id: uuid!) {
          merlin_agent_Pipeline_by_pk(id: $id) {
            id
            name
            description
            created_at
            updated_at
            units: merlin_agent_PipelineUnits(order_by: {index: asc}) {
              id
              index
              type
              name
              command
              sql_query
              zip_config
              sftp_config
            }
          }
        }
      `;

      const response = await hasuraClient.query(query, { id });
      
      if (response.errors) {
        return res.status(400).json({ error: response.errors[0]?.message || 'GraphQL error' });
      }

      const pipelineData = response.data?.merlin_agent_Pipeline_by_pk;
      if (!pipelineData) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }

      // Convertir a formato YAML y guardar
      const yamlData = convertHasuraToPipelineYAML(pipelineData);
      await savePipelineYAML(id, yamlData);

      res.json({ yaml: yamlData, success: true });
    } catch (error) {
      console.error('Error syncing pipeline YAML:', error);
      res.status(500).json({ error: 'Failed to sync pipeline YAML' });
    }
  });

  // ============ SCHEDULE CONFIGURATION ROUTES ============
  
  // Get all schedule configs with their targets
  app.get('/api/schedules', async (req, res) => {
    try {
      const configs = await storage.getScheduleConfigs();
      const targets = await storage.getAllScheduleTargets();
      
      // Combine configs with their targets
      const schedulesWithTargets = configs.map(config => ({
        ...config,
        targets: targets.filter(t => t.scheduleId === config.id)
      }));
      
      res.json(schedulesWithTargets);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });
  
  // Get schedules that include a specific pipeline (must be before :id route)
  app.get('/api/schedules/by-pipeline/:pipelineId', async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const schedules = await storage.getSchedulesByPipelineId(pipelineId);
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching schedules by pipeline:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });
  
  // Get single schedule config
  app.get('/api/schedules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getScheduleConfig(id);
      
      if (!config) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      const targets = await storage.getScheduleTargets(id);
      res.json({ ...config, targets });
    } catch (error) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });
  
  // Create schedule config
  app.post('/api/schedules', async (req, res) => {
    try {
      const parsed = insertScheduleConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid schedule data', details: parsed.error.errors });
      }
      
      const config = await storage.createScheduleConfig(parsed.data);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating schedule:', error);
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  });
  
  // Update schedule config
  app.patch('/api/schedules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateScheduleConfig(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating schedule:', error);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });
  
  // Delete schedule config
  app.delete('/api/schedules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduleConfig(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  });
  
  // Add target to schedule
  app.post('/api/schedules/:id/targets', async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const schedule = await storage.getScheduleConfig(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      const targetData = { ...req.body, scheduleId };
      const parsed = insertScheduleTargetSchema.safeParse(targetData);
      
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid target data', details: parsed.error.errors });
      }
      
      const target = await storage.createScheduleTarget(parsed.data);
      res.status(201).json(target);
    } catch (error) {
      console.error('Error adding schedule target:', error);
      res.status(500).json({ error: 'Failed to add schedule target' });
    }
  });
  
  // Delete target from schedule
  app.delete('/api/schedules/:scheduleId/targets/:targetId', async (req, res) => {
    try {
      const targetId = parseInt(req.params.targetId);
      const deleted = await storage.deleteScheduleTarget(targetId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Target not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting schedule target:', error);
      res.status(500).json({ error: 'Failed to delete schedule target' });
    }
  });
  
  // Bulk import schedules (for migration from Python file)
  app.post('/api/schedules/import', async (req, res) => {
    try {
      const { schedules } = req.body;
      
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: 'schedules must be an array' });
      }
      
      const results = [];
      
      for (const scheduleData of schedules) {
        const { targets, ...configData } = scheduleData;
        
        // Create schedule config
        const config = await storage.createScheduleConfig(configData);
        
        // Create targets
        const createdTargets = [];
        if (Array.isArray(targets)) {
          for (const targetData of targets) {
            const target = await storage.createScheduleTarget({
              ...targetData,
              scheduleId: config.id
            });
            createdTargets.push(target);
          }
        }
        
        results.push({ ...config, targets: createdTargets });
      }
      
      res.status(201).json({ imported: results.length, schedules: results });
    } catch (error) {
      console.error('Error importing schedules:', error);
      res.status(500).json({ error: 'Failed to import schedules' });
    }
  });
  
  // Parse scheduler.py file and return schedules
  app.post('/api/schedules/parse', async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string' });
      }
      
      const schedules = parseSchedulerFile(content);
      
      res.json({ 
        parsed: schedules.length, 
        totalPipelines: schedules.reduce((acc, s) => acc + s.targets.length, 0),
        schedules 
      });
    } catch (error) {
      console.error('Error parsing scheduler file:', error);
      res.status(500).json({ error: 'Failed to parse scheduler file' });
    }
  });
  
  // Parse and import in one step
  app.post('/api/schedules/parse-and-import', async (req, res) => {
    try {
      const { content, clearExisting = true } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string' });
      }
      
      const parsedSchedules = parseSchedulerFile(content);
      
      // Clear existing schedules if requested (default: true for idempotent imports)
      if (clearExisting) {
        const existingSchedules = await storage.getScheduleConfigs();
        for (const schedule of existingSchedules) {
          // Delete targets first
          const targets = await storage.getScheduleTargets(schedule.id);
          for (const target of targets) {
            await storage.deleteScheduleTarget(target.id);
          }
          // Delete schedule
          await storage.deleteScheduleConfig(schedule.id);
        }
      }
      
      const results = [];
      
      for (const scheduleData of parsedSchedules) {
        const { targets, ...configData } = scheduleData;
        
        // Create schedule config
        const config = await storage.createScheduleConfig(configData as any);
        
        // Create targets
        const createdTargets = [];
        if (Array.isArray(targets)) {
          for (const targetData of targets) {
            const target = await storage.createScheduleTarget({
              pipelineId: targetData.pipelineId,
              pipelineName: targetData.pipelineName,
              clientName: targetData.clientName,
              scheduleId: config.id,
              enabled: true
            });
            createdTargets.push(target);
          }
        }
        
        results.push({ ...config, targets: createdTargets });
      }
      
      res.status(201).json({ 
        imported: results.length,
        totalPipelines: results.reduce((acc, s) => acc + s.targets.length, 0),
        schedules: results,
        clearedExisting: clearExisting
      });
    } catch (error) {
      console.error('Error parsing and importing schedules:', error);
      res.status(500).json({ error: 'Failed to parse and import schedules' });
    }
  });

  return httpServer;
}

// Function to check if a query is read-only
function isReadOnlyQuery(query: string): boolean {
  try {
    // Remove comments
    const queryWithoutComments = query.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    // Normalize whitespace
    const normalizedQuery = queryWithoutComments.replace(/\s+/g, ' ').trim().toLowerCase();

    // If the query is empty after normalization, it's not valid but not harmful
    if (!normalizedQuery) {
      return true;
    }

    // Check if it's explicitly a mutation or subscription
    if (normalizedQuery.startsWith('mutation') || normalizedQuery.startsWith('subscription')) {
      return false;
    }

    // GraphQL queries usually start with 'query'
    if (normalizedQuery.startsWith('query')) {
      return true;
    }

    // SQL mutations would have these patterns
    const dangerousPatterns = [
      /\binsert\s+into\b/i,
      /\bupdate\s+\w+\s+set\b/i,
      /\bdelete\s+from\b/i,
      /\balter\s+table\b/i,
      /\bcreate\s+(table|database|index)\b/i,
      /\bdrop\s+(table|database|index)\b/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedQuery)) {
        return false;
      }
    }
    
    // Assume it's read-only if no dangerous patterns are found
    return true;
  } catch (error) {
    console.error("Error in isReadOnlyQuery:", error);
    // If there's an error in the validation, be safe and reject the query
    return false;
  }
}

// Function to check if a mutation is specifically allowed (agent creation or pipeline execution)
function isAgentCreationMutation(query: string): boolean {
  try {
    // Remove comments and normalize whitespace
    const queryWithoutComments = query.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const normalizedQuery = queryWithoutComments.replace(/\s+/g, ' ').trim();
    
    // If it's not a mutation, it's not allowed
    if (!normalizedQuery.toLowerCase().startsWith('mutation')) {
      return false;
    }
    
    // Check for specific patterns that indicate allowed mutations
    const allowedMutationPatterns = [
      // Pattern for the specific CreateAgent mutation
      /mutation\s+CreateAgent/i,
      
      // Pattern for inserting into AgentPassport table
      /insert_merlin_agent_AgentPassport/i,
      
      // Pattern for executing pipelines (inserting into job queue)
      /insert_merlin_agent_PipelineJobQueue/i,
      
      // Pattern for updating pipeline description only (must use update_by_pk with description in _set)
      /update_merlin_agent_Pipeline_by_pk[\s\S]*_set[\s\S]*description/i,
      
      // Pattern for cancelling/aborting a running job (update PipelineJobQueue by pk)
      /update_merlin_agent_PipelineJobQueue_by_pk[\s\S]*_set[\s\S]*aborted/i
    ];
    
    for (const pattern of allowedMutationPatterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('Allowed mutation detected:', pattern.toString());
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error in isAgentCreationMutation:", error);
    // If there's an error in the validation, be safe and don't allow the mutation
    return false;
  }
}
