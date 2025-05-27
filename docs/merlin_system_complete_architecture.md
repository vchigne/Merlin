# Arquitectura Completa del Sistema Merlin

## 🎯 Resumen Ejecutivo

Merlin es un sistema de orquestación distribuido diseñado para automatizar procesos empresariales complejos. Combina agentes autónomos en .NET con un coordinador central en Hasura GraphQL, ejecutando pipelines con múltiples tipos de operaciones: consultas SQL, transferencias SFTP, comandos del sistema, compresión de archivos y llamadas recursivas a otros pipelines.

## 🏗️ Arquitectura General del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │  Hasura GraphQL │    │   Merlin Agent  │
│   (Monitoring)  │◄──►│  (Coordinator)  │◄──►│   (Executor)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   - Real-time UI          - Job Queue              - 4 Workers
   - Agent Status          - Pipeline Storage       - 5 Runners  
   - Pipeline Design       - Logging Aggregation    - Auto-Update
   - Error Analysis        - GraphQL API            - Heartbeat
```

---

## 🤖 Arquitectura del Agente Merlin

### **Sistema Multi-Worker Paralelo**

```csharp
// 4 Workers ejecutándose simultáneamente en cada agente
services.AddHostedService<Worker>();        // Coordinación y updates
services.AddHostedService<PingWorker>();    // Heartbeat cada ~60s
services.AddHostedService<MemoryLogWorker>(); // Buffer de logs
services.AddHostedService<QueueWorker>();   // Procesamiento de jobs
```

#### **1. Worker Principal**
- **Verificación de actualizaciones** automáticas desde Hasura
- **Coordinación general** del ciclo de vida del agente
- **Auto-limpieza** de archivos temporales
- **Gestión de configuración** desde variables de entorno

#### **2. PingWorker - Sistema de Heartbeat**
- **Pings regulares** cada ~60 segundos a Hasura
- **Información del sistema**: OS, IPs, directorio de trabajo, versión
- **Actualización** de `is_healthy` y `last_ping_at`
- **Detección automática** de agentes offline por el dashboard

#### **3. MemoryLogWorker - Gestión de Logs**
- **Buffer optimizado** en memoria durante ejecución de jobs
- **Flush automático** a Hasura en formato JSON estructurado
- **Cola de respaldo** con máximo 100 bloques si falla conexión
- **Reenvío automático** cuando la conexión se restablece

#### **4. QueueWorker - Procesador de Jobs**
- **Polling continuo** de `PipelineJobQueue` en Hasura
- **Construcción de cadenas** de dependencia entre pipeline units
- **Ejecución secuencial** con runners especializados
- **Manejo de estados** (pending → running → completed/failed)

### **Modos de Despliegue Flexibles**

#### **Desarrollo/Debug**
```bash
merlin-agent normal --contentRoot "C:\path"
```
- Ejecución continua con logging visible en consola
- Ideal para testing y desarrollo

#### **Producción Enterprise**
```bash
merlin-agent winservice --contentRoot "C:\path"
```
- Servicio Windows nativo con `sc.exe`
- Auto-start y recuperación automática
- Logging solo a archivos y Hasura

#### **Entornos Restringidos**
```bash
merlin-agent onetime --contentRoot "C:\path"
```
- Ejecución única para Windows Task Scheduler
- Sin servicios persistentes requeridos

### **Sistema de Logging Avanzado**

```csharp
// Configuración multi-target optimizada
var batchLogFile = new AsyncTargetWrapper("batchLogFile", logfile) {
    BatchSize = 1000,  // Escritura por lotes
    OverflowAction = AsyncTargetWrapperOverflowAction.Discard
};

// JSON estructurado para Hasura
var jsonLayout = new NLog.Layouts.JsonLayout() {
    Attributes = {
        new JsonAttribute("pipeline_job_id", "${event-properties:PipelineJobId}"),
        new JsonAttribute("pipeline_unit_id", "${event-properties:PipelineUnitId}"),
        new JsonAttribute("pipeline_unit_context_id", "${event-properties:PipelineUnitContextId}"),
        new JsonAttribute("date", "${longdate:universalTime=true}+00:00"),
        new JsonAttribute("level", "${level:uppercase=true}"),
        new JsonAttribute("message", "${message}"),
        new JsonAttribute("callsite", "${callsite}"),
        new JsonAttribute("exception", "${exception:format=type}"),
        new JsonAttribute("exception_message", "${exception:format=message}"),
        new JsonAttribute("exception_stack_trace", "${exception:format=stacktrace}")
    }
};
```

**Características:**
- **Logging asíncrono** con batches de 1000 logs para performance
- **Rotación automática** a los 5MB con 5 archivos históricos
- **Contexto enriquecido** con PipelineJobId, PipelineUnitId, y ContextId
- **Activación dinámica** del memory target durante ejecución de jobs
- **Cola de respaldo** resiliente con reenvío automático

---

## 🔧 Sistema de Runners Especializados

### **1. QueryQueueRunner - Orquestador de Datos**

```csharp
// Ejecución ordenada con reintentos por query
var sortedQueries = queryQueue.Queries.OrderBy(q => q.Order);
foreach (var query in sortedQueries) {
    QueryExecutionResult result = _runQueryWithRetry(query, tryCount: 0);
    if (query.ReturnOutput && result.Output != null) {
        _output.AddRange(result.Output); // Archivos CSV/TXT generados
    }
}
```

**Capacidades:**
- **Soporte dual**: MSSQL Server nativo y ODBC universal
- **Reintentos independientes** con `RetryCount` y `RetryAfterMilliseconds`
- **Configuración granular**: encoding, separadores, headers, chunks, formato de fechas
- **Generación de archivos** CSV/TXT con paths en el output para siguiente unidad

### **2. CommandRunner - Motor de Ejecución**

```csharp
// 3 modos de ejecución diferenciados
if (unit.Command.RawScript != null) {
    return runCommandWithRawScript(startInfo, unit);  // Scripts multi-línea
} else if (unit.Command.Instant) {
    return runInstantCommand(startInfo, unit);        // Comandos rápidos
} else {
    return runNormalCommand(startInfo, unit);         // Streaming en tiempo real
}
```

**Características:**
- **Timeout robusto** con terminación forzada de procesos colgados
- **Captura completa** de stdout y stderr
- **Working directory** configurable por comando
- **Script injection** para aplicaciones interactivas

### **3. SFTPRunner - Transferidor Seguro**

```csharp
// Upload/Download con manejo robusto de errores
client.HostKeyReceived += delegate { e.CanTrust = true; }; // Bypass SSL automático
foreach (var f in fsUploader) {
    using (var s = File.OpenRead(f.Input)) {
        client.UploadFile(s, f.Output);
        if (f.ReturnOutput) _output.Add(f.Output); // Path remoto
    }
}
```

**Funciones:**
- **Bypass SSL automático** para certificados self-signed
- **Transferencias múltiples** con conteo de éxitos vs fallos
- **Puerto configurable** (default 22)
- **Logging detallado** de cada transferencia individual

### **4. ZipRunner - Compactador Inteligente**

```csharp
// Compresión con wildcards y directorios
if (Directory.Exists(fStream.Input) && fStream.WildcardExp != null) {
    string[] wfiles = Directory.GetFiles(fStream.Input, fStream.WildcardExp);
    foreach (string wfile in wfiles) {
        zip.CreateEntryFromFile(wfile, Path.GetFileName(wfile), CompressionLevel.Optimal);
    }
}
```

**Características:**
- **Wildcards** para múltiples archivos con patrones (*.csv, *.txt)
- **Compresión óptima** automática
- **Sobrescritura** de archivos existentes
- **Descompresión** con overwrite para actualizaciones

### **5. PipelineCallRunner - Recursivo Asíncrono**

```csharp
// Ejecuta otro pipeline de forma asíncrona
public async Task<bool> CallPipeline(PipelineUnit unit) {
    GQLCallPipeline call = new GQLCallPipeline();
    var response = await HasuraClient.graphQLClient.SendMutationAsync<InsertMerlinAgentPipelineJobQueueResponse>(call.callPipeline(unit.CallPipeline));
    
    return response.Data.insertMerlinAgentPipelineJobQueue.AffectedRows > 0;
}
```

**Permite:**
- **Reutilización** de pipelines complejos
- **Workflows condicionales** basados en resultados
- **Procesamiento paralelo** de datos independientes
- **Modularidad** y composición de procesos

---

## 🔄 Flujo de Datos y Orquestación

### **Construcción de Cadenas de Dependencia**

```csharp
// Algoritmo recursivo para construir árbol jerárquico
public static List<PipelineUnitChain> DefinePipelineUnitsChain(List<PipelineUnit> units) {
    return new Orchestator().getChildren(null, rawUnits);
}
```

**Proceso:**
1. **Identificar raíces**: Units con `PipelineUnitId == null`
2. **Construir recursivamente**: Para cada unit, encontrar sus hijos
3. **Crear cadenas**: Estructura jerárquica para ejecución ordenada

### **Flujo de Outputs Entre Unidades**

```
QueryRunner (extrae BD) → genera data.csv → _output: ["/temp/data.csv"]
    ↓ lastOutput
ZipRunner (comprime) → procesa data.csv → _output: ["/temp/archive.zip"]
    ↓ lastOutput  
SFTPUploader (envía) → sube archive.zip → _output: ["/remote/archive.zip"]
    ↓ lastOutput
CommandRunner (valida) → verifica upload → _output: ["Upload successful"]
```

### **Patrón de Reintentos Configurables**

```csharp
public RunnerOutput RunWithRetry(PipelineUnit unit, RunnerOutput _lastOutput, int tryCount = 0) {
    var runResult = Run(unit, _lastOutput);
    if (runResult.HasErrors) {
        if (tryCount + 1 <= unit.RetryCount) {
            Thread.Sleep(unit.RetryAfterMilliseconds);
            return RunWithRetry(unit, _lastOutput, tryCount: tryCount + 1);
        }
        // Falló después de todos los reintentos
        return null;
    }
    return runResult;
}
```

---

## 📊 Sistema de Actualizaciones Automáticas

### **Verificación y Descarga**

```csharp
// 1. Consultar Hasura por nuevas versiones
var merlinAgentUpdate = await hasura.GetMerlinAgentVersion();

// 2. Descargar con timeout configurable (60 min default)
await MerlinHttpHelper.DownloadFileAsync(updateUrl, localPath, timeOutMinutes: 60);

// 3. Aplicar actualización
MerlinUpdater updater = new MerlinUpdater(merlinAgentUpdate.AgentVersion);
bool successUpdate = await updater.PerformUpdate();

// 4. Auto-limpieza si está habilitada
if (successUpdate && merlinAgentUpdate.AutoCleanUpdate) {
    AutoClean autoClean = new AutoClean();
    autoClean.Clean();
}

// 5. Reportar resultado y reiniciar
await hasura.InformAgentUpdateResult(updateLog);
if (successUpdate) {
    Environment.Exit(1); // SIGTERM para restart por service manager
}
```

**Características:**
- **3 URLs de respaldo** para alta disponibilidad
- **Validación post-descarga** del archivo
- **Auto-limpieza** configurable de archivos temporales
- **Reinicio controlado** para aplicar updates sin intervención manual

---

## 🗄️ Integración con Hasura GraphQL

### **Operaciones de Escritura del Agente**
1. **AgentPassportPing**: Heartbeat con información del sistema
2. **SetRunningStateJob**: Marcar job como ejecutándose
3. **InformPipelineJobResults**: Enviar métricas de timing (PipelineJobLogV2)
4. **CollectMemoryLogs**: Enviar logs detallados (PipelineJobLogV2Body)
5. **CompletePipelineJob**: Marcar job como completado/fallido
6. **InformAgentUpdateResult**: Reportar resultado de actualización
7. **InsertPipelineJobQueue**: Crear nuevos jobs (CallPipeline runner)

### **Operaciones de Lectura del Agente**
1. **GetMerlinAgentVersion**: Consultar por actualizaciones disponibles
2. **GetMerlinAgentPipelineJob**: Obtener próximo job a ejecutar

### **Sistema de Logging Dual**

#### **PipelineJobLogV2 - Métricas de Timing**
```csharp
pipelineJobLogs.Add(new PipelineJobLog() {
    PipelineUnitId = unit.Id,
    PipelineJobQueueId = jobId,
    LogOrder = this.logOrder,           // Orden de ejecución
    MilliSeconds = watch.ElapsedMilliseconds  // Tiempo de ejecución
});
```

#### **PipelineJobLogV2Body - Logs Detallados**
```json
{
  "pipeline_job_id": "uuid-job-id",
  "pipeline_unit_id": "uuid-unit-id", 
  "pipeline_unit_context_id": "query_id:123",
  "date": "2025-05-27T23:51:15.000+00:00",
  "level": "INFO",
  "message": "Ejecutando consulta SQL exitosamente.",
  "callsite": "QueryQueueRunner.Execute",
  "exception": null,
  "exception_message": null,
  "exception_stack_trace": null
}
```

---

## 🎯 Casos de Uso Empresariales

### **1. Pipeline de Extracción y Distribución**
```
QueryRunner (extrae ventas diarias) 
→ ZipRunner (comprime reportes)
→ SFTPUploader (envía a sucursales)
→ CommandRunner (genera notificación)
```

### **2. Pipeline de Procesamiento ETL**
```
SFTPDownloader (descarga archivos externos)
→ ZipRunner (descomprime datos)
→ CommandRunner (ejecuta transformación Python)
→ QueryRunner (inserta a data warehouse)
```

### **3. Pipeline de Consolidación Recursiva**
```
QueryRunner (consulta inicial)
→ PipelineCallRunner (llama procesamiento por región)
    ├── Pipeline Región Norte
    ├── Pipeline Región Sur  
    └── Pipeline Región Centro
→ QueryRunner (consolida resultados finales)
```

### **4. Pipeline de Backup y Mantenimiento**
```
QueryRunner (exporta backups)
→ ZipRunner (comprime con password)
→ SFTPUploader (envía a storage remoto)
→ CommandRunner (limpia archivos locales antiguos)
```

---

## 🚀 Características Arquitectónicas Clave

### **Escalabilidad Horizontal**
- **Agentes independientes** sin coordinación entre ellos
- **Hasura como coordinador** central escalable
- **Pipelines recursivos** para distribución de carga
- **Múltiples agentes** pueden procesar diferentes pipelines simultáneamente

### **Confiabilidad Empresarial**
- **Heartbeat continuo** para detección inmediata de fallos
- **Reintentos automáticos** configurables por operación
- **Cola de respaldo** para logs cuando hay problemas de conectividad
- **Timeouts granulares** por tipo de operación
- **Actualización automática** sin intervención manual

### **Observabilidad Completa**
- **Logging dual** para métricas y contenido detallado
- **Contexto enriquecido** con PipelineJobId, PipelineUnitId, ContextId
- **Dashboard en tiempo real** con WebSocket para updates instantáneos
- **Trazabilidad completa** del flujo de datos entre unidades

### **Flexibilidad de Configuración**
- **5 tipos de runners** para diferentes tipos de operaciones
- **Configuración granular** de reintentos, timeouts, y comportamiento de errores
- **Flujo de datos explícito** entre unidades con outputs tipados
- **Modos de despliegue** flexibles para diferentes entornos

### **Seguridad y Mantenibilidad**
- **Operaciones read-only** del dashboard para proteger datos críticos
- **Variables de entorno** para configuración sensible
- **Auto-limpieza** de archivos temporales
- **Actualizaciones centralizadas** desde Hasura
- **Bypass SSL** configurable para entornos corporativos

---

## 📈 Métricas de Performance

### **Optimizaciones Implementadas**
- **Logging asíncrono** con batches de 1000 logs
- **Polling eficiente** de jobs con intervalos optimizados  
- **Reutilización de conexiones** HTTP para downloads
- **Compresión óptima** automática para archivos
- **Memory buffering** para logs de alta frecuencia

### **Límites y Configuraciones**
- **Timeout de descarga**: 60 minutos (configurable)
- **Rotación de logs**: 5MB por archivo, 5 archivos históricos
- **Cola de respaldo**: Máximo 100 bloques de logs
- **Batch size**: 1000 logs por escritura asíncrona
- **Heartbeat**: Cada ~60 segundos por agente

---

## 🎯 Consideraciones de Arquitectura

### **Puntos Fuertes**
1. **Distribución real**: Agentes completamente autónomos
2. **Resilencia**: Sistema de respaldo y recuperación automática  
3. **Trazabilidad**: Logging completo con contexto estructurado
4. **Flexibilidad**: 5 tipos de runners + recursividad
5. **Mantenimiento**: Actualizaciones automáticas centralizadas

### **Puntos de Atención**
1. **Dependencia de Hasura**: Coordinador central crítico
2. **Complejidad**: Sistema con múltiples componentes interconectados
3. **Recursos**: 4 workers por agente requieren recursos adecuados
4. **Red**: Conectividad estable requerida para operación óptima

### **Escalabilidad Future-Proof**
- **Nuevos tipos de runners** fácilmente extensibles
- **Múltiples coordinadores** Hasura para redundancia geográfica
- **Sharding** de agentes por región o funcionalidad
- **Métricas avanzadas** para optimización de performance

---

Este sistema representa una arquitectura robusta y escalable para automatización empresarial, combinando la flexibilidad de agentes distribuidos con la potencia de un coordinador centralizado GraphQL, todo monitoreado a través de un dashboard en tiempo real con capacidades de diseño visual de pipelines.