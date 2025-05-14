import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSocketServer } from "./api";
import { hasuraClient } from "./hasura-client";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up socket.io server for real-time updates
  setupSocketServer(httpServer);
  
  // Proxy Hasura GraphQL API requests
  app.post('/api/graphql', async (req, res) => {
    try {
      const { query, variables } = req.body;
      
      // Security check: ensure this is a read-only query
      const isReadOnly = isReadOnlyQuery(query);
      if (!isReadOnly) {
        console.log('Forbidden non-read-only query detected:', query.slice(0, 100) + '...');
        return res.status(403).json({
          error: "Forbidden: Only read-only queries are allowed"
        });
      }
      
      const result = await hasuraClient.query(query, variables);
      res.json(result);
    } catch (error) {
      console.error('GraphQL query error:', error);
      res.status(500).json({
        error: "Failed to execute GraphQL query",
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
      readonly: true
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
      
      const result = await hasuraClient.query(healthyQuery);
      
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
