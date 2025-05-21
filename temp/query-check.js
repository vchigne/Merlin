import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Los IDs que mencionaste
const pipelineId = '0da7b031-3a5f-4aa8-8fc6-e2d4aa55f0dd';
const unitId = '333de445-c707-4c60-a23d-3fd38c2681bf';

// Función para ejecutar consultas GraphQL
function executeQuery(query, variables) {
  const cmd = `curl -s -X POST "http://localhost:3000/api/graphql" -H "Content-Type: application/json" -d '${JSON.stringify({ query, variables })}'`;
  const result = execSync(cmd).toString();
  return JSON.parse(result);
}

// 1. Obtener el pipeline específico
const pipelineQuery = `
  query GetPipeline($id: uuid!) {
    merlin_agent_Pipeline(where: {id: {_eq: $id}}) {
      id
      name
      description
    }
  }
`;

// 2. Obtener la unidad específica del pipeline
const pipelineUnitQuery = `
  query GetPipelineUnit($id: uuid!) {
    merlin_agent_PipelineUnit(where: {id: {_eq: $id}}) {
      id
      sftp_uploader_id
      comment
    }
  }
`;

// 3. Obtener los detalles del SFTPUploader
const sftpUploaderQuery = `
  query GetSFTPUploader($id: uuid!) {
    merlin_agent_SFTPUploader(where: {id: {_eq: $id}}) {
      id
      name
      input
      output
      return_output
      sftp_link_id
      created_at
      updated_at
      SFTPLink {
        id
        name
        server
        port
        user
      }
    }
  }
`;

// Ejecutamos las consultas en secuencia
async function runQueries() {
  try {
    // Pipeline
    console.log("Consultando Pipeline...");
    const pipelineResult = executeQuery(pipelineQuery, { id: pipelineId });
    console.log(JSON.stringify(pipelineResult, null, 2));
    
    // PipelineUnit
    console.log("\nConsultando PipelineUnit...");
    const unitResult = executeQuery(pipelineUnitQuery, { id: unitId });
    console.log(JSON.stringify(unitResult, null, 2));
    
    if (unitResult.data.merlin_agent_PipelineUnit.length > 0) {
      const sftpUploaderId = unitResult.data.merlin_agent_PipelineUnit[0].sftp_uploader_id;
      
      if (sftpUploaderId) {
        // SFTP Uploader y SFTPLink
        console.log("\nConsultando SFTPUploader y SFTPLink...");
        const sftpResult = executeQuery(sftpUploaderQuery, { id: sftpUploaderId });
        console.log(JSON.stringify(sftpResult, null, 2));
      } else {
        console.log("No se encontró sftp_uploader_id en la unidad del pipeline.");
      }
    } else {
      console.log("No se encontró la unidad de pipeline.");
    }
  } catch (error) {
    console.error("Error al ejecutar consultas:", error);
  }
}

// Ejecutar las consultas
console.log("Siguiendo la cadena de relaciones para pipeline ID:", pipelineId, "y unit ID:", unitId);
runQueries();