# Referencia de Pipelines en Merlin

## Estructura de una Pipeline

Una pipeline en Merlin es una secuencia de unidades de ejecución donde cada unidad representa una operación específica a realizar. Las pipelines permiten automatizar flujos de trabajo complejos combinando diferentes tipos de operaciones.

## Unidades de Pipeline

Cada unidad en una pipeline tiene un tipo específico que determina qué operación realizará. El tipo de la unidad se determina por un campo específico presente en la tabla `PipelineUnit`.

### Determinación del tipo de unidad

La tabla `PipelineUnit` contiene los siguientes campos clave:
- `command_id`
- `sftp_uploader_id`
- `sftp_downloader_id`
- `query_queue_id`
- `zip_id`
- `unzip_id`

**Regla fundamental**: En cualquier momento, solo uno de estos campos tiene un valor (no nulo), todos los demás son nulos. El campo que tiene un valor determina el tipo de la unidad:

| Campo con valor      | Tipo de Unidad       | Descripción                                        |
|----------------------|----------------------|----------------------------------------------------|
| `command_id`         | Comando              | Ejecuta un comando del sistema operativo           |
| `sftp_uploader_id`   | Subida SFTP          | Envía archivos a un servidor SFTP remoto           |
| `sftp_downloader_id` | Descarga SFTP        | Descarga archivos desde un servidor SFTP remoto    |
| `query_queue_id`     | Consulta SQL         | Ejecuta una consulta SQL en una base de datos      |
| `zip_id`             | Compresión           | Comprime archivos en formato ZIP                   |
| `unzip_id`           | Descompresión        | Extrae archivos de un archivo ZIP                  |
| `call_pipeline`      | Llamada a Pipeline   | Ejecuta otra pipeline como subrutina               |

## Visualización en la Interfaz

Cuando se visualiza una pipeline en la interfaz gráfica, cada unidad se representa visualmente según su tipo. Los nodos SFTP (tanto de subida como de descarga) muestran información sobre:

1. **Conexión SFTP**: Detalles del servidor, puerto y usuario
2. **Rutas**: Origen y/o destino dependiendo del tipo
   - Las unidades de descarga SFTP (`sftp_downloader_id`) tienen una ruta de origen en el servidor remoto y una ruta de destino local
   - Las unidades de subida SFTP (`sftp_uploader_id`) tienen una ruta de origen local y una ruta de destino en el servidor remoto

## Tratamiento en el Código

Para determinar el tipo de unidad en el código, simplemente se verifica cuál de los campos ID tiene un valor:

```typescript
// Ejemplo de código para determinar el tipo de unidad
function determineUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline';
  return 'unknown';
}
```

Este enfoque simple y directo garantiza una identificación correcta y consistente del tipo de unidad en todas las partes de la aplicación.

## Consideraciones Importantes

- No existen casos especiales o excepciones a esta regla. Si una unidad tiene el campo `sftp_uploader_id` con valor, es siempre una unidad de tipo "Subida SFTP".
- Todos los componentes de la aplicación deben usar esta misma lógica para determinar el tipo de unidad.
- La consistencia en la determinación del tipo de unidad es fundamental para el correcto funcionamiento de la interfaz.