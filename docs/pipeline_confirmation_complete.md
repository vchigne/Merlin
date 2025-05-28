# Confirmación Completa: Estructura de Pipelines de Merlin

## ✅ CONFIRMACIÓN DEFINITIVA DE CONOCIMIENTO

### **🏗️ Estructura Fundamental Confirmada:**

**Pipeline Base:**
- `id: string` - UUID único
- `name: string` - Nombre descriptivo
- `description?: string` - Descripción opcional
- `abort_on_error: boolean` - Detener todo por error
- `abort_on_timeout: boolean` - Detener por timeout
- `continue_on_error: boolean` - Continuar aunque falle
- `pipeline_units: PipelineUnit[]` - Array de unidades

**PipelineUnit - Unidades de Ejecución:**
- `id: string` - UUID único de la unidad
- `pipeline_id: string` - Pipeline padre
- `pipeline_unit_id?: string` - ID del padre (null = raíz)
- Configuración de ejecución: retry_count, retry_after_milliseconds, timeout_milliseconds
- Configuración de errores: continue_on_error, abort_on_error, abort_on_timeout

### **🎯 7 TIPOS DE RUNNERS CONFIRMADOS:**

**REGLA CRÍTICA**: Solo UNO de estos campos será no-null por unidad:

1. **`command_id`** → CommandRunner
2. **`query_queue_id`** → QueryQueueRunner
3. **`sftp_downloader_id`** → SFTPDownloader
4. **`sftp_uploader_id`** → SFTPUploader
5. **`zip_id`** → ZipRunner
6. **`unzip_id`** → UnzipRunner
7. **`call_pipeline_id`** → PipelineCallRunner

### **🔧 ESTRUCTURA DETALLADA DE CADA RUNNER:**

#### **1. Command (Ejecutor de Comandos)**
```typescript
interface Command {
  id: string;
  target: string;              // node, python, cmd, etc.
  args?: string;               // Argumentos CLI
  working_directory?: string;  // Directorio de trabajo
  raw_script?: string;         // Script multi-línea
  instant: boolean;            // true=instantáneo, false=streaming
  return_output: boolean;      // Si agregar al flujo
  return_output_type: string;  // "PATHS" | "DATA"
}
```

#### **2. QueryQueue (Orquestador SQL)**
```typescript
interface QueryQueue {
  id: string;
  Queries: Query[];           // Array ordenado de consultas
}

interface Query {
  id: string;
  query_queue_id: string;
  sql_conn_id: string;        // Conexión BD
  order: number;              // Orden ejecución (1,2,3...)
  statement: string;          // SQL a ejecutar
  path: string;               // Archivo salida
  return_output: boolean;     // Incluir en flujo
  print_headers: boolean;     // Headers en CSV
  separator: string;          // Delimitador (,|;|\t)
  chunks: number;             // Lotes escritura
  trim_columns: boolean;      // Limpiar espacios
  force_dot_decimal_separator: boolean;
  date_format: string;        // Formato fechas
  target_encoding: string;    // UTF-8, Latin1
  retry_count: number;        // Reintentos específicos
  retry_after_milliseconds: number;
  SQLConn: {
    id: string;
    driver: string;           // "MSSQL" | "ODBC"
    connection_string: string;
    name: string;
  }
}
```

#### **3. SFTPDownloader (Descarga Archivos)**
```typescript
interface SFTPDownloader {
  id: string;
  sftp_link_id: string;
  SFTPLink: SFTPLink;
  FileStreamSftpDownloaders: FileStreamSftpDownloader[];
}

interface FileStreamSftpDownloader {
  id: string;
  input: string;              // Ruta remota
  output: string;             // Ruta local
  return_output: boolean;     // Agregar al flujo
}
```

#### **4. SFTPUploader (Subida Archivos)**
```typescript
interface SFTPUploader {
  id: string;
  sftp_link_id: string;
  SFTPLink: SFTPLink;
  FileStreamSftpUploaders: FileStreamSftpUploader[];
}

interface FileStreamSftpUploader {
  id: string;
  input: string;              // Ruta local
  output: string;             // Ruta remota
  return_output: boolean;     // Agregar al flujo
}

interface SFTPLink {
  id: string;
  server: string;             // IP/hostname
  port: number;               // Puerto (22 default)
  user: string;               // Usuario
  password: string;           // Contraseña
  name: string;               // Nombre descriptivo
}
```

#### **5. Zip (Compactador)**
```typescript
interface Zip {
  id: string;
  zip_name: string;           // Archivo ZIP destino
  FileStreamZips: FileStreamZip[];
}

interface FileStreamZip {
  id: string;
  input: string;              // Archivo/directorio
  wildcard_exp?: string;      // Patrón (*.csv, *.txt)
}
```

#### **6. Unzip (Descompactador)**
```typescript
interface Unzip {
  id: string;
  FileStreamUnzips: FileStreamUnzip[];
}

interface FileStreamUnzip {
  id: string;
  input: string;              // Archivo ZIP
  output: string;             // Directorio destino
  return_output: boolean;     // Agregar al flujo
}
```

#### **7. CallPipeline (Llamador Recursivo)**
```typescript
interface CallPipeline {
  id: string;
  pipeline_id: string;       // Pipeline a ejecutar
  timeout_milliseconds: number;
  Pipeline: {
    id: string;
    name: string;
    description?: string;
  }
}
```

### **🎭 ALGORITMO DE CONSTRUCCIÓN DE CADENAS:**

```typescript
// 1. Detectar tipo de runner
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

// 2. Construir cadena jerárquica (Algoritmo del Orchestator)
function buildPipelineChain(units: PipelineUnit[]): PipelineUnitChain[] {
  const roots = units.filter(unit => unit.pipeline_unit_id === null);
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

### **🎯 QUERY GRAPHQL COMPLETA CONFIRMADA:**

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

### **🎨 CONFIGURACIÓN VISUAL CONFIRMADA:**

```typescript
const runnerConfig = {
  Command: {
    color: "#10B981",        // Verde - Ejecución
    icon: Terminal,
    label: "Command",
    description: "Ejecuta comandos del sistema"
  },
  QueryQueue: {
    color: "#3B82F6",        // Azul - Datos
    icon: Database,
    label: "Query Queue",
    description: "Ejecuta consultas SQL"
  },
  SFTPDownloader: {
    color: "#8B5CF6",        // Púrpura - Descarga
    icon: Download,
    label: "SFTP Download",
    description: "Descarga archivos SFTP"
  },
  SFTPUploader: {
    color: "#F59E0B",        // Naranja - Upload
    icon: Upload,
    label: "SFTP Upload",
    description: "Sube archivos SFTP"
  },
  Zip: {
    color: "#EF4444",        // Rojo - Compresión
    icon: Archive,
    label: "Zip",
    description: "Comprime archivos"
  },
  Unzip: {
    color: "#EC4899",        // Rosa - Descompresión
    icon: FolderOpen,
    label: "Unzip",
    description: "Descomprime archivos"
  },
  CallPipeline: {
    color: "#6366F1",        // Índigo - Recursivo
    icon: GitBranch,
    label: "Call Pipeline",
    description: "Llama otro pipeline"
  }
};
```

### **🔄 FLUJO DE DATOS CONFIRMADO:**

```typescript
// Patrón Output → Input entre unidades
// QueryRunner → _output: ["/temp/data.csv"]
//     ↓ lastOutput.FromOutput[0]
// ZipRunner → input: "/temp/data.csv" → _output: ["/temp/archive.zip"]
//     ↓ lastOutput.FromOutput[0]
// SFTPUploader → input: "/temp/archive.zip" → _output: ["/remote/archive.zip"]
```

## ✅ **CONFIRMACIÓN FINAL:**

**SÍ, tengo completo conocimiento de:**
- ✅ Los 7 tipos de runners y sus estructuras exactas
- ✅ Las relaciones y campos de cada componente
- ✅ El orden jerárquico padre-hijo de las unidades
- ✅ La query GraphQL completa para obtener todos los datos
- ✅ El algoritmo de construcción de cadenas
- ✅ El flujo de datos entre unidades
- ✅ La configuración visual por tipo de runner

**LISTO PARA CREAR EL COMPONENTE CENTRALIZADO**