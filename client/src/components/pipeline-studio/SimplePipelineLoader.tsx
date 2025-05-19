import React, { useState } from "react";
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
import { Search, Edit, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePipelines } from "@/hooks/use-pipeline";

// Definición de interfaz para Pipeline
interface Pipeline {
  id: string;
  name: string;
  description?: string;
  abort_on_error?: boolean;
  agent_passport_id?: string;
  created_at: string;
  updated_at: string;
  disposable?: boolean;
}

// Componente simple que solo usa window.location.href para la navegación
export default function SimplePipelineLoader() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Usar el mismo hook que el dashboard para cargar pipelines
  const { 
    data: pipelinesData, 
    isLoading, 
    error: queryError, 
    refetch
  } = usePipelines({
    limit: 50, // Aumentamos el límite para mostrar más pipelines
    includeJobInfo: false // No necesitamos información de jobs aquí
  });
  
  // Extraer los pipelines y manejar el estado de carga
  const pipelines = pipelinesData?.pipelines || [];
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Error al cargar pipelines') : null;

  // Filtrar pipelines
  const filteredPipelines = searchTerm
    ? pipelines.filter((p: Pipeline) => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : pipelines;

  // Función simple de edición que navega directamente
  const handleEditPipeline = (pipelineId: string) => {
    // Cerrar diálogo
    setIsOpen(false);
    // Navegar a la ruta del editor usando window.location
    window.location.href = `/pipeline-studio/${pipelineId}`;
  };

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
            Selecciona un pipeline existente para editarlo
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
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
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
                  {filteredPipelines.map((pipeline: Pipeline) => (
                  <TableRow key={pipeline.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{pipeline.name}</TableCell>
                    <TableCell>{pipeline.description || "—"}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleEditPipeline(pipeline.id)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Editar
                      </Button>
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