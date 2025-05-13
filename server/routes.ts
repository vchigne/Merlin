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
  // Remove comments
  const queryWithoutComments = query.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  
  // Normalize whitespace
  const normalizedQuery = queryWithoutComments.replace(/\s+/g, ' ').trim().toLowerCase();

  // Check if it's explicitly a mutation or subscription
  if (normalizedQuery.startsWith('mutation') || normalizedQuery.startsWith('subscription')) {
    return false;
  }

  // Check for typical mutation keywords that aren't in column/table names
  const hasMutationKeyword = /\s+insert\s+into|\s+update\s+|\s+delete\s+from|\s+alter\s+|\s+create\s+|\s+drop\s+/.test(normalizedQuery);
  
  // Return true if query contains only read operations
  return !hasMutationKeyword;
}
