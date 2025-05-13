import { apiRequest } from "./queryClient";

// Function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}) {
  try {
    const response = await apiRequest('POST', '/api/graphql', {
      query,
      variables,
    });

    return await response.json();
  } catch (error) {
    console.error('GraphQL query error:', error);
    throw error;
  }
}

// Ensure query is read-only
export function validateReadOnlyQuery(query: string): boolean {
  // Remove comments
  const queryWithoutComments = query.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  
  // Normalize whitespace
  const normalizedQuery = queryWithoutComments.replace(/\s+/g, ' ').trim().toLowerCase();

  // Check for mutations, subscriptions, and other write operations
  const hasMutation = normalizedQuery.includes('mutation');
  const hasSubscription = normalizedQuery.includes('subscription');
  const hasInsert = normalizedQuery.includes('insert');
  const hasUpdate = normalizedQuery.includes('update');
  const hasDelete = normalizedQuery.includes('delete');
  const hasAlter = normalizedQuery.includes('alter');
  const hasCreate = normalizedQuery.includes('create');
  const hasDrop = normalizedQuery.includes('drop');
  
  // Return true if query contains only read operations
  return !(hasMutation || hasSubscription || hasInsert || hasUpdate || 
          hasDelete || hasAlter || hasCreate || hasDrop);
}

// Parse GraphQL query result
export function parseQueryResult(result: any, path: string[]) {
  if (!result || !result.data) {
    return null;
  }

  let current = result.data;
  for (const key of path) {
    if (current[key] === undefined) {
      return null;
    }
    current = current[key];
  }

  return current;
}
