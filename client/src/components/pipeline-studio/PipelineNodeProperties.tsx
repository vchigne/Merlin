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
import { 
  Info, AlertTriangle, Settings2, Database, Upload, Download, 
  File, FileArchive, ExternalLink, ChevronDown, ChevronUp 
} from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(true);
  
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
      const unitType = getUnitType();
      const nodeData = node.data || {};
      
      if (nodeData.properties) {
        setProperties(nodeData.properties);
      } else {
        // Valores por defecto según el tipo
        switch (unitType) {
          case 'command':
            setProperties({
              target: "",
              args: "",
              working_directory: "",
              raw_script: "",
              return_output: true
            });
            break;
          case 'query':
            setProperties({
              sqlconn_id: "",
              query_string: "",
              path: "",
              print_headers: true,
              return_output: true
            });
            break;
          case 'sftpDownloader':
            setProperties({
              sftp_link_id: "",
              output: "",
              return_output: true
            });
            break;
          case 'sftpUploader':
            setProperties({
              sftp_link_id: "",
              input: "",
              return_output: true
            });
            break;
          case 'zip':
            setProperties({
              name: "",
              output: "",
              return_output: true
            });
            break;
          case 'unzip':
            setProperties({
              name: "",
              input: "",
              output: "",
              return_output: true
            });
            break;
          case 'callPipeline':
            setProperties({
              pipeline_id: "",
              call_pipeline: ""
            });
            break;
          default:
            setProperties({});
        }
      }
      
      // Inicializar opciones
      if (nodeData.options) {
        setOptions(nodeData.options);
      }
    }
  }, [node]);
  
  // Determinar el tipo real de la unidad según el tipo de nodo
  const getUnitType = () => {
    if (!nodeType) return '';
    
    switch (nodeType) {
      case 'commandNode': return 'command';
      case 'queryNode': return 'query';
      case 'sftpDownloaderNode': return 'sftpDownloader';
      case 'sftpUploaderNode': return 'sftpUploader';
      case 'zipNode': return 'zip';
      case 'unzipNode': return 'unzip';
      case 'callPipelineNode': return 'callPipeline';
      case 'pipelineStart': return 'start';
      default: return '';
    }
  };
  
  // Manejar cambio en la etiqueta del nodo
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
  
  // Manejar cambios en las propiedades específicas
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="target" className="text-xs">Ejecutable</Label>
              <Input
                id="target"
                placeholder="cmd.exe, powershell.exe, bash, etc."
                value={properties.target || ""}
                onChange={(e) => handlePropertyChange('target', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">El comando o programa a ejecutar</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="args" className="text-xs">Argumentos</Label>
              <Input
                id="args"
                placeholder="/c echo Hola, -File script.ps1, etc."
                value={properties.args || ""}
                onChange={(e) => handlePropertyChange('args', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Argumentos pasados al comando</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="working-directory" className="text-xs">Directorio de trabajo</Label>
              <Input
                id="working-directory"
                placeholder="C:\\ruta\\al\\directorio"
                value={properties.working_directory || ""}
                onChange={(e) => handlePropertyChange('working_directory', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Directorio desde donde se ejecutará el comando</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="raw-script" className="text-xs">Script completo (opcional)</Label>
              <Textarea
                id="raw-script"
                placeholder="Contenido del script a ejecutar"
                value={properties.raw_script || ""}
                onChange={(e) => handlePropertyChange('raw_script', e.target.value)}
                disabled={readOnly}
                rows={3}
                className="text-sm min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">Si se proporciona, se guardará en un archivo temporal y se ejecutará</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output" className="text-xs">Capturar salida</Label>
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sqlconn-id" className="text-xs">Conexión SQL</Label>
              <Select
                value={properties.sqlconn_id || ""}
                onValueChange={(value) => handlePropertyChange('sqlconn_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="sqlconn-id"
                  className="text-sm h-8"
                >
                  <SelectValue placeholder="Selecciona una conexión SQL" />
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
            
            <div className="space-y-1">
              <Label htmlFor="query-string" className="text-xs">Consulta SQL</Label>
              <Textarea
                id="query-string"
                placeholder="SELECT * FROM tabla"
                value={properties.query_string || ""}
                onChange={(e) => handlePropertyChange('query_string', e.target.value)}
                disabled={readOnly}
                rows={3}
                className="text-sm min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">Consulta SQL a ejecutar</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="path" className="text-xs">Ruta de salida</Label>
              <Input
                id="path"
                placeholder="C:\\ruta\\a\\resultados.csv"
                value={properties.path || ""}
                onChange={(e) => handlePropertyChange('path', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta donde se guardarán los resultados</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="print-headers" className="text-xs">Incluir encabezados</Label>
                <p className="text-xs text-muted-foreground">Incluir nombres de columnas en la salida</p>
              </div>
              <Switch
                id="print-headers"
                checked={properties.print_headers === true}
                onCheckedChange={(checked) => handlePropertyChange('print_headers', checked)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-sql" className="text-xs">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar los resultados de la consulta</p>
              </div>
              <Switch
                id="return-output-sql"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'sftpDownloader':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sftp-link-download" className="text-xs">Conexión SFTP</Label>
              <Select
                value={properties.sftp_link_id || ""}
                onValueChange={(value) => handlePropertyChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="sftp-link-download"
                  className="text-sm h-8"
                >
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
            
            <div className="space-y-1">
              <Label htmlFor="output-path" className="text-xs">Ruta de salida</Label>
              <Input
                id="output-path"
                placeholder="C:\\ruta\\destino"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta local donde se guardarán los archivos descargados</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-sftp-down" className="text-xs">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar la lista de archivos descargados</p>
              </div>
              <Switch
                id="return-output-sftp-down"
                checked={properties.return_output === true}
                onCheckedChange={(checked) => handlePropertyChange('return_output', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        );
        
      case 'sftpUploader':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sftp-link-upload" className="text-xs">Conexión SFTP</Label>
              <Select
                value={properties.sftp_link_id || ""}
                onValueChange={(value) => handlePropertyChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="sftp-link-upload"
                  className="text-sm h-8"
                >
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
            
            <div className="space-y-1">
              <Label htmlFor="input-path" className="text-xs">Ruta de entrada</Label>
              <Input
                id="input-path"
                placeholder="C:\\ruta\\origen"
                value={properties.input || ""}
                onChange={(e) => handlePropertyChange('input', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta local de los archivos a subir</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-sftp-up" className="text-xs">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar la lista de archivos subidos</p>
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="zip-name" className="text-xs">Nombre del archivo ZIP</Label>
              <Input
                id="zip-name"
                placeholder="archivo.zip"
                value={properties.name || ""}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Nombre del archivo ZIP a crear</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="zip-output" className="text-xs">Ruta de salida</Label>
              <Input
                id="zip-output"
                placeholder="C:\\ruta\\destino\\archivo.zip"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta completa donde se creará el archivo ZIP</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-zip" className="text-xs">Capturar salida</Label>
                <p className="text-xs text-muted-foreground">Capturar información sobre el archivo comprimido</p>
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="unzip-name" className="text-xs">Nombre del archivo ZIP</Label>
              <Input
                id="unzip-name"
                placeholder="archivo.zip"
                value={properties.name || ""}
                onChange={(e) => handlePropertyChange('name', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Nombre del archivo ZIP a descomprimir</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="unzip-input" className="text-xs">Ruta de entrada</Label>
              <Input
                id="unzip-input"
                placeholder="C:\\ruta\\origen\\archivo.zip"
                value={properties.input || ""}
                onChange={(e) => handlePropertyChange('input', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta completa del archivo ZIP a descomprimir</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="unzip-output" className="text-xs">Ruta de salida</Label>
              <Input
                id="unzip-output"
                placeholder="C:\\ruta\\destino"
                value={properties.output || ""}
                onChange={(e) => handlePropertyChange('output', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Ruta donde se extraerán los archivos</p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="return-output-unzip" className="text-xs">Capturar salida</Label>
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pipeline-id" className="text-xs">Pipeline a ejecutar</Label>
              <Select
                value={properties.pipeline_id || ""}
                onValueChange={(value) => handlePropertyChange('pipeline_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger
                  id="pipeline-id"
                  className="text-sm h-8"
                >
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
              <p className="text-xs text-muted-foreground">Pipeline que se ejecutará como subrutina</p>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="call-pipeline" className="text-xs">ID de referencia</Label>
              <Input
                id="call-pipeline"
                placeholder="Identificador único"
                value={properties.call_pipeline || ""}
                onChange={(e) => handlePropertyChange('call_pipeline', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
              />
              <p className="text-xs text-muted-foreground">Identificador único para la llamada al pipeline</p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="py-8 text-center">
            <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm">No hay propiedades específicas para este tipo de nodo.</p>
          </div>
        );
    }
  };
  
  // Renderizar las opciones comunes a todos los nodos
  const renderCommonOptions = () => {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="retry-count" className="text-xs">Intentos de reintento</Label>
          <Input
            id="retry-count"
            type="number"
            min="0"
            max="10"
            value={options.retry_count}
            onChange={(e) => handleOptionChange('retry_count', parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="text-sm h-8"
          />
          <p className="text-xs text-muted-foreground">Número de veces a reintentar en caso de error</p>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="retry-after" className="text-xs">Tiempo entre reintentos (ms)</Label>
          <Input
            id="retry-after"
            type="number"
            min="0"
            step="1000"
            value={options.retry_after_milliseconds}
            onChange={(e) => handleOptionChange('retry_after_milliseconds', parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="text-sm h-8"
          />
          <p className="text-xs text-muted-foreground">Tiempo de espera entre reintentos en milisegundos</p>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="timeout" className="text-xs">Tiempo máximo de ejecución (ms)</Label>
          <Input
            id="timeout"
            type="number"
            min="0"
            step="1000"
            value={options.timeout_milliseconds}
            onChange={(e) => handleOptionChange('timeout_milliseconds', parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="text-sm h-8"
          />
          <p className="text-xs text-muted-foreground">Tiempo máximo permitido para la ejecución en milisegundos</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="continue-on-error" className="text-xs">Continuar en error</Label>
            <p className="text-xs text-muted-foreground">Continuar la ejecución si ocurre un error</p>
          </div>
          <Switch
            id="continue-on-error"
            checked={options.continue_on_error || false}
            onCheckedChange={(checked) => handleOptionChange('continue_on_error', checked)}
            disabled={readOnly}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="abort-on-timeout" className="text-xs">Abortar en timeout</Label>
            <p className="text-xs text-muted-foreground">Detener la ejecución si se supera el tiempo máximo</p>
          </div>
          <Switch
            id="abort-on-timeout"
            checked={options.abort_on_timeout || false}
            onCheckedChange={(checked) => handleOptionChange('abort_on_timeout', checked)}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  };
  
  // Generar un mensaje de ayuda según el tipo de nodo
  const renderHelpInfo = () => {
    const unitType = getUnitType();
    
    let title = "Información";
    let message = "Configura las propiedades específicas para este tipo de nodo.";
    let icon = <Info className="h-4 w-4 text-blue-400" />;
    let color = "bg-blue-50";
    
    switch (unitType) {
      case 'command':
        message = "El nodo Comando ejecuta un comando del sistema operativo. Puedes especificar argumentos y capturar su salida.";
        break;
      case 'query':
        message = "El nodo Consulta SQL ejecuta una consulta en una base de datos y puede guardar los resultados en un archivo.";
        break;
      case 'sftpDownloader':
        message = "El nodo SFTP Descarga permite descargar archivos desde un servidor SFTP remoto.";
        break;
      case 'sftpUploader':
        message = "El nodo SFTP Subida permite subir archivos a un servidor SFTP remoto.";
        break;
      case 'zip':
        message = "El nodo Comprimir crea un archivo ZIP a partir de archivos y carpetas.";
        break;
      case 'unzip':
        message = "El nodo Descomprimir extrae el contenido de un archivo ZIP.";
        break;
      case 'callPipeline':
        message = "El nodo Llamar Pipeline ejecuta otro pipeline como una subrutina.";
        break;
      case 'start':
        title = "Nodo de inicio";
        message = "Este es el nodo de inicio del pipeline. No tiene propiedades configurables específicas.";
        break;
    }
    
    return (
      <div className={`rounded-md ${color} p-2 mt-2`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-2">
            <h3 className="text-xs font-medium">{title}</h3>
            <div className="mt-1 text-xs">
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
        return <Settings2 className="h-4 w-4 mr-2" />;
      case 'query':
        return <Database className="h-4 w-4 mr-2" />;
      case 'sftpDownloader':
        return <Download className="h-4 w-4 mr-2" />;
      case 'sftpUploader':
        return <Upload className="h-4 w-4 mr-2" />;
      case 'zip':
        return <FileArchive className="h-4 w-4 mr-2" />;
      case 'unzip':
        return <File className="h-4 w-4 mr-2" />;
      case 'callPipeline':
        return <ExternalLink className="h-4 w-4 mr-2" />;
      default:
        return <Info className="h-4 w-4 mr-2" />;
    }
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Renderizar el tipo de nodo de forma más amigable
  const getNodeTypeLabel = () => {
    switch (nodeType) {
      case 'commandNode': return 'Comando';
      case 'queryNode': return 'Consulta SQL';
      case 'sftpDownloaderNode': return 'SFTP Descarga';
      case 'sftpUploaderNode': return 'SFTP Subida';
      case 'zipNode': return 'Comprimir';
      case 'unzipNode': return 'Descomprimir';
      case 'callPipelineNode': return 'Llamar Pipeline';
      case 'pipelineStart': return 'Inicio Pipeline';
      default: return nodeType;
    }
  };

  return (
    <Card>
      <CardHeader className="py-2 flex flex-row items-center justify-between">
        <div className="flex items-center">
          {getNodeIcon()}
          <div>
            <CardTitle className="text-base">Propiedades del Nodo</CardTitle>
            {!isExpanded && (
              <CardDescription className="text-xs">
                {nodeLabel || "Sin nombre"} - {getNodeTypeLabel()}
              </CardDescription>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleExpanded}
          className="h-7 w-7 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {!node ? (
            <div className="py-4 text-center">
              <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm">Selecciona un nodo en el editor para configurar sus propiedades.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="node-label" className="text-xs">Nombre del nodo</Label>
                <Input
                  id="node-label"
                  placeholder="Nombre descriptivo"
                  value={nodeLabel}
                  onChange={handleLabelChange}
                  disabled={readOnly}
                  className="text-sm h-8"
                />
              </div>
              
              <Separator className="my-2" />
              
              <Tabs defaultValue="properties" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="properties">Propiedades</TabsTrigger>
                  <TabsTrigger value="options">Opciones</TabsTrigger>
                </TabsList>
                <TabsContent value="properties" className="pt-2">
                  <ScrollArea className="h-[250px] pr-4">
                    {renderSpecificFields()}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="options" className="pt-2">
                  <ScrollArea className="h-[250px] pr-4">
                    {renderCommonOptions()}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              
              {renderHelpInfo()}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}