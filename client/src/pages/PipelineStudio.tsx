import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
// No necesitamos importar Layout ya que App.tsx ya lo incluye
import { PipelineTemplateManager } from "@/lib/pipeline-template-manager";
import PipelineEditor from "@/components/pipeline-studio/PipelineEditor";
import PipelineTemplateSelector from "@/components/pipeline-studio/PipelineTemplateSelector";
import PipelinePropertiesPanel from "@/components/pipeline-studio/PipelinePropertiesPanel";
import PipelineNodeProperties from "@/components/pipeline-studio/PipelineNodeProperties";
import PipelineYamlEditor from "@/components/pipeline-studio/PipelineYamlEditor";
import NodePalette from "@/components/pipeline-studio/NodePalette";
import DraggablePipelineProperties from "@/components/pipeline-studio/DraggablePipelineProperties";
import DraggableNodeProperties from "@/components/pipeline-studio/DraggableNodeProperties";
import PipelineLoadDialog from "@/components/pipeline-studio/PipelineLoadDialog";
import { 
  AlertTriangle, Info, TerminalSquare, CheckCircle2, PlusCircle, Copy, ArrowLeftRight,
  FolderOpen, Search, Edit, Loader2, ChevronLeft, ChevronRight, Settings2, Database,
  Download, Upload, FileArchive, File as FileIcon, ExternalLink, X, LayoutPanelLeft,
  LayoutPanelTop, Maximize2, Minimize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PipelineLayoutManager } from "@/lib/pipeline-layout-manager";

// Tipo de los modos de edición
type EditorMode = 'create' | 'edit' | 'view';

// Interfaz para las opciones de SFTP y SQL
interface SFTPOption {
  id: string;
  name: string;
}

interface SQLConnection {
  id: string;
  name: string;
}

// Componente principal de PipelineStudio
export default function PipelineStudio() {
  // Hooks para la navegación y el manejo de notificaciones
  const params = useParams<{ id?: string }>();
  const pipelineId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para los datos del pipeline
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [pipelineFlowData, setPipelineFlowData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [filteredPipelines, setFilteredPipelines] = useState<any[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>(pipelineId ? 'edit' : 'create');
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [yamlMode, setYamlMode] = useState<boolean>(false);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(true);
  const [agentOptions, setAgentOptions] = useState<any[]>([]);
  const [sftpOptions, setSftpOptions] = useState<SFTPOption[]>([]);
  const [sqlConnections, setSqlConnections] = useState<SQLConnection[]>([]);
  
  // Referencia al gestor de plantillas de pipeline
  const templateManager = new PipelineTemplateManager();
  
  // Efecto para cargar los datos del pipeline en modo edición
  useEffect(() => {
    if (pipelineId) {
      loadPipeline(pipelineId);
    } else {
      // Inicializar pipeline vacío en modo creación
      const emptyFlow = {
        nodes: [],
        edges: []
      };
      setPipelineFlowData(emptyFlow);
      setIsLoading(false);
    }
    
    // Cargar opciones de agentes, conexiones SFTP y SQL
    loadAgentOptions();
    loadSftpOptions();
    loadSqlConnections();
    
    // Cargar plantillas
    loadTemplates();
  }, [pipelineId]);
  
  // Cargar opciones de agentes
  const loadAgentOptions = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Error al cargar agentes');
      }
      const data = await response.json();
      setAgentOptions(data);
    } catch (error) {
      console.error('Error al cargar opciones de agentes:', error);
      toast({
        title: "Error al cargar agentes",
        description: "No se pudieron cargar los agentes disponibles",
        variant: "destructive"
      });
    }
  };
  
  // Cargar opciones de SFTP
  const loadSftpOptions = async () => {
    try {
      const response = await fetch('/api/sftp-links');
      if (!response.ok) {
        throw new Error('Error al cargar conexiones SFTP');
      }
      const data = await response.json();
      setSftpOptions(data);
    } catch (error) {
      console.error('Error al cargar opciones de SFTP:', error);
    }
  };
  
  // Cargar conexiones SQL
  const loadSqlConnections = async () => {
    try {
      const response = await fetch('/api/sql-connections');
      if (!response.ok) {
        throw new Error('Error al cargar conexiones SQL');
      }
      const data = await response.json();
      setSqlConnections(data);
    } catch (error) {
      console.error('Error al cargar conexiones SQL:', error);
    }
  };
  
  // Cargar plantillas de pipeline
  const loadTemplates = async () => {
    try {
      // Simulación de carga de plantillas
      const mockTemplates = [
        { id: 'template1', name: 'ETL Básico', description: 'Extracción, transformación y carga básica' },
        { id: 'template2', name: 'Descarga SFTP', description: 'Descargar archivos desde SFTP y procesarlos' },
        { id: 'template3', name: 'Pipeline SQL', description: 'Ejecutar consultas SQL secuenciales' }
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
    }
  };
  
  // Cargar listado de pipelines
  const loadPipelines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pipelines');
      if (!response.ok) {
        throw new Error('Error al cargar pipelines');
      }
      const data = await response.json();
      setPipelines(data);
      setFilteredPipelines(data);
    } catch (error) {
      console.error('Error al cargar pipelines:', error);
      toast({
        title: "Error al cargar pipelines",
        description: "No se pudieron cargar los pipelines existentes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar un pipeline por ID
  const loadPipeline = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pipelines/${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar pipeline');
      }
      const pipeline = await response.json();
      setPipelineData(pipeline);
      
      // Construir estructura de flujo para el editor visual
      const layoutManager = new PipelineLayoutManager();
      const flow = layoutManager.buildFlowFromPipeline(pipeline);
      
      setPipelineFlowData(flow);
      
      // Generar YAML si estamos en modo YAML
      if (yamlMode) {
        try {
          const yaml = templateManager.convertFlowToYaml(flow, {
            name: pipeline.name,
            description: pipeline.description || '',
            agent_passport_id: pipeline.agent_passport_id,
            abort_on_error: pipeline.abort_on_error === true
          });
          setYamlContent(yaml);
        } catch (error) {
          console.error("Error al convertir a YAML:", error);
        }
      }
    } catch (error) {
      console.error('Error al cargar pipeline:', error);
      toast({
        title: "Error al cargar pipeline",
        description: "No se pudo cargar el pipeline seleccionado",
        variant: "destructive"
      });
      
      // Redireccionar a creación si hay error
      navigate('/pipeline-studio');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar la selección de un nodo en el editor
  const handleNodeSelect = (node: any) => {
    setSelectedNode(node);
  };
  
  // Manejar cambios en el flujo del pipeline
  const handleFlowChange = (flowData: any, selectedNodeId?: string) => {
    setPipelineFlowData(flowData);
    setUnsavedChanges(true);
    
    // Si hay un nodo seleccionado, actualizar la referencia
    if (selectedNodeId) {
      const selectedNode = flowData.nodes.find((n: any) => n.id === selectedNodeId);
      setSelectedNode(selectedNode);
    }
    
    // Actualizar YAML si estamos en modo YAML
    if (yamlMode && pipelineData) {
      try {
        const yaml = templateManager.convertFlowToYaml(flowData, {
          name: pipelineData.name || 'Nuevo Pipeline',
          description: pipelineData.description || '',
          agent_passport_id: pipelineData.agent_passport_id || '',
          abort_on_error: pipelineData.abort_on_error === true
        });
        setYamlContent(yaml);
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
      }
    }
  };
  
  // Alternar entre modo visual y YAML
  const toggleYamlMode = () => {
    if (!yamlMode) {
      // Pasar de modo visual a YAML
      try {
        if (pipelineFlowData && pipelineData) {
          const yaml = templateManager.convertFlowToYaml(pipelineFlowData, {
            name: pipelineData.name || 'Nuevo Pipeline',
            description: pipelineData.description || '',
            agent_passport_id: pipelineData.agent_passport_id || '',
            abort_on_error: pipelineData.abort_on_error === true
          });
          setYamlContent(yaml);
        }
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
        toast({
          title: "Error al generar YAML",
          description: "No se pudo convertir el pipeline a formato YAML",
          variant: "destructive"
        });
      }
    } else {
      // Pasar de YAML a modo visual
      try {
        if (yamlContent) {
          const { flow, pipeline } = templateManager.convertYamlToFlow(yamlContent);
          setPipelineFlowData(flow);
          setPipelineData({
            ...pipelineData,
            name: pipeline.name || pipelineData?.name || 'Nuevo Pipeline',
            description: pipeline.description || pipelineData?.description || '',
            agent_passport_id: pipeline.agent_passport_id || pipelineData?.agent_passport_id || '',
            abort_on_error: pipeline.abort_on_error !== undefined ? pipeline.abort_on_error : (pipelineData?.abort_on_error === true)
          });
        }
      } catch (error) {
        console.error("Error al convertir de YAML:", error);
        toast({
          title: "Error al procesar YAML",
          description: "El formato YAML no es válido o contiene errores",
          variant: "destructive"
        });
        return; // No cambiar de modo si hay error
      }
    }
    
    setYamlMode(!yamlMode);
  };
  
  // Manejar cambios en el YAML
  const handleYamlChange = (yaml: string) => {
    setYamlContent(yaml);
    setUnsavedChanges(true);
  };
  
  // Guardar pipeline
  const savePipeline = async () => {
    try {
      setIsSaving(true);
      
      if (!pipelineData || !pipelineData.name) {
        toast({
          title: "Error al guardar",
          description: "El pipeline debe tener un nombre",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      
      // Si estamos en modo YAML, convertir primero a estructura de flujo
      if (yamlMode) {
        try {
          const { flow, pipeline } = templateManager.convertYamlToFlow(yamlContent);
          setPipelineFlowData(flow);
          setPipelineData({
            ...pipelineData,
            name: pipeline.name || pipelineData.name,
            description: pipeline.description || pipelineData.description || '',
            agent_passport_id: pipeline.agent_passport_id || pipelineData.agent_passport_id || '',
            abort_on_error: pipeline.abort_on_error !== undefined ? pipeline.abort_on_error : (pipelineData.abort_on_error === true)
          });
        } catch (error) {
          console.error("Error al convertir YAML:", error);
          toast({
            title: "Error en el formato YAML",
            description: "El YAML contiene errores y no puede ser procesado",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }
      
      // Construir estructura para guardar
      const pipelineToSave = templateManager.buildPipelineFromFlow(
        pipelineFlowData,
        {
          id: pipelineId,
          name: pipelineData.name,
          description: pipelineData.description || '',
          agent_passport_id: pipelineData.agent_passport_id || '',
          abort_on_error: pipelineData.abort_on_error === true
        }
      );
      
      // Llamar a la API para guardar
      const method = editorMode === 'create' ? 'POST' : 'PUT';
      const url = editorMode === 'create' ? '/api/pipelines' : `/api/pipelines/${pipelineId}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipelineToSave)
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar pipeline');
      }
      
      const savedPipeline = await response.json();
      
      toast({
        title: "Pipeline guardado",
        description: "El pipeline se ha guardado correctamente",
        variant: "default"
      });
      
      // Si estábamos creando, redirigir al modo edición
      if (editorMode === 'create') {
        navigate(`/pipeline-studio/${savedPipeline.id}`);
        setEditorMode('edit');
      }
      
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Error al guardar pipeline:', error);
      toast({
        title: "Error al guardar",
        description: `No se pudo guardar el pipeline. ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Manejar cambios en las propiedades del pipeline
  const handlePipelinePropertiesChange = (properties: any) => {
    setPipelineData({
      ...pipelineData,
      ...properties
    });
    setUnsavedChanges(true);
  };
  
  // Manejar cambios en las propiedades de un nodo
  const handleNodePropertiesChange = (nodeId: string, properties: any) => {
    const updatedNodes = pipelineFlowData.nodes.map((node: any) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...properties
          }
        };
      }
      return node;
    });
    
    setPipelineFlowData({
      ...pipelineFlowData,
      nodes: updatedNodes
    });
    
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          ...properties
        }
      });
    }
    
    setUnsavedChanges(true);
  };
  
  // Cargar una plantilla de pipeline
  const handleTemplateSelect = async (templateId: string) => {
    try {
      setIsLoading(true);
      
      // Simulación de carga de plantilla
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Plantilla no encontrada');
      }
      
      // Generar flujo a partir de la plantilla
      const { flow, pipeline } = templateManager.loadTemplate(templateId);
      
      setPipelineFlowData(flow);
      setPipelineData({
        name: template.name,
        description: template.description,
        agent_passport_id: '',
        abort_on_error: false
      });
      
      setEditorMode('create');
      setUnsavedChanges(true);
      
      toast({
        title: "Plantilla cargada",
        description: `La plantilla "${template.name}" se ha cargado correctamente`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error al cargar plantilla:', error);
      toast({
        title: "Error al cargar plantilla",
        description: "No se pudo cargar la plantilla seleccionada",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Duplicar un pipeline existente
  const handleDuplicatePipeline = async (pipelineId: string) => {
    try {
      setIsLoading(true);
      
      // Buscar el pipeline a duplicar
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) {
        throw new Error('Pipeline no encontrado');
      }
      
      // Cargar el pipeline completo con sus detalles
      const response = await fetch(`/api/pipelines/${pipelineId}`);
      if (!response.ok) {
        throw new Error('Error al cargar pipeline para duplicar');
      }
      const fullPipeline = await response.json();
      
      // Construir estructura de flujo para el editor visual
      const layoutManager = new PipelineLayoutManager();
      const flow = layoutManager.buildFlowFromPipeline(fullPipeline);
      
      // Actualizar estados
      setPipelineData({
        ...fullPipeline,
        name: `${fullPipeline.name} (Copia)`,
        id: undefined
      });
      setPipelineFlowData(flow);
      setEditorMode('create');
      setUnsavedChanges(true);
      
      // Generar YAML si estamos en modo YAML
      if (yamlMode) {
        try {
          const yaml = templateManager.convertFlowToYaml(flow, {
            name: `${pipeline.name} (Copia)`,
            description: pipeline.description || '',
            agent_passport_id: pipeline.agent_passport_id,
            abort_on_error: pipeline.abort_on_error === true
          });
          setYamlContent(yaml);
        } catch (error) {
          console.error("Error al convertir a YAML:", error);
        }
      }
      
      toast({
        title: "Pipeline duplicado",
        description: "El pipeline se ha duplicado correctamente. Guárdelo con un nuevo nombre.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error duplicando pipeline:", error);
      toast({
        title: "Error al duplicar pipeline",
        description: `No se pudo duplicar el pipeline. ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Renderizar el componente
  return (
    <div className="container py-4 mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {editorMode === 'create' ? 'Crear Nuevo Pipeline' : 'Editor de Pipeline'}
          </h1>
          <p className="text-muted-foreground">
            {editorMode === 'create' 
              ? 'Diseña un nuevo pipeline de procesamiento' 
              : pipelineData?.name ? `Editando: ${pipelineData.name}` : 'Cargando pipeline...'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/pipelines')}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver a Pipelines
          </Button>
          
          {editorMode !== 'view' && (
            <>
              <Button 
                variant="default" 
                onClick={savePipeline}
                disabled={isSaving || (!pipelineData?.name)}
                className="flex items-center"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar Pipeline'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {unsavedChanges && (
        <Alert className="mb-4 border-amber-500 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Hay cambios sin guardar</AlertTitle>
          <AlertDescription>
            Has realizado cambios en el pipeline que no han sido guardados.
          </AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando...</span>
        </div>
      ) : (
        <>
          {/* Tabs para alternar entre editor visual y YAML */}
          <Tabs defaultValue="visual" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="visual" onClick={() => yamlMode && toggleYamlMode()}>
                  <LayoutPanelLeft className="h-4 w-4 mr-2" />
                  Editor Visual
                </TabsTrigger>
                <TabsTrigger value="yaml" onClick={() => !yamlMode && toggleYamlMode()}>
                  <TerminalSquare className="h-4 w-4 mr-2" />
                  Editor YAML
                </TabsTrigger>
              </TabsList>
              
              {/* Dialog para seleccionar plantilla */}
              <div className="flex items-center space-x-2">
                {/* Dialog para cargar pipeline existente */}
                <PipelineLoadDialog onDuplicate={handleDuplicatePipeline} />
                
                {/* Dialog para cargar plantilla */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Cargar Plantilla
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Seleccionar Plantilla</DialogTitle>
                      <DialogDescription>
                        Elige una plantilla predefinida para comenzar tu pipeline.
                      </DialogDescription>
                    </DialogHeader>
                    <PipelineTemplateSelector
                      templates={templates}
                      onSelect={handleTemplateSelect}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <TabsContent value="visual" className="mt-4">
              <div className="flex flex-col space-y-4">
                {/* Editor de pipeline visual */}
                <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                  <PipelineEditor
                    flow={pipelineFlowData}
                    onFlowChange={handleFlowChange}
                    onNodeSelect={handleNodeSelect}
                    readOnly={editorMode === 'view'}
                  />
                  
                  {/* Paleta de nodos */}
                  <NodePalette />
                  
                  {/* Panel de propiedades arrastrable */}
                  {pipelineData && (
                    <DraggablePipelineProperties
                      pipeline={pipelineData}
                      onChange={handlePipelinePropertiesChange}
                      agentOptions={agentOptions}
                      readOnly={editorMode === 'view'}
                    />
                  )}
                  
                  {/* Panel de propiedades del nodo seleccionado */}
                  {selectedNode && (
                    <DraggableNodeProperties
                      node={selectedNode}
                      onChange={(props) => handleNodePropertiesChange(selectedNode.id, props)}
                      sftpOptions={sftpOptions}
                      sqlConnections={sqlConnections}
                      readOnly={editorMode === 'view'}
                    />
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="yaml" className="mt-4">
              <PipelineYamlEditor
                value={yamlContent}
                onChange={handleYamlChange}
                readOnly={editorMode === 'view'}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}