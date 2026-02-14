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
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execAsync = promisify(exec);

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
  
  // Toggle/update target
  app.patch('/api/schedules/:scheduleId/targets/:targetId', async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.scheduleId);
      const targetId = parseInt(req.params.targetId);
      
      const updateSchema = z.object({
        enabled: z.boolean().optional(),
        pipelineName: z.string().optional(),
        clientName: z.string().optional(),
        notes: z.string().optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid update data', details: parsed.error.errors });
      }

      const updated = await storage.updateScheduleTarget(targetId, parsed.data);
      
      if (!updated) {
        return res.status(404).json({ error: 'Target not found' });
      }

      if (updated.scheduleId !== scheduleId) {
        return res.status(400).json({ error: 'Target does not belong to this schedule' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating target:', error);
      res.status(500).json({ error: 'Failed to update target' });
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

  // ============================================
  // CRON ENDPOINTS
  // ============================================

  // Execute a pipeline by ID (server-side, for crontab usage)
  app.post('/api/cron/execute/:pipelineId', async (req, res) => {
    try {
      const { pipelineId } = req.params;
      
      if (!pipelineId || !/^[0-9a-f-]{36}$/i.test(pipelineId)) {
        return res.status(400).json({ error: 'Invalid pipeline ID' });
      }

      const result = await hasuraClient.query(`
        mutation ExecutePipeline($pipelineId: uuid!) {
          insert_merlin_agent_PipelineJobQueue(objects: [{pipeline_id: $pipelineId}]) {
            returning {
              id
              pipeline_id
              running
              completed
              created_at
            }
          }
        }
      `, { pipelineId });

      if (result.errors) {
        console.error('Cron execute error:', result.errors);
        return res.status(500).json({ error: result.errors[0].message });
      }

      const job = result.data?.insert_merlin_agent_PipelineJobQueue?.returning?.[0];
      console.log(`[CRON] Pipeline ${pipelineId} executed, job: ${job?.id}`);
      
      res.json({ 
        success: true, 
        pipelineId,
        jobId: job?.id,
        createdAt: job?.created_at
      });
    } catch (error: any) {
      console.error('[CRON] Execute error:', error);
      res.status(500).json({ error: error.message || 'Failed to execute pipeline' });
    }
  });

  // Execute multiple pipelines in batch (server-side, for crontab usage)
  app.post('/api/cron/execute-batch', async (req, res) => {
    try {
      const { pipelineIds } = req.body;
      
      if (!Array.isArray(pipelineIds) || pipelineIds.length === 0) {
        return res.status(400).json({ error: 'pipelineIds must be a non-empty array' });
      }

      const invalidIds = pipelineIds.filter((id: string) => !/^[0-9a-f-]{36}$/i.test(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: 'Invalid pipeline IDs', invalidIds });
      }

      const objects = pipelineIds.map((id: string) => ({ pipeline_id: id }));

      const result = await hasuraClient.query(`
        mutation ExecutePipelineBatch($objects: [merlin_agent_PipelineJobQueue_insert_input!]!) {
          insert_merlin_agent_PipelineJobQueue(objects: $objects) {
            returning {
              id
              pipeline_id
              running
              completed
              created_at
            }
          }
        }
      `, { objects });

      if (result.errors) {
        console.error('Cron batch execute error:', result.errors);
        return res.status(500).json({ error: result.errors[0].message });
      }

      const jobs = result.data?.insert_merlin_agent_PipelineJobQueue?.returning || [];
      console.log(`[CRON] Batch executed ${jobs.length} pipelines`);
      
      res.json({ 
        success: true, 
        count: jobs.length,
        jobs: jobs.map((j: any) => ({ id: j.id, pipelineId: j.pipeline_id, createdAt: j.created_at }))
      });
    } catch (error: any) {
      console.error('[CRON] Batch execute error:', error);
      res.status(500).json({ error: error.message || 'Failed to execute batch' });
    }
  });

  // Export crontab content from enabled schedules
  app.get('/api/cron/export', async (req, res) => {
    try {
      const configs = await storage.getScheduleConfigs();
      const targets = await storage.getAllScheduleTargets();

      const baseUrl = req.query.baseUrl as string || 'http://localhost:5000';
      
      const lines: string[] = [];
      lines.push('# ============================================');
      lines.push('# Merlin Observer - Auto-generated Crontab');
      lines.push(`# Generated: ${new Date().toISOString()}`);
      lines.push(`# Base URL: ${baseUrl}`);
      lines.push('# ============================================');
      lines.push('');
      lines.push('SHELL=/bin/bash');
      lines.push('PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin');
      lines.push('');

      let enabledCount = 0;
      let disabledCount = 0;

      for (const config of configs) {
        const scheduleTargets = targets.filter(t => t.scheduleId === config.id);
        const enabledTargets = scheduleTargets.filter(t => t.enabled);
        
        if (!config.enabled) {
          disabledCount += scheduleTargets.length;
          continue;
        }

        if (enabledTargets.length === 0) {
          continue;
        }

        lines.push(`# --- ${config.label} ---`);

        if (config.timezone) {
          lines.push(`CRON_TZ=${config.timezone}`);
        }

        const [hours, minutes] = config.timeOfDay.split(':').map(Number);
        
        let cronTime = '';
        switch (config.frequencyType) {
          case 'daily':
            cronTime = `${minutes} ${hours} * * *`;
            break;
          case 'weekly':
            if (config.daysOfWeek) {
              const mondayBasedDays = config.daysOfWeek.split(',').map(Number);
              const cronDays = mondayBasedDays.map(d => (d + 1) % 7).join(',');
              cronTime = `${minutes} ${hours} * * ${cronDays}`;
            } else {
              cronTime = `${minutes} ${hours} * * 1-5`;
            }
            break;
          case 'monthly':
            if (config.daysOfMonth) {
              cronTime = `${minutes} ${hours} ${config.daysOfMonth} * *`;
            } else {
              cronTime = `${minutes} ${hours} 1 * *`;
            }
            break;
          default:
            cronTime = `${minutes} ${hours} * * *`;
        }

        const pipelineIds = enabledTargets.map(t => t.pipelineId);
        const comments = enabledTargets.map(t => `${t.pipelineName || ''}${t.clientName ? ' [' + t.clientName + ']' : ''}`);
        lines.push(`# Pipelines: ${comments.join(', ')}`);
        const jsonPayload = JSON.stringify({ pipelineIds });
        lines.push(`${cronTime} curl -s -X POST -H "Content-Type: application/json" -d '${jsonPayload}' ${baseUrl}/api/cron/execute-batch > /dev/null 2>&1`);
        enabledCount += enabledTargets.length;

        disabledCount += scheduleTargets.filter((t: any) => !t.enabled).length;

        lines.push('');
      }

      lines.push('# ============================================');
      lines.push(`# Total: ${enabledCount} active, ${disabledCount} disabled`);
      lines.push('# ============================================');

      const crontab = lines.join('\n');
      
      if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="merlin-crontab"');
        return res.send(crontab);
      }

      res.json({ 
        crontab,
        stats: {
          enabledEntries: enabledCount,
          disabledEntries: disabledCount,
          totalSchedules: configs.length,
          enabledSchedules: configs.filter(c => c.enabled).length
        }
      });
    } catch (error: any) {
      console.error('[CRON] Export error:', error);
      res.status(500).json({ error: error.message || 'Failed to export crontab' });
    }
  });

  // Install crontab to system cron (production Debian only)
  app.post('/api/cron/install', async (req, res) => {
    try {
      const configs = await storage.getScheduleConfigs();
      const targets = await storage.getAllScheduleTargets();

      const baseUrl = req.body.baseUrl || process.env.MERLIN_BASE_URL || 'http://localhost:5000';
      
      const lines: string[] = [];
      lines.push('# ============================================');
      lines.push('# Merlin Observer - Auto-generated Crontab');
      lines.push(`# Generated: ${new Date().toISOString()}`);
      lines.push(`# Base URL: ${baseUrl}`);
      lines.push('# DO NOT EDIT MANUALLY - managed by Merlin Observer');
      lines.push('# ============================================');
      lines.push('');
      lines.push('SHELL=/bin/bash');
      lines.push('PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin');
      lines.push('');

      let enabledCount = 0;
      let disabledCount = 0;

      for (const config of configs) {
        const scheduleTargets = targets.filter(t => t.scheduleId === config.id);
        const enabledTargets = scheduleTargets.filter(t => t.enabled);
        
        if (!config.enabled) {
          disabledCount += scheduleTargets.length;
          continue;
        }

        if (enabledTargets.length === 0) {
          continue;
        }

        lines.push(`# --- ${config.label} ---`);

        if (config.timezone) {
          lines.push(`CRON_TZ=${config.timezone}`);
        }

        const [hours, minutes] = config.timeOfDay.split(':').map(Number);
        
        let cronTime = '';
        switch (config.frequencyType) {
          case 'daily':
            cronTime = `${minutes} ${hours} * * *`;
            break;
          case 'weekly':
            if (config.daysOfWeek) {
              const mondayBasedDays = config.daysOfWeek.split(',').map(Number);
              const cronDays = mondayBasedDays.map(d => (d + 1) % 7).join(',');
              cronTime = `${minutes} ${hours} * * ${cronDays}`;
            } else {
              cronTime = `${minutes} ${hours} * * 1-5`;
            }
            break;
          case 'monthly':
            if (config.daysOfMonth) {
              cronTime = `${minutes} ${hours} ${config.daysOfMonth} * *`;
            } else {
              cronTime = `${minutes} ${hours} 1 * *`;
            }
            break;
          default:
            cronTime = `${minutes} ${hours} * * *`;
        }

        const pipelineIds = enabledTargets.map(t => t.pipelineId);
        const comments = enabledTargets.map(t => `${t.pipelineName || ''}${t.clientName ? ' [' + t.clientName + ']' : ''}`);
        lines.push(`# Pipelines: ${comments.join(', ')}`);
        const jsonPayload = JSON.stringify({ pipelineIds });
        lines.push(`${cronTime} curl -s -X POST -H "Content-Type: application/json" -d '${jsonPayload}' ${baseUrl}/api/cron/execute-batch > /dev/null 2>&1`);
        enabledCount += enabledTargets.length;

        disabledCount += scheduleTargets.filter((t: any) => !t.enabled).length;

        lines.push('');
      }

      lines.push('# ============================================');
      lines.push(`# Total: ${enabledCount} active, ${disabledCount} disabled`);
      lines.push('# ============================================');

      const crontab = lines.join('\n');

      let installed = false;
      let installError = '';
      
      try {
        const tmpFile = '/tmp/merlin-crontab';
        fs.writeFileSync(tmpFile, crontab + '\n');
        await execAsync(`crontab ${tmpFile}`);
        fs.unlinkSync(tmpFile);
        installed = true;
        console.log(`[CRON] Crontab installed: ${enabledCount} active entries`);
      } catch (err: any) {
        installError = err.message || 'Failed to install crontab';
        console.warn(`[CRON] Could not install crontab to system: ${installError}`);
        // This is expected in dev environments (Replit) - not a fatal error
      }

      res.json({ 
        success: true,
        installed,
        installError: installed ? undefined : installError,
        crontab,
        stats: {
          enabledEntries: enabledCount,
          disabledEntries: disabledCount,
          totalSchedules: configs.length,
          enabledSchedules: configs.filter(c => c.enabled).length
        }
      });
    } catch (error: any) {
      console.error('[CRON] Install error:', error);
      res.status(500).json({ error: error.message || 'Failed to install crontab' });
    }
  });

  // Get current cron installation status
  app.get('/api/cron/status', async (req, res) => {
    try {
      let currentCrontab = '';
      let isInstalled = false;
      
      try {
        const { stdout } = await execAsync('crontab -l');
        currentCrontab = stdout;
        isInstalled = currentCrontab.includes('Merlin Observer');
      } catch (err: any) {
        // No crontab installed or command not available
        currentCrontab = '';
        isInstalled = false;
      }

      res.json({ 
        isInstalled,
        currentCrontab,
        lastCheck: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
