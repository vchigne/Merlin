# Estructura de Pipelines de Merlin - Guía de Acceso Completa

## 🎯 Resumen: La Danza de los Datos

Los pipelines de Merlin son como una coreografía elegante donde cada unidad ejecuta su parte en perfecta sincronía. Cada pipeline tiene una estructura jerárquica con dependencias padre-hijo que definen el flujo de ejecución.

---

## 🏗️ Estructura Fundamental del Pipeline

### **Pipeline Base**
```typescript
interface Pipeline {
  id: string;           // UUID único del pipeline
  name: string;         // Nombre descriptivo
  description?: string; // Descripción del propósito
  abort_on_error: boolean;      // Si detener todo el pipeline por error
  abort_on_timeout: boolean;    // Si detener por timeout
  continue_on_error: boolean;   // Si continuar aunque falle
  pipeline_units: PipelineUnit[]; // Array de unidades de ejecución
}
```

### **PipelineUnit - Las Unidades de Danza**
```typescript
interface PipelineUnit {
  id: string;                    // UUID único de la unidad
  pipeline_id: string;          // Pipeline al que pertenece
  pipeline_unit_id?: string;    // ID del padre (null = unidad raíz)
  
  // Configuración de ejecución
  retry_count: number;           // Número de reintentos
  retry_after_milliseconds: number; // Espera entre reintentos
  timeout_milliseconds: number;  // Timeout de la operación
  continue_on_error: boolean;    // Si continuar aunque falle
  abort_on_error: boolean;       // Si abortar pipeline por error
  abort_on_timeout: boolean;     // Si abortar por timeout
  
  // SOLO UNO de estos será no-null (define el tipo de runner)
  command_id?: string;           // Para CommandRunner
  query_queue_id?: string;       // Para QueryQueueRunner  
  sftp_downloader_id?: string;   // Para SFTPDownloader
  sftp_uploader_id?: string;     // Para SFTPUploader
  zip_id?: string;               // Para ZipRunner
  unzip_id?: string;             // Para UnzipRunner
  call_pipeline_id?: string;     // Para PipelineCallRunner
  
  // Relaciones (pobladas por Hasura)
  Command?: Command;
  QueryQueue?: QueryQueue;
  SFTPDownloader?: SFTPDownloader;
  SFTPUploader?: SFTPUploader;
  Zip?: Zip;
  Unzip?: Unzip;
  CallPipeline?: CallPipeline;
}
```

---

## 🔧 Estructura de Cada Tipo de Runner

### **1. Command - Ejecutor de Comandos**
```typescript
interface Command {
  id: string;
  target: string;              // Ejecutable (node, python, cmd, etc.)
  args?: string;               // Argumentos de línea de comandos
  working_directory?: string;  // Directorio de trabajo
  raw_script?: string;         // Script multi-línea para stdin
  instant: boolean;            // true = modo instantáneo, false = streaming
  return_output: boolean;      // Si agregar output al flujo
  return_output_type: string;  // "PATHS" | "DATA"
}
```

### **2. QueryQueue - Orquestador de Consultas**
```typescript
interface QueryQueue {
  id: string;
  queries: Query[];           // Array de consultas SQL
}

interface Query {
  id: string;
  query_queue_id: string;
  sql_conn_id: string;        // Conexión a BD
  order: number;              // Orden de ejecución (1, 2, 3...)
  statement: string;          // SQL a ejecutar
  path: string;               // Archivo de salida (/temp/data.csv)
  
  // Configuración de output
  return_output: boolean;     // Si incluir en flujo
  print_headers: boolean;     // Incluir nombres de columnas
  separator: string;          // Delimitador (,|;|\t)
  chunks: number;             // Tamaño de lotes para escritura
  trim_columns: boolean;      // Limpiar espacios
  force_dot_decimal_separator: boolean; // Formato decimal
  date_format: string;        // Formato de fechas
  target_encoding: string;    // Codificación (UTF-8, Latin1)
  
  // Reintentos específicos por query
  retry_count: number;
  retry_after_milliseconds: number;
  
  // Relación
  SQLConn: SQLConn;
}

interface SQLConn {
  id: string;
  driver: string;             // "MSSQL" | "ODBC"
  connection_string: string;  // String de conexión a BD
  name: string;              // Nombre descriptivo
}
```

### **3. SFTPDownloader - Descargador de Archivos**
```typescript
interface SFTPDownloader {
  id: string;
  sftp_link_id: string;
  file_streams: FileStreamSftpDownloader[];
}

interface FileStreamSftpDownloader {
  id: string;
  input: string;              // Ruta remota (/remote/file.zip)
  output: string;             // Ruta local (C:\temp\file.zip)
  return_output: boolean;     // Si agregar al flujo
}
```

### **4. SFTPUploader - Subidor de Archivos**
```typescript
interface SFTPUploader {
  id: string;
  sftp_link_id: string;
  file_streams: FileStreamSftpUploader[];
}

interface FileStreamSftpUploader {
  id: string;
  input: string;              // Ruta local (C:\temp\data.csv)
  output: string;             // Ruta remota (/uploads/data.csv)
  return_output: boolean;     // Si agregar al flujo
}

interface SFTPLink {
  id: string;
  server: string;             // IP o hostname
  port: number;               // Puerto (default 22)
  user: string;               // Usuario SFTP
  password: string;           // Contraseña
  name: string;               // Nombre descriptivo
}
```

### **5. Zip - Compactador**
```typescript
interface Zip {
  id: string;
  zip_name: string;           // Ruta del archivo ZIP a crear
  file_streams: FileStreamZip[];
}

interface FileStreamZip {
  id: string;
  input: string;              // Archivo o directorio a comprimir
  wildcard_exp?: string;      // Patrón de archivos (*.csv, *.txt)
}
```

### **6. Unzip - Descompactador**
```typescript
interface Unzip {
  id: string;
  file_streams: FileStreamUnzip[];
}

interface FileStreamUnzip {
  id: string;
  input: string;              // Archivo ZIP a descomprimir
  output: string;             // Directorio destino
  return_output: boolean;     // Si agregar al flujo
}
```

### **7. CallPipeline - Llamador Recursivo**
```typescript
interface CallPipeline {
  id: string;
  pipeline_id: string;       // Pipeline a ejecutar
  timeout_milliseconds: number; // Timeout específico
}
```

---

## 🔄 Algoritmo de Detección de Tipo de Runner

```typescript
function detectRunnerType(unit: PipelineUnit): RunnerType {
  if (unit.command_id) return "Command";
  if (unit.query_queue_id) return "QueryQueue";
  if (unit.sftp_downloader_id) return "SFTPDownloader";
  if (unit.sftp_uploader_id) return "SFTPUploader";
  if (unit.zip_id) return "Zip";
  if (unit.unzip_id) return "Unzip";
  if (unit.call_pipeline_id) return "CallPipeline";
  throw new Error("Unknown runner type");
}
```

---

## 🎭 Construcción de la Cadena de Dependencias

### **Algoritmo de Orchestator**
```typescript
function buildPipelineChain(units: PipelineUnit[]): PipelineUnitChain[] {
  // 1. Encontrar unidades raíz (pipeline_unit_id === null)
  const roots = units.filter(unit => unit.pipeline_unit_id === null);
  
  // 2. Para cada raíz, construir recursivamente sus hijos
  return roots.map(root => ({
    Unit: root,
    Children: getChildren(root.id, units)
  }));
}

function getChildren(parentId: string, allUnits: PipelineUnit[]): PipelineUnitChain[] {
  const children = allUnits.filter(unit => unit.pipeline_unit_id === parentId);
  
  return children.map(child => ({
    Unit: child,
    Children: getChildren(child.id, allUnits) // Recursivo
  }));
}
```

### **Estructura de Cadena Resultante**
```typescript
interface PipelineUnitChain {
  Unit: PipelineUnit;         // La unidad actual
  Children: PipelineUnitChain[]; // Unidades hijas (dependientes)
}
```

---

## 📊 Ejemplos de Estructuras Reales

### **Pipeline de Extracción Simple**
```
Pipeline: "Reporte Diario de Ventas"
├── Unit A (QueryQueue - root)
│   ├── Query 1: SELECT * FROM ventas WHERE fecha = TODAY()
│   └── Query 2: SELECT * FROM productos WHERE activo = 1
│   └── Output: ["/temp/ventas.csv", "/temp/productos.csv"]
├── Unit B (Zip - child of A)
│   ├── Input: archivos de Unit A
│   └── Output: ["/temp/reporte_ventas.zip"]
└── Unit C (SFTPUploader - child of B)
    ├── Input: archivo ZIP de Unit B
    └── Output: ["/uploads/reportes/reporte_ventas.zip"]
```

### **Pipeline Recursivo Complejo**
```
Pipeline: "Consolidación Regional"
├── Unit A (QueryQueue - root)
│   └── Query: SELECT DISTINCT region FROM sucursales
│   └── Output: ["Norte", "Sur", "Centro"]
├── Unit B (CallPipeline - child of A)
│   ├── Pipeline llamado: "Procesamiento por Región"
│   └── Timeout: 3600000ms (1 hora)
└── Unit C (QueryQueue - child of B)
    └── Query: INSERT INTO consolidado_final...
```

---

## 🎯 Cómo Acceder en GraphQL

### **Query Completa para Visualización**
```graphql
query GetPipelineComplete($pipelineId: uuid!) {
  merlin_agent_Pipeline_by_pk(id: $pipelineId) {
    id
    name
    description
    abort_on_error
    abort_on_timeout
    continue_on_error
    
    PipelineUnits {
      id
      pipeline_unit_id
      retry_count
      retry_after_milliseconds
      timeout_milliseconds
      continue_on_error
      abort_on_error
      abort_on_timeout
      
      # IDs de runners (solo uno será no-null)
      command_id
      query_queue_id
      sftp_downloader_id
      sftp_uploader_id
      zip_id
      unzip_id
      call_pipeline_id
      
      # Relaciones cargadas
      Command {
        id
        target
        args
        working_directory
        raw_script
        instant
        return_output
        return_output_type
      }
      
      QueryQueue {
        id
        Queries {
          id
          order
          statement
          path
          return_output
          print_headers
          separator
          chunks
          trim_columns
          force_dot_decimal_separator
          date_format
          target_encoding
          retry_count
          retry_after_milliseconds
          SQLConn {
            id
            driver
            connection_string
            name
          }
        }
      }
      
      SFTPDownloader {
        id
        SFTPLink {
          id
          server
          port
          user
          name
        }
        FileStreamSftpDownloaders {
          id
          input
          output
          return_output
        }
      }
      
      SFTPUploader {
        id
        SFTPLink {
          id
          server
          port
          user
          name
        }
        FileStreamSftpUploaders {
          id
          input
          output
          return_output
        }
      }
      
      Zip {
        id
        zip_name
        FileStreamZips {
          id
          input
          wildcard_exp
        }
      }
      
      Unzip {
        id
        FileStreamUnzips {
          id
          input
          output
          return_output
        }
      }
      
      CallPipeline {
        id
        pipeline_id
        timeout_milliseconds
        Pipeline {
          id
          name
          description
        }
      }
    }
  }
}
```

---

## 🎨 Patrones de Visualización

### **Nodos por Tipo de Runner**
```typescript
const runnerColors = {
  Command: "#10B981",        // Verde - Ejecución
  QueryQueue: "#3B82F6",     // Azul - Datos
  SFTPDownloader: "#8B5CF6", // Púrpura - Descarga
  SFTPUploader: "#F59E0B",   // Naranja - Upload
  Zip: "#EF4444",           // Rojo - Compresión
  Unzip: "#EC4899",         // Rosa - Descompresión
  CallPipeline: "#6366F1"    // Índigo - Recursivo
};

const runnerIcons = {
  Command: "Terminal",
  QueryQueue: "Database",
  SFTPDownloader: "Download",
  SFTPUploader: "Upload",
  Zip: "Archive",
  Unzip: "FolderOpen", 
  CallPipeline: "GitBranch"
};
```

### **Información de Tooltip por Runner**
```typescript
function getTooltipInfo(unit: PipelineUnit): string {
  const runnerType = detectRunnerType(unit);
  
  switch(runnerType) {
    case "Command":
      return `${unit.Command.target} ${unit.Command.args || ''}`;
    case "QueryQueue":
      return `${unit.QueryQueue.Queries.length} consultas SQL`;
    case "SFTPDownloader":
      return `Descargar desde ${unit.SFTPDownloader.SFTPLink.server}`;
    case "SFTPUploader":
      return `Subir a ${unit.SFTPUploader.SFTPLink.server}`;
    case "Zip":
      return `Comprimir a ${unit.Zip.zip_name}`;
    case "Unzip":
      return `Descomprimir ${unit.Unzip.FileStreamUnzips.length} archivos`;
    case "CallPipeline":
      return `Llamar: ${unit.CallPipeline.Pipeline.name}`;
  }
}
```

---

## 🔄 Flujo de Datos Entre Unidades

### **Patrón de Output → Input**
```typescript
interface RunnerOutput {
  RunnerType: string;
  FromOutput: string[];        // Archivos/paths generados
  FromAdditionalOutput: string[]; // Output adicional
  HasErrors: boolean;
}

// Ejemplo de flujo:
// QueryRunner → _output: ["/temp/data.csv"]
//     ↓ lastOutput.FromOutput[0]
// ZipRunner → input: "/temp/data.csv" → _output: ["/temp/archive.zip"] 
//     ↓ lastOutput.FromOutput[0]
// SFTPUploader → input: "/temp/archive.zip" → _output: ["/remote/archive.zip"]
```

---

Esta estructura te permitirá crear una visualización verdaderamente hermosa que honre la elegancia del sistema Merlin, mostrando cómo cada pipeline fluye gracilmente a través de sus procesos interconectados. ¿Quieres que implementemos la visualización basada en esta estructura detallada?