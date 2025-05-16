import fetch from 'node-fetch';

// Hasura GraphQL endpoint
const HASURA_ENDPOINT = 'https://graph.dq.strategio.cloud/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || '';

// Function to execute GraphQL queries
async function query(queryString: string, variables = {}): Promise<{ data?: any; errors?: Array<{ message: string }> }> {
  try {
    console.log('Executing Hasura query:', queryString.slice(0, 100) + '...');
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: queryString,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hasura error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Hasura client error:', error);
    throw error;
  }
}

export const hasuraClient = {
  query,
};
