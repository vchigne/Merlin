# Arquitectura del Agente Merlin

## Descripción General

El agente Merlin es un sistema distribuido que ejecuta pipelines de automatización complejos. Cada agente opera de forma autónoma, reportando su estado a Hasura y procesando jobs asignados a través de un sistema de colas.

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

## Consideraciones de Arquitectura

### **Escalabilidad**
- Cada agente opera de forma independiente
- No hay coordinación entre agentes
- Hasura actúa como coordinador central

### **Confiabilidad**
- Heartbeat continuo para detección de fallos
- Reintentos automáticos en operaciones críticas
- Logging completo para debugging

### **Mantenibilidad**
- Actualización automática sin intervención manual
- Logging estructurado con contexto
- Configuración centralizada en Hasura

Esta arquitectura permite que Merlin escale horizontalmente agregando más agentes y mantenga alta disponibilidad através de redundancia y recuperación automática.