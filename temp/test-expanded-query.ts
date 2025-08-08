// Test script para probar queries expandidas
import { HasuraService } from '../shared/hasura-service.js';

const hasuraService = new HasuraService();

async function testExpandedQueries() {
  console.log('🧪 Probando query expandida para Pipeline...');
  
  try {
    // Probar query expandida para Pipeline con todos los campos posibles
    const expandedPipelineQuery = `
      query TestExpandedPipeline {
        merlin_agent_Pipeline(limit: 1) {
          id
          name
          description
          abort_on_error
          abort_on_timeout
          continue_on_error
          notify_on_abort_email_id
          notify_on_abort_webhook_id
          created_at
          updated_at
          agent_passport_id
          disposable
        }
      }
    `;
    
    const pipelineResult = await hasuraService.executeQuery({ query: expandedPipelineQuery });
    console.log('✅ Pipeline query exitosa, campos obtenidos:', Object.keys(pipelineResult.data?.merlin_agent_Pipeline?.[0] || {}));
    
  } catch (error) {
    console.log('❌ Error en Pipeline query:', error.message);
  }
  
  console.log('\n🧪 Probando query expandida para PipelineUnit...');
  
  try {
    // Probar query expandida para PipelineUnit con todos los campos posibles
    const expandedPipelineUnitQuery = `
      query TestExpandedPipelineUnit {
        merlin_agent_PipelineUnit(limit: 1) {
          id
          pipeline_id
          pipeline_unit_id
          comment
          retry_after_milliseconds
          retry_count
          timeout_milliseconds
          abort_on_timeout
          continue_on_error
          notify_on_error_email
          notify_on_error_webhook
          notify_on_timeout_email
          notify_on_timeout_webhook
          posx
          posy
          command_id
          query_queue_id
          sftp_downloader_id
          sftp_uploader_id
          zip_id
          unzip_id
          call_pipeline
        }
      }
    `;
    
    const pipelineUnitResult = await hasuraService.executeQuery({ query: expandedPipelineUnitQuery });
    console.log('✅ PipelineUnit query exitosa, campos obtenidos:', Object.keys(pipelineUnitResult.data?.merlin_agent_PipelineUnit?.[0] || {}));
    
  } catch (error) {
    console.log('❌ Error en PipelineUnit query:', error.message);
  }
  
  console.log('\n🧪 Probando query expandida para Command...');
  
  try {
    // Probar query expandida para Command con todos los campos posibles
    const expandedCommandQuery = `
      query TestExpandedCommand {
        merlin_agent_Command(limit: 1) {
          id
          target
          working_directory
          args
          instant
          name
          description
          dq_process_id
          raw_script
          return_output
          return_output_type
          labels
        }
      }
    `;
    
    const commandResult = await hasuraService.executeQuery({ query: expandedCommandQuery });
    console.log('✅ Command query exitosa, campos obtenidos:', Object.keys(commandResult.data?.merlin_agent_Command?.[0] || {}));
    
  } catch (error) {
    console.log('❌ Error en Command query:', error.message);
  }
}

testExpandedQueries();