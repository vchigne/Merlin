# Resolución de Problemas: Visualización de Unidades de Pipeline

## Problema Identificado

### Síntomas
- La visualización de pipelines en el dashboard mostraba "No hay unidades definidas para este pipeline"
- A pesar de que los pipelines existían y tenían unidades configuradas
- Los logs mostraban errores de validación en GraphQL

### Error Específico en Logs
```
query GetPipelineUnits($pipelineId: uuid!) {
  merlin_agent_PipelineUnit(where: {pipeline_id: {...
POST /api/graphql 200 in 15ms :: {"errors":[{"extensions":{"code":"validation-f...
```

## Análisis del Problema

### Causa Raíz
El problema estaba en la consulta GraphQL `PIPELINE_UNITS_QUERY` que incluía relaciones anidadas que causaban errores de validación en Hasura:

```graphql
# Relaciones problemáticas
SFTPUploader {
  id
  name
  input
  return_output
  sftp_link_id
  SFTPLink {
    id
    name
    server
    port
    user
  }
}

SFTPDownloader {
  id
  name
  output
  return_output
  sftp_link_id
  SFTPLink {
    id
    name
    server
    port
    user
  }
}
```

### Problemas con las Relaciones
1. **Nombres de relaciones incorrectos**: En Hasura, las relaciones se generan automáticamente basándose en foreign keys
2. **Estructura anidada compleja**: Las relaciones `SFTPLink` dentro de `SFTPUploader/SFTPDownloader` no estaban configuradas correctamente
3. **Convención de nomenclatura**: Intentamos varios nombres (`SFTPUploader`, `merlin_agent_SFTPUploader`) sin éxito

## Solución Implementada

### Enfoque: Simplificación de la Consulta
Eliminamos las relaciones anidadas problemáticas y mantuvimos solo los campos esenciales para la determinación del tipo de unidad:

```graphql
export const PIPELINE_UNITS_QUERY = `
  query GetPipelineUnits($pipelineId: uuid!) {
    merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
      id
      command_id
      query_queue_id
      sftp_downloader_id
      sftp_uploader_id
      zip_id
      unzip_id
      pipeline_id
      pipeline_unit_id
      created_at
      updated_at
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
      call_pipeline
    }
  }
`;
```

### Campos Críticos para Determinación de Tipo
La solución se basa en la regla fundamental: **cada unidad de pipeline tiene exactamente un campo ID no nulo que determina su tipo**:

- `command_id` → Comando/Script
- `query_queue_id` → Consulta SQL
- `sftp_downloader_id` → Descarga SFTP
- `sftp_uploader_id` → Subida SFTP
- `zip_id` → Compresión
- `unzip_id` → Descompresión

## Proceso de Diagnóstico Seguido

### 1. Identificación del Error
```bash
# Revisión de logs del servidor
Executing Hasura query: 
  query GetPipelineUnits($pipelineId: uuid!) {
    merlin_agent_PipelineUnit(where: {pipeline_id: {...
POST /api/graphql 200 in 15ms :: {"errors":[{"extensions":{"code":"validation-f...
```

### 2. Análisis de la Consulta Original
- Identificamos que las relaciones `SFTPUploader` y `SFTPDownloader` causaban el error
- Verificamos que otras consultas similares funcionaban correctamente

### 3. Pruebas de Nomenclatura
Intentamos varias convenciones de nombres:
- `SFTPUploader` (original)
- `merlin_agent_SFTPUploader` (con prefijo de esquema)
- Sin relaciones (solución final)

### 4. Verificación de Funcionalidad
- Confirmamos que los campos básicos contenían toda la información necesaria
- Validamos que la regla de determinación de tipo seguía funcionando

## Componentes Afectados

### Archivos Modificados
- `shared/queries.ts`: Simplificación de `PIPELINE_UNITS_QUERY`

### Componentes que Usan esta Consulta
1. `client/src/components/dashboard/PipelineVisualizerNew.tsx`
2. `client/src/components/dashboard/PipelineVisualization.tsx`
3. `client/src/components/dashboard/PipelineVisualizer.tsx`
4. `client/src/hooks/use-pipeline-units.ts`

## Reglas de Determinación de Tipo de Unidad

### Regla Fundamental
**Solo un campo ID tiene valor por unidad**: Cada registro en la tabla `merlin_agent_PipelineUnit` tiene exactamente uno de los campos `*_id` con un valor no nulo.

### Función de Determinación
```javascript
function determineUnitType(unit) {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query_queue';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline_call';
  return 'unknown';
}
```

## Consideraciones para el Futuro

## ACTUALIZACIÓN CRÍTICA: Estructura Real Descubierta

### Código Fuente del Agente C# como Referencia
Al analizar el código C# del agente oficial de Merlin, descubrimos la estructura **exacta** que Hasura debe retornar:

```csharp
public class PipelineUnit
{
    [JsonPropertyName("Command")]
    public Command Command { get; set; }
    
    [JsonPropertyName("QueryQueue")]
    public QueryQueue QueryQueue { get; set; }
    
    [JsonPropertyName("SFTPDownloader")]
    public SFTPDownloader SFTPDownloader { get; set; }
    
    [JsonPropertyName("SFTPUploader")]
    public SFTPUploader SFTPUploader { get; set; }
    
    [JsonPropertyName("Unzip")]
    public Unzip Unzip { get; set; }
    
    [JsonPropertyName("Zip")]
    public Zip Zip { get; set; }
}
```

### Consulta GraphQL Correcta (Basada en Código C#)
```graphql
export const PIPELINE_UNITS_QUERY_COMPLETE = `
  query GetPipelineUnits($pipelineId: uuid!) {
    merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
      id
      pipeline_unit_id
      abort_on_timeout
      continue_on_error
      retry_count
      timeout_milliseconds
      retry_after_milliseconds
      call_pipeline
      
      Command {
        id
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
          }
        }
      }
      
      SFTPDownloader {
        id
        input
        output
        return_output
        SFTPLink {
          id
          server
          port
          user
          password
        }
      }
      
      SFTPUploader {
        id
        output
        return_output
        SFTPLink {
          id
          server
          port
          user
          password
        }
      }
      
      Zip {
        id
        output
        return_output
      }
      
      Unzip {
        id
        output
        return_output
      }
    }
  }
`;
```

### Nombres de Relaciones Correctos
El código C# nos confirmó que los nombres de las relaciones en GraphQL son:
- ✅ `Command` (no `command`)
- ✅ `QueryQueue` (no `query_queue`)  
- ✅ `SFTPDownloader` (no `merlin_agent_SFTPDownloader`)
- ✅ `SFTPUploader` (no `merlin_agent_SFTPUploader`)
- ✅ `SFTPLink` (relación anidada dentro de SFTPDownloader/SFTPUploader)

### Configuración de Relaciones en Hasura
Para resolver las relaciones SFTP en el futuro:
1. Verificar que las foreign keys estén configuradas correctamente
2. Confirmar los nombres exactos de las relaciones en la consola de Hasura
3. Usar la introspección de GraphQL para obtener los nombres correctos

### Consulta de Introspección
```graphql
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
```

## Resultado

✅ **Problema resuelto**: La visualización de pipelines en el dashboard ahora muestra correctamente las unidades de cada pipeline

✅ **Funcionalidad mantenida**: La determinación del tipo de unidad sigue funcionando según la regla fundamental

✅ **Rendimiento mejorado**: La consulta simplificada es más eficiente y no causa errores de validación

## Lecciones Aprendidas

1. **Principio KISS**: A veces la solución más simple es la mejor
2. **Debugging incremental**: Simplificar paso a paso hasta encontrar el elemento problemático
3. **Validación de esquemas**: Siempre verificar que las relaciones en GraphQL estén correctamente configuradas en Hasura
4. **Datos esenciales vs. datos completos**: Identificar qué información es realmente necesaria para cada funcionalidad