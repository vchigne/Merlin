import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, AlertTriangle, Settings2, Database, Upload, Download, File, FileArchive, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PipelineNodePropertiesProps {
  node: any;
  onChange: (updatedNode: any) => void;
  sftpConnections?: Array<{ id: string; name: string; server: string }>;
  sqlConnections?: Array<{ id: string; name: string; driver: string }>;
  pipelines?: Array<{ id: string; name: string }>;
  readOnly?: boolean;
}

export default function PipelineNodeProperties({
  node,
  onChange,
  sftpConnections = [],
  sqlConnections = [],
  pipelines = [],
  readOnly = false,
}: PipelineNodePropertiesProps) {
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeType, setNodeType] = useState("");
  
  // Propiedades comunes a todos los tipos de nodos
  const [properties, setProperties] = useState<any>({});
  const [options, setOptions] = useState<any>({
    retry_count: 0,
    retry_after_milliseconds: 5000,
    timeout_milliseconds: 60000,
    continue_on_error: false,
    abort_on_timeout: true
  });
  
  // Sincronizar estados con los datos del nodo
  useEffect(() => {
    if (node) {
      setNodeLabel(node.data?.label || "");
      setNodeType(node.type || "");
      
      // Inicializar propiedades según el tipo de nodo
      if (node.data?.properties) {
        setProperties(node.data.properties);
      }
      
      // Inicializar opciones
      if (node.data?.options) {
        setOptions(node.data.options);
      }
    }
  }, [node]);

  // Determinar el tipo de unidad basado en el tipo de nodo
  const getUnitType = () => {
    switch (nodeType) {
      case 'commandNode':
        return 'command';
      case 'queryNode':
        return 'query';
      case 'sftpDownloaderNode':
        return 'sftpDownloader';
      case 'sftpUploaderNode':
        return 'sftpUploader';
      case 'zipNode':
        return 'zip';
      case 'unzipNode':
        return 'unzip';
      case 'callPipelineNode':
        return 'callPipeline';
      default:
        return '';
    }
  };

  // Manejar cambios en el nombre del nodo
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const newLabel = e.target.value;
    setNodeLabel(newLabel);
    
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        label: newLabel
      }
    };
    
    onChange(updatedNode);
  };

  // Manejar cambios en las propiedades
  const handlePropertyChange = (key: string, value: any) => {
    if (readOnly) return;
    
    const updatedProperties = {
      ...properties,
      [key]: value
    };
    
    setProperties(updatedProperties);
    
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        properties: updatedProperties
      }
    };
    
    onChange(updatedNode);
  };

  // Manejar cambios en las opciones
  const handleOptionChange = (key: string, value: any) => {
    if (readOnly) return;
    
    const updatedOptions = {
      ...options,
      [key]: value
    };
    
    setOptions(updatedOptions);
    
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        options: updatedOptions
      }
    };
    
    onChange(updatedNode);
  };

  // Renderizar los campos específicos según el tipo de nodo
  const renderSpecificFields = () => {
    const unitType = getUnitType();
    
    switch (unitType) {
      case 'command':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target">Ejecutable</Label>
              <Input
                id="target"
                placeholder="cmd.exe, powershell.exe, bash, etc."
                value={properties.target || ""}
                onChange={(e) => handlePropertyChange('target', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">El comando o programa a ejecutar</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="args">Argumentos</Label>
              <Input
                id="args"
                placeholder="/c echo Hola, -File script.ps1, etc."
                value={properties.args || ""}
                onChange={(e) => handlePropertyChange('args', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Argumentos pasados al comando</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="working-directory">Directorio de trabajo</Label>
              <Input
                id="working-directory"
                placeholder="C:\\ruta\\al\\directorio"
                value={properties.working_directory || ""}
                onChange={(e) => handlePropertyChange('working_directory', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Directorio desde donde se ejecutará el comando</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="raw-script">Script completo (opcional)</Label>
              <Textarea
                id="raw-script"
                placeholder="Contenido del script a ejecutar"
                value={properties.raw_script || ""}
                onChange={(e) => handlePropertyChange('raw_script', e.target.value)}
                disabled={readOnly}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Si se proporciona, se guardará en un archivo temporal y se ejecutará</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar la salida estándar del comando</p>
              </div>
              <Switch
                id="return-output"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'query':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sqlconn-id">Conexión SQL</Label>
              <Select
                value={properties.sqlconn_id || ""}
                onValueChange={(value) => handlePropertyChange('sqlconn_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="sqlconn-id">
                  <SelectValue placeholder="Selecciona una conexión" />
                </SelectTrigger>
                <SelectContent>
                  {sqlConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.driver})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Conexión a la base de datos</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="query-string">Consulta SQL</Label>
              <Textarea
                id="query-string"
                placeholder="SELECT * FROM tabla WHERE condicion = 1"
                value={properties.query_string || ""}
                onChange={(e) => handlePropertyChange('query_string', e.target.value)}
                disabled={readOnly}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Consulta SQL a ejecutar</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="output-path">Ruta de salida</Label>
              <Input
                id="output-path"
                placeholder="C:\\ruta\\resultados.csv"
                value={properties.path || ""}
                onChange={(e) => handlePropertyChange('path', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Ruta donde se guardarán los resultados</p>
            </div>
            
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="format-options">
                <AccordionTrigger>Opciones de formato</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="print-headers">Incluir encabezados</Label>
                      </div>
                      <Switch
                        id="print-headers"
                        checked={properties.print_headers !== false}
                        onCheckedChange={(checked) => handlePropertyChange('print_headers', checked)}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="separator">Separador</Label>
                      <Select
                        value={properties.separator || ","}
                        onValueChange={(value) => handlePropertyChange('separator', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="separator">
                          <SelectValue placeholder="Separador para CSV" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=",">Coma (,)</SelectItem>
                          <SelectItem value=";">Punto y coma (;)</SelectItem>
                          <SelectItem value="|">Pipe (|)</SelectItem>
                          <SelectItem value="\t">Tabulación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date-format">Formato de fecha</Label>
                      <Input
                        id="date-format"
                        placeholder="YYYY-MM-DD"
                        value={properties.date_format || ""}
                        onChange={(e) => handlePropertyChange('date_format', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="trim-columns">Recortar columnas</Label>
                      </div>
                      <Switch
                        id="trim-columns"
                        checked={properties.trim_columns === true}
                        onCheckedChange={(checked) => handlePropertyChange('trim_columns', checked)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-query">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Hacer disponible el resultado para la siguiente unidad</p>
              </div>
              <Switch
                id="return-output-query"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'sftpDownloader':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sftp-link-id">Conexión SFTP</Label>
              <Select
                value={properties.sftp_link_id || ""}
                onValueChange={(value) => handlePropertyChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="sftp-link-id">
                  <SelectValue placeholder="Selecciona una conexión SFTP" />
                </SelectTrigger>
                <SelectContent>
                  {sftpConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.server})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Conexión al servidor SFTP</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="output-dir">Directorio de destino</Label>
              <Input
                id="output-dir"
                placeholder="C:\\ruta\\destino\\"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Directorio local donde se guardarán los archivos descargados</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-pattern">Patrón de filtrado (opcional)</Label>
              <Input
                id="filter-pattern"
                placeholder="*.txt, data*.csv"
                value={properties.filter_pattern || ""}
                onChange={(e) => handlePropertyChange('filter_pattern', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Patrón para filtrar qué archivos descargar</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-paths">Preservar estructura de directorios</Label>
              </div>
              <Switch
                id="preserve-paths"
                checked={properties.preserve_paths === true}
                onCheckedChange={(checked) => handlePropertyChange('preserve_paths', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recursive">Descargar recursivamente</Label>
                <p className="text-xs text-muted-foreground">Incluir subdirectorios</p>
              </div>
              <Switch
                id="recursive"
                checked={properties.recursive === true}
                onCheckedChange={(checked) => handlePropertyChange('recursive', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="delete-after">Eliminar después de descargar</Label>
              </div>
              <Switch
                id="delete-after"
                checked={properties.delete_after === true}
                onCheckedChange={(checked) => handlePropertyChange('delete_after', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-sftp">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Obtener la lista de archivos descargados</p>
              </div>
              <Switch
                id="return-output-sftp"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'sftpUploader':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sftp-link-id-up">Conexión SFTP</Label>
              <Select
                value={properties.sftp_link_id || ""}
                onValueChange={(value) => handlePropertyChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="sftp-link-id-up">
                  <SelectValue placeholder="Selecciona una conexión SFTP" />
                </SelectTrigger>
                <SelectContent>
                  {sftpConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.server})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Conexión al servidor SFTP</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="input-files">Archivos a subir</Label>
              <Input
                id="input-files"
                placeholder="C:\\ruta\\archivo.txt o C:\\ruta\\*.csv"
                value={properties.input || ""}
                onChange={(e) => handlePropertyChange('input', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Ruta local de los archivos a subir (acepta comodines)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remote-path">Directorio remoto</Label>
              <Input
                id="remote-path"
                placeholder="/ruta/en/servidor/"
                value={properties.remote_path || ""}
                onChange={(e) => handlePropertyChange('remote_path', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Ruta en el servidor SFTP donde se subirán los archivos</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-paths-up">Preservar estructura de directorios</Label>
              </div>
              <Switch
                id="preserve-paths-up"
                checked={properties.preserve_paths === true}
                onCheckedChange={(checked) => handlePropertyChange('preserve_paths', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overwrite">Sobrescribir si existe</Label>
              </div>
              <Switch
                id="overwrite"
                checked={properties.overwrite !== false}
                onCheckedChange={(checked) => handlePropertyChange('overwrite', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-sftp-up">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Obtener la lista de archivos subidos</p>
              </div>
              <Switch
                id="return-output-sftp-up"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'zip':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zip-input">Archivos a comprimir</Label>
              <Input
                id="zip-input"
                placeholder="C:\\ruta\\*.* o C:\\ruta\\archivo.txt"
                value={properties.input || ""}
                onChange={(e) => handlePropertyChange('input', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Archivos o patrón para comprimir</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip-output">Archivo ZIP resultante</Label>
              <Input
                id="zip-output"
                placeholder="C:\\ruta\\archivo.zip"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Ruta y nombre del archivo ZIP a crear</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="compression-level">Nivel de compresión</Label>
              <Select
                value={String(properties.compression_level || "5")}
                onValueChange={(value) => handlePropertyChange('compression_level', parseInt(value))}
                disabled={readOnly}
              >
                <SelectTrigger id="compression-level">
                  <SelectValue placeholder="Nivel de compresión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Mínima (más rápido)</SelectItem>
                  <SelectItem value="3">3 - Baja</SelectItem>
                  <SelectItem value="5">5 - Normal</SelectItem>
                  <SelectItem value="7">7 - Alta</SelectItem>
                  <SelectItem value="9">9 - Máxima (más lento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip-password">Contraseña (opcional)</Label>
              <Input
                id="zip-password"
                type="password"
                placeholder="Contraseña para proteger el ZIP"
                value={properties.password || ""}
                onChange={(e) => handlePropertyChange('password', e.target.value)}
                disabled={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exclude-pattern">Patrón de exclusión (opcional)</Label>
              <Input
                id="exclude-pattern"
                placeholder="*.tmp, *.log"
                value={properties.exclude_pattern || ""}
                onChange={(e) => handlePropertyChange('exclude_pattern', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Patrón de archivos a excluir</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="store-relative-paths">Guardar rutas relativas</Label>
              </div>
              <Switch
                id="store-relative-paths"
                checked={properties.store_relative_paths !== false}
                onCheckedChange={(checked) => handlePropertyChange('store_relative_paths', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-zip">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar la ruta del archivo ZIP creado</p>
              </div>
              <Switch
                id="return-output-zip"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'unzip':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unzip-input">Archivo ZIP a extraer</Label>
              <Input
                id="unzip-input"
                placeholder="C:\\ruta\\archivo.zip"
                value={properties.input || ""}
                onChange={(e) => handlePropertyChange('input', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Ruta del archivo ZIP a descomprimir</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unzip-output">Directorio de destino</Label>
              <Input
                id="unzip-output"
                placeholder="C:\\ruta\\destino\\"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Directorio donde se extraerán los archivos</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unzip-password">Contraseña (si es necesaria)</Label>
              <Input
                id="unzip-password"
                type="password"
                placeholder="Contraseña del ZIP"
                value={properties.password || ""}
                onChange={(e) => handlePropertyChange('password', e.target.value)}
                disabled={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-pattern-unzip">Extraer solo (opcional)</Label>
              <Input
                id="filter-pattern-unzip"
                placeholder="*.txt, data/*.csv"
                value={properties.filter_pattern || ""}
                onChange={(e) => handlePropertyChange('filter_pattern', e.target.value)}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">Patrón para extraer solo ciertos archivos</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overwrite-unzip">Sobrescribir si existe</Label>
              </div>
              <Switch
                id="overwrite-unzip"
                checked={properties.overwrite !== false}
                onCheckedChange={(checked) => handlePropertyChange('overwrite', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="flatten-directories">Ignorar estructura de directorios</Label>
                <p className="text-xs text-muted-foreground">Extraer todos los archivos en el directorio raíz</p>
              </div>
              <Switch
                id="flatten-directories"
                checked={properties.flatten_directories === true}
                onCheckedChange={(checked) => handlePropertyChange('flatten_directories', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-unzip">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar la lista de archivos extraídos</p>
              </div>
              <Switch
                id="return-output-unzip"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'callPipeline':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-id">Pipeline a ejecutar</Label>
              <Select
                value={properties.call_pipeline || ""}
                onValueChange={(value) => handlePropertyChange('call_pipeline', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="pipeline-id">
                  <SelectValue placeholder="Selecciona un pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pipeline que será ejecutado como parte de este flujo</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="wait-for-completion">Esperar a que termine</Label>
                <p className="text-xs text-muted-foreground">Esperar a que el pipeline llamado termine antes de continuar</p>
              </div>
              <Switch
                id="wait-for-completion"
                checked={properties.wait_for_completion !== false}
                onCheckedChange={(checked) => handlePropertyChange('wait_for_completion', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pass-context">Pasar contexto</Label>
                <p className="text-xs text-muted-foreground">Pasar las variables de contexto al pipeline llamado</p>
              </div>
              <Switch
                id="pass-context"
                checked={properties.pass_context !== false}
                onCheckedChange={(checked) => handlePropertyChange('pass_context', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parameters">Parámetros (opcional)</Label>
              <Textarea
                id="parameters"
                placeholder="param1=valor1&#10;param2=valor2"
                value={properties.parameters || ""}
                onChange={(e) => handlePropertyChange('parameters', e.target.value)}
                disabled={readOnly}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Parámetros a pasar al pipeline invocado (uno por línea)</p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="py-8 text-center">
            <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <p>Selecciona un nodo en el editor para configurar sus propiedades.</p>
          </div>
        );
    }
  };

  // Renderizar las opciones comunes para todos los tipos de nodos
  const renderCommonOptions = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="retry-count">Número de reintentos</Label>
          <Input
            id="retry-count"
            type="number"
            min="0"
            max="10"
            placeholder="0"
            value={options.retry_count || 0}
            onChange={(e) => handleOptionChange('retry_count', parseInt(e.target.value))}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">Veces que se reintentará si falla (0 = sin reintentos)</p>
        </div>
        
        {options.retry_count > 0 && (
          <div className="space-y-2">
            <Label htmlFor="retry-after">Tiempo entre reintentos (ms)</Label>
            <Input
              id="retry-after"
              type="number"
              min="1000"
              step="1000"
              placeholder="5000"
              value={options.retry_after_milliseconds || 5000}
              onChange={(e) => handleOptionChange('retry_after_milliseconds', parseInt(e.target.value))}
              disabled={readOnly}
            />
            <p className="text-xs text-muted-foreground">Tiempo de espera antes de reintentar</p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="timeout">Tiempo máximo (ms)</Label>
          <Input
            id="timeout"
            type="number"
            min="1000"
            step="1000"
            placeholder="60000"
            value={options.timeout_milliseconds || 60000}
            onChange={(e) => handleOptionChange('timeout_milliseconds', parseInt(e.target.value))}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">Tiempo máximo de ejecución (1 minuto = 60000)</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="abort-on-timeout">Abortar al exceder tiempo</Label>
            <p className="text-xs text-muted-foreground">Detener el pipeline si se excede el tiempo</p>
          </div>
          <Switch
            id="abort-on-timeout"
            checked={options.abort_on_timeout !== false}
            onCheckedChange={(checked) => handleOptionChange('abort_on_timeout', checked)}
            disabled={readOnly}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="continue-on-error">Continuar si hay error</Label>
            <p className="text-xs text-muted-foreground">Seguir con la siguiente unidad aunque esta falle</p>
          </div>
          <Switch
            id="continue-on-error"
            checked={options.continue_on_error === true}
            onCheckedChange={(checked) => handleOptionChange('continue_on_error', checked)}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  };

  // Renderizar información de ayuda y advertencias según el tipo de nodo
  const renderHelpInfo = () => {
    const unitType = getUnitType();
    
    let icon = <Info className="h-5 w-5 text-blue-400" />;
    let title = "Información";
    let message = "Configura las propiedades específicas de este nodo.";
    let color = "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-100";
    
    switch (unitType) {
      case 'command':
        message = "El comando se ejecutará en el sistema del agente. Asegúrate de que el programa exista y tenga permisos.";
        break;
      case 'query':
        message = "La consulta se ejecutará contra la base de datos seleccionada. Verifica que la consulta sea válida y la conexión esté configurada.";
        break;
      case 'sftpDownloader':
        message = "Descargará archivos desde el servidor SFTP a la ruta local especificada. Verifica que la conexión sea correcta.";
        break;
      case 'sftpUploader':
        message = "Subirá archivos locales al servidor SFTP especificado. Asegúrate de que los archivos existan en la ruta local.";
        break;
      case 'zip':
        message = "Comprimirá los archivos seleccionados en un archivo ZIP. Los comodines como * son permitidos en la ruta de entrada.";
        break;
      case 'unzip':
        message = "Extraerá el contenido del archivo ZIP a la ruta especificada. Verifica que el ZIP exista y sea válido.";
        break;
      case 'callPipeline':
        message = "Ejecutará otro pipeline como parte de este flujo. Si esperas a que termine, este pipeline se bloqueará hasta que el llamado finalice.";
        break;
    }
    
    return (
      <div className={`rounded-md ${color} p-4 mt-6`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">{title}</h3>
            <div className="mt-2 text-sm">
              <p>{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Obtener el ícono según el tipo de nodo
  const getNodeIcon = () => {
    const unitType = getUnitType();
    
    switch (unitType) {
      case 'command':
        return <Settings2 className="h-5 w-5 mr-2" />;
      case 'query':
        return <Database className="h-5 w-5 mr-2" />;
      case 'sftpDownloader':
        return <Download className="h-5 w-5 mr-2" />;
      case 'sftpUploader':
        return <Upload className="h-5 w-5 mr-2" />;
      case 'zip':
        return <FileArchive className="h-5 w-5 mr-2" />;
      case 'unzip':
        return <File className="h-5 w-5 mr-2" />;
      case 'callPipeline':
        return <ExternalLink className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          {getNodeIcon()}
          <div>
            <CardTitle>Propiedades del Nodo</CardTitle>
            <CardDescription>Configura las propiedades específicas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!node ? (
          <div className="py-8 text-center">
            <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <p>Selecciona un nodo en el editor para configurar sus propiedades.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="node-label">Nombre del nodo</Label>
              <Input
                id="node-label"
                placeholder="Nombre descriptivo"
                value={nodeLabel}
                onChange={handleLabelChange}
                disabled={readOnly}
              />
            </div>
            
            <Separator className="my-4" />
            
            <Tabs defaultValue="properties" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties">Propiedades</TabsTrigger>
                <TabsTrigger value="options">Opciones</TabsTrigger>
              </TabsList>
              <TabsContent value="properties" className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {renderSpecificFields()}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="options" className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {renderCommonOptions()}
                </ScrollArea>
              </TabsContent>
            </Tabs>
            
            {renderHelpInfo()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}