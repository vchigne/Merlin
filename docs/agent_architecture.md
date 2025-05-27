# Arquitectura del Agente Merlin

## Descripción General

El agente Merlin es un sistema distribuido que ejecuta pipelines de automatización complejos con **4 workers paralelos** especializados. Cada agente opera de forma autónoma, reportando su estado a Hasura y procesando jobs asignados a través de un sistema de colas robusto.

## 🏗️ Arquitectura Multi-Worker

### **Inicialización del Sistema**
```csharp
// 4 Workers ejecutándose simultáneamente
services.AddHostedService<Worker>();        // Worker principal - lógica de negocio
services.AddHostedService<PingWorker>();    // Sistema de heartbeat cada ~60s
services.AddHostedService<MemoryLogWorker>(); // Buffer de logs en memoria
services.AddHostedService<QueueWorker>();   // Procesador de pipeline jobs
```

### **1. Worker Principal**
- **Coordinación general** del agente
- **Verificación de actualizaciones** automáticas
- **Gestión del ciclo de vida** del sistema
- **Lógica de negocio** central

### **2. PingWorker - Sistema de Heartbeat**
- **Pings regulares** cada ~60 segundos a Hasura
- **Reporte de estado** (is_healthy = true/false)
- **Detección automática** de agentes offline
- **Actualización** de `last_ping_at` timestamp

### **3. MemoryLogWorker - Gestión de Logs**
- **Buffer en memoria** para logs de alta frecuencia
- **Flush periódico** a base de datos por lotes
- **Optimización** de escritura masiva
- **Prevención** de pérdida de logs durante ejecución

### **4. QueueWorker - Procesador de Jobs**
- **Polling continuo** de `PipelineJobQueue`
- **Ejecución** de pipeline units con runners
- **Invocación** de runners especializados
- **Actualización** de estados de jobs

## 🔧 Configuración y Despliegue

### **Variables de Entorno Críticas**
```bash
# Archivo: .env o merlin.env (obligatorio)
PASSPORT=uuid-del-agente-passport  # ID único del AgentPassport en Hasura
```

**⚠️ Crítico**: Sin la variable `PASSPORT`, el agente no puede iniciar.

### **Modos de Ejecución Flexibles**

#### **1. Modo Normal (Desarrollo/Debug)**
```bash
merlin-agent normal --contentRoot "C:\path\to\agent"
merlin-agent normal  # Usa directorio actual
```
- **Ejecución continua** con 4 workers activos
- **Logging visible** en consola
- **Ideal** para desarrollo y debugging
- **Compatible** con PM2 para gestión de procesos

#### **2. Modo One-Time (Task Scheduler)**
```bash
merlin-agent onetime --contentRoot "C:\path\to\agent"
```
- **Ejecución única** y salida controlada
- **Perfecto** para Windows Task Scheduler
- **Útil** para entornos con restricciones de servicios persistentes
- **Sin logging en consola**

#### **3. Modo Windows Service**
```bash
merlin-agent winservice --contentRoot "C:\path\to\agent"
```
- **Servicio de Windows** nativo
- **Configuración** con `sc.exe create "Merlin Agent"`
- **Auto-start** y recuperación automática
- **Logging** solo a archivos/Hasura

#### **4. Modo Linux Service (Futuro)**
```bash
merlin-agent linuxservice --contentRoot "/path/to/agent"
```
- **Systemd integration** (pendiente implementación)
- **Daemon mode** para distribuciones Linux

### **Sistema de Auto-Limpieza**
```csharp
AutoClean autoClean = new AutoClean();
autoClean.CleanLocalBackups();  // Ejecuta al iniciar cualquier modo
```

**Funciones de limpieza:**
- Eliminación de archivos temporales de ejecuciones anteriores
- Limpieza de logs antiguos
- Remoción de instaladores de updates usados

## Componentes Principales del Agente

### 1. MerlinAgent (Núcleo Principal)

```csharp
internal class MerlinAgent
{
    private int logOrder;
    private List<PipelineJobLog> pipelineJobLogs = new List<PipelineJobLog>();
    public static List<string> VERSION = new List<string>() { "4.2.a" };
}
```

**Responsabilidades:**
- Gestión del ciclo de vida del agente
- Procesamiento de pipeline jobs
- Sistema de actualizaciones automáticas
- Comunicación con Hasura (heartbeat)

### 2. Orchestrator (Motor de Dependencias)

```csharp
public class PipelineUnitChain
{
    public PipelineUnit Unit { set; get; }
    public List<PipelineUnitChain> Children { set; get; }
}
```

**Responsabilidades:**
- Construcción de cadenas de dependencia
- Resolución de orden de ejecución
- Gestión de relaciones parent-child entre unidades

## Ciclo de Vida del Agente

### 1. **Inicialización**
```csharp
public MerlinAgent() {
    this.pipelineJobLogs = new List<PipelineJobLog>();
    this.logOrder = 0;
}
```

### 2. **Verificación de Actualizaciones**
```csharp
public async Task CheckUpdates() {
    // 1. Consultar Hasura por nuevas versiones
    var merlinAgentUpdate = await hasura.GetMerlinAgentVersion();
    
    // 2. Descargar y aplicar actualización si está disponible
    if (merlinAgentUpdate != null && isOk) {
        MerlinUpdater updater = new MerlinUpdater(merlinAgentUpdate.AgentVersion);
        bool successUpdate = await updater.PerformUpdate();
        
        // 3. Auto-limpieza si está habilitada
        if (successUpdate && merlinAgentUpdate.AutoCleanUpdate) {
            AutoClean autoClean = new AutoClean();
            autoClean.Clean();
        }
        
        // 4. Reportar resultado a Hasura
        await hasura.InformAgentUpdateResult(updateLog);
        
        // 5. Reiniciar agente si actualización exitosa
        if (successUpdate) {
            Environment.Exit(1); // SIGTERM para reinicio por service manager
        }
    }
}
```

### 3. **Sistema de Heartbeat**
```csharp
public async Task Ping() {
    HasuraClient hasura = new HasuraClient(Config.PASSPORT);
    await hasura.AgentPassportPing();
}
```

**Información enviada en cada ping:**
- Timestamp actual
- Información del sistema operativo
- Versión del agente
- Directorio de trabajo
- IPs del sistema

### 4. **Procesamiento de Pipeline Jobs**
```csharp
public async Task ProcessPipelineJob() {
    // 1. Obtener job de la cola
    MerlinAgentPipelineJobQueue job = await hasura.GetMerlinAgentPipelineJob();
    
    if (job != null) {
        // 2. Marcar job como ejecutándose
        await hasura.SetRunningStateJob(job.Id);
        
        // 3. Habilitar logging en memoria
        MerlinLogger.setMemoryRule(memoryRuleEnabled: true, clearMemoryLogBeforeEnable: true);
        
        // 4. Construir cadena de ejecución
        var pipelineUnitsChain = Orchestator.DefinePipelineUnitsChain(job.Pipeline.PipelineUnits);
        
        // 5. Ejecutar cada cadena
        foreach (var chain in pipelineUnitsChain) {
            executeChain(chain: chain, jobId: job.Id);
        }
        
        // 6. Enviar logs y completar job
        await hasura.InformPipelineJobResults(pipelineJobLogs);
        await hasura.CompletePipelineJob(job.Id);
        await MemoryLogQueue.SendLogs();
        
        // 7. Deshabilitar logging en memoria
        MerlinLogger.setMemoryRule(memoryRuleEnabled: false, clearMemoryLogBeforeEnable: true);
    }
}
```

## Sistema de Orchestración

### Construcción de Cadenas de Dependencia

```csharp
public static List<PipelineUnitChain> DefinePipelineUnitsChain(List<PipelineUnit> units)
{
    // Algoritmo recursivo para construir árbol de dependencias
    return new Orchestator().getChildren(null, rawUnits);
}
```

**Proceso:**
1. **Identificar raíces**: Units con `PipelineUnitId == null`
2. **Construir recursivamente**: Para cada unit, encontrar sus hijos
3. **Crear cadenas**: Estructura jerárquica para ejecución ordenada

### Patrón de Ejecución

```
Pipeline Job
├── Unit A (root)
│   ├── Unit B (child of A)
│   │   └── Unit D (child of B)
│   └── Unit C (child of A)
└── Unit E (root)
    └── Unit F (child of E)
```

**Orden de ejecución:**
1. Unit A → Unit B → Unit D
2. Unit A → Unit C  
3. Unit E → Unit F

### Ejecución de Unidades Individuales

```csharp
private void executeChain(PipelineUnitChain chain, string jobId, RunnerOutput lastOutput = null) {
    this.logOrder++;
    var unit = chain.Unit;
    
    // 1. Configurar logging con contexto
    var _logger = MerlinLogger.NLogger.WithProperties(
        new[] {
            new KeyValuePair<string, object>("PipelineUnitId", unit.Id),
            new KeyValuePair<string, object>("PipelineJobId", jobId)
        }
    );
    
    // 2. Ejecutar unidad con reintentos
    Runner runner = new Runner(jobId: jobId);
    var watch = Stopwatch.StartNew();
    
    RunnerOutput output = runner.RunWithRetry(
        unit: unit,
        _lastOutput: lastOutput,
        tryCount: 0
    );
    
    watch.Stop();
    
    // 3. Registrar métricas de timing
    pipelineJobLogs.Add(new PipelineJobLog()
    {
        PipelineUnitId = unit.Id,
        PipelineJobQueueId = jobId,
        LogOrder = this.logOrder,
        MilliSeconds = Convert.ToInt32(watch.ElapsedMilliseconds)
    });
    
    // 4. Ejecutar unidades hijas recursivamente
    foreach (var nChain in chain.Children) {
        executeChain(chain: nChain, jobId: jobId, lastOutput: output);
    }
}
```

## Características Clave del Agente

### **Gestión de Errores Robusta**
- **Reintentos**: Configurables por unidad (`RetryCount`, `RetryAfterMilliseconds`)
- **Timeouts**: Con opción de abortar pipeline (`AbortOnTimeout`)
- **Continue-on-error**: Para unidades no críticas (`ContinueOnError`)
- **Abort-on-error**: Para pipelines críticos (`AbortOnError`)

### **Logging Dual**
- **Métricas de timing**: `PipelineJobLogV2` con milisegundos y orden
- **Logs detallados**: `PipelineJobLogV2Body` con mensajes y excepciones
- **Contexto enriquecido**: Logger con PipelineJobId y PipelineUnitId

### **Actualización Automática**
- **Verificación de versiones**: Consulta Hasura por updates
- **Descarga con redundancia**: 3 URLs de respaldo
- **Auto-limpieza**: Eliminación de archivos temporales
- **Reinicio controlado**: SIGTERM para restart por service manager

### **Modo de Operación**
- **Servicio continuo**: Bucle infinito procesando jobs
- **Ejecución única**: `Config.RUN_ONE_TIME` para testing
- **Gestión de memoria**: Logging en memoria durante ejecución

## Integración con Hasura

### **Operaciones de Escritura del Agente**
1. **AgentPassportPing**: Heartbeat con información del sistema
2. **SetRunningStateJob**: Marcar job como ejecutándose
3. **InformPipelineJobResults**: Enviar métricas de timing
4. **CompletePipelineJob**: Marcar job como completado
5. **InformAgentUpdateResult**: Reportar resultado de actualización

### **Operaciones de Lectura del Agente**
1. **GetMerlinAgentVersion**: Consultar por actualizaciones
2. **GetMerlinAgentPipelineJob**: Obtener próximo job a ejecutar

## Sistema de Ejecución de Unidades (Runner)

### **Tipos de Unidades Soportadas**

```csharp
public enum RunnerType {
    Command,         // Ejecuta comandos shell/batch
    QueryQueue,      // Ejecuta consultas SQL  
    SFTPDownloader,  // Descarga archivos desde SFTP
    SFTPUploader,    // Sube archivos a SFTP
    Unzip,           // Descomprime archivos
    Zip,             // Comprime archivos
    CallPipeline     // Llama a otro pipeline (recursivo)
}
```

### **Sistema de Reintentos**

```csharp
public RunnerOutput RunWithRetry(PipelineUnit unit, RunnerOutput _lastOutput = null, int tryCount = 0) {
    var runResult = Run(unit, _lastOutput);
    if (runResult.HasErrors) {
        if (tryCount + 1 <= unit.RetryCount) {
            // Esperar antes del reintento
            System.Threading.Thread.Sleep(unit.RetryAfterMilliseconds);
            return RunWithRetry(unit, _lastOutput: _lastOutput, tryCount: tryCount + 1);
        }
        // Falló después de todos los reintentos
        return null;
    }
    return runResult;
}
```

**Configuración por unidad:**
- `RetryCount`: Número máximo de reintentos
- `RetryAfterMilliseconds`: Tiempo de espera entre reintentos
- `TimeoutMilliseconds`: Timeout para la operación
- `ContinueOnError`: Si continúa aunque falle
- `AbortOnTimeout`: Si aborta el pipeline por timeout

### **Flujo de Datos Entre Unidades**

#### **RunnerOutput Structure**
```csharp
public class RunnerOutput {
    public RunnerType RunnerType { get; set; }
    public List<string> FromOutput { get; set; }           // Archivos/paths generados
    public List<string> FromAditionalOutput { get; set; }  // Output adicional
    public bool HasErrors { get; set; }                    // Estado de error
}
```

#### **Cadenas de Procesamiento de Archivos**
```
Command (genera archivo) → SFTP Uploader → SFTP Downloader → Unzip
    ↓ FromOutput              ↓ _lastOutput    ↓ FromOutput     ↓ _lastOutput
["/temp/data.csv"]        Input: data.csv   ["/remote/proc.zip"] Input: proc.zip
```

#### **Ejemplo: SFTP Uploader usando output anterior**
```csharp
private RunnerOutput RunSFTPUploader(PipelineUnit unit, RunnerOutput _lastOutput = null) {
    List<FileStreamSftpUploader> uploadList = new List<FileStreamSftpUploader>();

    // Usar archivo generado por unidad anterior
    if (_lastOutput != null && _lastOutput.FromOutput.Count > 0) {
        uploadList.Add(new FileStreamSftpUploader() {
            Input = _lastOutput.FromOutput[0],  // 👈 Archivo de unidad anterior
            Output = unit.SFTPUploader.Output,
            ReturnOutput = unit.SFTPUploader.ReturnOutput
        });
    }
    
    // Agregar archivos adicionales configurados
    uploadList.AddRange(unit.SFTPUploader.FileStreamSftpUploaders);
    
    SFTPRunner sftpRunner = new SFTPRunner(...);
    bool hasErrors = !sftpRunner.UploadFileStream();
    
    return new RunnerOutput() {
        RunnerType = RunnerType.SFTPUploader,
        FromOutput = sftpRunner.Output,
        HasErrors = hasErrors
    };
}
```

### **Detección de Tipo de Unidad**

El Runner determina automáticamente qué ejecutar basado en qué campo **no es null**:

```csharp
public RunnerOutput Run(PipelineUnit unit, RunnerOutput _lastOutput = null) {
    if (unit.Command != null)
        return RunCommand(unit: unit);
    else if (unit.QueryQueue != null)
        return RunQueryQueue(unit: unit);
    else if (unit.SFTPDownloader != null)
        return RunSFTPDownloader(unit: unit, _lastOutput: _lastOutput);
    else if (unit.SFTPUploader != null)
        return RunSFTPUploader(unit: unit, _lastOutput: _lastOutput);
    else if (unit.Unzip != null)
        return RunUnzip(unit: unit, _lastOutput: _lastOutput);
    else if (unit.Zip != null)
        return RunZip(unit: unit, _lastOutput: _lastOutput);
    else if (unit.CallPipeline != null)
        return RunCallPipeline(unit: unit);
}
```

### **Casos de Uso por Tipo de Runner**

#### **1. Command Runner**
- Ejecuta comandos del sistema operativo
- Puede generar archivos como output
- Útil para procesamiento de datos, conversiones, validaciones

```csharp
// Ejemplo: Convertir CSV a Excel
if (unit.Command.ReturnOutput && unit.Command.ReturnOutputType == "PATHS") {
    // Solo incluye archivos que realmente existen
    for (int i = 0; i < commandRunner.Output.Count; i++) {
        if (File.Exists(commandRunner.Output[i])) {
            commandOutput.Add(commandRunner.Output[i]);
        }
    }
}
```

#### **2. QueryQueue Runner**
- Ejecuta consultas SQL
- Retorna resultados como datos estructurados
- Útil para extracciones de base de datos

#### **3. SFTP Runners**
- **Downloader**: Descarga archivos desde servidor remoto
- **Uploader**: Sube archivos a servidor remoto
- Ambos pueden usar archivos de unidades anteriores

#### **4. Zip Runners**
- **Zip**: Comprime múltiples archivos
- **Unzip**: Descomprime archivos
- Útiles para empaquetado y distribución

#### **5. CallPipeline Runner**
- Ejecuta otro pipeline completo
- Permite reutilización y modularidad
- Soporta timeouts configurables

```csharp
private RunnerOutput RunCallPipeline (PipelineUnit unit) {
    PipelineCallRunner pipelineCallRunner = new PipelineCallRunner(jobId: _jobId, unitId: unit.Id);
    
    var unitWaiter = pipelineCallRunner.CallPipeline(unit);
    unitWaiter.Wait(unit.TimeoutMilliseconds);  // 👈 Timeout configurable
    bool hasErrors = !unitWaiter.Result;
    
    return new RunnerOutput() {
        RunnerType = RunnerType.CallPipeline,
        HasErrors = hasErrors
    };
}
```

## Consideraciones de Arquitectura

### **Escalabilidad**
- Cada agente opera de forma independiente
- No hay coordinación entre agentes
- Hasura actúa como coordinador central
- Pipelines pueden llamar otros pipelines recursivamente

### **Confiabilidad**
- Heartbeat continuo para detección de fallos
- Reintentos automáticos en operaciones críticas
- Logging completo para debugging
- Timeouts configurables por unidad
- Manejo de errores granular (continue-on-error, abort-on-error)

### **Mantenibilidad**
- Actualización automática sin intervención manual
- Logging estructurado con contexto
- Configuración centralizada en Hasura
- Flujo de datos explícito entre unidades
- Detección automática de tipos de unidades

### **Flexibilidad**
- 7 tipos diferentes de runners
- Cadenas de procesamiento complejas
- Reutilización de pipelines vía CallPipeline
- Configuración granular de reintentos y timeouts

Esta arquitectura permite que Merlin escale horizontalmente agregando más agentes y mantenga alta disponibilidad através de redundancia y recuperación automática, mientras ejecuta flujos de trabajo complejos con múltiples tipos de operaciones.