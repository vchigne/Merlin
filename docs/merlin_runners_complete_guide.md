# Guía Completa del Sistema de Runners de Merlin

## 🎯 Resumen Ejecutivo

El sistema de runners de Merlin es el motor de ejecución que procesa las unidades de pipeline. Cada runner especializado maneja un tipo específico de operación, desde consultas de base de datos hasta transferencias de archivos y ejecución de comandos.

## 🏗️ Arquitectura Base

Todos los runners heredan de `BaseRunner` que proporciona:

```csharp
public abstract class BaseRunner {
    protected List<string> _output = new List<string>();
    public List<string> Output { get => _output; }
}
```

**Características comunes:**
- ✅ **Sistema de logging estructurado** con PipelineJobId y PipelineUnitId
- ✅ **Captura de outputs** para flujo entre unidades
- ✅ **Manejo robusto de errores** con reintentos configurables
- ✅ **Contextualización automática** para trazabilidad

---

## 🗄️ QueryQueueRunner - El Orquestador de Datos

### **Función Principal**
Ejecuta múltiples consultas SQL en orden secuencial con sistema de reintentos por query.

### **Características Clave**
```csharp
// Ejecución ordenada de consultas
var sortedQueries = queryQueue.Queries.OrderBy(q => q.Order);
foreach (var query in sortedQueries) {
    QueryExecutionResult result = _runQueryWithRetry(query: query, tryCount: 0);
    if (query.ReturnOutput && result.Output != null) {
        _output.AddRange(result.Output); // 👈 Acumula archivos CSV generados
    }
}
```

### **Capacidades**
- **🔄 Reintentos independientes** por cada query con `query.RetryCount` y `query.RetryAfterMilliseconds`
- **📊 Soporte dual** MSSQL Server y ODBC universal
- **📁 Generación de archivos** CSV/TXT con paths en el output
- **⚡ Orden de ejecución** configurable por `query.Order`
- **🎯 Logging contextual** con `PipelineUnitContextId: query_id:xxx`

### **Drivers Soportados**
1. **MSSQL** - SQL Server nativo con parser Microsoft
2. **ODBC** - Universal para cualquier BD con driver ODBC

### **Configuraciones Granulares**
- `PrintHeaders` - Incluir nombres de columnas
- `Separator` - Delimitador personalizable
- `Chunks` - Escritura por lotes para performance
- `TrimColumns` - Limpiar espacios en blanco
- `ForceDotDecimalSeparator` - Formato decimal estándar
- `DateFormat` - Formato personalizable de fechas
- `TargetEncoding` - Encoding del archivo de salida

---

## 💻 CommandRunner - El Motor de Ejecución

### **Función Principal**
Ejecuta comandos del sistema operativo, aplicaciones y scripts con control completo del proceso.

### **Modos de Ejecución**

#### **1. Comando Instantáneo**
```csharp
private bool runInstantCommand(ProcessStartInfo startInfo, PipelineUnit unit) {
    using Process proc = Process.Start(startInfo);
    WaitProcessToFinish(process: proc, unit: unit, timeOut: unit.TimeoutMilliseconds);
    
    using StreamReader reader = proc.StandardOutput;
    _output.AddRange(reader.ReadToEnd().Split(new char[] { '\r', }));
}
```
- ⚡ **Ejecución rápida** para comandos simples
- 📤 **Captura inmediata** de stdout completo

#### **2. Comando Normal con Streaming**
```csharp
proc.OutputDataReceived += new DataReceivedEventHandler((sender, e) => {
    if (!String.IsNullOrEmpty(e.Data)) {
        output.AppendLine($"[Command LOG] {e.Data}");
        _output.Add(e.Data);
    }
});
```
- 🔄 **Logging en tiempo real** de stdout y stderr
- 📊 **Captura asíncrona** para comandos de larga duración

#### **3. Script Raw Injection**
```csharp
using (var sw = proc.StandardInput) {
    foreach (string line in unit.Command.RawScript.Split("\n")) {
        if (line.Trim().Length > 0) {
            sw.WriteLine(line);
        }
    }
}
```
- 📝 **Scripts multi-línea** enviados vía stdin
- 🔧 **Interacción programática** con aplicaciones interactivas

### **Control de Procesos Robusto**
```csharp
private void forceClose(Process process) {
    // Intenta múltiples métodos de terminación:
    process.Kill(true);      // Kill con subprocesos
    process.Kill();          // Kill estándar  
    process.Close();         // Cierre limpio
    process.CloseMainWindow(); // Cierre por GUI
}
```

### **Configuraciones**
- `Target` - Ejecutable o comando
- `Args` - Argumentos de línea de comandos
- `WorkingDirectory` - Directorio de trabajo
- `TimeoutMilliseconds` - Timeout con terminación forzada
- `RawScript` - Script multi-línea para stdin
- `Instant` - Modo de ejecución instantáneo vs streaming

---

## 🔄 PipelineCallRunner - El Recursivo

### **Función Principal**
Permite que un pipeline invoque otro pipeline de forma asíncrona.

### **Implementación**
```csharp
public async Task<bool> CallPipeline(PipelineUnit unit) {
    GQLCallPipeline call = new GQLCallPipeline();
    var graphQLResponse = await HasuraClient.graphQLClient.SendMutationAsync<InsertMerlinAgentPipelineJobQueueResponse>(call.callPipeline(unit.CallPipeline));
    
    if (graphQLResponse.Data.insertMerlinAgentPipelineJobQueue.AffectedRows > 0) {
        _logger.Info("Pipeline enviado");
        return true;
    }
}
```

### **Características**
- 🔄 **Ejecución asíncrona** - No bloquea el pipeline padre
- 📨 **Inserción en cola** - Crea nuevo PipelineJobQueue
- 🎯 **CallPipeline ID** - Referencia al pipeline a ejecutar
- ⚡ **GraphQL nativo** - Comunicación directa con Hasura

### **Casos de Uso**
- **Pipeline de consolidación** que llama múltiples sub-pipelines
- **Workflows condicionales** basados en resultados
- **Procesamiento paralelo** de datos independientes

---

## 📁 SFTPRunner - El Transferidor

### **Función Principal**
Maneja transferencias seguras de archivos via SFTP con soporte para upload y download.

### **Upload de Archivos**
```csharp
public bool UploadFileStream() {
    using (var client = new SftpClient(sftpLink.Server, sftpLink.Port, sftpLink.User, sftpLink.Password)) {
        client.HostKeyReceived += delegate { e.CanTrust = true; }; // Bypass SSL automático
        
        foreach (var f in fsUploader) {
            using (var s = File.OpenRead(f.Input)) {
                client.UploadFile(s, f.Output);
                if (f.ReturnOutput) _output.Add(f.Output); // Path remoto en output
            }
        }
    }
}
```

### **Download de Archivos**
```csharp
public bool DownloadFileStream() {
    foreach (var f in fsDownloader) {
        using (Stream fileStream = File.OpenWrite(f.Output)) {
            client.DownloadFile(f.Input, fileStream);
        }
        if (f.ReturnOutput) _output.Add(f.Output); // Path local en output
    }
}
```

### **Características de Seguridad**
- 🔒 **Bypass SSL automático** para certificados self-signed
- 🔑 **Autenticación por usuario/password**
- 🌐 **Puerto configurable** (default 22)

### **Manejo de Errores Granular**
- 📊 **Conteo de éxitos** vs archivos fallidos
- ⚠️ **Logging detallado** de cada transferencia
- 🚨 **Falla total** si ningún archivo se transfiere
- ⚡ **Falla parcial** con warning si algunos archivos fallan

### **Configuraciones**
- `SFTPLink` - Configuración de conexión (server, port, user, password)
- `FileStreamSftpUploader[]` - Lista de archivos para upload
- `FileStreamSftpDownloader[]` - Lista de archivos para download
- `ReturnOutput` - Si agregar paths al output del runner

---

## 🗜️ ZipRunner - El Compactador

### **Función Principal**
Compresión y descompresión de archivos con soporte para wildcards y directorios.

### **Compresión con Wildcards**
```csharp
public bool Compress(string zipName, List<FileStreamZip> fileStreamZip) {
    using (ZipArchive zip = ZipFile.Open(zipName, ZipArchiveMode.Create)) {
        foreach (var fStream in fileStreamZip) {
            if (Directory.Exists(fStream.Input) && fStream.WildcardExp != null) {
                string[] wfiles = Directory.GetFiles(fStream.Input, fStream.WildcardExp);
                foreach (string wfile in wfiles) {
                    zip.CreateEntryFromFile(wfile, Path.GetFileName(wfile), CompressionLevel.Optimal);
                }
            }
            
            if (File.Exists(fStream.Input)) {
                zip.CreateEntryFromFile(fStream.Input, Path.GetFileName(fStream.Input), CompressionLevel.Optimal);
            }
        }
    }
    _output.Add(zipName); // 👈 Path del ZIP creado
}
```

### **Descompresión**
```csharp
public bool Decompress(List<FileStreamUnzip> fileStreamUnzip) {
    foreach (var fStream in fileStreamUnzip) {
        ZipFile.ExtractToDirectory(fStream.Input, fStream.Output, true); // true = overwrite
        if (fStream.ReturnOutput) {
            _output.Add(fStream.Output); // 👈 Directorio de extracción
        }
    }
}
```

### **Características**
- 🎯 **Wildcards** para comprimir múltiples archivos con patrón
- 🗂️ **Soporte de directorios** completos
- ♻️ **Sobrescritura automática** de ZIPs existentes
- ⚡ **Compresión óptima** automática
- 🔄 **Overwrite** en descompresión

### **Configuraciones**
- `FileStreamZip.Input` - Archivo o directorio a comprimir
- `FileStreamZip.WildcardExp` - Patrón para archivos múltiples (ej: "*.csv")
- `FileStreamUnzip.Input` - Archivo ZIP a descomprimir
- `FileStreamUnzip.Output` - Directorio destino para extracción

---

## 🔄 Flujos de Pipeline Reales

### **1. Pipeline de Extracción y Envío**
```
QueryQueueRunner (extrae BD) → genera CSVs → ZipRunner (comprime) → SFTPRunner (upload)
```

### **2. Pipeline de Descarga y Procesamiento**
```
SFTPRunner (download) → ZipRunner (descomprime) → CommandRunner (procesa) → QueryQueueRunner (inserta resultados)
```

### **3. Pipeline Recursivo de Consolidación**
```
QueryQueueRunner (consulta inicial) → CommandRunner (procesa) → PipelineCallRunner (llama sub-pipelines) → QueryQueueRunner (consolida)
```

### **4. Pipeline de Transformación de Datos**
```
QueryQueueRunner (extrae datos) → CommandRunner (ejecuta ETL) → ZipRunner (comprime logs) → SFTPRunner (backup)
```

---

## 📊 Sistema de Outputs y Flujo de Datos

### **Principio Fundamental**
Cada runner agrega a su `_output` los **paths de archivos** o **datos** que genera, permitiendo que el siguiente runner en la cadena los use como input.

### **Tipos de Output por Runner**
- **QueryQueueRunner**: Paths de archivos CSV/TXT generados
- **CommandRunner**: Logs de stdout/stderr línea por línea
- **SFTPRunner**: Paths remotos (upload) o locales (download)
- **ZipRunner**: Path del archivo ZIP creado o directorio extraído
- **PipelineCallRunner**: No genera output directo (es asíncrono)

### **Flujo de Contexto**
```csharp
// Logging contextual automático en todos los runners
_logger = MerlinLogger.NLogger.WithProperties(
    new[] {
        new KeyValuePair<string, object>("PipelineUnitId", unitId),
        new KeyValuePair<string, object>("PipelineJobId", jobId),
        new KeyValuePair<string, object>("PipelineUnitContextId", $"query_id:{query.Id}"), // Solo en QueryRunner
    }
);
```

---

## 🎯 Configuraciones Avanzadas

### **Timeouts y Reintentos**
- **QueryQueueRunner**: Reintentos por query individual con `RetryCount` y `RetryAfterMilliseconds`
- **CommandRunner**: Timeout global con terminación forzada de procesos
- **SFTPRunner**: Manejo de conexiones con auto-reconexión
- **ZipRunner**: Sin timeouts (operaciones de filesystem)

### **Logging Estratificado**
Todos los runners implementan logging con múltiples niveles:
- **Info**: Operaciones normales y progreso
- **Warn**: Archivos faltantes, fallos parciales
- **Error**: Errores recuperables con reintentos
- **Fatal**: Errores que detienen la ejecución del pipeline

### **Configuraciones de Performance**
- **QueryQueueRunner**: Chunking de datos para archivos grandes
- **CommandRunner**: Streaming asíncrono para comandos largos  
- **SFTPRunner**: Transferencias paralelas de múltiples archivos
- **ZipRunner**: Compresión óptima automática

---

## 🚀 Implicaciones para el Dashboard

Esta documentación completa nos permite implementar:

### **1. Visualización de Flujos**
- **Mapeo automático** de tipos de runner por pipeline unit
- **Predicción de outputs** basada en configuraciones
- **Visualización de dependencias** entre unidades

### **2. Monitoreo Inteligente**
- **Alertas específicas** por tipo de runner
- **Métricas de performance** diferenciadas
- **Troubleshooting dirigido** por contexto

### **3. Debugging Avanzado**
- **Logs contextuales** con PipelineUnitContextId
- **Trazabilidad de archivos** a través del flujo
- **Análisis de fallos** por tipo de operación

El sistema de runners de Merlin es extraordinariamente robusto y configurable, diseñado para manejar workflows empresariales complejos con alta confiabilidad y trazabilidad completa.