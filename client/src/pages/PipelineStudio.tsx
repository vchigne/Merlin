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
  
  // Función para cargar las plantillas de pipeline
  const loadTemplates = async () => {
    try {
      const templates = await templateManager.getTemplates();
      setTemplates(templates);
    } catch (error) {
      console.error("Error cargando plantillas:", error);
      toast({
        title: "Error al cargar plantillas",
        description: "No se pudieron cargar las plantillas de pipeline. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Función para cargar los agentes disponibles
  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Error al cargar agentes');
      
      const agents = await response.json();
      const formattedAgents = agents.map((agent: any) => ({
        label: agent.name,
        value: agent.id,
        is_healthy: agent.is_healthy
      }));
      
      setAgentOptions(formattedAgents);
    } catch (error) {
      console.error("Error cargando agentes:", error);
      toast({
        title: "Error al cargar agentes",
        description: "No se pudieron cargar los agentes disponibles. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Función para cargar las conexiones SFTP disponibles
  const loadSftpConnections = async () => {
    try {
      const response = await fetch('/api/sftp-links');
      if (!response.ok) throw new Error('Error al cargar conexiones SFTP');
      
      const connections = await response.json();
      setSftpOptions(connections);
    } catch (error) {
      console.error("Error cargando conexiones SFTP:", error);
      toast({
        title: "Error al cargar conexiones SFTP",
        description: "No se pudieron cargar las conexiones SFTP disponibles.",
        variant: "destructive"
      });
    }
  };
  
  // Función para cargar las conexiones SQL disponibles
  const loadSqlConnections = async () => {
    try {
      const response = await fetch('/api/sql-connections');
      if (!response.ok) throw new Error('Error al cargar conexiones SQL');
      
      const connections = await response.json();
      setSqlConnections(connections);
    } catch (error) {
      console.error("Error cargando conexiones SQL:", error);
      toast({
        title: "Error al cargar conexiones SQL",
        description: "No se pudieron cargar las conexiones SQL disponibles.",
        variant: "destructive"
      });
    }
  };
  
  // Función para cargar la lista de pipelines disponibles
  const loadPipelines = async () => {
    try {
      // Primero obtenemos la lista de agentes para poder mapear los IDs a nombres
      const agentsResponse = await fetch('/api/agents');
      if (!agentsResponse.ok) throw new Error('Error al cargar agentes');
      const agents = await agentsResponse.json();
      
      // Ahora obtenemos los pipelines
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetAllPipelines {
              merlin_agent_Pipeline {
                id
                name
                description
                agent_passport_id
                updated_at
              }
            }
          `
        })
      });
      
      if (!response.ok) throw new Error('Error al cargar pipelines');
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const pipelinesList = result.data.merlin_agent_Pipeline.map((pipeline: any) => {
        // Buscar el nombre del agente correspondiente al ID
        const agent = agents.find((a: any) => a.id === pipeline.agent_passport_id);
        
        return {
          id: pipeline.id,
          name: pipeline.name,
          description: pipeline.description,
          agent_id: pipeline.agent_passport_id,
          agent_name: agent ? agent.name : "Sin agente",
          updated_at: pipeline.updated_at
        };
      });
      
      // Ordenar por último actualizado
      pipelinesList.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      setPipelines(pipelinesList);
    } catch (error) {
      console.error("Error cargando pipelines:", error);
      toast({
        title: "Error al cargar pipelines",
        description: "No se pudieron cargar los pipelines disponibles. Por favor, intente de nuevo.",
        variant: "destructive"
      });
    }
  };

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadTemplates(), 
          loadAgents(),
          loadSftpConnections(),
          loadSqlConnections(),
          loadPipelines()
        ]);
        
        if (pipelineId) {
          await loadPipeline();
        } else {
          // Pipeline nuevo, inicializar con datos por defecto
          setPipelineData({
            name: 'Nuevo Pipeline',
            description: '',
            agent_passport_id: '',
            abort_on_error: true
          });
          
          // Flujo inicial con solo el nodo de inicio
          setPipelineFlowData({
            nodes: [
              {
                id: 'pipeline-start',
                type: 'pipelineStart',
                position: { x: 250, y: 50 },
                data: { label: 'Inicio de Pipeline' }
              }
            ],
            edges: []
          });
          setEditorMode('create');
        }
      } catch (error) {
        console.error("Error inicializando datos:", error);
        toast({
          title: "Error al cargar datos",
          description: "No se pudieron cargar los datos necesarios. Por favor, intente de nuevo.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);
  
  // Cargar un pipeline existente
  const loadPipeline = async () => {
    if (!pipelineId) return;
    
    try {
      // Obtener datos del pipeline
      const response = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetPipeline($id: uuid!) {
              merlin_agent_Pipeline(where: {id: {_eq: $id}}) {
                id
                name
                description
                agent_passport_id
                abort_on_error
                created_at
                updated_at
              }
            }
          `,
          variables: {
            id: pipelineId
          }
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const pipeline = result.data.merlin_agent_Pipeline[0];
      if (!pipeline) {
        throw new Error("Pipeline no encontrado");
      }
      
      setPipelineData(pipeline);
      
      // Obtener unidades del pipeline
      const unitsResponse = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetPipelineUnits($pipelineId: uuid!) {
              merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $pipelineId}}) {
                id
                unit_type
                details
                order_index
                next_on_success
                next_on_error
              }
            }
          `,
          variables: {
            pipelineId
          }
        })
      });
      
      const unitsResult = await unitsResponse.json();
      
      if (unitsResult.errors) {
        throw new Error(unitsResult.errors[0].message);
      }
      
      const units = unitsResult.data.merlin_agent_PipelineUnit;
      
      // Convertir unidades a formato de flow
      const flow = convertUnitsToFlow(units);
      setPipelineFlowData(flow);
      
      // Cargar posiciones de nodos guardadas previamente
      const layoutManager = new PipelineLayoutManager();
      const savedLayout = await layoutManager.loadLayout(pipelineId);
      
      if (savedLayout && flow.nodes.length > 0) {
        // Aplicar posiciones guardadas
        const updatedNodes = flow.nodes.map(node => {
          const savedPos = savedLayout.nodes.find(n => n.id === node.id);
          if (savedPos) {
            return {
              ...node,
              position: savedPos.position
            };
          }
          return node;
        });
        
        setPipelineFlowData({
          ...flow,
          nodes: updatedNodes
        });
      }
      
      setEditorMode('edit');
    } catch (error) {
      console.error("Error cargando pipeline:", error);
      toast({
        title: "Error al cargar pipeline",
        description: `No se pudo cargar el pipeline. ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      });
      navigate('/pipelines');
    }
  };
  
  // Convertir unidades de pipeline a formato de flow
  const convertUnitsToFlow = (units: any[]) => {
    if (!units || units.length === 0) {
      // Pipeline vacío, solo nodo de inicio
      return {
        nodes: [
          {
            id: 'pipeline-start',
            type: 'pipelineStart',
            position: { x: 250, y: 50 },
            data: { label: 'Inicio de Pipeline' }
          }
        ],
        edges: []
      };
    }
    
    // Crear nodos
    const nodes = [
      // Nodo de inicio siempre presente
      {
        id: 'pipeline-start',
        type: 'pipelineStart',
        position: { x: 250, y: 50 },
        data: { label: 'Inicio de Pipeline' }
      }
    ];
    
    // Crear nodos para cada unidad
    units.forEach((unit, index) => {
      const nodeType = getNodeTypeFromUnitType(unit.unit_type);
      const details = typeof unit.details === 'string' ? JSON.parse(unit.details) : unit.details;
      
      // Calcular posición inicial (se ajustará después)
      const position = { x: 250, y: 150 + index * 100 };
      
      nodes.push({
        id: unit.id,
        type: nodeType,
        position,
        data: {
          label: details.name || getNodeLabel(nodeType),
          details: details,
          options: {}
        }
      });
    });
    
    // Crear conexiones
    const edges = [];
    
    // Ordenar unidades topológicamente
    const orderedUnits = orderUnitsTopologically(units);
    
    // Si hay al menos una unidad, conectar el inicio con la primera
    if (orderedUnits.length > 0) {
      const firstUnit = orderedUnits[0];
      edges.push({
        id: `e-pipeline-start-${firstUnit.id}`,
        source: 'pipeline-start',
        target: firstUnit.id,
        animated: false
      });
    }
    
    // Crear conexiones entre unidades según next_on_success
    for (let i = 0; i < orderedUnits.length - 1; i++) {
      const currentUnit = orderedUnits[i];
      const nextUnit = orderedUnits[i + 1];
      
      edges.push({
        id: `e-${currentUnit.id}-${nextUnit.id}`,
        source: currentUnit.id,
        target: nextUnit.id,
        animated: false
      });
    }
    
    return { nodes, edges };
  };
  
  // Convertir tipo de unidad a tipo de nodo
  const getNodeTypeFromUnitType = (unitType: string): string => {
    switch (unitType) {
      case 'Command':
        return 'commandNode';
      case 'QueryQueue':
        return 'queryNode';
      case 'SFTPDownloader':
        return 'sftpDownloaderNode';
      case 'SFTPUploader':
        return 'sftpUploaderNode';
      case 'Zip':
        return 'zipNode';
      case 'UnZip':
        return 'unzipNode';
      case 'CallPipeline':
        return 'callPipelineNode';
      default:
        return 'commandNode';
    }
  };
  
  // Ordenar unidades topológicamente
  const orderUnitsTopologically = (units: any[]): any[] => {
    const visited = new Set<string>();
    const orderedUnits: any[] = [];
    
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const unit = units.find(u => u.id === id);
      if (!unit) return;
      
      if (unit.next_on_success) {
        const nextUnit = units.find(u => u.id === unit.next_on_success);
        if (nextUnit && !visited.has(nextUnit.id)) {
          visit(nextUnit.id);
        }
      }
      
      orderedUnits.push(unit);
    };
    
    // Encontrar el nodo inicial (sin dependencias)
    const startUnit = units.find(u => !units.some(other => other.next_on_success === u.id));
    if (startUnit) {
      visit(startUnit.id);
    }
    
    // En caso de que no todos los nodos sean visitados (ciclos o múltiples ramas)
    units.forEach(unit => {
      if (!visited.has(unit.id)) {
        visit(unit.id);
      }
    });
    
    // Revertir para tener el orden correcto (de principio a fin)
    return orderedUnits.reverse();
  };
  
  // Función para añadir un nuevo nodo al flujo
  const handleAddNode = (nodeType: string) => {
    if (!pipelineFlowData) return;
    
    // Generar un ID único para el nodo
    const nodeId = `${nodeType.replace('Node', '')}_${Date.now()}`;
    
    // Calcular la posición para el nuevo nodo
    const lastNodeIndex = pipelineFlowData.nodes.length - 1;
    const lastY = lastNodeIndex >= 0 ? pipelineFlowData.nodes[lastNodeIndex].position.y + 100 : 150;
    
    // Posición para el nuevo nodo
    const position = { x: 250, y: lastY };
    
    // Crear nodo según el tipo
    let newNode: any = {
      id: nodeId,
      type: nodeType,
      position,
      data: {
        label: getNodeLabel(nodeType),
        details: getNodeDefaultProperties(nodeType),
        options: {}
      }
    };
    
    // Añadir el nuevo nodo al flujo
    const updatedNodes = [...pipelineFlowData.nodes, newNode];
    
    // Crear una conexión desde el último nodo si existe
    let updatedEdges = [...pipelineFlowData.edges];
    if (lastNodeIndex >= 0) {
      // Si hay nodos, conectar con el último o con el inicio
      const sourceId = pipelineFlowData.nodes.length > 1 ? 
        pipelineFlowData.nodes[lastNodeIndex].id : 
        'pipeline-start';
      
      const newEdge = {
        id: `e-${sourceId}-${nodeId}`,
        source: sourceId,
        target: nodeId,
        animated: false
      };
      
      updatedEdges.push(newEdge);
    } else if (pipelineFlowData.nodes.length === 1 && pipelineFlowData.nodes[0].id === 'pipeline-start') {
      // Si solo existe el nodo inicial, conectar desde él
      const newEdge = {
        id: `e-pipeline-start-${nodeId}`,
        source: 'pipeline-start',
        target: nodeId,
        animated: false
      };
      
      updatedEdges.push(newEdge);
    }
    
    const updatedFlow = {
      ...pipelineFlowData,
      nodes: updatedNodes,
      edges: updatedEdges
    };
    
    // Actualizar el estado
    setPipelineFlowData(updatedFlow);
    
    // Seleccionar el nuevo nodo para editar sus propiedades
    setSelectedNode(newNode);
    setUnsavedChanges(true);
    
    // Asegurar que el panel de propiedades esté visible
    setShowPropertiesPanel(true);
    
    // Notificar el cambio
    handleVisualEditorChange(updatedFlow, nodeId);
  };
  
  // Función para obtener la etiqueta del nodo según su tipo
  const getNodeLabel = (nodeType: string): string => {
    switch (nodeType) {
      case 'commandNode':
        return 'Comando';
      case 'queryNode':
        return 'Consulta SQL';
      case 'sftpDownloaderNode':
        return 'SFTP Descarga';
      case 'sftpUploaderNode':
        return 'SFTP Subida';
      case 'zipNode':
        return 'Comprimir';
      case 'unzipNode':
        return 'Descomprimir';
      case 'callPipelineNode':
        return 'Llamar Pipeline';
      case 'pipelineStart':
        return 'Inicio de Pipeline';
      default:
        return 'Nodo';
    }
  };
  
  // Función para obtener propiedades por defecto según el tipo de nodo
  const getNodeDefaultProperties = (nodeType: string): any => {
    switch (nodeType) {
      case 'commandNode':
        return {
          target: '',
          working_directory: '',
          args: '',
          raw_script: '',
          return_output: false
        };
      case 'queryNode':
        return {
          sqlconn_id: '',
          return_output: false
        };
      case 'sftpDownloaderNode':
        return {
          sftp_link_id: '',
          output: '',
          return_output: false
        };
      case 'sftpUploaderNode':
        return {
          sftp_link_id: '',
          input: '',
          return_output: false
        };
      case 'zipNode':
        return {
          output: '',
          return_output: false
        };
      case 'unzipNode':
        return {
          input: '',
          output: '',
          return_output: false
        };
      case 'callPipelineNode':
        return {
          call_pipeline: '',
          wait_for_completion: true
        };
      default:
        return {};
    }
  };
  
  // Función para actualizar un nodo
  const handleNodeUpdate = (id: string, data: any) => {
    if (!pipelineFlowData) return;
    
    const updatedNodes = pipelineFlowData.nodes.map(node => {
      if (node.id === id) {
        return { ...node, data };
      }
      return node;
    });
    
    const updatedFlow = {
      ...pipelineFlowData,
      nodes: updatedNodes
    };
    
    setPipelineFlowData(updatedFlow);
    setUnsavedChanges(true);
    
    // Si el nodo actualizado es el seleccionado, actualizar también la selección
    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, data });
    }
    
    // Notificar el cambio
    handleVisualEditorChange(updatedFlow);
  };
  
  // Función para eliminar un nodo
  const handleNodeDelete = (id: string) => {
    if (!pipelineFlowData || id === 'pipeline-start') return; // No se puede eliminar el nodo inicial
    
    // Filtrar nodos para eliminar el seleccionado
    const updatedNodes = pipelineFlowData.nodes.filter(node => node.id !== id);
    
    // Filtrar aristas que involucran al nodo eliminado
    const updatedEdges = pipelineFlowData.edges.filter(
      edge => edge.source !== id && edge.target !== id
    );
    
    const updatedFlow = {
      ...pipelineFlowData,
      nodes: updatedNodes,
      edges: updatedEdges
    };
    
    setPipelineFlowData(updatedFlow);
    setSelectedNode(null);
    setUnsavedChanges(true);
    
    // Notificar el cambio
    handleVisualEditorChange(updatedFlow);
  };
  
  // Función para manejar los cambios en el editor visual
  const handleVisualEditorChange = (flowData: any, selectedNodeId?: string) => {
    setPipelineFlowData(flowData);
    setUnsavedChanges(true);
    
    // Actualizar selección de nodo si se proporciona un ID
    if (selectedNodeId) {
      const node = flowData.nodes.find((n: any) => n.id === selectedNodeId);
      setSelectedNode(node || null);
    }
    
    // Actualizar el contenido YAML si estamos en modo YAML
    if (yamlMode) {
      try {
        const yaml = templateManager.convertFlowToYaml(flowData, pipelineData);
        setYamlContent(yaml);
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
      }
    }
  };
  
  // Función para manejar los cambios en el editor YAML
  const handleYamlChange = (yaml: string) => {
    setYamlContent(yaml);
    setUnsavedChanges(true);
    
    // Intentar convertir YAML a flow para mantener sincronizada la vista visual
    try {
      const { flowData, pipelineData: updatedPipelineData } = templateManager.convertYamlToFlow(yaml);
      setPipelineFlowData(flowData);
      
      // Actualizar los datos del pipeline si han cambiado
      if (updatedPipelineData && updatedPipelineData.name) {
        setPipelineData(updatedPipelineData);
      }
    } catch (error) {
      console.error("Error al convertir YAML:", error);
      // No actualizar la vista visual en caso de error
    }
  };
  
  // Función para cambiar entre modo visual y YAML
  const toggleYamlMode = () => {
    if (!yamlMode) {
      // Cambiar a modo YAML
      try {
        const yaml = templateManager.convertFlowToYaml(pipelineFlowData, pipelineData);
        setYamlContent(yaml);
        setYamlMode(true);
      } catch (error) {
        console.error("Error al convertir a YAML:", error);
        toast({
          title: "Error al cambiar a modo YAML",
          description: "No se pudo convertir el pipeline a formato YAML.",
          variant: "destructive"
        });
      }
    } else {
      // Cambiar a modo visual
      try {
        const { flowData, pipelineData: updatedPipelineData } = templateManager.convertYamlToFlow(yamlContent);
        setPipelineFlowData(flowData);
        
        // Actualizar los datos del pipeline si han cambiado
        if (updatedPipelineData && updatedPipelineData.name) {
          setPipelineData(updatedPipelineData);
        }
        
        setYamlMode(false);
      } catch (error) {
        console.error("Error al convertir desde YAML:", error);
        toast({
          title: "Error al cambiar a modo visual",
          description: "El YAML contiene errores y no puede ser convertido a formato visual.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Función para guardar el pipeline
  const savePipeline = async () => {
    if (!pipelineData || !pipelineData.name || !pipelineData.agent_passport_id) {
      toast({
        title: "Datos incompletos",
        description: "Debe especificar un nombre y seleccionar un agente para el pipeline.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Si estamos en modo YAML, asegurar que se convierta a flow antes de guardar
      if (yamlMode) {
        try {
          const { flowData, pipelineData: updatedPipelineData } = templateManager.convertYamlToFlow(yamlContent);
          setPipelineFlowData(flowData);
          
          // Actualizar los datos del pipeline si han cambiado
          if (updatedPipelineData && updatedPipelineData.name) {
            setPipelineData(updatedPipelineData);
          }
        } catch (error) {
          console.error("Error al convertir YAML para guardar:", error);
          toast({
            title: "Error en el YAML",
            description: "El YAML contiene errores y no puede ser guardado.",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }
      
      // Convertir flow a unidades de pipeline
      const units = convertFlowToUnits(pipelineFlowData);
      
      // Crear o actualizar pipeline
      if (editorMode === 'create') {
        // Crear nuevo pipeline
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              mutation CreatePipeline($pipeline: merlin_agent_Pipeline_insert_input!, $units: [merlin_agent_PipelineUnit_insert_input!]!) {
                insert_merlin_agent_Pipeline_one(object: $pipeline) {
                  id
                  name
                }
                insert_merlin_agent_PipelineUnit(objects: $units) {
                  affected_rows
                }
              }
            `,
            variables: {
              pipeline: {
                name: pipelineData.name,
                description: pipelineData.description || '',
                agent_passport_id: pipelineData.agent_passport_id,
                abort_on_error: pipelineData.abort_on_error === true
              },
              units: units.map(unit => ({
                ...unit,
                pipeline_id: null  // Se rellenará en el servidor con el ID creado
              }))
            }
          })
        });
        
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        const newPipelineId = result.data.insert_merlin_agent_Pipeline_one.id;
        
        // Guardar el layout de nodos
        await saveNodeLayout(newPipelineId);
        
        toast({
          title: "Pipeline Creado",
          description: "El pipeline ha sido creado exitosamente.",
          variant: "default"
        });
        
        // Navegar a la vista de edición del nuevo pipeline
        navigate(`/pipelines/edit/${newPipelineId}`);
        setEditorMode('edit');
      } else {
        // Actualizar pipeline existente
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              mutation UpdatePipeline($id: uuid!, $pipeline: merlin_agent_Pipeline_set_input!, $units: [merlin_agent_PipelineUnit_insert_input!]!) {
                update_merlin_agent_Pipeline_by_pk(pk_columns: {id: $id}, _set: $pipeline) {
                  id
                  name
                }
                delete_merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $id}}) {
                  affected_rows
                }
                insert_merlin_agent_PipelineUnit(objects: $units) {
                  affected_rows
                }
              }
            `,
            variables: {
              id: pipelineId,
              pipeline: {
                name: pipelineData.name,
                description: pipelineData.description || '',
                agent_passport_id: pipelineData.agent_passport_id,
                abort_on_error: pipelineData.abort_on_error === true
              },
              units: units.map(unit => ({
                ...unit,
                pipeline_id: pipelineId
              }))
            }
          })
        });
        
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        
        // Guardar el layout de nodos
        await saveNodeLayout(pipelineId);
        
        toast({
          title: "Pipeline Actualizado",
          description: "El pipeline ha sido actualizado exitosamente.",
          variant: "default"
        });
      }
      
      setUnsavedChanges(false);
    } catch (error) {
      console.error("Error guardando pipeline:", error);
      toast({
        title: "Error al guardar pipeline",
        description: `No se pudo guardar el pipeline. ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Guardar la disposición de nodos
  const saveNodeLayout = async (pipelineId: string) => {
    try {
      if (!pipelineFlowData) return;
      
      const layoutManager = new PipelineLayoutManager();
      await layoutManager.saveLayout(pipelineId, pipelineFlowData);
    } catch (error) {
      console.error("Error guardando layout de nodos:", error);
      // No mostrar error al usuario, ya que esto es secundario
    }
  };
  
  // Convertir flow a unidades de pipeline
  const convertFlowToUnits = (flowData: any): any[] => {
    if (!flowData || !flowData.nodes || flowData.nodes.length <= 1) {
      return []; // No hay nodos o solo está el nodo inicial
    }
    
    // Filtrar el nodo inicial
    const nodes = flowData.nodes.filter((node: any) => node.id !== 'pipeline-start');
    
    // Ordenar nodos según las conexiones
    const orderedNodes = orderNodesByConnections(flowData);
    
    // Crear unidades
    return orderedNodes.map((node: any, index: number) => {
      const unitType = getUnitTypeFromNodeType(node.type);
      const details = node.data.details || {};
      
      // Ajustar details según type
      if (node.data.label) {
        details.name = node.data.label;
      }
      
      // Determinar siguiente nodo en caso de éxito
      const nextIndex = index + 1;
      const nextOnSuccess = nextIndex < orderedNodes.length ? orderedNodes[nextIndex].id : null;
      
      return {
        id: node.id,
        unit_type: unitType,
        details: JSON.stringify(details),
        order_index: index,
        next_on_success: nextOnSuccess,
        next_on_error: null // Por ahora no soportamos bifurcación en error
      };
    });
  };
  
  // Convertir tipo de nodo a tipo de unidad
  const getUnitTypeFromNodeType = (nodeType: string): string => {
    switch (nodeType) {
      case 'commandNode':
        return 'Command';
      case 'queryNode':
        return 'QueryQueue';
      case 'sftpDownloaderNode':
        return 'SFTPDownloader';
      case 'sftpUploaderNode':
        return 'SFTPUploader';
      case 'zipNode':
        return 'Zip';
      case 'unzipNode':
        return 'UnZip';
      case 'callPipelineNode':
        return 'CallPipeline';
      default:
        return 'Command';
    }
  };
  
  // Ordenar nodos según las conexiones
  const orderNodesByConnections = (flowData: any): any[] => {
    const { nodes, edges } = flowData;
    
    // Filtrar nodo de inicio
    const actualNodes = nodes.filter((node: any) => node.id !== 'pipeline-start');
    if (actualNodes.length === 0) return [];
    
    // Encontrar el primer nodo real (el que viene después del inicio)
    const startEdge = edges.find((edge: any) => edge.source === 'pipeline-start');
    if (!startEdge) return actualNodes; // Si no hay conexión desde el inicio, devolver nodos sin ordenar
    
    const firstNodeId = startEdge.target;
    const firstNode = nodes.find((node: any) => node.id === firstNodeId);
    if (!firstNode) return actualNodes;
    
    // Construir lista ordenada siguiendo las conexiones
    const orderedNodes = [firstNode];
    const visited = new Set([firstNode.id]);
    
    let currentNodeId = firstNode.id;
    
    while (true) {
      // Encontrar la siguiente conexión
      const nextEdge = edges.find((edge: any) => edge.source === currentNodeId);
      if (!nextEdge) break;
      
      const nextNodeId = nextEdge.target;
      if (visited.has(nextNodeId)) break; // Evitar ciclos
      
      const nextNode = nodes.find((node: any) => node.id === nextNodeId);
      if (!nextNode) break;
      
      orderedNodes.push(nextNode);
      visited.add(nextNodeId);
      currentNodeId = nextNodeId;
    }
    
    // Añadir nodos que no estén conectados al final
    actualNodes.forEach((node: any) => {
      if (!visited.has(node.id)) {
        orderedNodes.push(node);
      }
    });
    
    return orderedNodes;
  };
  
  // Cargar plantilla
  const handleTemplateSelect = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast({
          title: "Plantilla no encontrada",
          description: "La plantilla seleccionada no existe.",
          variant: "destructive"
        });
        return;
      }
      
      // Cargar YAML de la plantilla
      const yaml = await templateManager.loadTemplateContent(templateId);
      
      // Convertir YAML a flujo
      const { flowData, pipelineData: templatePipelineData } = templateManager.convertYamlToFlow(yaml);
      
      // Actualizar datos del pipeline
      setPipelineData({
        name: `${templatePipelineData.name || template.name} (Copia)`,
        description: templatePipelineData.description || template.description || '',
        agent_passport_id: pipelineData?.agent_passport_id || '',
        abort_on_error: templatePipelineData.abort_on_error === true
      });
      
      // Actualizar flujo
      setPipelineFlowData(flowData);
      setYamlContent(yaml);
      setUnsavedChanges(true);
      
      toast({
        title: "Plantilla cargada",
        description: "La plantilla se ha cargado correctamente.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error cargando plantilla:", error);
      toast({
        title: "Error al cargar plantilla",
        description: "No se pudo cargar la plantilla seleccionada.",
        variant: "destructive"
      });
    }
  };
  
  // Función para duplicar un pipeline existente
  const handleDuplicatePipeline = async (pipelineId: string) => {
    setIsLoading(true);
    try {
      // Obtener datos del pipeline
      const response = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetPipelineDetails($id: uuid!) {
              merlin_agent_Pipeline(where: {id: {_eq: $id}}) {
                id
                name
                description
                agent_passport_id
                abort_on_error
              }
              merlin_agent_PipelineUnit(where: {pipeline_id: {_eq: $id}}) {
                id
                unit_type
                command_id
                query_queue_id
                sftp_downloader_id
                sftp_uploader_id
                zip_id
                unzip_id
                comment
                retry_after_milliseconds
                retry_count
                timeout_milliseconds
                abort_on_timeout
                continue_on_error
                posx
                posy
                call_pipeline
                details
              }
            }
          `,
          variables: {
            id: pipelineId
          }
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const pipeline = result.data.merlin_agent_Pipeline[0];
      const units = result.data.merlin_agent_PipelineUnit;
      
      if (!pipeline) {
        throw new Error("Pipeline no encontrado");
      }
      
      // Actualizar datos del pipeline (como copia)
      setPipelineData({
        name: `${pipeline.name} (Copia)`,
        description: pipeline.description || '',
        agent_passport_id: pipeline.agent_passport_id,
        abort_on_error: pipeline.abort_on_error === true
      });
      
      // Convertir unidades a formato de flow
      const flow = convertUnitsToFlow(units);
      setPipelineFlowData(flow);
      
      // Cambiar a modo creación
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
              ? 'Diseña un nuevo pipeline para automatizar tareas' 
              : 'Edita la configuración y flujo del pipeline'}
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
                disabled={isSaving || !pipelineData?.name || !pipelineData?.agent_passport_id}
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Search className="mr-2 h-4 w-4" />
                      Cargar Pipeline Existente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cargar Pipeline Existente</DialogTitle>
                      <DialogDescription>
                        Selecciona un pipeline existente para editarlo
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Agente</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pipelines.map((pipeline) => (
                            <TableRow key={pipeline.id}>
                              <TableCell className="font-medium">{pipeline.name}</TableCell>
                              <TableCell>{pipeline.agent_name || "—"}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => navigate(`/pipelines/edit/${pipeline.id}`)}
                                  >
                                    <Edit className="mr-1 h-4 w-4" />
                                    Editar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleDuplicatePipeline(pipeline.id)}
                                  >
                                    <Copy className="mr-1 h-4 w-4" />
                                    Duplicar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
                
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
            
            <TabsContent value="visual" className="space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative w-full h-[calc(100vh-300px)] min-h-[500px]">
                    {/* Editor de pipeline visual */}
                    {pipelineFlowData && (
                      <PipelineEditor 
                        flowData={pipelineFlowData}
                        onChange={handleVisualEditorChange}
                        readOnly={editorMode === 'view'}
                        pipelineId={pipelineId || undefined}
                      />
                    )}
                    
                    {/* Paneles flotantes verdaderamente arrastrables */}
                    {pipelineFlowData && (
                      <>
                        {/* Paleta de nodos flotante */}
                        <NodePalette 
                          onAddNode={handleAddNode}
                          readOnly={editorMode === 'view'}
                          initialPosition={{ x: 20, y: 60 }}
                        />
                        
                        {/* Panel de propiedades del pipeline */}
                        {!selectedNode && (
                          <DraggablePipelineProperties
                            pipelineData={pipelineData}
                            onChange={setPipelineData}
                            agentOptions={agentOptions}
                            readOnly={editorMode === 'view'}
                            initialPosition={{ x: 20, y: 350 }}
                          />
                        )}
                        
                        {/* Panel de propiedades del nodo seleccionado */}
                        {selectedNode && (
                          <DraggableNodeProperties
                            node={selectedNode}
                            onUpdateNode={handleNodeUpdate}
                            onDeleteNode={handleNodeDelete}
                            readOnly={editorMode === 'view'}
                            sftpOptions={sftpOptions.map(conn => ({
                              label: conn.name,
                              value: conn.id
                            }))}
                            sqlConnOptions={sqlConnections.map(conn => ({
                              label: conn.name,
                              value: conn.id
                            }))}
                            initialPosition={{ x: window.innerWidth - 370, y: 60 }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="yaml" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="relative w-full h-[calc(100vh-300px)] min-h-[500px]">
                    <PipelineYamlEditor
                      value={yamlContent}
                      onChange={handleYamlChange}
                      readOnly={editorMode === 'view'}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}