# Estructura y Componentes de un Pipeline en Merlin

## Estructura General

Un pipeline en Merlin es un conjunto organizado de unidades de procesamiento que se ejecutan en secuencia para realizar tareas automatizadas. La estructura básica de un pipeline incluye:

1. **Pipeline**: Contenedor principal que agrupa unidades de ejecución
2. **PipelineUnit**: Cada paso o unidad de ejecución dentro del pipeline
3. **PipelineJobQueue**: Cola de trabajos programados o en ejecución
4. **PipelineJobLog**: Registro de la ejecución de cada unidad

## Componentes Principales

### 1. Pipeline

El pipeline es la entidad principal que contiene la definición del flujo de trabajo.

**Campos principales**:
- **id**: Identificador único del pipeline (UUID)
- **name**: Nombre descriptivo del pipeline
- **description**: Descripción detallada del propósito del pipeline
- **abort_on_error**: Indica si el pipeline debe detenerse al encontrar un error
- **agent_passport_id**: El agente asignado para ejecutar este pipeline
- **disposable**: Indica si el pipeline es de un solo uso

### 2. PipelineUnit

Cada unidad representa una tarea específica dentro del pipeline. Cada unidad solo puede tener uno de los siguientes tipos:

**Tipos de Unidades**:
- **Command**: Ejecuta comandos del sistema operativo
- **QueryQueue**: Ejecuta consultas SQL
- **SFTPDownloader**: Descarga archivos desde un servidor SFTP
- **SFTPUploader**: Sube archivos a un servidor SFTP
- **Zip**: Comprime archivos
- **UnZip**: Descomprime archivos
- **CallPipeline**: Llama a otro pipeline

**Campos principales**:
- **id**: Identificador único de la unidad
- **pipeline_id**: Pipeline al que pertenece
- **command_id**: Comando a ejecutar (si es de tipo Command)
- **query_queue_id**: Cola de consultas a ejecutar (si es de tipo QueryQueue)
- **sftp_downloader_id**: Configuración de descarga SFTP (si es de tipo SFTPDownloader)
- **sftp_uploader_id**: Configuración de subida SFTP (si es de tipo SFTPUploader)
- **zip_id**: Configuración de compresión (si es de tipo Zip)
- **unzip_id**: Configuración de descompresión (si es de tipo UnZip)
- **call_pipeline**: ID del pipeline a llamar (si es de tipo CallPipeline)
- **comment**: Descripción de la unidad
- **posx, posy**: Posición en el editor visual
- **retry_count**: Número de reintentos en caso de error
- **retry_after_milliseconds**: Tiempo de espera antes de reintentar
- **timeout_milliseconds**: Tiempo máximo de ejecución
- **abort_on_timeout**: Detener el pipeline si se excede el tiempo
- **continue_on_error**: Continuar con la siguiente unidad a pesar de errores

### 3. Tipos de Unidades Detallados

#### Command

Ejecuta comandos en el sistema operativo del agente.

**Campos específicos**:
- **target**: El comando a ejecutar
- **working_directory**: Directorio donde se ejecutará el comando
- **args**: Argumentos para el comando
- **instant**: Si es de ejecución instantánea
- **raw_script**: Script completo para comandos complejos
- **return_output**: Si debe devolver la salida del comando
- **return_output_type**: Tipo de salida a devolver

#### QueryQueue

Contiene una o varias consultas SQL para ejecutar en una base de datos.

**Campos específicos**:
- **name**: Nombre de la cola de consultas
- **description**: Descripción de su propósito

Las consultas individuales dentro de la cola tienen:
- **order**: Orden de ejecución
- **name**: Nombre de la consulta
- **query_string**: La consulta SQL
- **path**: Ruta donde se guardarán los resultados
- **sqlconn_id**: Conexión SQL a utilizar
- **print_headers**: Si incluye encabezados en los resultados
- **separator**: Separador para archivos CSV
- **chunks**: División de resultados en bloques
- **timeout**: Tiempo máximo de ejecución

#### SFTPDownloader/Uploader

Gestiona la transferencia de archivos mediante SFTP.

**Campos específicos**:
- **name**: Nombre de la operación
- **output/input**: Ruta destino/origen de los archivos
- **sftp_link_id**: Configuración de conexión SFTP
- **return_output**: Si devuelve información sobre la transferencia

#### Zip/UnZip

Comprime o descomprime archivos.

**Campos específicos**:
- **name**: Nombre de la operación
- **input**: Archivos a comprimir/descomprimir (para UnZip)
- **output**: Ruta donde se guardarán los resultados
- **return_output**: Si devuelve información sobre la operación

### 4. Ejecución y Monitoreo

#### PipelineJobQueue

Gestiona la cola de ejecución de pipelines.

**Campos principales**:
- **id**: Identificador único del trabajo
- **pipeline_id**: Pipeline que se está ejecutando
- **completed**: Si ha finalizado
- **running**: Si está en ejecución
- **aborted**: Si fue abortado
- **started_by_agent**: Agente que inició la ejecución

#### PipelineJobLog

Registros detallados de la ejecución de cada unidad.

**Campos principales**:
- **pipeline_job_id**: ID del trabajo
- **pipeline_unit_id**: Unidad que generó el registro
- **logs/warnings/errors**: Mensajes de salida
- **log_order**: Orden secuencial del registro
- **milliseconds**: Tiempo de ejecución

La versión V2 (PipelineJobLogV2Body) desglosa los mensajes con mayor detalle:
- **level**: Nivel de log (INFO, WARN, ERROR, FATAL)
- **message**: Mensaje detallado
- **exception**: Información de excepciones
- **callsite**: Ubicación del código que generó el mensaje

## Relaciones Principales

1. **Pipeline → AgentPassport**: Cada pipeline está asignado a un agente específico
2. **Pipeline → PipelineUnit**: Un pipeline contiene múltiples unidades
3. **PipelineUnit → Command/QueryQueue/etc**: Cada unidad apunta a un tipo de tarea específica
4. **PipelineJobQueue → Pipeline**: Los trabajos en cola están asociados a pipelines específicos
5. **PipelineJobLog → PipelineJobQueue**: Los logs pertenecen a trabajos específicos
6. **PipelineJobLog → PipelineUnit**: Los logs están asociados a unidades específicas

## Consideraciones para el Editor Visual

En el editor visual de pipelines:

1. **Tipos de Nodos**:
   - Comando: Para ejecutar comandos del sistema operativo
   - Consulta SQL: Para ejecutar consultas en bases de datos
   - SFTP Descarga/Subida: Para transferencia de archivos
   - Comprimir/Descomprimir: Para manejo de archivos ZIP
   - Llamar Pipeline: Para invocar otros pipelines

2. **Conexiones**: Representan el flujo de ejecución entre unidades

3. **Posicionamiento**: Las unidades tienen coordenadas (posx, posy) que definen su ubicación en el canvas del editor

4. **Propiedades Visuales**:
   - Cada tipo de unidad tiene un color distintivo
   - Los estados (completado, en ejecución, error, pendiente) se muestran con colores diferentes
   - Las conexiones pueden ser animadas para indicar flujo activo

## Particularidades del Sistema

1. **Cada PipelineUnit solo puede tener un tipo de tarea activo**: Los campos command_id, query_queue_id, sftp_downloader_id, etc. son mutuamente excluyentes. Solo uno debe estar establecido.

2. **El orden de ejecución depende de las conexiones**: Las unidades se ejecutan según el grafo de dependencias definido por las conexiones.

3. **Un pipeline puede ser recursivo**: Una unidad puede llamar a otro pipeline mediante call_pipeline, incluso al mismo pipeline que la contiene.

4. **Las unidades pueden configurar su comportamiento ante errores**: Mediante campos como retry_count, continue_on_error, abort_on_timeout.

5. **Los logs se almacenan de forma jerárquica**: PipelineJobQueue → PipelineJobLog → PipelineJobLogV2Body para permitir un análisis detallado de las ejecuciones.