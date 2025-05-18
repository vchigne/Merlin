import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";

interface PipelineBrowserProps {
  onDuplicate?: (pipelineId: string) => Promise<void>;
}

export default function PipelineBrowser({ onDuplicate }: PipelineBrowserProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [filteredPipelines, setFilteredPipelines] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

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
      const response = await fetch('/api/pipelines');
      
      if (!response.ok) {
        throw new Error(`Error al cargar pipelines: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
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

  // Función para editar pipeline - navega a la ruta del editor
  const handleEdit = (pipelineId: string) => {
    // Cierra el diálogo antes de navegar
    setIsOpen(false);
    // Navega a la página de edición usando wouter
    navigate(`/pipeline-studio/${pipelineId}`);
  };

  // Función para duplicar pipeline
  const handleDuplicate = async (pipelineId: string) => {
    if (!onDuplicate) return;
    
    try {
      setIsLoading(true);
      await onDuplicate(pipelineId);
      toast({
        title: "Pipeline duplicado",
        description: "El pipeline ha sido duplicado correctamente",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error al duplicar pipeline:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Error al duplicar pipeline',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar pipelines
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPipelines(pipelines);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = pipelines.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.description && p.description.toLowerCase().includes(term))
    );
    setFilteredPipelines(filtered);
  }, [searchTerm, pipelines]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
        >
          <Search className="mr-2 h-4 w-4" />
          Cargar Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] z-[9999]">
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
              placeholder="Buscar por nombre o descripción..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        ) : filteredPipelines.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mb-2">No se encontraron pipelines</div>
            <Button 
              variant="outline" 
              onClick={loadPipelines}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Nombre</TableHead>
                    <TableHead className="min-w-[120px]">Descripción</TableHead>
                    <TableHead className="min-w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPipelines.map((pipeline) => (
                  <TableRow key={pipeline.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{pipeline.name}</TableCell>
                    <TableCell>{pipeline.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleEdit(pipeline.id)}
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        
                        {onDuplicate && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDuplicate(pipeline.id)}
                            disabled={isLoading}
                          >
                            <Copy className="mr-1 h-4 w-4" />
                            Duplicar
                          </Button>
                        )}
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