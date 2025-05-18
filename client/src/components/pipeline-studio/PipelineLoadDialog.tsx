import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Copy, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PipelineLoadDialogProps {
  onDuplicate: (pipelineId: string) => Promise<void>;
}

interface Pipeline {
  id: string;
  name: string;
  agent_name?: string;
  agent_passport_id?: string;
  description?: string;
}

export default function PipelineLoadDialog({ onDuplicate }: PipelineLoadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [filteredPipelines, setFilteredPipelines] = useState<Pipeline[]>([]);

  // Cargar pipelines cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      loadPipelines();
    }
  }, [isOpen]);

  // Función para cargar los pipelines
  const loadPipelines = async () => {
    setError(null);
    try {
      setIsLoading(true);
      console.log("Cargando lista de pipelines...");
      const response = await fetch('/api/pipelines');
      
      if (!response.ok) {
        throw new Error(`Error al cargar pipelines: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Pipelines cargados:", data);
      
      if (!Array.isArray(data)) {
        throw new Error('La respuesta no es un array de pipelines');
      }
      
      setPipelines(data);
      setFilteredPipelines(data);
    } catch (error) {
      console.error('Error al cargar pipelines:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar pipelines');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para editar pipeline de manera segura
  const handleEdit = (pipelineId: string, pipelineName: string) => {
    console.log(`Editando pipeline: ${pipelineName} (${pipelineId})`);
    
    // Cerrar el diálogo inmediatamente para evitar problemas de UI
    setIsOpen(false);
    
    // Usar un método más directo y confiable
    try {
      // Construir la URL completa para asegurar que no hay problemas de enrutamiento
      // Método extremo: usar redirección de página completa
      const baseUrl = window.location.protocol + '//' + window.location.host;
      const fullUrl = `${baseUrl}/pipeline-studio/${pipelineId}`;
      console.log(`Navegando a URL completa: ${fullUrl}`);
      
      // Pequeño delay para permitir que se cierre el diálogo primero
      setTimeout(() => {
        // Crear un enlace y simular un clic para una navegación más confiable
        const link = document.createElement('a');
        link.href = fullUrl;
        // Importante: _self garantiza que navegamos en la misma ventana
        link.target = "_self";
        link.rel = "noopener noreferrer";
        // Agregar al DOM
        document.body.appendChild(link);
        // Simular clic para una navegación más confiable que window.location
        link.click();
        // Limpiar el DOM
        document.body.removeChild(link);
        
        // Plan de respaldo por si acaso la navegación falla
        setTimeout(() => {
          if (window.location.pathname !== `/pipeline-studio/${pipelineId}`) {
            console.warn("Navegación falló, usando método alternativo...");
            // Método de respaldo usando location.replace
            window.location.replace(fullUrl);
            
            // Último recurso: alertar al usuario si todo lo demás falla
            setTimeout(() => {
              if (window.location.pathname !== `/pipeline-studio/${pipelineId}`) {
                alert(`Error de navegación. Por favor, ve manualmente a ${fullUrl}`);
              }
            }, 1000);
          }
        }, 500);
      }, 100);
    } catch (error) {
      console.error("Error crítico en la navegación:", error);
      alert(`Error al navegar. Por favor, intenta ir manualmente a /pipeline-studio/${pipelineId}`);
    }
  };

  // Función para duplicar pipeline
  const handleDuplicate = async (pipelineId: string, pipelineName: string) => {
    try {
      console.log(`Duplicando pipeline: ${pipelineName} (${pipelineId})`);
      await onDuplicate(pipelineId);
      setIsOpen(false);
    } catch (error) {
      console.error("Error al duplicar pipeline:", error);
      setError(error instanceof Error ? error.message : 'Error desconocido al duplicar pipeline');
    }
  };

  // Filtrar pipelines
  const handleFilter = (searchTerm: string) => {
    if (!searchTerm) {
      setFilteredPipelines(pipelines);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = pipelines.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.agent_name && p.agent_name.toLowerCase().includes(term))
    );
    setFilteredPipelines(filtered);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            console.log("Abriendo diálogo de carga de pipelines...");
          }}
        >
          <Search className="mr-2 h-4 w-4" />
          Cargar Pipeline Existente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[650px] z-[9999]">
        <DialogHeader>
          <DialogTitle>Cargar Pipeline Existente</DialogTitle>
          <DialogDescription>
            Selecciona un pipeline existente para editarlo o duplicarlo
          </DialogDescription>
        </DialogHeader>
        
        {/* Buscador de pipelines */}
        <div className="py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar pipeline por nombre o agente..."
              className="pl-8"
              onChange={(e) => handleFilter(e.target.value)}
            />
          </div>
        </div>
        
        {/* Mensaje de error */}
        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <div>Cargando pipelines...</div>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mb-2">No se encontraron pipelines</div>
            <Button 
              variant="outline" 
              onClick={() => loadPipelines()}
            >
              Reintentar
            </Button>
          </div>
        ) : filteredPipelines.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mb-2">No se encontraron pipelines que coincidan con la búsqueda</div>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">Agente</TableHead>
                    <TableHead className="min-w-[180px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPipelines.map((pipeline) => (
                  <TableRow key={pipeline.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{pipeline.name}</TableCell>
                    <TableCell>{pipeline.agent_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleEdit(pipeline.id, pipeline.name)}
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDuplicate(pipeline.id, pipeline.name)}
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}