import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSocketServer } from "./api";
import { hasuraClient } from "./hasura-client";
import { PipelineTemplateManager } from "../client/src/lib/pipeline-template-manager";

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
      
      // Get pipeline units (safe version for YAML editor)
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
            notify_on_error_email
            notify_on_error_webhook
            notify_on_timeout_email
            notify_on_timeout_webhook
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

// Function to check if a mutation is specifically for agent creation
function isAgentCreationMutation(query: string): boolean {
  try {
    // Remove comments and normalize whitespace
    const queryWithoutComments = query.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const normalizedQuery = queryWithoutComments.replace(/\s+/g, ' ').trim();
    
    // If it's not a mutation, it's not an agent creation
    if (!normalizedQuery.toLowerCase().startsWith('mutation')) {
      return false;
    }
    
    // Check for specific patterns that indicate agent creation
    const agentCreationPatterns = [
      // Pattern for the specific CreateAgent mutation
      /mutation\s+CreateAgent/i,
      
      // Pattern for inserting into AgentPassport table
      /insert_merlin_agent_AgentPassport/i
    ];
    
    for (const pattern of agentCreationPatterns) {
      if (pattern.test(normalizedQuery)) {
        console.log('Allowed agent creation mutation detected');
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
