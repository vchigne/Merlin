# Overview

Merlin Observer is a modern web-based monitoring dashboard for the Merlin automation system. It provides real-time visibility into a distributed network of autonomous .NET agents that execute complex pipeline workflows. The application serves as the central control plane, allowing users to monitor agent health, track pipeline executions, view logs, and manage system configurations through an intuitive interface.

The system operates in a distributed architecture where multiple C# agents execute automation tasks while reporting their status and results to a centralized Hasura GraphQL backend. The dashboard provides comprehensive monitoring, alerting, and management capabilities for this distributed automation infrastructure.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React with TypeScript, using Vite for development and build tooling. The UI is built with shadcn/ui components on top of Tailwind CSS for styling, providing a modern and accessible design system.

**State Management**: TanStack Query (React Query) for server state management, with custom contexts for global application state. Real-time updates are handled through Socket.IO connections to provide live dashboard updates.

**Routing**: Uses Wouter for lightweight client-side routing, providing navigation between dashboard pages including agents, pipelines, jobs, logs, and system configuration.

**Component Architecture**: Modular component structure with reusable UI components, page-level components for different dashboard views, and specialized components for data visualization and forms.

## Backend Architecture

**Express.js Server**: Lightweight Node.js backend that serves as a proxy and aggregation layer between the frontend and Hasura GraphQL backend. Handles API routing, WebSocket connections, and file management.

**GraphQL Proxy**: Acts as a secure proxy to the Hasura GraphQL endpoint, implementing read-only query restrictions and specific mutation allowances for agent creation and updates.

**Real-time Communications**: Socket.IO server provides real-time updates to connected clients, polling Hasura for data changes and broadcasting updates for agent status, pipeline jobs, and system logs.

**File Management**: YAML-based pipeline configuration management, storing pipeline definitions and visual positioning data locally for enhanced user experience and version control.

## Data Storage Solutions

**Primary Database**: PostgreSQL database managed through Hasura GraphQL engine, containing all operational data including agent configurations, pipeline definitions, job queues, and execution logs.

**Schema Management**: Drizzle ORM for local database schema definitions and migrations, with shared TypeScript interfaces ensuring type safety across the application.

**Local Storage**: Browser localStorage for user preferences and dashboard settings, with YAML files for pipeline configurations and positioning data.

## Authentication and Authorization

**Security Model**: Read-only access by default for most operations, with specific allowances for agent creation and ping updates. The system implements a security-first approach where only necessary operations are permitted through the GraphQL proxy.

**Session Management**: Basic session handling through the Express server, with plans for more robust authentication as the system scales.

# External Dependencies

## Third-party Services

**Hasura GraphQL Engine**: Primary data layer providing real-time GraphQL API over PostgreSQL. Handles all data operations, subscriptions, and authorization rules for the distributed agent network.

**Neon Database**: Serverless PostgreSQL database hosting with WebSocket support for optimal performance with Hasura's real-time features.

## APIs and Integrations

**Socket.IO**: Real-time bidirectional communication between server and clients for live dashboard updates and notifications.

**GraphQL Client**: Custom GraphQL client implementation for querying Hasura with error handling and response caching.

## UI and Styling Libraries

**Radix UI**: Comprehensive set of accessible React components providing the foundation for the design system, including complex components like dialogs, dropdowns, and form controls.

**Tailwind CSS**: Utility-first CSS framework for consistent styling and responsive design across all dashboard components.

**Lucide React**: Icon library providing consistent iconography throughout the interface.

## Development and Build Tools

**TypeScript**: Full type safety across frontend and backend with shared type definitions for GraphQL responses and data models.

**Vite**: Modern build tool providing fast development server, hot module replacement, and optimized production builds.

**React Query**: Server state management with caching, background updates, and error handling for all data fetching operations.