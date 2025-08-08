// Script temporal para introspección de campos de Hasura
import { HasuraService } from '../shared/hasura-service.js';

async function introspectFields() {
  const hasuraService = new HasuraService();
  
  try {
    console.log('🔍 Investigando campos disponibles en Pipeline...');
    
    // Query de introspección para Pipeline
    const pipelineIntrospection = await hasuraService.executeQuery({
      query: `
        query IntrospectPipeline {
          __type(name: "merlin_agent_Pipeline") {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                }
              }
            }
          }
        }
      `
    });
    
    console.log('📋 Campos disponibles en Pipeline:');
    if (pipelineIntrospection.data?.__type?.fields) {
      pipelineIntrospection.data.__type.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type.name || field.type.ofType?.name || field.type.kind}`);
      });
    }
    
    console.log('\n🔍 Investigando campos disponibles en PipelineUnit...');
    
    // Query de introspección para PipelineUnit
    const pipelineUnitIntrospection = await hasuraService.executeQuery({
      query: `
        query IntrospectPipelineUnit {
          __type(name: "merlin_agent_PipelineUnit") {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                }
              }
            }
          }
        }
      `
    });
    
    console.log('📋 Campos disponibles en PipelineUnit:');
    if (pipelineUnitIntrospection.data?.__type?.fields) {
      pipelineUnitIntrospection.data.__type.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type.name || field.type.ofType?.name || field.type.kind}`);
      });
    }
    
    console.log('\n🔍 Investigando campos disponibles en Command...');
    
    // Query de introspección para Command
    const commandIntrospection = await hasuraService.executeQuery({
      query: `
        query IntrospectCommand {
          __type(name: "merlin_agent_Command") {
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                }
              }
            }
          }
        }
      `
    });
    
    console.log('📋 Campos disponibles en Command:');
    if (commandIntrospection.data?.__type?.fields) {
      commandIntrospection.data.__type.fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.type.name || field.type.ofType?.name || field.type.kind}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error durante la introspección:', error);
  }
}

introspectFields();