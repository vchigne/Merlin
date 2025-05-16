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
import PipelineVisualEditor from "@/components/pipeline-studio/PipelineVisualEditor";
import PipelineTemplateSelector from "@/components/pipeline-studio/PipelineTemplateSelector";
import PipelinePropertiesPanel from "@/components/pipeline-studio/PipelinePropertiesPanel";
import PipelineNodeProperties from "@/components/pipeline-studio/PipelineNodeProperties";
import PipelineYamlEditor from "@/components/pipeline-studio/PipelineYamlEditor";
import { 
  AlertTriangle, Info, TerminalSquare, CheckCircle2, PlusCircle, Copy, ArrowLeftRight,
  FolderOpen, Search, Edit, Loader2, ChevronLeft, ChevronRight, Settings2, Database,
  Download, Upload, FileArchive, File as FileIcon, ExternalLink, X, LayoutPanelLeft,
  LayoutPanelTop, Maximize2, Minimize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tipo de los modos de edición
type EditorMode = 'create' | 'edit' | 'view';

export default function PipelineStudio() {
  // Obtener parámetros de la URL
  const [location, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  
  // Estados para la gestión del editor
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [pipelineFlowData, setPipelineFlowData] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState('visual');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [agentOptions, setAgentOptions] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [sftpConnections, setSftpConnections] = useState<any[]>([]);
  const [sqlConnections, setSqlConnections] = useState<any[]>([]);
  const [availablePipelines, setAvailablePipelines] = useState<any[]>([]);
  
  // Estados para el diálogo de selección de pipelines
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [allPipelines, setAllPipelines] = useState<any[]>([]);
  const [filteredPipelines, setFilteredPipelines] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para controlar la visibilidad de paneles laterales
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showNodePalette, setShowNodePalette] = useState(true);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    // Verificar si estamos editando un pipeline existente
    const pipelineIdFromURL = window.location.pathname.split('/').pop();
    if (pipelineIdFromURL && pipelineIdFromURL !== 'pipeline-studio') {
      setPipelineId(pipelineIdFromURL);
      setEditorMode('edit');
      fetchPipelineData(pipelineIdFromURL);
    }

    // Cargar lista de agentes disponibles
    fetchAgents();
    
    // Cargar conexiones SFTP y SQL para los paneles de propiedades
    fetchSFTPConnections();
    fetchSQLConnections();
  }, []);

  // Función para cargar datos de un pipeline existente
  const fetchPipelineData = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pipelines/${id}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar el pipeline');
      }
      const data = await response.json();
      setPipelineData(data);
      
      // Generar los datos del flujo para el editor visual
      const flowData = generateFlowFromPipeline(data);
      setPipelineFlowData(flowData);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar el pipeline:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el pipeline seleccionado."
      });
      setIsLoading(false);
    }
  };

  // Función para cargar lista de agentes
  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los agentes');
      }
      const data = await response.json();
      setAgentOptions(data.map((agent: any) => ({
        label: agent.name,
        value: agent.id,
        is_healthy: agent.is_healthy
      })));
    } catch (error) {
      console.error('Error al cargar agentes:', error);
    }
  };
  
  // Función para cargar las conexiones SFTP
  const fetchSFTPConnections = async () => {
    try {
      const response = await fetch('/api/sftp-links');
      if (!response.ok) {
        throw new Error('No se pudieron cargar las conexiones SFTP');
      }
      const data = await response.json();
      setSftpConnections(data);
    } catch (error) {
      console.error('Error al cargar conexiones SFTP:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las conexiones SFTP."
      });
    }
  };
  
  // Función para cargar las conexiones SQL
  const fetchSQLConnections = async () => {
    try {
      const response = await fetch('/api/sql-connections');
      if (!response.ok) {
        throw new Error('No se pudieron cargar las conexiones SQL');
      }
      const data = await response.json();
      setSqlConnections(data);
    } catch (error) {
      console.error('Error al cargar conexiones SQL:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las conexiones SQL."
      });
    }
  };
  
  // Función para cargar todos los pipelines
  const fetchAllPipelines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pipelines');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los pipelines');
      }
      const data = await response.json();
      setAllPipelines(data);
      setFilteredPipelines(data);
      setAvailablePipelines(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar pipelines:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los pipelines disponibles."
      });
      setIsLoading(false);
    }
  };
  
  // Función para filtrar los pipelines según el término de búsqueda
  const handleSearchPipelines = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredPipelines(allPipelines);
      return;
    }
    
    const filtered = allPipelines.filter((pipeline: any) => 
      pipeline.name.toLowerCase().includes(term.toLowerCase()) || 
      (pipeline.description && pipeline.description.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredPipelines(filtered);
  };
  
  // Función para abrir el diálogo de cargar pipeline
  const handleOpenLoadDialog = () => {
    fetchAllPipelines();
    setIsLoadDialogOpen(true);
  };

  // Función para generar datos del flujo visual desde un pipeline
  const generateFlowFromPipeline = (pipeline: any) => {
    // Implementación de la lógica para convertir estructura de pipeline a nodos y conexiones
    // para el editor visual
    const nodes: Array<any> = [];
    const edges: Array<{id: string, source: string, target: string, animated: boolean}> = [];
    
    // Crear nodo inicial
    nodes.push({
      id: 'pipeline-start',
      type: 'pipelineStart',
      data: { 
        label: pipeline.name || 'Nuevo Pipeline',
        description: pipeline.description || '',
        agentId: pipeline.agent_passport_id
      },
      position: { x: 250, y: 50 }
    });
    
    // Si el pipeline tiene unidades, crear nodos para cada una
    if (pipeline.units && pipeline.units.length > 0) {
      pipeline.units.forEach((unit: any, index: number) => {
        const nodeType = getNodeTypeFromUnit(unit);
        
        nodes.push({
          id: unit.id,
          type: nodeType,
          data: { 
            label: unit.name || `Unidad ${index + 1}`,
            properties: unit.properties || {},
            options: unit.options || {}
          },
          position: { x: 250, y: 150 + (index * 100) }
        });
        
        // Conectar con el nodo anterior
        if (index === 0) {
          // Conectar con el inicio del pipeline
          edges.push({
            id: `e-start-${unit.id}`,
            source: 'pipeline-start',
            target: unit.id,
            animated: false
          });
        } else {
          // Conectar con la unidad anterior
          const prevUnit = pipeline.units[index - 1];
          edges.push({
            id: `e-${prevUnit.id}-${unit.id}`,
            source: prevUnit.id,
            target: unit.id,
            animated: false
          });
        }
      });
    }
    
    return { nodes, edges };
  };
  
  // Función para determinar el tipo de nodo según el tipo de unidad
  const getNodeTypeFromUnit = (unit: any) => {
    // Lógica para determinar el tipo de nodo según el tipo de unidad del pipeline
    if (unit.command_id) return 'commandNode';
    if (unit.query_queue_id) return 'queryNode';
    if (unit.sftp_downloader_id) return 'sftpDownloaderNode';
    if (unit.sftp_uploader_id) return 'sftpUploaderNode';
    if (unit.zip_id) return 'zipNode';
    if (unit.unzip_id) return 'unzipNode';
    if (unit.call_pipeline) return 'callPipelineNode';
    
    return 'genericNode';
  };

  // Función para seleccionar una plantilla
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    
    // Generar un pipeline básico a partir de la plantilla
    const newPipeline = {
      name: `Nuevo pipeline desde ${template.name}`,
      description: template.description,
      agent_passport_id: '',
      abort_on_error: true,
      units: template.units || []
    };
    
    setPipelineData(newPipeline);
    
    // Generar datos para el editor visual
    const flowData = generateFlowFromPipeline(newPipeline);
    setPipelineFlowData(flowData);
  };
  
  // Función para actualizar los datos del pipeline desde el editor visual
  const handleVisualEditorChange = (updatedFlow: any, selected: any = null) => {
    // Convertir los datos del editor visual a la estructura del pipeline
    const updatedPipeline = convertFlowToPipeline(updatedFlow);
    setPipelineData(updatedPipeline);
    setUnsavedChanges(true);
    
    // Actualizar el nodo seleccionado
    if (selected !== undefined) {
      // Si se seleccionó un nodo, buscarlo en los nodos del flujo
      const selectedNodeData = selected ? 
        updatedFlow.nodes.find((node: any) => node.id === selected) : 
        null;
      setSelectedNode(selectedNodeData);
    }
  };
  
  // Función para convertir datos del flujo visual a estructura de pipeline
  const convertFlowToPipeline = (flow: any) => {
    const updatedPipeline = { ...pipelineData };
    const units: any[] = [];
    
    // Procesar nodos y sus conexiones para generar las unidades del pipeline
    flow.nodes.forEach((node: any) => {
      if (node.id === 'pipeline-start') {
        // Actualizar propiedades básicas del pipeline
        updatedPipeline.name = node.data.label;
        updatedPipeline.description = node.data.description;
        updatedPipeline.agent_passport_id = node.data.agentId;
        return;
      }
      
      // Convertir el nodo a una unidad de pipeline según su tipo
      const unit = convertNodeToUnit(node);
      if (unit) {
        units.push(unit);
      }
    });
    
    // Ordenar las unidades según las conexiones
    const orderedUnits = orderUnitsByConnections(units, flow.edges);
    updatedPipeline.units = orderedUnits;
    
    return updatedPipeline;
  };
  
  // Función para convertir un nodo a una unidad de pipeline
  const convertNodeToUnit = (node: any) => {
    // Lógica para convertir un nodo a una unidad de pipeline según su tipo
    switch (node.type) {
      case 'commandNode':
        return {
          id: node.id,
          name: node.data.label,
          command_id: node.data.properties.command_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'queryNode':
        return {
          id: node.id,
          name: node.data.label,
          query_queue_id: node.data.properties.query_queue_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'sftpDownloaderNode':
        return {
          id: node.id,
          name: node.data.label,
          sftp_downloader_id: node.data.properties.sftp_downloader_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'sftpUploaderNode':
        return {
          id: node.id,
          name: node.data.label,
          sftp_uploader_id: node.data.properties.sftp_uploader_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'zipNode':
        return {
          id: node.id,
          name: node.data.label,
          zip_id: node.data.properties.zip_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'unzipNode':
        return {
          id: node.id,
          name: node.data.label,
          unzip_id: node.data.properties.unzip_id,
          properties: node.data.properties,
          options: node.data.options
        };
      case 'callPipelineNode':
        return {
          id: node.id,
          name: node.data.label,
          call_pipeline: node.data.properties.call_pipeline,
          properties: node.data.properties,
          options: node.data.options
        };
      default:
        return {
          id: node.id,
          name: node.data.label,
          properties: node.data.properties,
          options: node.data.options
        };
    }
  };
  
  // Función para ordenar las unidades según las conexiones
  const orderUnitsByConnections = (units: any[], edges: Array<{source: string, target: string}>) => {
    // Ordenar las unidades según las conexiones entre ellas
    const orderedUnits: any[] = [];
    const unitMap = new Map();
    
    // Crear un mapa de unidades por ID
    units.forEach(unit => {
      unitMap.set(unit.id, unit);
    });
    
    // Crear un grafo de dependencias
    const graph = new Map();
    units.forEach(unit => {
      graph.set(unit.id, []);
    });
    
    // Llenar el grafo con las conexiones
    edges.forEach(edge => {
      if (edge.source === 'pipeline-start') {
        // Unidad inicial, no tiene dependencias
        return;
      }
      if (graph.has(edge.target)) {
        graph.get(edge.target).push(edge.source);
      }
    });
    
    // Ordenar topológicamente
    const visited = new Set();
    const temp = new Set();
    
    const visit = (unitId: string) => {
      if (temp.has(unitId)) {
        // Ciclo detectado
        return;
      }
      if (visited.has(unitId)) {
        return;
      }
      
      temp.add(unitId);
      
      // Visitar dependencias
      const deps = graph.get(unitId) || [];
      deps.forEach((depId: string) => {
        visit(depId);
      });
      
      temp.delete(unitId);
      visited.add(unitId);
      
      if (unitMap.has(unitId)) {
        orderedUnits.push(unitMap.get(unitId));
      }
    };
    
    // Iniciar ordenamiento topológico
    units.forEach(unit => {
      if (!visited.has(unit.id)) {
        visit(unit.id);
      }
    });
    
    // Revertir para tener el orden correcto (de principio a fin)
    return orderedUnits.reverse();
  };
  
  // Función para guardar el pipeline
  const handleSavePipeline = async () => {
    try {
      setIsSaving(true);
      
      // Verificar datos requeridos
      if (!pipelineData.name) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El pipeline debe tener un nombre."
        });
        setIsSaving(false);
        return;
      }
      
      if (!pipelineData.agent_passport_id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debes seleccionar un agente para el pipeline."
        });
        setIsSaving(false);
        return;
      }
      
      // Determinar si es creación o actualización
      const endpoint = pipelineId ? 
        `/api/pipelines/${pipelineId}` : 
        '/api/pipelines';
      
      const method = pipelineId ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipelineData)
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar el pipeline');
      }
      
      const savedPipeline = await response.json();
      
      toast({
        title: "Pipeline guardado",
        description: "El pipeline se ha guardado correctamente.",
        duration: 3000
      });
      
      // Actualizar estado
      setPipelineId(savedPipeline.id);
      setEditorMode('edit');
      setUnsavedChanges(false);
      
      // Redirigir a la edición con el ID en la URL
      setLocation(`/pipeline-studio/${savedPipeline.id}`);
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error al guardar el pipeline:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el pipeline. Intenta de nuevo."
      });
      setIsSaving(false);
    }
  };
  
  // Función para actualizar propiedades básicas del pipeline
  const handlePipelinePropertiesChange = (updatedProperties: any) => {
    setPipelineData({
      ...pipelineData,
      ...updatedProperties
    });
    setUnsavedChanges(true);
    
    // Actualizar también el nodo inicial del editor visual
    if (pipelineFlowData) {
      const updatedNodes = pipelineFlowData.nodes.map((node: any) => {
        if (node.id === 'pipeline-start') {
          return {
            ...node,
            data: {
              ...node.data,
              label: updatedProperties.name || node.data.label,
              description: updatedProperties.description || node.data.description,
              agentId: updatedProperties.agent_passport_id || node.data.agentId
            }
          };
        }
        return node;
      });
      
      setPipelineFlowData({
        ...pipelineFlowData,
        nodes: updatedNodes
      });
    }
  };
  
  // Función para crear un nuevo pipeline (restablecer el editor)
  const handleNewPipeline = () => {
    if (unsavedChanges) {
      if (!window.confirm('Hay cambios sin guardar. ¿Estás seguro de que quieres crear un nuevo pipeline?')) {
        return;
      }
    }
    
    setPipelineId(null);
    setSelectedTemplate(null);
    setPipelineData(null);
    setPipelineFlowData(null);
    setEditorMode('create');
    setUnsavedChanges(false);
    setLocation('/pipeline-studio');
  };
  
  // Función para duplicar el pipeline actual
  const handleDuplicatePipeline = () => {
    if (!pipelineData) return;
    
    // Crear copia del pipeline actual sin ID
    const duplicatedPipeline = {
      ...pipelineData,
      name: `Copia de ${pipelineData.name}`,
      id: undefined
    };
    
    setPipelineId(null);
    setPipelineData(duplicatedPipeline);
    setEditorMode('create');
    setUnsavedChanges(true);
    setLocation('/pipeline-studio');
    
    toast({
      title: "Pipeline duplicado",
      description: "Se ha creado una copia del pipeline. No olvides guardar los cambios.",
      duration: 3000
    });
  };
  
  // Renderizar la interfaz de usuario
  return (
      <div className="container mx-auto py-4">
        
        {/* Diálogo para cargar un pipeline existente */}
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cargar Pipeline Existente</DialogTitle>
              <DialogDescription>
                Selecciona un pipeline existente para editarlo o duplicarlo
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="flex items-center border rounded-md pl-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input 
                  className="border-0 focus-visible:ring-0" 
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => handleSearchPipelines(e.target.value)}
                />
              </div>
              
              <div className="border rounded-md">
                {/* Agregamos ScrollArea para permitir el desplazamiento vertical */}
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-white dark:bg-slate-900">Nombre</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-slate-900">Descripción</TableHead>
                        <TableHead className="sticky top-0 bg-white dark:bg-slate-900">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <span className="mt-2 block text-sm text-slate-500">Cargando pipelines...</span>
                          </TableCell>
                        </TableRow>
                      ) : filteredPipelines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                            {searchTerm ? 'No se encontraron pipelines con ese criterio' : 'No hay pipelines disponibles'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPipelines.map((pipeline) => (
                          <TableRow key={pipeline.id}>
                            <TableCell className="font-medium">{pipeline.name}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {pipeline.description || <span className="italic text-slate-400">Sin descripción</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    fetchPipelineData(pipeline.id);
                                    setIsLoadDialogOpen(false);
                                  }}
                                >
                                  <Edit className="mr-1 h-3 w-3" />
                                  Editar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    fetchPipelineData(pipeline.id);
                                    setTimeout(() => {
                                      handleDuplicatePipeline();
                                    }, 500);
                                    setIsLoadDialogOpen(false);
                                  }}
                                >
                                  <Copy className="mr-1 h-3 w-3" />
                                  Duplicar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Pipeline Studio</h1>
            <p className="text-slate-500">Crea y edita pipelines visualmente</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleNewPipeline}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
            
            <Button
              variant="outline"
              onClick={handleOpenLoadDialog}
              disabled={isLoading}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Cargar Pipeline
            </Button>
            
            {pipelineData && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDuplicatePipeline}
                  disabled={isLoading || isSaving}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </Button>
                
                <Button
                  onClick={handleSavePipeline}
                  disabled={isLoading || isSaving}
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
            <p>Cargando...</p>
          </div>
        ) : (
          <>
            {!pipelineData ? (
              <div className="grid grid-cols-1 gap-6">
                <div className="col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Seleccionar plantilla</CardTitle>
                      <CardDescription>
                        Elige una plantilla para comenzar a crear tu pipeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PipelineTemplateSelector onSelect={handleTemplateSelect} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>{pipelineData.name || 'Nuevo Pipeline'}</CardTitle>
                    <CardDescription>
                      {pipelineData.description || 'Sin descripción'}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    <Tabs 
                      value={selectedTab} 
                      onValueChange={setSelectedTab}
                      className="w-full"
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value="visual">
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Editor Visual
                        </TabsTrigger>
                        <TabsTrigger value="yaml">
                          <TerminalSquare className="mr-2 h-4 w-4" />
                          Editor YAML
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="visual" className="h-[600px]">
                        <div className="relative w-full h-full">
                          {/* Canvas principal a pantalla completa */}
                          <div className="w-full h-full">
                            {pipelineFlowData && (
                              <PipelineVisualEditor 
                                flowData={pipelineFlowData}
                                onChange={handleVisualEditorChange}
                                readOnly={editorMode === 'view'}
                              />
                            )}
                          </div>
                          
                          {/* Panel flotante izquierdo - Agregar Nodos */}
                          <div className="absolute top-4 left-4 z-10 shadow-lg">
                            <Card 
                              className={`transition-all duration-300 ease-in-out bg-opacity-90 backdrop-blur-sm bg-card border-slate-200 dark:border-slate-700`}
                              style={{ 
                                width: showNodePalette ? '220px' : '40px',
                                height: showNodePalette ? 'auto' : '40px'
                              }}
                            >
                              {showNodePalette ? (
                                <>
                                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base">Añadir Nodos</CardTitle>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setShowNodePalette(false)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </CardHeader>
                                  
                                  <CardContent className="pt-0 pb-2 px-3">
                                    <ScrollArea className="h-[400px] pr-3">
                                      <div className="space-y-2">
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('commandNode')}
                                        >
                                          <Settings2 className="mr-2 h-4 w-4" />
                                          Comando
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('queryNode')}
                                        >
                                          <Database className="mr-2 h-4 w-4" />
                                          Consulta SQL
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('sftpDownloaderNode')}
                                        >
                                          <Download className="mr-2 h-4 w-4" />
                                          SFTP Descarga
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('sftpUploaderNode')}
                                        >
                                          <Upload className="mr-2 h-4 w-4" />
                                          SFTP Subida
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('zipNode')}
                                        >
                                          <FileArchive className="mr-2 h-4 w-4" />
                                          Comprimir
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('unzipNode')}
                                        >
                                          <FileIcon className="mr-2 h-4 w-4" />
                                          Descomprimir
                                        </Button>
                                        
                                        <Button
                                          className="w-full justify-start text-left text-sm"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAddNode('callPipelineNode')}
                                        >
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          Llamar Pipeline
                                        </Button>
                                      </div>
                                    </ScrollArea>
                                  </CardContent>
                                </>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setShowNodePalette(true)}
                                  className="h-10 w-10 p-0"
                                >
                                  <LayoutPanelLeft className="h-5 w-5" />
                                </Button>
                              )}
                            </Card>
                          </div>
                          
                          {/* Panel flotante derecho - Propiedades */}
                          <div className="absolute top-4 right-4 z-10 shadow-lg">
                            <Card
                              className="transition-all duration-300 ease-in-out bg-opacity-90 backdrop-blur-sm bg-card border-slate-200 dark:border-slate-700"
                              style={{ 
                                width: showPropertiesPanel ? '320px' : '40px',
                                height: showPropertiesPanel ? 'auto' : '40px',
                                overflow: 'hidden'
                              }}
                            >
                              {showPropertiesPanel ? (
                                <>
                                  <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base">Propiedades</CardTitle>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setShowPropertiesPanel(false)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </CardHeader>
                                  
                                  <CardContent className="p-3">
                                    <ScrollArea className="h-[500px] pr-3">
                                      <div className="space-y-4">
                                        <PipelinePropertiesPanel
                                          pipelineData={pipelineData}
                                          agentOptions={agentOptions}
                                          onChange={handlePipelinePropertiesChange}
                                          readOnly={editorMode === 'view'}
                                        />
                                        
                                        {selectedNode && (
                                          <PipelineNodeProperties
                                            node={selectedNode}
                                            onChange={(updatedNode) => {
                                              // Actualizar el nodo en el flujo
                                              const updatedNodes = pipelineFlowData.nodes.map((node: any) => {
                                                if (node.id === selectedNode.id) {
                                                  return updatedNode;
                                                }
                                                return node;
                                              });
                                              
                                              const updatedFlow = {
                                                ...pipelineFlowData,
                                                nodes: updatedNodes
                                              };
                                              
                                              setPipelineFlowData(updatedFlow);
                                              handleVisualEditorChange(updatedFlow, selectedNode.id);
                                            }}
                                            sftpConnections={sftpConnections}
                                            sqlConnections={sqlConnections}
                                            pipelines={availablePipelines}
                                            readOnly={editorMode === 'view'}
                                          />
                                        )}
                                        
                                        {selectedTemplate && (
                                          <Card>
                                            <CardHeader className="py-3">
                                              <CardTitle className="text-base">Plantilla Seleccionada</CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2">
                                              <div className="mb-2">
                                                <span className="font-semibold">{selectedTemplate.name}</span>
                                              </div>
                                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {selectedTemplate.description}
                                              </p>
                                            </CardContent>
                                            <CardFooter className="py-2">
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setSelectedTemplate(null)}
                                              >
                                                Cambiar Plantilla
                                              </Button>
                                            </CardFooter>
                                          </Card>
                                        )}
                                        
                                        {!selectedNode && !selectedTemplate && (
                                          <Card>
                                            <CardHeader className="py-3">
                                              <CardTitle className="text-base">Ayuda</CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2">
                                              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                                                <p>
                                                  <Info className="inline-block h-3 w-3 mr-1" />
                                                  Utiliza el panel izquierdo para añadir nodos al pipeline.
                                                </p>
                                                <p>
                                                  <Info className="inline-block h-3 w-3 mr-1" />
                                                  Selecciona un nodo para ver y editar sus propiedades.
                                                </p>
                                                <p>
                                                  <Info className="inline-block h-3 w-3 mr-1" />
                                                  No olvides guardar tus cambios para que se apliquen.
                                                </p>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        )}
                                      </div>
                                    </ScrollArea>
                                  </CardContent>
                                </>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setShowPropertiesPanel(true)}
                                  className="h-10 w-10 p-0"
                                >
                                  <LayoutPanelTop className="h-5 w-5" />
                                </Button>
                              )}
                            </Card>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="yaml" className="min-h-[500px]">
                        <PipelineYamlEditor
                          pipelineData={pipelineData}
                          onChange={(updatedPipeline: any) => {
                            setPipelineData(updatedPipeline);
                            const flowData = generateFlowFromPipeline(updatedPipeline);
                            setPipelineFlowData(flowData);
                            setUnsavedChanges(true);
                          }}
                          readOnly={editorMode === 'view'}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
  );
}