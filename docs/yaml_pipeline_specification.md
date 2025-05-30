# Especificación YAML para Pipelines Merlin

## 🎯 Propósito

Esta especificación define el formato YAML **idempotente** para describir completamente pipelines Merlin, incluyendo todas sus características, unidades y configuraciones. Un archivo YAML generado con esta especificación debe contener toda la información necesaria para recrear exactamente el pipeline original.

---

## 📝 Estructura Base del Pipeline

```yaml
# Información básica del pipeline
name: "[MDLZ] pipeline de JOMER_CHINCHA"
description: "Pipeline para procesamiento de datos JOMER_CHINCHA"

# Configuración global del pipeline
configuration:
  agent_passport_id: "24cb707e-15ae-40b1-af90-674c83415db6"
  abort_on_error: true
  abort_on_timeout: false
  continue_on_error: false
  disposable: false

# Lista de unidades de ejecución
units:
  - id: "8a0c81b8-79fd-4845-a048-ae83271af67e"
    type: "command"
    name: "[MDLZ] - JOMER_CHINCHA] Limpiar archivos"
    parent_unit_id: null  # null = unidad raíz
    position:
      x: 50
      y: 150
    
    # Configuración de ejecución de la unidad
    execution:
      retry_count: 3
      retry_after_milliseconds: 5000
      timeout_milliseconds: 30000
      continue_on_error: false
      abort_on_error: false
      abort_on_timeout: false
    
    # Configuración específica del runner
    configuration:
      target: "cmd"
      args: "/c del C:\\temp\\*.tmp"
      working_directory: "C:\\temp"
      raw_script: null
      instant: true
      return_output: true
      return_output_type: "PATHS"
    
    # Conexiones a otras unidades (outputs)
    connections:
      - to: "unit-2"
      - to: "unit-3"

  - id: "unit-2"
    type: "sftp_uploader"
    name: "[MDLZ] Subir archivos de JOMER_CHINCHA"
    parent_unit_id: "8a0c81b8-79fd-4845-a048-ae83271af67e"
    position:
      x: 300
      y: 150
    
    execution:
      retry_count: 3
      retry_after_milliseconds: 5000
      timeout_milliseconds: 60000
      continue_on_error: false
      abort_on_error: true
      abort_on_timeout: false
    
    configuration:
      sftp_connection:
        server: "sftp.example.com"
        port: 22
        user: "upload_user"
        name: "Servidor MDLZ Principal"
      file_streams:
        - input: "C:\\temp\\data.csv"
          output: "/uploads/jomer_chincha/data.csv"
          return_output: true
        - input: "C:\\temp\\report.zip"
          output: "/uploads/jomer_chincha/report.zip"
          return_output: false
    
    connections: []  # No tiene conexiones de salida
```

---

## 🔧 Tipos de Unidades Soportadas

### 1. Command Runner
```yaml
type: "command"
configuration:
  target: "node"                    # Ejecutable: node, python, cmd, powershell
  args: "script.js --env=prod"      # Argumentos de línea de comandos
  working_directory: "C:\\app"       # Directorio de trabajo
  raw_script: |                    # Script multi-línea para stdin
    const fs = require('fs');
    console.log('Processing...');
  instant: true                    # true = instantáneo, false = streaming
  return_output: true              # Si agregar output al flujo
  return_output_type: "PATHS"      # "PATHS" | "DATA"
```

### 2. Query Queue Runner  
```yaml
type: "query_queue"
configuration:
  queries:
    - order: 1
      statement: "SELECT * FROM ventas WHERE fecha = GETDATE()"
      path: "/temp/ventas.csv"
      sql_connection:
        driver: "MSSQL"
        connection_string: "Server=localhost;Database=Sales;Trusted_Connection=yes;"
        name: "BD Ventas Principal"
      output_settings:
        return_output: true
        print_headers: true
        separator: ","
        chunks: 1000
        trim_columns: true
        force_dot_decimal_separator: false
        date_format: "yyyy-MM-dd"
        target_encoding: "UTF-8"
      retry_settings:
        retry_count: 2
        retry_after_milliseconds: 3000
    
    - order: 2
      statement: "SELECT * FROM productos WHERE activo = 1"
      path: "/temp/productos.csv"
      sql_connection:
        driver: "MSSQL"
        connection_string: "Server=localhost;Database=Sales;Trusted_Connection=yes;"
        name: "BD Ventas Principal"
      output_settings:
        return_output: true
        print_headers: true
        separator: "|"
        chunks: 500
        trim_columns: false
        force_dot_decimal_separator: true
        date_format: "dd/MM/yyyy"
        target_encoding: "Latin1"
      retry_settings:
        retry_count: 1
        retry_after_milliseconds: 1000
```

### 3. SFTP Downloader
```yaml
type: "sftp_downloader"
configuration:
  sftp_connection:
    server: "files.company.com"
    port: 22
    user: "download_user"
    name: "Servidor Archivos Externos"
  file_streams:
    - input: "/remote/data/daily_report.csv"
      output: "C:\\temp\\daily_report.csv"
      return_output: true
    - input: "/remote/backups/*.zip"
      output: "C:\\backups\\"
      return_output: false
```

### 4. SFTP Uploader
```yaml
type: "sftp_uploader"
configuration:
  sftp_connection:
    server: "upload.partner.com"
    port: 22
    user: "api_user"
    name: "Servidor Partner Upload"
  file_streams:
    - input: "C:\\exports\\report.pdf"
      output: "/incoming/reports/report.pdf"
      return_output: true
    - input: "C:\\data\\*.csv"
      output: "/incoming/data/"
      return_output: false
```

### 5. Zip Compressor
```yaml
type: "zip"
configuration:
  zip_name: "C:\\temp\\backup.zip"
  file_streams:
    - input: "C:\\data\\reports"
      wildcard_exp: "*.pdf"
    - input: "C:\\temp\\exports"
      wildcard_exp: "*.csv"
    - input: "C:\\logs\\app.log"
      wildcard_exp: null
```

### 6. Unzip Extractor
```yaml
type: "unzip"
configuration:
  file_streams:
    - input: "C:\\downloads\\archive.zip"
      output: "C:\\extracted\\data"
      return_output: true
    - input: "C:\\temp\\backup.zip"
      output: "C:\\restored\\"
      return_output: false
```

### 7. Pipeline Call (Recursivo)
```yaml
type: "call_pipeline"
configuration:
  pipeline_reference:
    id: "99457a82-8c67-4c7d-b123-456789abcdef"
    name: "Subproceso de Validación"
    description: "Pipeline para validar datos antes de continuar"
  timeout_milliseconds: 1800000  # 30 minutos
```

---

## 🔗 Sistema de Conexiones

Las conexiones definen el flujo de ejecución entre unidades:

```yaml
connections:
  - to: "unit-id-2"        # ID de la unidad destino
  - to: "unit-id-3"        # Múltiples conexiones = ejecución en paralelo
  - to: "unit-id-4"
```

**Reglas de conexión:**
- `connections: []` = Unidad final (sin salidas)
- `parent_unit_id: null` = Unidad raíz (punto de inicio)
- Una unidad puede tener múltiples conexiones de salida (paralelismo)
- Una unidad puede tener múltiples unidades padre (sincronización)

---

## 🎨 Posicionamiento Visual

```yaml
position:
  x: 150    # Coordenada X en el canvas visual
  y: 300    # Coordenada Y en el canvas visual
```

**Convenciones de posicionamiento:**
- Grid base: incrementos de 50 píxeles
- Unidades raíz: Y = 50-100
- Flujo descendente: incrementos Y = +200
- Ramificaciones: incrementos X = +250

---

## ⚙️ Configuración de Ejecución

Cada unidad incluye configuración de manejo de errores y reintentos:

```yaml
execution:
  retry_count: 3                    # Número de reintentos
  retry_after_milliseconds: 5000    # Espera entre reintentos
  timeout_milliseconds: 30000       # Timeout de la operación
  continue_on_error: false          # Si continuar aunque falle
  abort_on_error: false             # Si abortar pipeline por error
  abort_on_timeout: false           # Si abortar por timeout
```

---

## 📊 Ejemplo Completo: Pipeline ETL

```yaml
name: "ETL Diario de Ventas Regional"
description: "Extracción, transformación y carga de datos de ventas por región"

configuration:
  agent_passport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  abort_on_error: true
  abort_on_timeout: false
  continue_on_error: false
  disposable: false

units:
  # Unidad 1: Extracción de datos
  - id: "extract-sales"
    type: "query_queue"
    name: "Extraer datos de ventas"
    parent_unit_id: null
    position: { x: 50, y: 50 }
    
    execution:
      retry_count: 2
      retry_after_milliseconds: 10000
      timeout_milliseconds: 300000
      continue_on_error: false
      abort_on_error: true
      abort_on_timeout: true
    
    configuration:
      queries:
        - order: 1
          statement: "SELECT * FROM ventas WHERE fecha >= DATEADD(day, -1, GETDATE())"
          path: "/temp/ventas_diarias.csv"
          sql_connection:
            driver: "MSSQL"
            connection_string: "Server=prod-db;Database=Sales;Trusted_Connection=yes;"
            name: "Base Ventas Producción"
          output_settings:
            return_output: true
            print_headers: true
            separator: ","
            chunks: 5000
            trim_columns: true
            force_dot_decimal_separator: false
            date_format: "yyyy-MM-dd HH:mm:ss"
            target_encoding: "UTF-8"
          retry_settings:
            retry_count: 3
            retry_after_milliseconds: 5000
    
    connections:
      - to: "transform-data"

  # Unidad 2: Transformación
  - id: "transform-data"
    type: "command"
    name: "Procesar y transformar datos"
    parent_unit_id: "extract-sales"
    position: { x: 300, y: 50 }
    
    execution:
      retry_count: 2
      retry_after_milliseconds: 5000
      timeout_milliseconds: 180000
      continue_on_error: false
      abort_on_error: true
      abort_on_timeout: false
    
    configuration:
      target: "python"
      args: "transform_sales.py --input=/temp/ventas_diarias.csv --output=/temp/ventas_procesadas.csv"
      working_directory: "/scripts"
      raw_script: null
      instant: false
      return_output: true
      return_output_type: "PATHS"
    
    connections:
      - to: "compress-results"
      - to: "validate-data"

  # Unidad 3: Validación en paralelo
  - id: "validate-data"
    type: "command"
    name: "Validar calidad de datos"
    parent_unit_id: "transform-data"
    position: { x: 200, y: 300 }
    
    execution:
      retry_count: 1
      retry_after_milliseconds: 3000
      timeout_milliseconds: 60000
      continue_on_error: true
      abort_on_error: false
      abort_on_timeout: false
    
    configuration:
      target: "python"
      args: "validate_data.py --file=/temp/ventas_procesadas.csv"
      working_directory: "/scripts"
      raw_script: null
      instant: true
      return_output: true
      return_output_type: "DATA"
    
    connections:
      - to: "upload-results"

  # Unidad 4: Compresión en paralelo
  - id: "compress-results"
    type: "zip"
    name: "Comprimir archivos de resultado"
    parent_unit_id: "transform-data"
    position: { x: 400, y: 300 }
    
    execution:
      retry_count: 2
      retry_after_milliseconds: 2000
      timeout_milliseconds: 120000
      continue_on_error: false
      abort_on_error: false
      abort_on_timeout: false
    
    configuration:
      zip_name: "/temp/ventas_diarias_processed.zip"
      file_streams:
        - input: "/temp/ventas_procesadas.csv"
          wildcard_exp: null
        - input: "/temp/logs"
          wildcard_exp: "*.log"
    
    connections:
      - to: "upload-results"

  # Unidad 5: Carga final (sincronización)
  - id: "upload-results"
    type: "sftp_uploader"
    name: "Subir resultados al servidor"
    parent_unit_id: null  # Recibirá de validate-data Y compress-results
    position: { x: 300, y: 550 }
    
    execution:
      retry_count: 3
      retry_after_milliseconds: 10000
      timeout_milliseconds: 600000
      continue_on_error: false
      abort_on_error: true
      abort_on_timeout: true
    
    configuration:
      sftp_connection:
        server: "data-warehouse.company.com"
        port: 22
        user: "etl_user"
        name: "Servidor Data Warehouse"
      file_streams:
        - input: "/temp/ventas_diarias_processed.zip"
          output: "/incoming/sales/daily/ventas_diarias_processed.zip"
          return_output: true
    
    connections: []  # Unidad final
```

---

## 🔄 Reglas de Idempotencia

1. **IDs únicos**: Cada unidad debe tener un ID único y estable
2. **Referencias completas**: Todas las referencias a conexiones, agentes y configuraciones deben estar incluidas
3. **Configuraciones explícitas**: No asumir valores por defecto, especificar todo explícitamente
4. **Orden determinístico**: Las unidades y queries deben mantener un orden consistente
5. **Metadatos completos**: Incluir toda la información necesaria para recrear exactamente el pipeline

Esta especificación garantiza que cualquier pipeline pueda ser completamente descrito en YAML y posteriormente reconstruido sin pérdida de información.