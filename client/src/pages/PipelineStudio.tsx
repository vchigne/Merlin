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
  
  // Insertar un componente YAML con valores por defecto
  const insertYamlComponent = (type: string) => {
    let componentYaml = '';
    
    // Plantillas YAML para cada tipo de componente
    const templates: { [key: string]: string } = {
      command: `  - name: "Ejecutar Comando"
    type: command
    command:
      id: ""  # Dejar vacío para nuevo comando
      name: "Mi Comando"
      target: "bash"
      args: "echo 'Hola Mundo'"
      timeout_millis: 30000
    depends_on: []
    force_parallel_creation: false`,
      
      query_queue: `  - name: "Consulta SQL"
    type: query_queue
    queries:
      - id: ""  # Dejar vacío para nueva consulta
        query: "SELECT * FROM tabla WHERE condicion = true"
        sql_conn_id: ""  # Agregar ID de conexión SQL existente
        name: "Mi Consulta"
        abort_on_error: true
    depends_on: []
    force_parallel_creation: false`,
      
      sftp_downloader: `  - name: "Descargar SFTP"
    type: sftp_downloader
    sftp_link_id: ""  # Agregar ID de enlace SFTP existente
    download_config:
      source_directory: "/ruta/origen/"
      target_directory: "/ruta/destino/"
      file_pattern: "*.txt"
      delete_after_download: false
    depends_on: []
    force_parallel_creation: false`,
      
      sftp_uploader: `  - name: "Subir SFTP"
    type: sftp_uploader
    sftp_link_id: ""  # Agregar ID de enlace SFTP existente
    upload_config:
      source_directory: "/ruta/origen/"
      target_directory: "/ruta/destino/"
      file_pattern: "*.txt"
      delete_after_upload: false
    depends_on: []
    force_parallel_creation: false`,
      
      api_call: `  - name: "Llamada API"
    type: api_call
    api_config:
      url: "https://api.ejemplo.com/endpoint"
      method: "GET"
      headers:
        Content-Type: "application/json"
      body: ""
      timeout_millis: 30000
    depends_on: []
    force_parallel_creation: false`,
      
      error_control: `  - name: "Control de Error"
    type: error_control
    error_config:
      error_pattern: ".*ERROR.*"
      action: "abort"  # abort | continue | retry
      max_retries: 3
      retry_delay_millis: 5000
    depends_on: []
    force_parallel_creation: false`,
      
      console_output: `  - name: "Salida de Consola"
    type: console_output
    output_config:
      message: "Pipeline ejecutándose - Estado: {status}"
      level: "info"  # info | warning | error
    depends_on: []
    force_parallel_creation: false`,
    
      file_mover: `  - name: "Mover Archivos"
    type: file_mover
    file_config:
      source_path: "/ruta/origen/"
      destination_path: "/ruta/destino/"
      file_pattern: "*.txt"
      create_destination: true
      overwrite: false
    depends_on: []
    force_parallel_creation: false`,
    
      file_copy: `  - name: "Copiar Archivos"
    type: file_copy
    file_config:
      source_path: "/ruta/origen/"
      destination_path: "/ruta/destino/"
      file_pattern: "*.txt"
      create_destination: true
      overwrite: false
    depends_on: []
    force_parallel_creation: false`,
    
      file_delete: `  - name: "Eliminar Archivos"
    type: file_delete
    file_config:
      target_path: "/ruta/archivos/"
      file_pattern: "*.tmp"
      recursive: false
      safe_mode: true  # Solicita confirmación
    depends_on: []
    force_parallel_creation: false`,
    
      compress: `  - name: "Comprimir Archivos"
    type: compress
    compress_config:
      source_path: "/ruta/origen/"
      output_file: "/ruta/archivo.zip"
      format: "zip"  # zip | tar | 7z
      compression_level: 5  # 1-9
      include_pattern: "*.*"
    depends_on: []
    force_parallel_creation: false`,
    
      decompress: `  - name: "Descomprimir Archivos"
    type: decompress
    decompress_config:
      archive_file: "/ruta/archivo.zip"
      destination_path: "/ruta/destino/"
      format: "auto"  # auto | zip | tar | 7z
      overwrite: false
    depends_on: []
    force_parallel_creation: false`,
    
      webhook: `  - name: "Webhook Notification"
    type: webhook
    webhook_config:
      url: "https://hooks.ejemplo.com/webhook"
      method: "POST"
      headers:
        Content-Type: "application/json"
      payload:
        pipeline: "{pipeline_name}"
        status: "{status}"
        timestamp: "{timestamp}"
      retry_count: 3
      timeout_millis: 10000
    depends_on: []
    force_parallel_creation: false`,
    
      wait: `  - name: "Esperar/Retraso"
    type: wait
    wait_config:
      delay_millis: 5000  # 5 segundos
      condition: ""  # Condición opcional para esperar
      max_wait_millis: 60000  # Máximo tiempo de espera
    depends_on: []
    force_parallel_creation: false`,
    
      conditional: `  - name: "Ejecución Condicional"
    type: conditional
    condition_config:
      condition: "status == 'success'"  # Expresión a evaluar
      if_true:
        - action: "continue"
          target_unit: ""  # ID de la unidad a ejecutar
      if_false:
        - action: "abort"
          message: "Condición no cumplida"
    depends_on: []
    force_parallel_creation: false`,
    
      loop: `  - name: "Bucle/Iteración"
    type: loop
    loop_config:
      type: "count"  # count | while | foreach
      count: 5  # Para tipo count
      condition: ""  # Para tipo while
      items: []  # Para tipo foreach
      body_units: []  # IDs de unidades a ejecutar en cada iteración
      max_iterations: 100  # Límite de seguridad
    depends_on: []
    force_parallel_creation: false`
    };
    
    componentYaml = templates[type] || '';
    
    if (componentYaml) {
      // Obtener el contenido actual del YAML
      let currentYaml = yamlContent || '';
      
      // Si el YAML está vacío, crear estructura básica
      if (!currentYaml.trim()) {
        currentYaml = `name: "Nuevo Pipeline"
description: ""
configuration:
  agent_passport_id: ""
  abort_on_error: false
units:`;
      }
      
      // Buscar la sección 'units:' y agregar el componente
      if (currentYaml.includes('units:')) {
        // Si ya hay units, agregar después
        const unitsIndex = currentYaml.lastIndexOf('units:');
        const afterUnits = currentYaml.substring(unitsIndex);
        
        // Verificar si units está vacío (solo tiene units: o units: [])
        const isEmptyUnits = afterUnits.match(/^units:\s*(\[\])?$/m);
        
        if (isEmptyUnits) {
          // Si units está vacío, reemplazar con el nuevo componente
          currentYaml = currentYaml.substring(0, unitsIndex) + 'units:\n' + componentYaml;
        } else {
          // Si ya hay units, agregar al final
          currentYaml = currentYaml + '\n' + componentYaml;
        }
      } else {
        // Si no hay sección units, agregarla
        currentYaml += '\nunits:\n' + componentYaml;
      }
      
      // Actualizar el contenido del YAML
      setYamlContent(currentYaml);
      handleYamlChange(currentYaml);
      
      toast({
        title: "Componente Agregado",
        description: `Se agregó un componente tipo ${type} al YAML`,
        variant: "default"
      });
    }
  };

  // Crear un nuevo pipeline en memoria
  const handleCreateNewPipeline = (name: string) => {
    try {
      // Generar un ID temporal para el pipeline (lo marcaremos con 'temp-' para identificarlo)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear estructura de pipeline vacío
      const newPipeline = {
        id: tempId,
        name: name,
        description: '',
        abort_on_error: false,
        notify_on_abort_email_id: null,
        notify_on_abort_webhook_id: null,
        agent_passport_id: agentOptions[0]?.id || null, // Usar el primer agente disponible por defecto
        disposable: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        PipelineUnits: [] // Sin unidades inicialmente
      };
      
      // Establecer el pipeline como el actual
      setPipelineData(newPipeline);
      setPipelineFlowData({ nodes: [], edges: [] });
      
      // Cambiar a modo creación
      setEditorMode('create');
      setUnsavedChanges(false); // No hay cambios sin guardar porque es nuevo
      
      // Si estamos en modo YAML, generar el YAML vacío
      if (yamlMode) {
        const yamlText = pipelineToYaml(newPipeline);
        setYamlContent(yamlText);
      }
      
      toast({
        title: "Nuevo Pipeline Creado",
        description: `Pipeline "${name}" creado en memoria. Recuerda guardarlo cuando termines de configurarlo.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error al crear nuevo pipeline:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el nuevo pipeline",
        variant: "destructive"
      });
    }
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
                
                {/* Dialog para crear nuevo pipeline */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Nuevo Pipeline
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Pipeline</DialogTitle>
                      <DialogDescription>
                        Ingresa el nombre para tu nuevo pipeline.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 p-4">
                      <div>
                        <label htmlFor="pipeline-name" className="block text-sm font-medium mb-2">
                          Nombre del Pipeline
                        </label>
                        <Input
                          id="pipeline-name"
                          placeholder="Ej: Mi Pipeline de Procesamiento"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const inputElement = e.target as HTMLInputElement;
                              const name = inputElement.value.trim();
                              if (name) {
                                handleCreateNewPipeline(name);
                                // Cerrar el diálogo
                                const closeButton = e.currentTarget.closest('[role="dialog"]')?.querySelector('[aria-label="Close"]') as HTMLButtonElement;
                                closeButton?.click();
                              }
                            }
                          }}
                        />
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          const input = document.getElementById('pipeline-name') as HTMLInputElement;
                          const name = input?.value?.trim();
                          if (name) {
                            handleCreateNewPipeline(name);
                            // Cerrar el diálogo
                            const closeButton = document.querySelector('[role="dialog"] [aria-label="Close"]') as HTMLButtonElement;
                            closeButton?.click();
                          } else {
                            toast({
                              title: "Nombre requerido",
                              description: "Por favor ingresa un nombre para el pipeline",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Pipeline
                      </Button>
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
              
              {/* Editor YAML con paleta de herramientas */}
              <div className="flex gap-4">
                {/* Paleta de herramientas lateral */}
                <div className="w-48 shrink-0">
                  <Card className="p-3">
                    <CardHeader className="p-0 pb-3">
                      <CardTitle className="text-sm font-semibold">Componentes</CardTitle>
                      <CardDescription className="text-xs">
                        Click para agregar al pipeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-2 max-h-[600px] overflow-y-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('command')}
                      >
                        <TerminalSquare className="mr-2 h-3 w-3" />
                        Command
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('query_queue')}
                      >
                        <Database className="mr-2 h-3 w-3" />
                        Query Queue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('sftp_downloader')}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        SFTP Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('sftp_uploader')}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        SFTP Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('file_mover')}
                      >
                        <ArrowLeftRight className="mr-2 h-3 w-3" />
                        File Mover
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('file_copy')}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        File Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('file_delete')}
                      >
                        <X className="mr-2 h-3 w-3" />
                        File Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('compress')}
                      >
                        <FileArchive className="mr-2 h-3 w-3" />
                        Compress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('decompress')}
                      >
                        <FileArchive className="mr-2 h-3 w-3" />
                        Decompress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('api_call')}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        API Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('webhook')}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Webhook
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('wait')}
                      >
                        <Loader2 className="mr-2 h-3 w-3" />
                        Wait/Delay
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('conditional')}
                      >
                        <Settings2 className="mr-2 h-3 w-3" />
                        Conditional
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('loop')}
                      >
                        <ArrowLeftRight className="mr-2 h-3 w-3" />
                        Loop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('error_control')}
                      >
                        <AlertTriangle className="mr-2 h-3 w-3" />
                        Error Control
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => insertYamlComponent('console_output')}
                      >
                        <Info className="mr-2 h-3 w-3" />
                        Console Output
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Editor YAML */}
                <div className="flex-1 space-y-4">
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
                    className="min-h-[500px] font-mono text-sm w-full p-3 border rounded-lg bg-[#1e293b]"
                    readOnly={editorMode === 'view'}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}