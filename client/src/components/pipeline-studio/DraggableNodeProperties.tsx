import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Command, 
  Database, 
  Download, 
  Upload, 
  Archive, 
  File, 
  Settings2, 
  Hash, 
  SquareStack,
  X, 
  Info 
} from 'lucide-react';
import DraggablePanel from '@/components/ui/draggable-panel';

// Mapa de iconos para tipos de nodos
const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  commandNode: <Command className="h-4 w-4 text-amber-500" />,
  queryNode: <Database className="h-4 w-4 text-blue-500" />,
  sftpDownloaderNode: <Download className="h-4 w-4 text-green-500" />,
  sftpUploaderNode: <Upload className="h-4 w-4 text-red-500" />,
  zipNode: <Archive className="h-4 w-4 text-purple-500" />,
  unzipNode: <File className="h-4 w-4 text-indigo-500" />,
  callPipelineNode: <SquareStack className="h-4 w-4 text-cyan-500" />,
  pipelineStart: <Hash className="h-4 w-4 text-emerald-500" />,
  default: <Settings2 className="h-4 w-4 text-gray-500" />
};

// Mapa de colores para los tipos de nodos
const NODE_TYPE_COLORS: Record<string, string> = {
  commandNode: 'text-amber-500',
  queryNode: 'text-blue-500',
  sftpDownloaderNode: 'text-green-500',
  sftpUploaderNode: 'text-red-500',
  zipNode: 'text-purple-500',
  unzipNode: 'text-indigo-500',
  callPipelineNode: 'text-cyan-500',
  pipelineStart: 'text-emerald-500'
};

interface SFTPOption {
  label: string;
  value: string;
}

interface SQLConnOption {
  label: string;
  value: string;
}

interface NodePropertiesProps {
  node: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
  sftpOptions?: SFTPOption[];
  sqlConnOptions?: SQLConnOption[];
  sqlConnections?: any[]; // Soporte para ambos nombres de props
  initialPosition?: { x: number, y: number };
}

const DraggableNodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  readOnly = false,
  sftpOptions = [],
  sqlConnOptions = [],
  initialPosition = { x: window.innerWidth - 350, y: 70 }
}) => {
  const [label, setLabel] = useState('');
  
  // Estados específicos para cada tipo de nodo
  const [commandFields, setCommandFields] = useState({
    target: '',
    workingDirectory: '',
    args: '',
    rawScript: '',
    returnOutput: false
  });
  
  const [queryFields, setQueryFields] = useState({
    sqlConnId: '',
    returnOutput: false
  });
  
  const [sftpFields, setSftpFields] = useState({
    sftpLinkId: '',
    path: '',
    returnOutput: false
  });
  
  const [zipFields, setZipFields] = useState({
    output: '',
    returnOutput: false
  });
  
  const [unzipFields, setUnzipFields] = useState({
    input: '',
    output: '',
    returnOutput: false
  });
  
  const [callPipelineFields, setCallPipelineFields] = useState({
    pipelineId: '',
    waitForCompletion: true
  });
  
  // Cargar datos del nodo
  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      
      // Cargar datos específicos según el tipo de nodo
      if (node.type === 'commandNode') {
        const details = node.data.details || {};
        setCommandFields({
          target: details.target || '',
          workingDirectory: details.working_directory || '',
          args: details.args || '',
          rawScript: details.raw_script || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'queryNode') {
        const details = node.data.details || {};
        setQueryFields({
          sqlConnId: details.sqlconn_id || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'sftpDownloaderNode' || node.type === 'sftpUploaderNode') {
        const details = node.data.details || {};
        setSftpFields({
          sftpLinkId: details.sftp_link_id || '',
          path: node.type === 'sftpDownloaderNode' ? (details.output || '') : (details.input || ''),
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'zipNode') {
        const details = node.data.details || {};
        setZipFields({
          output: details.output || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'unzipNode') {
        const details = node.data.details || {};
        setUnzipFields({
          input: details.input || '',
          output: details.output || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'callPipelineNode') {
        const details = node.data.details || {};
        setCallPipelineFields({
          pipelineId: details.call_pipeline || '',
          waitForCompletion: details.wait_for_completion !== false
        });
      }
    }
  }, [node]);
  
  // Funciones para actualizar el nodo
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const newLabel = e.target.value;
    setLabel(newLabel);
    
    const updatedData = { ...node.data, label: newLabel };
    onUpdateNode(node.id, updatedData);
  };
  
  const handleCommandChange = (field: keyof typeof commandFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...commandFields, [field]: value };
    setCommandFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      target: updatedFields.target,
      working_directory: updatedFields.workingDirectory,
      args: updatedFields.args,
      raw_script: updatedFields.rawScript,
      return_output: updatedFields.returnOutput
    };
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleQueryChange = (field: keyof typeof queryFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...queryFields, [field]: value };
    setQueryFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      sqlconn_id: updatedFields.sqlConnId,
      return_output: updatedFields.returnOutput
    };
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleSftpChange = (field: keyof typeof sftpFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...sftpFields, [field]: value };
    setSftpFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      sftp_link_id: updatedFields.sftpLinkId,
      return_output: updatedFields.returnOutput
    };
    
    // Asignar path a input u output según el tipo de nodo
    if (node.type === 'sftpDownloaderNode') {
      details.output = updatedFields.path;
    } else {
      details.input = updatedFields.path;
    }
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleZipChange = (field: keyof typeof zipFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...zipFields, [field]: value };
    setZipFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      output: updatedFields.output,
      return_output: updatedFields.returnOutput
    };
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleUnzipChange = (field: keyof typeof unzipFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...unzipFields, [field]: value };
    setUnzipFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      input: updatedFields.input,
      output: updatedFields.output,
      return_output: updatedFields.returnOutput
    };
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleCallPipelineChange = (field: keyof typeof callPipelineFields, value: any) => {
    if (readOnly) return;
    
    const updatedFields = { ...callPipelineFields, [field]: value };
    setCallPipelineFields(updatedFields);
    
    const details = {
      ...node.data.details || {},
      call_pipeline: updatedFields.pipelineId,
      wait_for_completion: updatedFields.waitForCompletion
    };
    
    onUpdateNode(node.id, { ...node.data, details });
  };
  
  const handleDeleteNode = () => {
    if (readOnly) return;
    onDeleteNode(node.id);
  };
  
  if (!node) return null;
  
  // Obtener el título del panel según el tipo de nodo
  const getNodeTypeTitle = () => {
    switch (node.type) {
      case 'commandNode': return 'Comando';
      case 'queryNode': return 'Consulta SQL';
      case 'sftpDownloaderNode': return 'Descarga SFTP';
      case 'sftpUploaderNode': return 'Subida SFTP';
      case 'zipNode': return 'Compresión';
      case 'unzipNode': return 'Descompresión';
      case 'callPipelineNode': return 'Llamada a Pipeline';
      case 'pipelineStart': return 'Inicio de Pipeline';
      default: return 'Nodo';
    }
  };
  
  const nodeIcon = NODE_TYPE_ICONS[node.type] || NODE_TYPE_ICONS.default;
  
  return (
    <DraggablePanel
      title={`${getNodeTypeTitle()}: ${label || 'Sin título'}`}
      icon={nodeIcon}
      initialPosition={initialPosition}
      id={`node-properties-${node.id}`}
      minWidth={320}
      maxWidth={350}
      className="bg-card/95 backdrop-blur-md"
      onClose={node.type !== 'pipelineStart' ? handleDeleteNode : undefined}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-label" className="text-xs">Nombre</Label>
          <Input
            id="node-label"
            value={label}
            onChange={handleLabelChange}
            disabled={readOnly}
            placeholder="Nombre del nodo"
            className="text-sm h-9"
          />
        </div>
        
        <Separator />
        
        {/* Campos específicos según el tipo de nodo */}
        {node.type === 'commandNode' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="command-target" className="text-xs">Comando</Label>
              <Input
                id="command-target"
                value={commandFields.target}
                onChange={(e) => handleCommandChange('target', e.target.value)}
                disabled={readOnly}
                placeholder="Ejecutable (ej: bash, python)"
                className="text-sm h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command-working-dir" className="text-xs">Directorio de trabajo</Label>
              <Input
                id="command-working-dir"
                value={commandFields.workingDirectory}
                onChange={(e) => handleCommandChange('workingDirectory', e.target.value)}
                disabled={readOnly}
                placeholder="/ruta/al/directorio"
                className="text-sm h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command-args" className="text-xs">Argumentos</Label>
              <Input
                id="command-args"
                value={commandFields.args}
                onChange={(e) => handleCommandChange('args', e.target.value)}
                disabled={readOnly}
                placeholder="-c ./script.sh"
                className="text-sm h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command-script" className="text-xs">Script</Label>
              <Textarea
                id="command-script"
                value={commandFields.rawScript}
                onChange={(e) => handleCommandChange('rawScript', e.target.value)}
                disabled={readOnly}
                placeholder="#!/bin/bash\necho 'Hola mundo'"
                className="text-sm min-h-[100px] font-mono text-xs"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="command-return-output" className="text-xs">Retornar salida</Label>
              <Switch
                id="command-return-output"
                checked={commandFields.returnOutput}
                onCheckedChange={(checked) => handleCommandChange('returnOutput', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'queryNode' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="query-connection" className="text-xs">Conexión SQL</Label>
              <Select
                value={queryFields.sqlConnId}
                onValueChange={(value) => handleQueryChange('sqlConnId', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="query-connection" className="text-sm h-9">
                  <SelectValue placeholder="Seleccionar conexión" />
                </SelectTrigger>
                <SelectContent>
                  {sqlConnOptions.map((conn) => (
                    <SelectItem key={conn.value} value={conn.value}>
                      {conn.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="query-return-output" className="text-xs">Retornar resultados</Label>
              <Switch
                id="query-return-output"
                checked={queryFields.returnOutput}
                onCheckedChange={(checked) => handleQueryChange('returnOutput', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {(node.type === 'sftpDownloaderNode' || node.type === 'sftpUploaderNode') && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sftp-connection" className="text-xs">Conexión SFTP</Label>
              <Select
                value={sftpFields.sftpLinkId}
                onValueChange={(value) => handleSftpChange('sftpLinkId', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="sftp-connection" className="text-sm h-9">
                  <SelectValue placeholder="Seleccionar conexión" />
                </SelectTrigger>
                <SelectContent>
                  {sftpOptions.map((conn) => (
                    <SelectItem key={conn.value} value={conn.value}>
                      {conn.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sftp-path" className="text-xs">
                {node.type === 'sftpDownloaderNode' ? 'Ruta de destino' : 'Ruta de origen'}
              </Label>
              <Input
                id="sftp-path"
                value={sftpFields.path}
                onChange={(e) => handleSftpChange('path', e.target.value)}
                disabled={readOnly}
                placeholder={node.type === 'sftpDownloaderNode' ? '/ruta/destino' : '/ruta/origen'}
                className="text-sm h-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sftp-return-output" className="text-xs">Retornar información</Label>
              <Switch
                id="sftp-return-output"
                checked={sftpFields.returnOutput}
                onCheckedChange={(checked) => handleSftpChange('returnOutput', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'zipNode' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="zip-output" className="text-xs">Ruta de salida</Label>
              <Input
                id="zip-output"
                value={zipFields.output}
                onChange={(e) => handleZipChange('output', e.target.value)}
                disabled={readOnly}
                placeholder="/ruta/archivo.zip"
                className="text-sm h-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="zip-return-output" className="text-xs">Retornar información</Label>
              <Switch
                id="zip-return-output"
                checked={zipFields.returnOutput}
                onCheckedChange={(checked) => handleZipChange('returnOutput', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'unzipNode' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="unzip-input" className="text-xs">Archivo a descomprimir</Label>
              <Input
                id="unzip-input"
                value={unzipFields.input}
                onChange={(e) => handleUnzipChange('input', e.target.value)}
                disabled={readOnly}
                placeholder="/ruta/archivo.zip"
                className="text-sm h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unzip-output" className="text-xs">Directorio destino</Label>
              <Input
                id="unzip-output"
                value={unzipFields.output}
                onChange={(e) => handleUnzipChange('output', e.target.value)}
                disabled={readOnly}
                placeholder="/ruta/destino"
                className="text-sm h-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="unzip-return-output" className="text-xs">Retornar información</Label>
              <Switch
                id="unzip-return-output"
                checked={unzipFields.returnOutput}
                onCheckedChange={(checked) => handleUnzipChange('returnOutput', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'callPipelineNode' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="call-pipeline-id" className="text-xs">ID del Pipeline</Label>
              <Input
                id="call-pipeline-id"
                value={callPipelineFields.pipelineId}
                onChange={(e) => handleCallPipelineChange('pipelineId', e.target.value)}
                disabled={readOnly}
                placeholder="ID del pipeline a ejecutar"
                className="text-sm h-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="pipeline-wait" className="text-xs">Esperar a que termine</Label>
              <Switch
                id="pipeline-wait"
                checked={callPipelineFields.waitForCompletion}
                onCheckedChange={(checked) => handleCallPipelineChange('waitForCompletion', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'pipelineStart' && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-4 w-4 text-blue-500" />
              </div>
              <div className="ml-2">
                <h3 className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  Nodo inicial
                </h3>
                <div className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  <p>
                    Este es el nodo de inicio del pipeline. No puede ser eliminado 
                    y sirve como punto de entrada para la ejecución.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Botón para eliminar el nodo (no disponible para nodo inicial) */}
        {!readOnly && node.type !== 'pipelineStart' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteNode}
            className="w-full mt-2"
          >
            <X className="h-4 w-4 mr-2" />
            Eliminar Nodo
          </Button>
        )}
      </div>
    </DraggablePanel>
  );
};

export default DraggableNodeProperties;