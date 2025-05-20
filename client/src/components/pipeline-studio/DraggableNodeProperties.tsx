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
  onChange,
  readOnly = false,
  sftpOptions = [],
  sqlConnOptions = [],
  sqlConnections = [],
  initialPosition = { x: window.innerWidth - 350, y: 70 }
}) => {
  const [label, setLabel] = useState('');
  
  // Estados específicos para cada tipo de nodo
  const [commandFields, setCommandFields] = useState({
    target: '',
    working_directory: '',
    args: '',
    raw_script: ''
  });
  
  const [sftpDownloaderFields, setSftpDownloaderFields] = useState({
    sftp_link_id: '',
    output: '',
    return_output: false
  });
  
  const [sftpUploaderFields, setSftpUploaderFields] = useState({
    sftp_link_id: '',
    input: '',
    return_output: false
  });
  
  const [zipFields, setZipFields] = useState({
    output: '',
    return_output: false
  });
  
  const [unzipFields, setUnzipFields] = useState({
    input: '',
    output: '',
    return_output: false
  });
  
  const [pipelineCallFields, setPipelineCallFields] = useState({
    pipeline_id: ''
  });
  
  const [queryFields, setQueryFields] = useState({
    sql_conn_id: '',
    path: '',
    return_output: false
  });
  
  // Inicializar estados con datos del nodo
  useEffect(() => {
    if (!node || !node.data) return;
    
    setLabel(node.data.label || '');
    
    if (node.data.details) {
      // Configurar campos específicos según el tipo de nodo
      
      if (node.type === 'commandNode' && node.data.details.command) {
        setCommandFields({
          target: node.data.details.command.target || '',
          working_directory: node.data.details.command.working_directory || '',
          args: node.data.details.command.args || '',
          raw_script: node.data.details.command.raw_script || ''
        });
      }
      
      else if (node.type === 'sftpDownloaderNode' && node.data.details.sftpDownloader) {
        setSftpDownloaderFields({
          sftp_link_id: node.data.details.sftpDownloader.sftp_link_id || '',
          output: node.data.details.sftpDownloader.output || '',
          return_output: !!node.data.details.sftpDownloader.return_output
        });
      }
      
      else if (node.type === 'sftpUploaderNode' && node.data.details.sftpUploader) {
        setSftpUploaderFields({
          sftp_link_id: node.data.details.sftpUploader.sftp_link_id || '',
          input: node.data.details.sftpUploader.input || '',
          return_output: !!node.data.details.sftpUploader.return_output
        });
      }
      
      else if (node.type === 'zipNode' && node.data.details.zip) {
        setZipFields({
          output: node.data.details.zip.output || '',
          return_output: !!node.data.details.zip.return_output
        });
      }
      
      else if (node.type === 'unzipNode' && node.data.details.unzip) {
        setUnzipFields({
          input: node.data.details.unzip.input || '',
          output: node.data.details.unzip.output || '',
          return_output: !!node.data.details.unzip.return_output
        });
      }
      
      else if (node.type === 'callPipelineNode' && node.data.details.pipelineCall) {
        setPipelineCallFields({
          pipeline_id: node.data.details.pipelineCall.pipeline_id || ''
        });
      }
      
      else if (node.type === 'queryNode' && node.data.details.query) {
        setQueryFields({
          sql_conn_id: node.data.details.query.sql_conn_id || '',
          path: node.data.details.query.path || '',
          return_output: !!node.data.details.query.return_output
        });
      }
    }
  }, [node]);
  
  // Manejar cambio de etiqueta
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    
    const newLabel = e.target.value;
    setLabel(newLabel);
    
    const updatedData = { ...node.data, label: newLabel };
    onChange(updatedData);
  };
  
  const handleCommandChange = (field: keyof typeof commandFields, value: any) => {
    if (readOnly) return;
    
    setCommandFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        command: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleSFTPDownloaderChange = (field: keyof typeof sftpDownloaderFields, value: any) => {
    if (readOnly) return;
    
    setSftpDownloaderFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        sftpDownloader: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleSFTPUploaderChange = (field: keyof typeof sftpUploaderFields, value: any) => {
    if (readOnly) return;
    
    setSftpUploaderFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        sftpUploader: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleZipChange = (field: keyof typeof zipFields, value: any) => {
    if (readOnly) return;
    
    setZipFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        zip: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleUnzipChange = (field: keyof typeof unzipFields, value: any) => {
    if (readOnly) return;
    
    setUnzipFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        unzip: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handlePipelineCallChange = (value: string) => {
    if (readOnly) return;
    
    setPipelineCallFields(prev => {
      const updated = { ...prev, pipeline_id: value };
      const details = {
        ...node.data.details,
        pipelineCall: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleQueryChange = (field: keyof typeof queryFields, value: any) => {
    if (readOnly) return;
    
    setQueryFields(prev => {
      const updated = { ...prev, [field]: value };
      const details = {
        ...node.data.details,
        query: updated
      };
      onChange({ ...node.data, details });
      return updated;
    });
  };
  
  const handleDeleteNode = () => {
    if (readOnly) return;
    // Esta función ahora no hace nada porque el prop onDeleteNode no existe
    console.log("Delete node requested for:", node.id);
    // En una implementación futura, podríamos usar un callback opcional
  };
  
  if (!node) return null;
  
  // Obtener el título del panel según el tipo de nodo
  const getNodeTitle = () => {
    switch (node.type) {
      case 'commandNode':
        return 'Comando';
      case 'queryNode':
        return 'Consulta SQL';
      case 'sftpDownloaderNode':
        return 'Descarga SFTP';
      case 'sftpUploaderNode':
        return 'Subida SFTP';
      case 'zipNode':
        return 'Compresión ZIP';
      case 'unzipNode':
        return 'Extracción ZIP';
      case 'callPipelineNode':
        return 'Llamada a Pipeline';
      case 'pipelineStart':
        return 'Inicio de Pipeline';
      default:
        return 'Propiedades del Nodo';
    }
  };
  
  // Obtener el icono según el tipo de nodo
  const getNodeIcon = () => {
    return NODE_TYPE_ICONS[node.type] || NODE_TYPE_ICONS.default;
  };
  
  // Obtener el color según el tipo de nodo
  const getNodeColor = () => {
    return NODE_TYPE_COLORS[node.type] || '';
  };
  
  return (
    <DraggablePanel 
      title={getNodeTitle()}
      initialPosition={initialPosition}
      icon={getNodeIcon()}
      iconClass={getNodeColor()}
      onClose={handleDeleteNode}
      closable={!readOnly}
      defaultSize={{ width: 320, height: 'auto' }}
    >
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Campo de etiqueta común a todos los nodos */}
        <div>
          <Label htmlFor="node-label" className="text-sm font-medium">Etiqueta</Label>
          <Input
            id="node-label"
            value={label}
            onChange={handleLabelChange}
            placeholder="Etiqueta del nodo"
            className="mt-1"
            disabled={readOnly}
          />
        </div>
        
        <Separator />
        
        {/* Campos específicos según el tipo de nodo */}
        {node.type === 'commandNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="command-target" className="text-sm font-medium">Comando</Label>
              <Input
                id="command-target"
                value={commandFields.target}
                onChange={(e) => handleCommandChange('target', e.target.value)}
                placeholder="Comando a ejecutar"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div>
              <Label htmlFor="command-args" className="text-sm font-medium">Argumentos</Label>
              <Input
                id="command-args"
                value={commandFields.args}
                onChange={(e) => handleCommandChange('args', e.target.value)}
                placeholder="Argumentos del comando"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div>
              <Label htmlFor="command-dir" className="text-sm font-medium">Directorio de trabajo</Label>
              <Input
                id="command-dir"
                value={commandFields.working_directory}
                onChange={(e) => handleCommandChange('working_directory', e.target.value)}
                placeholder="Directorio de trabajo"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div>
              <Label htmlFor="command-script" className="text-sm font-medium">Script</Label>
              <Textarea
                id="command-script"
                value={commandFields.raw_script}
                onChange={(e) => handleCommandChange('raw_script', e.target.value)}
                placeholder="Script a ejecutar"
                className="mt-1 min-h-[100px]"
                disabled={readOnly}
              />
            </div>
          </div>
        )}
        
        {node.type === 'sftpDownloaderNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sftp-link" className="text-sm font-medium">Conexión SFTP</Label>
              <Select
                value={sftpDownloaderFields.sftp_link_id}
                onValueChange={(value) => handleSFTPDownloaderChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecciona conexión SFTP" />
                </SelectTrigger>
                <SelectContent>
                  {sftpOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sftp-output" className="text-sm font-medium">Ruta de salida</Label>
              <Input
                id="sftp-output"
                value={sftpDownloaderFields.output}
                onChange={(e) => handleSFTPDownloaderChange('output', e.target.value)}
                placeholder="Ruta de salida"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={sftpDownloaderFields.return_output}
                onCheckedChange={(value) => handleSFTPDownloaderChange('return_output', value)}
                disabled={readOnly}
              />
              <Label className="text-sm">Retornar salida</Label>
            </div>
          </div>
        )}
        
        {node.type === 'sftpUploaderNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sftp-link" className="text-sm font-medium">Conexión SFTP</Label>
              <Select
                value={sftpUploaderFields.sftp_link_id}
                onValueChange={(value) => handleSFTPUploaderChange('sftp_link_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecciona conexión SFTP" />
                </SelectTrigger>
                <SelectContent>
                  {sftpOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sftp-input" className="text-sm font-medium">Ruta de entrada</Label>
              <Input
                id="sftp-input"
                value={sftpUploaderFields.input}
                onChange={(e) => handleSFTPUploaderChange('input', e.target.value)}
                placeholder="Ruta de entrada"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={sftpUploaderFields.return_output}
                onCheckedChange={(value) => handleSFTPUploaderChange('return_output', value)}
                disabled={readOnly}
              />
              <Label className="text-sm">Retornar salida</Label>
            </div>
          </div>
        )}
        
        {node.type === 'zipNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="zip-output" className="text-sm font-medium">Ruta de salida (archivo ZIP)</Label>
              <Input
                id="zip-output"
                value={zipFields.output}
                onChange={(e) => handleZipChange('output', e.target.value)}
                placeholder="Ruta de salida"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={zipFields.return_output}
                onCheckedChange={(value) => handleZipChange('return_output', value)}
                disabled={readOnly}
              />
              <Label className="text-sm">Retornar salida</Label>
            </div>
          </div>
        )}
        
        {node.type === 'unzipNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="unzip-input" className="text-sm font-medium">Archivo ZIP a extraer</Label>
              <Input
                id="unzip-input"
                value={unzipFields.input}
                onChange={(e) => handleUnzipChange('input', e.target.value)}
                placeholder="Ruta al archivo ZIP"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div>
              <Label htmlFor="unzip-output" className="text-sm font-medium">Directorio de extracción</Label>
              <Input
                id="unzip-output"
                value={unzipFields.output}
                onChange={(e) => handleUnzipChange('output', e.target.value)}
                placeholder="Directorio de salida"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={unzipFields.return_output}
                onCheckedChange={(value) => handleUnzipChange('return_output', value)}
                disabled={readOnly}
              />
              <Label className="text-sm">Retornar salida</Label>
            </div>
          </div>
        )}
        
        {node.type === 'callPipelineNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="pipeline-id" className="text-sm font-medium">ID del Pipeline</Label>
              <Input
                id="pipeline-id"
                value={pipelineCallFields.pipeline_id}
                onChange={(e) => handlePipelineCallChange(e.target.value)}
                placeholder="ID del pipeline a llamar"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-start mt-2">
              <Info className="h-4 w-4 mr-2 mt-0.5" />
              <span>El pipeline llamado debe existir y estar accesible para el agente.</span>
            </div>
          </div>
        )}
        
        {node.type === 'queryNode' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sql-conn" className="text-sm font-medium">Conexión SQL</Label>
              <Select
                value={queryFields.sql_conn_id}
                onValueChange={(value) => handleQueryChange('sql_conn_id', value)}
                disabled={readOnly}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecciona conexión SQL" />
                </SelectTrigger>
                <SelectContent>
                  {(sqlConnections.length > 0 ? sqlConnections : sqlConnOptions).map((option: any) => (
                    <SelectItem key={option.value || option.id} value={option.value || option.id}>
                      {option.label || option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="query-path" className="text-sm font-medium">Ruta de salida</Label>
              <Input
                id="query-path"
                value={queryFields.path}
                onChange={(e) => handleQueryChange('path', e.target.value)}
                placeholder="Ruta de salida para el resultado"
                className="mt-1"
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={queryFields.return_output}
                onCheckedChange={(value) => handleQueryChange('return_output', value)}
                disabled={readOnly}
              />
              <Label className="text-sm">Retornar salida</Label>
            </div>
          </div>
        )}
        
        {/* Sección de ayuda contextual */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {readOnly 
              ? "Modo de solo lectura. No se pueden editar las propiedades."
              : "Modifica las propiedades del nodo y haz clic fuera del panel para aplicar los cambios."}
          </p>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default DraggableNodeProperties;