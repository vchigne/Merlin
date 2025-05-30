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
import { convertToFlowCoordinates } from "../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// No necesitamos importar Layout ya que App.tsx ya lo incluye
import { PipelineTemplateManager } from "@/lib/pipeline-template-manager";

import SimplePipelineLoader from "@/components/pipeline-studio/SimplePipelineLoader";
import { pipelineToYaml, yamlToPipeline, validateYamlStructure } from '@/lib/yaml-converter';
import PipelineVisualizerNew from "@/components/dashboard/PipelineVisualizerNew";
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
  const [yamlErrors, setYamlErrors] = useState<string[]>([]);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(true);
  const [agentOptions, setAgentOptions] = useState<any[]>([]);
  const [sftpOptions, setSftpOptions] = useState<SFTPOption[]>([]);
  const [sqlConnections, setSqlConnections] = useState<SQLConnection[]>([]);
  
  // Referencia al gestor de plantillas de pipeline
  const templateManager = PipelineTemplateManager.getInstance();
  
  // Función para cargar pipeline completo con unidades (usando las queries existentes)
  const loadPipelineComplete = async (pipelineId: string) => {
    try {
      console.log("Cargando pipeline completo:", pipelineId);
      
      // Usar executeQuery como el visualizador existente
      const { executeQuery } = await import('@/lib/hasura-client');
      const { PIPELINE_UNITS_QUERY } = await import('@shared/queries');
      
      // Cargar pipeline básico
      const pipelineResponse = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetPipeline($pipelineId: uuid!) {
              merlin_agent_Pipeline_by_pk(id: $pipelineId) {
                id
                name
                description
                abort_on_error
                notify_on_abort_email_id
                notify_on_abort_webhook_id
                created_at
                updated_at
                agent_passport_id
                disposable
              }
            }
          `,
          variables: { pipelineId }
        })
      });

      const pipelineResult = await pipelineResponse.json();
      
      if (pipelineResult.errors) {
        throw new Error(pipelineResult.errors[0].message);
      }

      if (!pipelineResult.data.merlin_agent_Pipeline_by_pk) {
        throw new Error('Pipeline no encontrado');
      }

      // Cargar unidades usando la query existente que funciona
      const unitsResult = await executeQuery(PIPELINE_UNITS_QUERY, { pipelineId });
      
      if (unitsResult.errors) {
        throw new Error(unitsResult.errors[0].message);
      }

      // Combinar pipeline con sus unidades
      const completePipeline = {
        ...pipelineResult.data.merlin_agent_Pipeline_by_pk,
        PipelineUnits: unitsResult.data.merlin_agent_PipelineUnit || []
      };

      console.log("Pipeline completo cargado:", completePipeline);
      return completePipeline;
      
    } catch (error) {
      console.error("Error al cargar pipeline completo:", error);
      throw error;
    }
  };

  // Función para manejar la selección de un pipeline
  const handlePipelineSelect = async (pipeline: any) => {
    console.log("Pipeline seleccionado:", pipeline);
    
    try {
      // Cargar el pipeline completo con sus unidades
      const completePipeline = await loadPipelineComplete(pipeline.id);
      setPipelineData(completePipeline);
      setUnsavedChanges(false);
      
      // Convertir a YAML si estamos en modo YAML
      if (yamlMode) {
        try {
          const yaml = pipelineToYaml(completePipeline);
          setYamlContent(yaml);
          setYamlErrors([]);
        } catch (error) {
          console.error("Error al convertir a YAML:", error);
          setYamlErrors([error instanceof Error ? error.message : 'Error al convertir a YAML']);
        }
      }
      
      toast({
        title: "Pipeline cargado",
        description: `Pipeline "${completePipeline.name}" cargado con ${completePipeline.PipelineUnits.length} unidades`
      });
      
    } catch (error) {
      console.error("Error al cargar pipeline:", error);
      toast({
        title: "Error al cargar pipeline",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };
  
  // Función para alternar entre modo visual y YAML
  const toggleYamlMode = () => {
    if (!yamlMode && pipelineData) {
      // Convertir a YAML al activar modo YAML
      try {
        const yaml = pipelineToYaml(pipelineData);
        setYamlContent(yaml);
        setYamlErrors([]);
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
        setYamlErrors([error instanceof Error ? error.message : 'Error al convertir a YAML']);
      }
    }
    setYamlMode(!yamlMode);
  };
  
  // Función para manejar cambios en el contenido YAML
  const handleYamlChange = (newYamlContent: string) => {
    setYamlContent(newYamlContent);
    setUnsavedChanges(true);
    
    // Validar YAML en tiempo real
    const validation = validateYamlStructure(newYamlContent);
    setYamlErrors(validation.errors);
  };
  
  // Función para aplicar cambios del YAML al pipeline
  const applyYamlChanges = () => {
    try {
      if (yamlErrors.length > 0) {
        toast({
          title: "Error en YAML",
          description: "Corrige los errores antes de aplicar los cambios",
          variant: "destructive"
        });
        return;
      }
      
      const updatedPipeline = yamlToPipeline(yamlContent);
      setPipelineData({
        ...pipelineData,
        ...updatedPipeline
      });
      
      toast({
        title: "YAML aplicado",
        description: "Los cambios del YAML se han aplicado al pipeline",
        variant: "default"
      });
      
    } catch (error) {
      console.error("Error al aplicar YAML:", error);
      toast({
        title: "Error al aplicar YAML",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
    }
  };
  
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
      
      // Construir estructura de flujo para el editor visual usando las unidades del pipeline
      const pipelineUnits = pipeline.PipelineUnits || [];
      
      // Usar la función convertToFlowCoordinates para generar el flujo
      const flow = convertToFlowCoordinates(pipelineUnits);
      
      setPipelineFlowData(flow);
      
      // Generar YAML si estamos en modo YAML
      if (yamlMode) {
        try {
          const yaml = pipelineToYaml(pipeline);
          setYamlContent(yaml);
          setYamlErrors([]);
        } catch (error) {
          console.error("Error al convertir a YAML:", error);
          setYamlErrors([error instanceof Error ? error.message : 'Error al convertir a YAML']);
        }
      }
    } catch (error) {
      console.error('Error al cargar pipeline:', error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      
      toast({
        title: "Error al cargar pipeline",
        description: `Error: ${errorMsg}`,
        variant: "destructive"
      });
      
      // Mantener al usuario en la misma página para que pueda ver el error
      // y decidir qué hacer a continuación
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
        const yaml = pipelineToYaml(pipelineData);
        setYamlContent(yaml);
        setYamlErrors([]);
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
        setYamlErrors([error instanceof Error ? error.message : 'Error al convertir a YAML']);
      }
    }
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
      
      // Si estamos en modo YAML, convertir primero a estructura de pipeline
      if (yamlMode) {
        try {
          const updatedPipeline = yamlToPipeline(yamlContent);
          setPipelineData({
            ...pipelineData,
            ...updatedPipeline
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
      const pipelineToSave = {
        id: pipelineId,
        name: pipelineData.name,
        description: pipelineData.description || '',
        agent_passport_id: pipelineData.agent_passport_id || '',
        abort_on_error: pipelineData.abort_on_error === true,
        PipelineUnits: pipelineData.PipelineUnits || []
      };
      
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
      // Cargar plantilla simplificada
      const templateData = {
        name: template.name,
        description: template.description,
        PipelineUnits: []
      };
      
      setPipelineFlowData({ nodes: [], edges: [] });
      setPipelineData(templateData);
      
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
      const flow = convertToFlowCoordinates(fullPipeline.PipelineUnits || []);
      
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
          const yamlData = {
            ...fullPipeline,
            name: `${fullPipeline.name} (Copia)`,
            id: undefined
          };
          const yaml = pipelineToYaml(yamlData);
          setYamlContent(yaml);
          setYamlErrors([]);
        } catch (error) {
          console.error("Error al convertir a YAML:", error);
          setYamlErrors([error instanceof Error ? error.message : 'Error al convertir a YAML']);
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
                <SimplePipelineLoader onPipelineSelect={handlePipelineSelect} />
                
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
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {templates.map(template => (
                        <Card 
                          key={template.id} 
                          className="cursor-pointer hover:bg-secondary/30 transition-colors"
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <TabsContent value="visual" className="mt-4">
              <div className="flex flex-col space-y-4">
                {/* Editor de pipeline visual */}
                <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                  {/* Visualización del pipeline para el studio */}
                  {pipelineData ? (
                    <PipelineVisualizerNew 
                      pipelineId={pipelineData.id} 
                      showSelector={false} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      <div className="text-center">
                        <p className="text-lg mb-2">No hay pipeline cargado</p>
                        <p className="text-sm">Usa el botón "Cargar Pipeline" para comenzar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="yaml" className="mt-4">
              {/* Mostrar errores de YAML si existen */}
              {yamlErrors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Errores en el YAML:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {yamlErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Editor YAML simple */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={applyYamlChanges}
                      disabled={yamlErrors.length > 0 || !yamlContent.trim() || editorMode === 'view'}
                      size="sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Aplicar Cambios YAML
                    </Button>
                  </div>
                </div>
                
                <textarea
                  value={yamlContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleYamlChange(e.target.value)}
                  placeholder="# Pipeline YAML
name: 'Mi Pipeline'
description: 'Descripción del pipeline'
configuration:
  agent_passport_id: 'agent-id'
  abort_on_error: true
units: []"
                  className="min-h-[500px] font-mono text-sm w-full p-3 border rounded-lg"
                  readOnly={editorMode === 'view'}
                />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}