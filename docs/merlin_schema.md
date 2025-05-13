# Esquema de base de datos - Merlin

Este documento contiene la estructura de las tablas principales del sistema Merlin. El sistema está diseñado para manejar agentes, pipelines, y procesos de automatización.

## Agentes

### AgentPassport
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre del agente |
| description | string | Descripción del agente |
| is_testing | bool | Es de prueba |
| enabled | bool | Agente habilitado |
| agent_version_id | string | ID de la versión del agente (FK a AgentVersion) |
| check_agent_update | bool | - |
| is_healthy | bool | - |
| auto_clean_update | bool | - |

### AgentPassportPing
| Campo | Tipo | Descripción |
|-------|------|-------------|
| agent_passport_id | string | ID del agente (FK a AgentPassport) |
| hostname | string | Nombre del equipo |
| ips | string | IPs del equipo |
| created_at | timestamp | Fecha de creación |
| last_ping_at | timestamp | Fecha del último ping realizado |
| agent_local_time | timestamp | Tiempo local en el equipo del agente |
| current_directory | string | Directorio donde se ubica el programa del agente merlín |
| os_version | string | Versión del sistema operativo |
| agent_version_from_source_code | string | Versión instalada de agente merlín |

### AgentVersion
| Campo | Tipo | Descripción |
|-------|------|-------------|
| version | string | Versión del agente |
| url | string | URL de descarga |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| url2 | string | Url 2 |
| url3 | string | Url3 |

## Pipelines y Unidades

### Pipeline
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asignado al Pipeline |
| description | string | Descripción del pipeline |
| abort_on_error | bool | Abortar acción en caso de error |
| notify_on_abort_email_id | string | - |
| notify_on_abort_webhook_id | string | - |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| agent_passport_id | string | ID del agente al cual pertenecerá (FK a AgentPassport) |
| disposable | bool | - |

### PipelineUnit
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| command_id | string | ID del proceso de ejecución de comando (FK a Command) |
| query_queue_id | string | ID del proceso de cola de queries (FK a QueryQueue) |
| sftp_downloader_id | string | ID del proceso de descarga desde sftp (FK a SFTPDownloader) |
| sftp_uploader_id | string | ID del proceso de carga desde sftp (FK a SFTPUploader) |
| zip_id | string | ID del proceso de compresión (FK a Zip) |
| unzip_id | string | ID del proceso de descompresión (FK a UnZip) |
| pipeline_id | string | ID del pipeline al cual pertenece (FK a Pipeline) |
| pipeline_unit_id | string | ID de la unidad de pipeline al cual va a suceder en la ejecución (FK a PipelineUnit) |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| comment | string | Comentarios |
| retry_after_milliseconds | integer | Tiempo de espera en milisegundos para reintento |
| retry_count | integer | Número de reintentos |
| timeout_milliseconds | integer | Tiempo de espera en milisegundos para timeout |
| abort_on_timeout | bool | Abortar acción en caso de timeout |
| continue_on_error | bool | Continuar ejecución a pesar de error |
| notify_on_error_email | string | - |
| notify_on_error_webhook | string | - |
| notify_on_timeout_email | string | - |
| notify_on_timeout_webhook | string | - |
| posx | integer | Posición X en la interfaz gráfica |
| posy | integer | Posición Y en la interfaz gráfica |
| call_pipeline | string | ID del pipeline que se llamará a ejecutar (FK a Pipeline) |

## Tareas y Procesos

### Command
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| target | string | Nombre del programa/comando |
| working_directory | string | Ruta donde se ejecutará el comando/programa |
| args | string | Argumentos que recibe el comando/programa |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| instant | bool | - |
| name | string | Nombre asignado del proceso de comando |
| description | string | Descripción del proceso |
| dq_process_id | string | - |
| raw_script | string | Filas de comando para ejecución en consola (Cuando el target es cmd.exe) |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| return_output_type | string | PATHS |
| labels | array | Etiquetas |

### QueryQueue
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asignado a la cola de queries |
| description | string | Descripción de la cola de queries |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |

### Query
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| order | integer | Orden de ejecución |
| name | string | Nombre asignado a la query |
| query_string | string | Script que se ejecutará |
| path | string | Ruta donde se dejará el archivo generado |
| print_headers | bool | Escribir datos con encabezado |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| enabled | bool | Se encuentra habilitado |
| sqlconn_id | string | ID de conexión de sql (FK a SQLConn) |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| query_queue_id | string | ID de cola de ejecución de queries (FK a QueryQueue) |
| date_format | string | Formato de fecha para los campos de fecha |
| separator | string | Separador de columnas |
| chunks | integer | Bloque de cantidad de filas a escribir en el archivo generado |
| target_encoding | string | Codificación de datos |
| timeout | integer | Tiempo límite de ejecución en milisegundos |
| mssql_compatibility_level | string | Nivel de compatibilidad del sql server |
| retry_count | integer | Cantidad de reintentos |
| retry_after_milliseconds | integer | Tiempo de espera ejecutar reintento |
| remove_pipes_in_columns | bool | Remover pipelines de las columnas de datos |
| trim_columns | bool | Remover espacios al inicio y final de las columnas |
| labels | array | Etiquetas |
| force_dot_decimal_separator | bool | Forzar punto como separado decimal |

### SFTPDownloader
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asigando al proceso de descarga de sftp |
| output | string | Ruta donde será descargado el archivo |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| sftp_link_id | string | ID de conexión al sftp (FK a SFTPLink) |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de actualización |
| input | string | Ruta completa del archivo a descargar desde el sftp |
| description | string | Descripción del proceso |
| labels | array | Etiquetas |

### SFTPUploader
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asignado al proceso de carga de sftp |
| input | string | Ruta donde se encuentra el archivo a subir al sftp |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| sftp_link_id | string | ID de conexión al sftp (FK a SFTPLink) |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de actualización |
| output | string | Ruta del sftp donde se subirá el archivo |
| description | string | Descripción del proceso |
| labels | array | Etiquetas |

### Zip
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asignado |
| output | string | Ruta donde se guardará el archivo comprimido |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |

### UnZip
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre asignado |
| input | string | Ruta completa del archivo comprimido |
| output | string | Ruta de la carpeta donde se descomprimirá el archivo |
| return_output | bool | Mostrar el resultado de lo ejecutado |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |

## Ejecución y Logs

### PipelineJobQueue
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| pipeline_id | string | ID del pipeline al cual pertenece (FK a Pipeline) |
| completed | bool | Se completó la tarea |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |
| running | bool | Se encuentra ejecutando |
| aborted | bool | Fue abortado |
| started_by_agent | string | - |

### PipelineJobLogV2
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | integer | Código único identificador |
| pipeline_job_queue_id | string | ID de la cola de ejecución (FK a PipelineJobQueue) |
| pipeline_unit_id | string | ID de la unidad de pipeline (FK a PipelineUnit) |
| dqprocess_status_id | string | - |
| log_order | integer | Número de orden de ejecución |
| milliseconds | integer | Tiempo de ejecución |
| checked_by_notificator | bool | - |
| created_at | timestamp | Fecha de creación |

### PipelineJobLogV2Body
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | integer | Código único identificador |
| pipeline_job_queue_id | string | ID de la cola de ejecución (FK a PipelineJobQueue) |
| pipeline_unit_id | string | ID de la unidad de pipeline (FK a PipelineUnit) |
| pipeline_unit_context_id | string | - |
| date | timestamp | Fecha de ejecución |
| level | string | Nivel de log (INFO, WARN, ERROR, FATAL) |
| message | string | Mensaje recibido como resultado de la ejecución del proceso |
| callsite | string | Servicio/Módulo que envió el mensaje |
| exception | string | Excepción resultante |
| exception_message | string | Mensaje devuelto por la excepción |
| exception_stack_trace | string | Seguimiento de la excepción |
| created_at | timestamp | Fecha de creación |

## Conexiones y Configuraciones

### SQLConn
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre de la conexión |
| driver | string | Driver de base de datos |
| connection_string | string | Cadena de conexión |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de modificación |

### SFTPLink
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Código único identificador |
| name | string | Nombre de la conexión SFTP |
| server | string | Servidor del SFTP |
| port | integer | Puerto del SFTP |
| user | string | Usuario del SFTP |
| password | string | Contraseña del SFTP |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de edición |

## Relaciones principales

1. **Pipeline > PipelineUnit**: Un pipeline contiene múltiples unidades (one-to-many)
2. **PipelineUnit > (Command, QueryQueue, SFTPDownloader, SFTPUploader, Zip, UnZip)**: Una unidad está asociada a un solo tipo de tarea (one-to-one)
3. **QueryQueue > Query**: Una cola de consultas contiene múltiples consultas SQL (one-to-many)
4. **PipelineJobQueue > PipelineJobLogV2**: Una cola de trabajos tiene múltiples registros de logs (one-to-many)
5. **PipelineJobLogV2 > PipelineJobLogV2Body**: Un log puede tener múltiples mensajes detallados (one-to-many)