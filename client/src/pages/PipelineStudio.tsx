import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
// No necesitamos importar Layout ya que App.tsx ya lo incluye
import { PipelineTemplateManager } from "@/lib/pipeline-template-manager";
import PipelineVisualEditor from "@/components/pipeline-studio/PipelineVisualEditor";
import PipelineTemplateSelector from "@/components/pipeline-studio/PipelineTemplateSelector";
import PipelinePropertiesPanel from "@/components/pipeline-studio/PipelinePropertiesPanel";
import PipelineYamlEditor from "@/components/pipeline-studio/PipelineYamlEditor";
import { AlertTriangle, Info, TerminalSquare, CheckCircle2, PlusCircle, Copy, ArrowLeftRight } from "lucide-react";
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
  const handleVisualEditorChange = (updatedFlow: any) => {
    // Convertir los datos del editor visual a la estructura del pipeline
    const updatedPipeline = convertFlowToPipeline(updatedFlow);
    setPipelineData(updatedPipeline);
    setUnsavedChanges(true);
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
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3">
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
                        
                        <TabsContent value="visual" className="min-h-[600px]">
                          {pipelineFlowData && (
                            <PipelineVisualEditor 
                              flowData={pipelineFlowData}
                              onChange={handleVisualEditorChange}
                              readOnly={editorMode === 'view'}
                            />
                          )}
                        </TabsContent>
                        
                        <TabsContent value="yaml" className="min-h-[600px]">
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
                
                <div className="col-span-1">
                  <PipelinePropertiesPanel
                    pipelineData={pipelineData}
                    agentOptions={agentOptions}
                    onChange={handlePipelinePropertiesChange}
                    readOnly={editorMode === 'view'}
                  />
                  
                  {selectedTemplate && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Plantilla Seleccionada</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-2">
                          <span className="font-semibold">{selectedTemplate.name}</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {selectedTemplate.description}
                        </p>
                      </CardContent>
                      <CardFooter>
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
                  
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Ayuda</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-slate-600 space-y-2">
                        <p>
                          <Info className="inline-block h-4 w-4 mr-1" />
                          Utiliza el editor visual para crear y conectar los nodos del pipeline.
                        </p>
                        <p>
                          <Info className="inline-block h-4 w-4 mr-1" />
                          Puedes cambiar entre el editor visual y el editor YAML en cualquier momento.
                        </p>
                        <p>
                          <Info className="inline-block h-4 w-4 mr-1" />
                          No olvides guardar tus cambios para que se apliquen.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
}