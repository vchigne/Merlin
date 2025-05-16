import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { NODE_TYPE_ICON_MAP } from './DraggableNodePalette';
import { Info, X } from 'lucide-react';

interface FloatingNodePropertiesProps {
  node: any;
  onUpdateNode: (id: string, data: any) => void;
  onDeleteNode: (id: string) => void;
  readOnly?: boolean;
  sftpOptions?: Array<{ label: string; value: string }>;
  sqlConnOptions?: Array<{ label: string; value: string }>;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export default function FloatingNodeProperties({
  node,
  onUpdateNode,
  onDeleteNode,
  readOnly = false,
  sftpOptions = [],
  sqlConnOptions = [],
  defaultPosition = { x: window.innerWidth - 380, y: 20 },
  onPositionChange
}: FloatingNodePropertiesProps) {
  const [nodeData, setNodeData] = useState<any>({});
  const [position, setPosition] = useState(defaultPosition);

  // Estado específico para cada tipo de nodo
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

  const [sftpFields, setStfpFields] = useState({
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
      setNodeData(node.data);
      
      // Cargar datos específicos según el tipo
      if (node.type === 'Command') {
        const details = node.data.details || {};
        setCommandFields({
          target: details.target || '',
          workingDirectory: details.working_directory || '',
          args: details.args || '',
          rawScript: details.raw_script || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'QueryQueue') {
        const details = node.data.details || {};
        setQueryFields({
          sqlConnId: details.sqlconn_id || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'SFTPDownloader' || node.type === 'SFTPUploader') {
        const details = node.data.details || {};
        setStfpFields({
          sftpLinkId: details.sftp_link_id || '',
          path: node.type === 'SFTPDownloader' ? (details.output || '') : (details.input || ''),
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'Zip') {
        const details = node.data.details || {};
        setZipFields({
          output: details.output || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'UnZip') {
        const details = node.data.details || {};
        setUnzipFields({
          input: details.input || '',
          output: details.output || '',
          returnOutput: details.return_output === true
        });
      } else if (node.type === 'CallPipeline') {
        const details = node.data.details || {};
        setCallPipelineFields({
          pipelineId: details.call_pipeline || '',
          waitForCompletion: details.wait_for_completion !== false
        });
      }
    }
  }, [node]);

  useEffect(() => {
    const savedPosition = localStorage.getItem(`nodePropertiesPosition_${node?.id}`);
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Error parsing saved node properties position', e);
      }
    }
  }, [node?.id]);

  // Actualizar el nodo
  const updateNodeLabel = (label: string) => {
    if (!node || readOnly) return;
    
    // Actualizar directamente el label
    const updatedData = { ...node.data, label };
    onUpdateNode(node.id, updatedData);
    setNodeData(updatedData);
  };

  // Actualizar detalles específicos de cada tipo de nodo
  const updateCommandDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      target: commandFields.target,
      working_directory: commandFields.workingDirectory,
      args: commandFields.args,
      raw_script: commandFields.rawScript,
      return_output: commandFields.returnOutput
    };
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  const updateQueryDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      sqlconn_id: queryFields.sqlConnId,
      return_output: queryFields.returnOutput
    };
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  const updateSftpDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      sftp_link_id: sftpFields.sftpLinkId,
      return_output: sftpFields.returnOutput
    };
    
    // Agregar input u output según el tipo
    if (node.type === 'SFTPDownloader') {
      details.output = sftpFields.path;
    } else {
      details.input = sftpFields.path;
    }
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  const updateZipDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      output: zipFields.output,
      return_output: zipFields.returnOutput
    };
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  const updateUnzipDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      input: unzipFields.input,
      output: unzipFields.output,
      return_output: unzipFields.returnOutput
    };
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  const updateCallPipelineDetails = () => {
    if (!node || readOnly) return;
    
    const details = {
      ...node.data.details,
      call_pipeline: callPipelineFields.pipelineId,
      wait_for_completion: callPipelineFields.waitForCompletion
    };
    
    const updatedData = { ...node.data, details };
    onUpdateNode(node.id, updatedData);
  };

  // Handlers para cambios en los campos
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    updateNodeLabel(e.target.value);
  };

  const handleCommandChange = (field: keyof typeof commandFields, value: any) => {
    if (readOnly) return;
    setCommandFields({ ...commandFields, [field]: value });
    setTimeout(updateCommandDetails, 100);
  };

  const handleQueryChange = (field: keyof typeof queryFields, value: any) => {
    if (readOnly) return;
    setQueryFields({ ...queryFields, [field]: value });
    setTimeout(updateQueryDetails, 100);
  };

  const handleSftpChange = (field: keyof typeof sftpFields, value: any) => {
    if (readOnly) return;
    setStfpFields({ ...sftpFields, [field]: value });
    setTimeout(updateSftpDetails, 100);
  };

  const handleZipChange = (field: keyof typeof zipFields, value: any) => {
    if (readOnly) return;
    setZipFields({ ...zipFields, [field]: value });
    setTimeout(updateZipDetails, 100);
  };

  const handleUnzipChange = (field: keyof typeof unzipFields, value: any) => {
    if (readOnly) return;
    setUnzipFields({ ...unzipFields, [field]: value });
    setTimeout(updateUnzipDetails, 100);
  };

  const handleCallPipelineChange = (field: keyof typeof callPipelineFields, value: any) => {
    if (readOnly) return;
    setCallPipelineFields({ ...callPipelineFields, [field]: value });
    setTimeout(updateCallPipelineDetails, 100);
  };

  const handleDeleteNode = () => {
    if (!node || readOnly) return;
    onDeleteNode(node.id);
  };

  const handlePositionChange = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
    localStorage.setItem(`nodePropertiesPosition_${node?.id}`, JSON.stringify(newPosition));
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  if (!node) return null;

  // Determinar el icono según el tipo de nodo
  const nodeIcon = NODE_TYPE_ICON_MAP[node.type] || null;

  return (
    <FloatingPanel
      title={`Propiedades: ${node.type}`}
      defaultPosition={position}
      onPositionChange={handlePositionChange}
      width={340}
      icon={nodeIcon}
      id={`node-properties-${node.id}`}
    >
      <div className="space-y-4">
        {/* Sección común para todos los nodos */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="node-label" className="text-xs">Nombre</Label>
            <Input
              id="node-label"
              value={nodeData.label || ''}
              onChange={handleLabelChange}
              disabled={readOnly}
              className="text-sm h-8"
              placeholder="Nombre del nodo"
            />
          </div>

          {/* Botón de eliminar si no es de solo lectura */}
          {!readOnly && node.type !== 'Pipeline Start' && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteNode}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Eliminar Nodo
            </Button>
          )}
        </div>

        <Separator />

        {/* Secciones específicas para cada tipo de nodo */}
        {node.type === 'Command' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="command-target" className="text-xs">Comando</Label>
              <Input
                id="command-target"
                value={commandFields.target}
                onChange={(e) => handleCommandChange('target', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="Ejemplo: bash, python, etc."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="command-working-dir" className="text-xs">Directorio de trabajo</Label>
              <Input
                id="command-working-dir"
                value={commandFields.workingDirectory}
                onChange={(e) => handleCommandChange('workingDirectory', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="Ejemplo: /tmp/scripts"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="command-args" className="text-xs">Argumentos</Label>
              <Input
                id="command-args"
                value={commandFields.args}
                onChange={(e) => handleCommandChange('args', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="Ejemplo: -c 'echo Hello'"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="command-script" className="text-xs">Script</Label>
              <Textarea
                id="command-script"
                value={commandFields.rawScript}
                onChange={(e) => handleCommandChange('rawScript', e.target.value)}
                disabled={readOnly}
                className="text-sm min-h-[100px]"
                placeholder="Código del script"
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

        {node.type === 'QueryQueue' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="query-connection" className="text-xs">Conexión SQL</Label>
              <Select
                value={queryFields.sqlConnId}
                onValueChange={(value) => handleQueryChange('sqlConnId', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="query-connection" className="text-sm h-8">
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

        {(node.type === 'SFTPDownloader' || node.type === 'SFTPUploader') && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sftp-connection" className="text-xs">Conexión SFTP</Label>
              <Select
                value={sftpFields.sftpLinkId}
                onValueChange={(value) => handleSftpChange('sftpLinkId', value)}
                disabled={readOnly}
              >
                <SelectTrigger id="sftp-connection" className="text-sm h-8">
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

            <div className="space-y-1">
              <Label htmlFor="sftp-path" className="text-xs">
                {node.type === 'SFTPDownloader' ? 'Ruta de destino' : 'Ruta de origen'}
              </Label>
              <Input
                id="sftp-path"
                value={sftpFields.path}
                onChange={(e) => handleSftpChange('path', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder={node.type === 'SFTPDownloader' ? '/download/to/here' : '/upload/from/here'}
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

        {node.type === 'Zip' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="zip-output" className="text-xs">Ruta de salida</Label>
              <Input
                id="zip-output"
                value={zipFields.output}
                onChange={(e) => handleZipChange('output', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="/path/to/output.zip"
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

        {node.type === 'UnZip' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="unzip-input" className="text-xs">Archivo a descomprimir</Label>
              <Input
                id="unzip-input"
                value={unzipFields.input}
                onChange={(e) => handleUnzipChange('input', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="/path/to/input.zip"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="unzip-output" className="text-xs">Directorio de salida</Label>
              <Input
                id="unzip-output"
                value={unzipFields.output}
                onChange={(e) => handleUnzipChange('output', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="/path/to/extract"
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

        {node.type === 'CallPipeline' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="call-pipeline-id" className="text-xs">Pipeline a ejecutar</Label>
              <Input
                id="call-pipeline-id"
                value={callPipelineFields.pipelineId}
                onChange={(e) => handleCallPipelineChange('pipelineId', e.target.value)}
                disabled={readOnly}
                className="text-sm h-8"
                placeholder="ID del pipeline"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pipeline-wait" className="text-xs">Esperar a completar</Label>
              <Switch
                id="pipeline-wait"
                checked={callPipelineFields.waitForCompletion}
                onCheckedChange={(checked) => handleCallPipelineChange('waitForCompletion', checked)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        {node.type === 'Pipeline Start' && (
          <div className="rounded-md bg-blue-50 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-4 w-4 text-blue-400" />
              </div>
              <div className="ml-2">
                <h3 className="text-xs font-medium text-blue-800">
                  Nodo inicial
                </h3>
                <div className="mt-1 text-xs text-blue-700">
                  <p>
                    Este es el nodo de inicio del pipeline. No puede ser eliminado 
                    y sirve como punto de entrada para la ejecución.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}