# Sistema Merlin - Documentación Técnica

## Índice

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Conexión a Merlin](#conexión-a-merlin)
4. [Catálogo de Entidades y Tablas](#catálogo-de-entidades-y-tablas)
5. [Consultas GraphQL Disponibles](#consultas-graphql-disponibles)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [Modelo de Datos Detallado](#modelo-de-datos-detallado)

---

## Introducción

Merlin es un sistema de gestión y orquestación de agentes distribuidos que permite la ejecución automatizada de pipelines de procesos. El sistema utiliza **Hasura GraphQL Engine** como capa de acceso a datos sobre una base de datos **PostgreSQL**.

### Características Principales

- **Gestión de Agentes**: Monitoreo y control de agentes distribuidos
- **Orquestación de Pipelines**: Definición y ejecución de flujos de trabajo complejos
- **Múltiples Ejecutores**: Comandos, consultas SQL, transferencias SFTP, compresión de archivos
- **Monitoreo en Tiempo Real**: Estado de salud de agentes y seguimiento de ejecuciones
- **Sistema de Logs Avanzado**: Trazabilidad completa de todas las operaciones

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente de Aplicación                     │
│              (Dashboard, APIs, Integraciones)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ GraphQL Queries
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Hasura GraphQL Engine                       │
│          https://graph.dq.strategio.cloud/v1/graphql        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SQL
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│                   (Base de Datos Merlin)                     │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Aplicación Cliente** → Envía consultas GraphQL a Hasura
2. **Hasura GraphQL Engine** → Traduce GraphQL a SQL y consulta PostgreSQL
3. **PostgreSQL** → Retorna datos a Hasura
4. **Hasura** → Retorna respuesta GraphQL al cliente

---

## Conexión a Merlin

### Endpoint GraphQL

**URL**: `https://graph.dq.strategio.cloud/v1/graphql`

**Método**: `POST`

**Headers Requeridos**:
```http
Content-Type: application/json
x-hasura-admin-secret: <TU_HASURA_ADMIN_SECRET>
```

### Autenticación

El sistema utiliza autenticación basada en secreto administrativo de Hasura. Este secreto debe configurarse como variable de entorno:

```bash
HASURA_ADMIN_SECRET=tu_secreto_aquí
```

### Implementación del Cliente (Node.js/TypeScript)

```typescript
import fetch from 'node-fetch';

const HASURA_ENDPOINT = 'https://graph.dq.strategio.cloud/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || '';

async function query(queryString: string, variables = {}) {
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
    throw new Error(`Hasura error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export const hasuraClient = { query };
```

### Ejemplo de Uso Básico

```typescript
const result = await hasuraClient.query(`
  query GetAgentPassports {
    merlin_agent_AgentPassport {
      id
      name
      is_healthy
    }
  }
`);

console.log(result.data.merlin_agent_AgentPassport);
```

---

## Catálogo de Entidades y Tablas

### Diagrama de Relaciones Principales

```
AgentPassport (Agente)
    ├── AgentPassportPing (Ping/Heartbeat)
    ├── AgentVersion (Versión del Agente)
    └── Pipeline (Pipelines del Agente)
            ├── PipelineUnit (Unidades del Pipeline)
            │       ├── Command (Ejecución de Comandos)
            │       ├── QueryQueue (Cola de Consultas SQL)
            │       │       └── Query (Consulta SQL Individual)
            │       │               └── SQLConn (Conexión SQL)
            │       ├── SFTPDownloader (Descarga SFTP)
            │       │       └── SFTPLink (Conexión SFTP)
            │       ├── SFTPUploader (Carga SFTP)
            │       │       └── SFTPLink
            │       ├── Zip (Compresión)
            │       ├── UnZip (Descompresión)
            │       └── PipelineCall (Llamada a otro Pipeline)
            └── PipelineJobQueue (Trabajos de Ejecución)
                    ├── PipelineJobLog (Logs de Ejecución)
                    ├── PipelineJobLogV2 (Logs V2)
                    └── PipelineJobLogV2Body (Detalle de Logs)
```

### Resumen de Tablas por Categoría

#### 1. Gestión de Agentes (3 tablas)
- `AgentPassport`: Información del agente
- `AgentPassportPing`: Estado y conectividad del agente
- `AgentVersion`: Versiones disponibles del software del agente

#### 2. Definición de Pipelines (2 tablas)
- `Pipeline`: Configuración de pipelines
- `PipelineUnit`: Unidades/pasos dentro de un pipeline

#### 3. Ejecutores de Tareas (7 tablas)
- `Command`: Ejecución de comandos del sistema
- `QueryQueue`: Conjunto de consultas SQL
- `Query`: Consulta SQL individual
- `SFTPDownloader`: Descarga de archivos por SFTP
- `SFTPUploader`: Carga de archivos por SFTP
- `Zip`: Compresión de archivos
- `UnZip`: Descompresión de archivos

#### 4. Conexiones (2 tablas)
- `SQLConn`: Conexiones a bases de datos SQL
- `SFTPLink`: Conexiones a servidores SFTP

#### 5. Ejecución y Logs (4 tablas)
- `PipelineJobQueue`: Cola de trabajos de pipeline
- `PipelineJobLog`: Logs de ejecución (legacy)
- `PipelineJobLogV2`: Logs de ejecución (versión 2)
- `PipelineJobLogV2Body`: Contenido detallado de logs

#### 6. Soporte (3 tablas)
- `FileStreamZip`: Archivos para comprimir
- `FileStreamUnzip`: Archivos para descomprimir
- `FileStreamSftpDownloader`: Streams de descarga SFTP
- `FileStreamSftpUploader`: Streams de carga SFTP

---

## Consultas GraphQL Disponibles

Todas las consultas están organizadas por categoría funcional.

### 1. Consultas de Agentes

#### 1.1 Listar Todos los Agentes

**Query**: `AGENT_PASSPORT_QUERY`

```graphql
query GetAgentPassports {
  merlin_agent_AgentPassport {
    id
    name
    description
    is_testing
    enabled
    fabric_x_data_note_id
    watch
    agent_version_id
    check_agent_update
    is_healthy
    auto_clean_update
  }
}
```

**Uso**:
```typescript
const result = await hasuraClient.query(AGENT_PASSPORT_QUERY);
const agents = result.data.merlin_agent_AgentPassport;
```

#### 1.2 Estado de Ping de Agentes

**Query**: `AGENT_PASSPORT_PING_QUERY`

```graphql
query GetAgentPassportPings {
  merlin_agent_AgentPassportPing {
    agent_passport_id
    hostname
    ips
    created_at
    last_ping_at
    agent_local_time
    current_directory
    os_version
    agent_version_from_source_code
  }
}
```

**Campos clave**:
- `last_ping_at`: Último heartbeat del agente
- `hostname`: Nombre del servidor donde corre el agente
- `ips`: Direcciones IP del agente
- `os_version`: Sistema operativo del agente

#### 1.3 Estado de Salud de Agentes

**Query**: `AGENT_HEALTH_STATUS_QUERY`

```graphql
query GetAgentHealthStatus {
  merlin_agent_AgentPassport {
    id
    name
    is_healthy
    enabled
    AgentPassportPing {
      last_ping_at
      hostname
      ips
      created_at
    }
    PipelineJobQueues(limit: 20, order_by: {created_at: desc}) {
      id
      completed
      running
      aborted
      created_at
      updated_at
    }
  }
}
```

**Propósito**: Obtiene información completa de salud incluyendo ping y últimos trabajos ejecutados.

#### 1.4 Versiones de Agentes Disponibles

**Query**: `AGENT_VERSION_QUERY`

```graphql
query GetAgentVersions {
  merlin_agent_AgentVersion {
    version
    url
    created_at
    updated_at
    url2
    url3
  }
}
```

### 2. Consultas de Pipelines

#### 2.1 Listar Todos los Pipelines

**Query**: `PIPELINE_QUERY`

```graphql
query GetPipelines {
  merlin_agent_Pipeline {
    id
    name
    description
    abort_on_error
    notify_on_abort_email_id
    notify_on_abort_webhook_id
    created_at
    updated_at
    agent_passport_id
    disposable
  }
}
```

**Campos importantes**:
- `abort_on_error`: Si debe abortar el pipeline en caso de error
- `agent_passport_id`: ID del agente que ejecuta este pipeline
- `disposable`: Si el pipeline se elimina después de ejecutarse

#### 2.2 Obtener Unidades de un Pipeline

**Query**: `PIPELINE_UNITS_QUERY`

```graphql
query GetPipelineUnits($pipelineId: uuid!) {
  merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
    id
    pipeline_id
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
    
    Command {
      id
      name
      description
      target
      args
      working_directory
      instant
      raw_script
      return_output
      return_output_type
    }
    
    QueryQueue {
      id
      name
      description
      Queries {
        id
        order
        path
        query_string
        return_output
        SQLConn {
          id
          driver
          connstring
          name
        }
      }
    }
    
    SFTPDownloader {
      id
      name
      description
    }
    
    SFTPUploader {
      id
      name
      description
      return_output
      SFTPLink {
        id
        server
        port
        user
        name
      }
    }
    
    Zip {
      id
      name
      description
      output
      return_output
      FileStreamZips {
        id
        input
        return_output
        wildcard_exp
      }
    }
    
    Unzip {
      id
      name
      description
    }
    
    Pipeline {
      id
      name
      description
    }
  }
}
```

**Uso**:
```typescript
const result = await hasuraClient.query(
  PIPELINE_UNITS_QUERY,
  { pipelineId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
);
```

**Nota importante**: Cada `PipelineUnit` tiene exactamente **uno** de los siguientes IDs no nulo:
- `command_id`: Ejecuta un comando
- `query_queue_id`: Ejecuta consultas SQL
- `sftp_downloader_id`: Descarga archivos por SFTP
- `sftp_uploader_id`: Sube archivos por SFTP
- `zip_id`: Comprime archivos
- `unzip_id`: Descomprime archivos
- `call_pipeline`: Llama a otro pipeline

### 3. Consultas de Trabajos (Jobs)

#### 3.1 Listar Trabajos de Pipeline

**Query**: `PIPELINE_JOBS_QUERY`

```graphql
query GetPipelineJobs($limit: Int, $offset: Int) {
  merlin_agent_PipelineJobQueue(
    limit: $limit, 
    offset: $offset, 
    order_by: {created_at: desc}
  ) {
    id
    pipeline_id
    completed
    created_at
    updated_at
    running
    aborted
    started_by_agent
  }
}
```

**Uso con paginación**:
```typescript
const result = await hasuraClient.query(PIPELINE_JOBS_QUERY, {
  limit: 50,
  offset: 0
});
```

#### 3.2 Trabajos Recientes

**Query**: `RECENT_JOBS_QUERY`

```graphql
query GetRecentJobs($limit: Int!) {
  merlin_agent_PipelineJobQueue(
    limit: $limit, 
    order_by: {created_at: desc}
  ) {
    id
    pipeline_id
    completed
    created_at
    updated_at
    running
    aborted
    started_by_agent
  }
}
```

#### 3.3 Logs de un Trabajo (Legacy)

**Query**: `PIPELINE_JOB_LOGS_QUERY`

```graphql
query GetPipelineJobLogs($jobId: uuid!) {
  merlin_agent_PipelineJobLog(
    where: {pipeline_job_id: {_eq: $jobId}}, 
    order_by: {log_order: asc}
  ) {
    id
    pipeline_job_id
    pipeline_unit_id
    logs
    created_at
    updated_at
    warnings
    errors
    dqprocess_status_id
    log_order
    milliseconds
    checked_by_notificator
  }
}
```

#### 3.4 Logs de un Trabajo (V2)

**Query**: `PIPELINE_JOB_LOGS_V2_QUERY`

```graphql
query GetPipelineJobLogsV2($jobId: uuid!) {
  merlin_agent_PipelineJobLogV2(
    where: {pipeline_job_id: {_eq: $jobId}}, 
    order_by: {log_order: asc}
  ) {
    id
    pipeline_job_id
    pipeline_unit_id
    dqprocess_status_id
    log_order
    milliseconds
    checked_by_notificator
    created_at
  }
}
```

#### 3.5 Detalle de Logs V2

**Query**: `PIPELINE_JOB_LOGS_V2_BODY_QUERY`

```graphql
query GetPipelineJobLogsV2Body($logId: Int!) {
  merlin_agent_PipelineJobLogV2Body(where: {id: {_eq: $logId}}) {
    id
    pipeline_job_id
    pipeline_unit_id
    pipeline_unit_context_id
    date
    level
    message
    callsite
    exception
    exception_message
    exception_stack_trace
    created_at
  }
}
```

**Niveles de log disponibles**: ERROR, WARNING, INFO, DEBUG

### 4. Consultas de Ejecutores

#### 4.1 Comando por ID

**Query**: `COMMAND_QUERY`

```graphql
query GetCommand($id: uuid!) {
  merlin_agent_Command(where: {id: {_eq: $id}}) {
    id
    target
    working_directory
    args
    created_at
    updated_at
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
```

#### 4.2 Cola de Consultas SQL

**Query**: `QUERY_QUEUE_QUERY`

```graphql
query GetQueryQueue($id: uuid!) {
  merlin_agent_QueryQueue(where: {id: {_eq: $id}}) {
    id
    name
    description
    created_at
    updated_at
    Queries {
      id
      order
      query_string
      path
      return_output
      print_headers
      separator
      chunks
      trim_columns
      force_dot_decimal_separator
      date_format
      target_encoding
      sqlconn_id
      SQLConn {
        id
        name
        driver
      }
    }
  }
}
```

#### 4.3 Detalle de Consulta SQL

**Query**: `QUERY_DETAILS_QUERY`

```graphql
query GetQuery($id: uuid!) {
  merlin_agent_Query(where: {query_queue_id: {_eq: $id}}) {
    id
    order
    name
    statement
    path
    print_headers
    created_at
    updated_at
    enabled
    sqlconn_id
    return_output
    query_queue_id
    date_format
    separator
    chunks
    target_encoding
    timeout
    mssql_compatibility_level
    retry_count
    retry_after_milliseconds
    remove_pipes_in_columns
    trim_columns
    labels
    force_dot_decimal_separator
    SQLConn {
      id
      name
      driver
      connection_string
    }
  }
}
```

#### 4.4 SFTP Downloader

**Query**: `SFTP_DOWNLOADER_QUERY`

```graphql
query GetSFTPDownloader($id: uuid!) {
  merlin_agent_SFTPDownloader(where: {id: {_eq: $id}}) {
    id
    name
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
    FileStreamSftpDownloaders {
      id
      input
      output
      return_output
    }
  }
}
```

#### 4.5 SFTP Uploader

**Query**: `SFTP_UPLOADER_QUERY`

```graphql
query GetSFTPUploader($id: uuid!) {
  merlin_agent_SFTPUploader(where: {id: {_eq: $id}}) {
    id
    name
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
    FileStreamSftpUploaders {
      id
      input
      output
      return_output
    }
  }
}
```

#### 4.6 Zip

**Query**: `ZIP_QUERY`

```graphql
query GetZip($id: uuid!) {
  merlin_agent_Zip(where: {id: {_eq: $id}}) {
    id
    name
    output
    return_output
    created_at
    updated_at
    FileStreamZips {
      id
      input
      return_output
      wildcard_exp
    }
  }
}
```

#### 4.7 Unzip

**Query**: `UNZIP_QUERY`

```graphql
query GetUnzip($id: uuid!) {
  merlin_agent_UnZip(where: {id: {_eq: $id}}) {
    id
    name
    input
    output
    return_output
    created_at
    updated_at
    FileStreamUnzips {
      id
      input
      output
      return_output
    }
  }
}
```

### 5. Consultas de Conexiones

#### 5.1 Conexiones SQL

**Query**: `SQL_CONNECTIONS_QUERY`

```graphql
query GetSQLConnections($limit: Int!) {
  merlin_agent_SQLConn(limit: $limit) {
    id
    name
    driver
    connstring
    created_at
    updated_at
  }
}
```

**Drivers soportados**: SQL Server, MySQL, PostgreSQL, Oracle, SQLite, etc.

#### 5.2 Detalle de Conexión SQL

**Query**: `SQL_CONNECTION_DETAIL_QUERY`

```graphql
query GetSQLConnectionDetail($id: uuid!) {
  connection: merlin_agent_SQLConn(where: {id: {_eq: $id}}, limit: 1) {
    id
    name
    driver
    connstring
    created_at
    updated_at
  }
  queries: merlin_agent_Query(where: {sqlconn_id: {_eq: $id}}, limit: 50) {
    id
    name
    query_string
    path
    enabled
    chunks
    date_format
    separator
    target_encoding
    timeout
    return_output
    order
    query_queue_id
    QueryQueue {
      id
      name
      description
      created_at
      updated_at
    }
  }
}
```

#### 5.3 Enlaces SFTP

**Query**: `SFTP_LINKS_QUERY`

```graphql
query GetSFTPLinks($limit: Int!) {
  merlin_agent_SFTPLink(limit: $limit) {
    id
    name
    server
    port
    user
    created_at
    updated_at
  }
}
```

#### 5.4 Detalle de Enlace SFTP

**Query**: `SFTP_LINK_DETAIL_QUERY`

```graphql
query GetSFTPLinkDetail($id: uuid!) {
  merlin_agent_SFTPLink_by_pk(id: $id) {
    id
    name
    server
    port
    user
    created_at
    updated_at
  }
}
```

#### 5.5 Uso de Enlace SFTP

**Query**: `SFTP_LINK_USAGE_QUERY`

```graphql
query GetSFTPLinkUsage($id: uuid!) {
  downloaders: merlin_agent_SFTPDownloader(
    where: {sftp_link_id: {_eq: $id}}, 
    limit: 50
  ) {
    id
    name
    output
    return_output
  }
  uploaders: merlin_agent_SFTPUploader(
    where: {sftp_link_id: {_eq: $id}}, 
    limit: 50
  ) {
    id
    name
    output
    return_output
  }
}
```

### 6. Consultas de Estadísticas

#### 6.1 Resumen General de Estadísticas

**Query**: `STATS_OVERVIEW_QUERY`

```graphql
query GetStatsOverview {
  activeAgents: merlin_agent_AgentPassport_aggregate(
    where: {is_healthy: {_eq: true}, enabled: {_eq: true}}
  ) {
    aggregate {
      count
    }
  }
  totalAgents: merlin_agent_AgentPassport_aggregate {
    aggregate {
      count
    }
  }
  pipelineJobs: merlin_agent_PipelineJobQueue_aggregate {
    aggregate {
      count
    }
  }
  completedJobs: merlin_agent_PipelineJobQueue_aggregate(
    where: {completed: {_eq: true}}
  ) {
    aggregate {
      count
    }
  }
  abortedJobs: merlin_agent_PipelineJobQueue_aggregate(
    where: {aborted: {_eq: true}}
  ) {
    aggregate {
      count
    }
  }
  errorLogs: merlin_agent_PipelineJobLogV2Body_aggregate(
    where: {level: {_eq: "ERROR"}}
  ) {
    aggregate {
      count
    }
  }
}
```

**Uso**:
```typescript
const stats = await hasuraClient.query(STATS_OVERVIEW_QUERY);
console.log(`Agentes activos: ${stats.data.activeAgents.aggregate.count}`);
console.log(`Total de trabajos: ${stats.data.pipelineJobs.aggregate.count}`);
```

---

## Ejemplos Prácticos

### Ejemplo 1: Obtener Agentes Activos y Saludables

```typescript
const query = `
  query GetHealthyAgents {
    merlin_agent_AgentPassport(
      where: {
        is_healthy: {_eq: true},
        enabled: {_eq: true}
      }
    ) {
      id
      name
      description
      AgentPassportPing {
        last_ping_at
        hostname
      }
    }
  }
`;

const result = await hasuraClient.query(query);
const healthyAgents = result.data.merlin_agent_AgentPassport;

healthyAgents.forEach(agent => {
  console.log(`Agente: ${agent.name}`);
  console.log(`Último ping: ${agent.AgentPassportPing.last_ping_at}`);
  console.log(`Hostname: ${agent.AgentPassportPing.hostname}`);
});
```

### Ejemplo 2: Obtener Pipelines de un Agente Específico

```typescript
const query = `
  query GetAgentPipelines($agentId: uuid!) {
    merlin_agent_Pipeline(
      where: {agent_passport_id: {_eq: $agentId}}
    ) {
      id
      name
      description
      created_at
    }
  }
`;

const result = await hasuraClient.query(query, {
  agentId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
});

const pipelines = result.data.merlin_agent_Pipeline;
console.log(`Pipelines encontrados: ${pipelines.length}`);
```

### Ejemplo 3: Monitorear Trabajos en Ejecución

```typescript
const query = `
  query GetRunningJobs {
    merlin_agent_PipelineJobQueue(
      where: {
        running: {_eq: true},
        completed: {_eq: false}
      },
      order_by: {created_at: desc}
    ) {
      id
      pipeline_id
      created_at
      Pipeline {
        name
        agent_passport_id
        AgentPassport {
          name
        }
      }
    }
  }
`;

const result = await hasuraClient.query(query);
const runningJobs = result.data.merlin_agent_PipelineJobQueue;

runningJobs.forEach(job => {
  console.log(`Pipeline: ${job.Pipeline.name}`);
  console.log(`Agente: ${job.Pipeline.AgentPassport.name}`);
  console.log(`Iniciado: ${job.created_at}`);
});
```

### Ejemplo 4: Buscar Errores Recientes

```typescript
const query = `
  query GetRecentErrors($limit: Int!) {
    merlin_agent_PipelineJobLogV2Body(
      where: {level: {_eq: "ERROR"}},
      order_by: {created_at: desc},
      limit: $limit
    ) {
      id
      message
      exception_message
      exception_stack_trace
      created_at
      PipelineJobLogV2 {
        pipeline_job_id
        PipelineJobQueue {
          Pipeline {
            name
            AgentPassport {
              name
            }
          }
        }
      }
    }
  }
`;

const result = await hasuraClient.query(query, { limit: 10 });
const errors = result.data.merlin_agent_PipelineJobLogV2Body;

errors.forEach(error => {
  console.log(`Error: ${error.message}`);
  console.log(`Excepción: ${error.exception_message}`);
  console.log(`Pipeline: ${error.PipelineJobLogV2.PipelineJobQueue.Pipeline.name}`);
});
```

### Ejemplo 5: Obtener Estructura Completa de un Pipeline

```typescript
const query = `
  query GetPipelineStructure($pipelineId: uuid!) {
    merlin_agent_Pipeline_by_pk(id: $pipelineId) {
      id
      name
      description
      abort_on_error
      
      AgentPassport {
        id
        name
        is_healthy
      }
      
      PipelineUnits(order_by: {posx: asc, posy: asc}) {
        id
        comment
        posx
        posy
        retry_count
        timeout_milliseconds
        
        Command {
          name
          target
          args
        }
        
        QueryQueue {
          name
          Queries(order_by: {order: asc}) {
            order
            query_string
            SQLConn {
              name
              driver
            }
          }
        }
        
        SFTPUploader {
          name
          SFTPLink {
            server
            port
          }
        }
      }
    }
  }
`;

const result = await hasuraClient.query(query, {
  pipelineId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
});

const pipeline = result.data.merlin_agent_Pipeline_by_pk;
console.log(`Pipeline: ${pipeline.name}`);
console.log(`Agente: ${pipeline.AgentPassport.name}`);
console.log(`Unidades: ${pipeline.PipelineUnits.length}`);
```

### Ejemplo 6: Analizar Rendimiento de Agentes

```typescript
const query = `
  query GetAgentPerformance {
    merlin_agent_AgentPassport {
      id
      name
      is_healthy
      enabled
      
      PipelineJobQueues_aggregate(
        where: {created_at: {_gte: "2025-01-01"}}
      ) {
        aggregate {
          count
        }
      }
      
      CompletedJobs: PipelineJobQueues_aggregate(
        where: {
          completed: {_eq: true},
          created_at: {_gte: "2025-01-01"}
        }
      ) {
        aggregate {
          count
        }
      }
      
      AbortedJobs: PipelineJobQueues_aggregate(
        where: {
          aborted: {_eq: true},
          created_at: {_gte: "2025-01-01"}
        }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;

const result = await hasuraClient.query(query);
const agents = result.data.merlin_agent_AgentPassport;

agents.forEach(agent => {
  const total = agent.PipelineJobQueues_aggregate.aggregate.count;
  const completed = agent.CompletedJobs.aggregate.count;
  const aborted = agent.AbortedJobs.aggregate.count;
  const successRate = total > 0 ? (completed / total * 100).toFixed(2) : 0;
  
  console.log(`\nAgente: ${agent.name}`);
  console.log(`Total trabajos: ${total}`);
  console.log(`Completados: ${completed}`);
  console.log(`Abortados: ${aborted}`);
  console.log(`Tasa de éxito: ${successRate}%`);
});
```

### Ejemplo 7: Filtrar Conexiones SQL por Driver

```typescript
const query = `
  query GetSQLServerConnections {
    merlin_agent_SQLConn(
      where: {driver: {_ilike: "%sqlserver%"}}
    ) {
      id
      name
      driver
      created_at
      
      Queries_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const result = await hasuraClient.query(query);
const sqlServerConns = result.data.merlin_agent_SQLConn;

console.log(`Conexiones SQL Server: ${sqlServerConns.length}`);
sqlServerConns.forEach(conn => {
  console.log(`- ${conn.name}: ${conn.Queries_aggregate.aggregate.count} queries`);
});
```

---

## Modelo de Datos Detallado

### 1. AgentPassport (Agente)

**Tabla**: `merlin_agent_AgentPassport`

**Descripción**: Representa un agente de Merlin, que es un proceso que se ejecuta en un servidor y es capaz de ejecutar pipelines.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único del agente |
| `name` | text | Nombre del agente |
| `description` | text | Descripción del agente |
| `is_testing` | boolean | Indica si el agente está en modo de prueba |
| `enabled` | boolean | Indica si el agente está habilitado |
| `fabric_x_data_note_id` | text | ID de nota de Fabric X Data |
| `watch` | boolean | Indica si se debe monitorear el agente |
| `agent_version_id` | uuid | ID de la versión del agente |
| `check_agent_update` | boolean | Verifica actualizaciones del agente |
| `is_healthy` | boolean | Estado de salud del agente |
| `auto_clean_update` | boolean | Limpieza automática después de actualizar |

**Relaciones**:
- `AgentPassportPing` (1:1): Información de ping/heartbeat
- `Pipeline` (1:N): Pipelines asignados a este agente
- `AgentVersion` (N:1): Versión del software del agente

**Uso típico**: Gestionar y monitorear agentes distribuidos que ejecutan pipelines.

---

### 2. AgentPassportPing (Ping del Agente)

**Tabla**: `merlin_agent_AgentPassportPing`

**Descripción**: Registro de conectividad y estado del agente. Se actualiza periódicamente mediante heartbeats.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `agent_passport_id` | uuid | ID del agente (FK) |
| `hostname` | text | Nombre del host donde corre el agente |
| `ips` | text | Direcciones IP del servidor |
| `created_at` | timestamp | Fecha de creación del registro |
| `last_ping_at` | timestamp | **Último heartbeat recibido** |
| `agent_local_time` | timestamp | Hora local del agente |
| `current_directory` | text | Directorio actual del agente |
| `os_version` | text | Versión del sistema operativo |
| `agent_version_from_source_code` | text | Versión del código del agente |

**Uso típico**: Determinar si un agente está online, offline o tiene problemas de conectividad.

**Cálculo de estado**:
- **Online**: `last_ping_at` dentro de los últimos 5 minutos
- **Warning**: `last_ping_at` entre 5-15 minutos
- **Offline**: `last_ping_at` mayor a 15 minutos o null

---

### 3. AgentVersion (Versión del Agente)

**Tabla**: `merlin_agent_AgentVersion`

**Descripción**: Versiones disponibles del software del agente para actualizaciones.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `version` | text | Número de versión |
| `url` | text | URL de descarga principal |
| `url2` | text | URL de descarga alternativa 1 |
| `url3` | text | URL de descarga alternativa 2 |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

---

### 4. Pipeline (Pipeline)

**Tabla**: `merlin_agent_Pipeline`

**Descripción**: Define un flujo de trabajo compuesto por múltiples unidades de ejecución.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único del pipeline |
| `name` | text | Nombre del pipeline |
| `description` | text | Descripción del pipeline |
| `abort_on_error` | boolean | Abortar pipeline si una unidad falla |
| `notify_on_abort_email_id` | uuid | ID de email para notificación de aborto |
| `notify_on_abort_webhook_id` | uuid | ID de webhook para notificación de aborto |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |
| `agent_passport_id` | uuid | **ID del agente que ejecuta este pipeline** |
| `disposable` | boolean | Pipeline de un solo uso (se elimina tras ejecución) |

**Relaciones**:
- `AgentPassport` (N:1): Agente que ejecuta este pipeline
- `PipelineUnit` (1:N): Unidades/pasos del pipeline
- `PipelineJobQueue` (1:N): Ejecuciones del pipeline

---

### 5. PipelineUnit (Unidad de Pipeline)

**Tabla**: `merlin_agent_PipelineUnit`

**Descripción**: Representa un paso individual dentro de un pipeline. Cada unidad ejecuta exactamente **un tipo** de tarea.

**Campos Generales**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único de la unidad |
| `pipeline_id` | uuid | **ID del pipeline al que pertenece** |
| `comment` | text | Comentario descriptivo |
| `retry_after_milliseconds` | integer | Tiempo de espera antes de reintentar |
| `retry_count` | integer | Número de reintentos permitidos |
| `timeout_milliseconds` | integer | Tiempo máximo de ejecución |
| `abort_on_timeout` | boolean | Abortar si excede el timeout |
| `continue_on_error` | boolean | Continuar pipeline si esta unidad falla |
| `notify_on_error_email` | text | Email para notificación de error |
| `notify_on_error_webhook` | text | Webhook para notificación de error |
| `notify_on_timeout_email` | text | Email para notificación de timeout |
| `notify_on_timeout_webhook` | text | Webhook para notificación de timeout |
| `posx` | integer | Posición X en el canvas visual |
| `posy` | integer | Posición Y en el canvas visual |

**Campos de Tipo de Ejecutor** (exactamente **uno** debe ser no nulo):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `command_id` | uuid | ID de comando a ejecutar |
| `query_queue_id` | uuid | ID de cola de consultas SQL |
| `sftp_downloader_id` | uuid | ID de descargador SFTP |
| `sftp_uploader_id` | uuid | ID de cargador SFTP |
| `zip_id` | uuid | ID de compresor de archivos |
| `unzip_id` | uuid | ID de descompresor de archivos |
| `call_pipeline` | uuid | ID de pipeline a llamar |

**Relaciones**:
- `Pipeline` (N:1): Pipeline al que pertenece
- `Command` (N:1): Comando a ejecutar (si aplica)
- `QueryQueue` (N:1): Cola de queries (si aplica)
- `SFTPDownloader` (N:1): Descargador SFTP (si aplica)
- `SFTPUploader` (N:1): Cargador SFTP (si aplica)
- `Zip` (N:1): Compresor (si aplica)
- `UnZip` (N:1): Descompresor (si aplica)

---

### 6. Command (Comando)

**Tabla**: `merlin_agent_Command`

**Descripción**: Define la ejecución de un comando del sistema operativo o script.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre del comando |
| `description` | text | Descripción |
| `target` | text | Ejecutable o comando a correr |
| `args` | text | Argumentos del comando |
| `working_directory` | text | Directorio de trabajo |
| `instant` | boolean | Ejecución instantánea sin esperar respuesta |
| `raw_script` | text | Script completo a ejecutar |
| `return_output` | boolean | Retornar la salida del comando |
| `return_output_type` | text | Tipo de salida (text, json, xml, etc.) |
| `labels` | text | Etiquetas para organización |
| `dq_process_id` | uuid | ID del proceso DQ |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Ejemplos de uso**:
- Ejecutar un script de Python
- Correr un programa .NET
- Ejecutar comandos de shell
- Invocar APIs de línea de comandos

---

### 7. QueryQueue (Cola de Consultas)

**Tabla**: `merlin_agent_QueryQueue`

**Descripción**: Agrupa múltiples consultas SQL que se ejecutan en secuencia.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre de la cola |
| `description` | text | Descripción |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `Query` (1:N): Consultas individuales en la cola

---

### 8. Query (Consulta SQL)

**Tabla**: `merlin_agent_Query`

**Descripción**: Define una consulta SQL individual con sus parámetros de ejecución.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `query_queue_id` | uuid | **ID de la cola a la que pertenece** |
| `sqlconn_id` | uuid | **ID de la conexión SQL a usar** |
| `order` | integer | Orden de ejecución dentro de la cola |
| `name` | text | Nombre de la consulta |
| `statement` | text | **Sentencia SQL a ejecutar** |
| `query_string` | text | Query string (alias de statement) |
| `path` | text | Ruta donde guardar resultados |
| `enabled` | boolean | Si la consulta está habilitada |
| `return_output` | boolean | Retornar resultados |
| `print_headers` | boolean | Incluir headers en la salida |
| `separator` | text | Separador de columnas (CSV) |
| `chunks` | integer | Dividir resultados en chunks |
| `trim_columns` | boolean | Recortar espacios en columnas |
| `force_dot_decimal_separator` | boolean | Forzar punto como separador decimal |
| `date_format` | text | Formato de fechas |
| `target_encoding` | text | Codificación de salida |
| `timeout` | integer | Timeout en milisegundos |
| `mssql_compatibility_level` | integer | Nivel de compatibilidad SQL Server |
| `retry_count` | integer | Número de reintentos |
| `retry_after_milliseconds` | integer | Espera entre reintentos |
| `remove_pipes_in_columns` | boolean | Eliminar pipes en columnas |
| `labels` | text | Etiquetas |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `QueryQueue` (N:1): Cola a la que pertenece
- `SQLConn` (N:1): Conexión SQL a usar

**Formatos de salida soportados**: CSV, JSON, XML, TXT

---

### 9. SQLConn (Conexión SQL)

**Tabla**: `merlin_agent_SQLConn`

**Descripción**: Define una conexión a una base de datos SQL.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre de la conexión |
| `driver` | text | **Driver de base de datos** |
| `connstring` | text | **Connection string** |
| `connection_string` | text | Alias de connstring |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Drivers soportados**:
- SQL Server
- MySQL
- PostgreSQL
- Oracle
- SQLite
- Otros via ODBC

**Ejemplo de connection string**:
```
Server=myserver;Database=mydb;User Id=myuser;Password=mypass;
```

---

### 10. SFTPLink (Enlace SFTP)

**Tabla**: `merlin_agent_SFTPLink`

**Descripción**: Define una conexión SFTP reutilizable.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre de la conexión |
| `server` | text | **Servidor SFTP** |
| `port` | integer | **Puerto** (default: 22) |
| `user` | text | **Usuario** |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Nota**: La contraseña/clave privada se gestiona de forma segura fuera de la base de datos.

---

### 11. SFTPDownloader (Descargador SFTP)

**Tabla**: `merlin_agent_SFTPDownloader`

**Descripción**: Define una operación de descarga de archivos por SFTP.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre del descargador |
| `description` | text | Descripción |
| `output` | text | Directorio de salida local |
| `return_output` | boolean | Retornar lista de archivos descargados |
| `sftp_link_id` | uuid | **ID de la conexión SFTP** |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `SFTPLink` (N:1): Conexión SFTP a usar
- `FileStreamSftpDownloader` (1:N): Archivos a descargar

---

### 12. SFTPUploader (Cargador SFTP)

**Tabla**: `merlin_agent_SFTPUploader`

**Descripción**: Define una operación de carga de archivos por SFTP.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre del cargador |
| `description` | text | Descripción |
| `output` | text | Directorio de destino remoto |
| `return_output` | boolean | Retornar confirmación |
| `sftp_link_id` | uuid | **ID de la conexión SFTP** |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `SFTPLink` (N:1): Conexión SFTP a usar
- `FileStreamSftpUploader` (1:N): Archivos a subir

---

### 13. Zip (Compresor)

**Tabla**: `merlin_agent_Zip`

**Descripción**: Define una operación de compresión de archivos.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre del compresor |
| `description` | text | Descripción |
| `output` | text | **Ruta del archivo ZIP de salida** |
| `return_output` | boolean | Retornar ruta del ZIP generado |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `FileStreamZip` (1:N): Archivos a comprimir

---

### 14. UnZip (Descompresor)

**Tabla**: `merlin_agent_UnZip`

**Descripción**: Define una operación de descompresión de archivos.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `name` | text | Nombre del descompresor |
| `description` | text | Descripción |
| `input` | text | **Ruta del archivo ZIP a descomprimir** |
| `output` | text | **Directorio de salida** |
| `return_output` | boolean | Retornar lista de archivos extraídos |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Relaciones**:
- `FileStreamUnzip` (1:N): Streams de archivos descomprimidos

---

### 15. PipelineJobQueue (Cola de Trabajos)

**Tabla**: `merlin_agent_PipelineJobQueue`

**Descripción**: Representa una ejecución individual de un pipeline.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único del trabajo |
| `pipeline_id` | uuid | **ID del pipeline ejecutado** |
| `completed` | boolean | Si el trabajo completó exitosamente |
| `running` | boolean | Si el trabajo está en ejecución |
| `aborted` | boolean | Si el trabajo fue abortado |
| `started_by_agent` | text | Agente que inició el trabajo |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

**Estados posibles**:
- `running = true`: En ejecución
- `completed = true, aborted = false`: Completado exitosamente
- `aborted = true`: Abortado por error
- `completed = false, running = false, aborted = false`: Pendiente

**Relaciones**:
- `Pipeline` (N:1): Pipeline ejecutado
- `PipelineJobLog` (1:N): Logs de ejecución (legacy)
- `PipelineJobLogV2` (1:N): Logs de ejecución (V2)

---

### 16. PipelineJobLogV2 (Log de Trabajo V2)

**Tabla**: `merlin_agent_PipelineJobLogV2`

**Descripción**: Registro de log mejorado para ejecuciones de pipeline.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | Identificador único |
| `pipeline_job_id` | uuid | **ID del trabajo** |
| `pipeline_unit_id` | uuid | **ID de la unidad ejecutada** |
| `dqprocess_status_id` | integer | Estado del proceso |
| `log_order` | integer | Orden del log |
| `milliseconds` | integer | Tiempo de ejecución en ms |
| `checked_by_notificator` | boolean | Si fue revisado por el notificador |
| `created_at` | timestamp | Fecha de creación |

**Relaciones**:
- `PipelineJobQueue` (N:1): Trabajo al que pertenece
- `PipelineUnit` (N:1): Unidad ejecutada
- `PipelineJobLogV2Body` (1:N): Cuerpo detallado del log

---

### 17. PipelineJobLogV2Body (Cuerpo del Log V2)

**Tabla**: `merlin_agent_PipelineJobLogV2Body`

**Descripción**: Almacena el contenido detallado de cada entrada de log.

**Campos**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | Identificador único |
| `pipeline_job_id` | uuid | ID del trabajo |
| `pipeline_unit_id` | uuid | ID de la unidad |
| `pipeline_unit_context_id` | uuid | ID de contexto |
| `date` | timestamp | Fecha del evento de log |
| `level` | text | **Nivel del log** (ERROR, WARNING, INFO, DEBUG) |
| `message` | text | **Mensaje del log** |
| `callsite` | text | Punto de código que generó el log |
| `exception` | text | Nombre de la excepción |
| `exception_message` | text | **Mensaje de la excepción** |
| `exception_stack_trace` | text | **Stack trace completo** |
| `created_at` | timestamp | Fecha de creación |

**Niveles de log**:
- `ERROR`: Errores que detuvieron la ejecución
- `WARNING`: Advertencias que no detienen la ejecución
- `INFO`: Información general
- `DEBUG`: Información de depuración

---

## Buenas Prácticas

### 1. Manejo de Errores

Siempre verificar errores en las respuestas de GraphQL:

```typescript
const result = await hasuraClient.query(query, variables);

if (result.errors) {
  console.error('GraphQL errors:', result.errors);
  throw new Error(result.errors[0].message);
}

const data = result.data;
```

### 2. Paginación

Para consultas que pueden retornar muchos resultados, usar `limit` y `offset`:

```typescript
const query = `
  query GetPipelines($limit: Int!, $offset: Int!) {
    merlin_agent_Pipeline(limit: $limit, offset: $offset) {
      id
      name
    }
  }
`;

const result = await hasuraClient.query(query, {
  limit: 50,
  offset: 0
});
```

### 3. Filtrado Eficiente

Usar operadores de Hasura para filtrado:

```typescript
const query = `
  query GetRecentHealthyAgents {
    merlin_agent_AgentPassport(
      where: {
        _and: [
          {is_healthy: {_eq: true}},
          {enabled: {_eq: true}},
          {created_at: {_gte: "2025-01-01"}}
        ]
      }
    ) {
      id
      name
    }
  }
`;
```

**Operadores disponibles**:
- `_eq`: Igual
- `_neq`: No igual
- `_gt`: Mayor que
- `_gte`: Mayor o igual que
- `_lt`: Menor que
- `_lte`: Menor o igual que
- `_in`: En lista
- `_nin`: No en lista
- `_is_null`: Es nulo
- `_like`: Like (para texto)
- `_ilike`: Like case-insensitive
- `_and`: Y lógico
- `_or`: O lógico
- `_not`: No lógico

### 4. Agregaciones

Usar `_aggregate` para obtener estadísticas:

```typescript
const query = `
  query GetPipelineStats($pipelineId: uuid!) {
    merlin_agent_PipelineJobQueue_aggregate(
      where: {pipeline_id: {_eq: $pipelineId}}
    ) {
      aggregate {
        count
        max {
          created_at
        }
        min {
          created_at
        }
      }
    }
  }
`;
```

### 5. Ordenamiento

Usar `order_by` para ordenar resultados:

```typescript
const query = `
  query GetRecentJobs {
    merlin_agent_PipelineJobQueue(
      order_by: {created_at: desc},
      limit: 10
    ) {
      id
      created_at
    }
  }
`;
```

### 6. Suscripciones en Tiempo Real

Hasura soporta suscripciones GraphQL para datos en tiempo real:

```typescript
const subscription = `
  subscription WatchRunningJobs {
    merlin_agent_PipelineJobQueue(
      where: {running: {_eq: true}}
    ) {
      id
      pipeline_id
      created_at
    }
  }
`;
```

---

## Conclusión

Este documento proporciona una visión completa del sistema Merlin, incluyendo:

- ✅ Arquitectura y conexión a través de Hasura GraphQL
- ✅ Catálogo completo de 20+ tablas y entidades
- ✅ 30+ consultas GraphQL predefinidas
- ✅ Ejemplos prácticos de uso común
- ✅ Descripción detallada de cada entidad con todos sus campos

Para soporte adicional o preguntas específicas, consulte la documentación de Hasura en https://hasura.io/docs/ o revise el código fuente en los archivos:
- `server/hasura-client.ts` - Cliente de conexión
- `shared/queries.ts` - Todas las queries disponibles
- `shared/schema.ts` - Esquema local de la aplicación

---

**Última actualización**: Octubre 2025  
**Versión del documento**: 1.0  
**Endpoint de producción**: `https://graph.dq.strategio.cloud/v1/graphql`
