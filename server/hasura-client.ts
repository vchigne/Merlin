import fetch from 'node-fetch';

// Hasura GraphQL endpoint
const HASURA_ENDPOINT = 'https://graph.dq.strategio.cloud/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'D?m.R65w={)8`H;3F>y<r&jadu(PN}L/be%vJ:+SpMKV-"W*ZY';

// Function to execute GraphQL queries
async function query(queryString: string, variables = {}) {
  try {
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
