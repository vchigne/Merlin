# CHECKPOINT - Estado antes de ampliar consultas GraphQL

## Fecha: 2025-08-08

## Estado actual:
- Sistema YAML completamente funcional con persistencia de posiciones
- Editor YAML con problema de modo nocturno resuelto
- Logs del pipeline funcionando correctamente
- Posiciones de nodos se guardan y cargan automáticamente

## Consultas GraphQL actuales que funcionan:

### PIPELINE_QUERY (shared/queries.ts líneas 49-63):
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

### PIPELINE_UNITS_QUERY (shared/queries.ts líneas 65-152):
```graphql
query GetPipelineUnits($pipelineId: uuid!) {
  merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
    id
    pipeline_id
    posx
    posy
    command_id
    query_queue_id
    sftp_downloader_id
    sftp_uploader_id
    zip_id
    unzip_id
    call_pipeline
    Command { ... }
    QueryQueue { ... }
    SFTPDownloader { ... }
    SFTPUploader { ... }
    Zip { ... }
    Unzip { ... }
    Pipeline { ... }
  }
}
```

## Campos identificados como faltantes según hasura-models.ts:

### Pipeline:
- abort_on_timeout
- continue_on_error

### PipelineUnit:
- comment
- retry_after_milliseconds
- retry_count
- timeout_milliseconds
- abort_on_timeout
- continue_on_error
- notify_on_error_email
- notify_on_error_webhook
- notify_on_timeout_email
- notify_on_timeout_webhook

### Command:
- dq_process_id
- labels

## Objetivo:
Investigar qué campos están realmente disponibles en Hasura y agregar todos los campos existentes sin romper las consultas actuales.