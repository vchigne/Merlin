import React, { useState } from "react";
import { useLocation, Link } from "wouter";
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

interface SimplePipelineLoaderProps {
  onPipelineSelect?: (pipeline: Pipeline) => void;
}

// Componente que usa wouter para la navegación SPA
export default function SimplePipelineLoader({ onPipelineSelect }: SimplePipelineLoaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();

  // Función para manejar la selección de pipeline
  const handlePipelineSelect = (pipeline: Pipeline) => {
    if (onPipelineSelect) {
      // Si se proporciona un callback, usarlo
      onPipelineSelect(pipeline);
      setIsOpen(false);
    } else {
      // Comportamiento por defecto: navegar a la página de detalles
      navigate(`/pipeline/${pipeline.id}`);
      setIsOpen(false);
    }
  };
  
  // Usar el mismo hook que el dashboard para cargar pipelines
  const { 
    data: pipelinesData, 
    isLoading, 
    error: queryError, 
    refetch
  } = usePipelines({
    limit: 1000, // Límite muy alto para cargar todos los pipelines
    includeJobInfo: false // No necesitamos información de jobs aquí
  });
  
  // Extraer los pipelines y manejar el estado de carga
  const pipelines = pipelinesData?.pipelines || [];
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Error al cargar pipelines') : null;

  // Función para normalizar texto (quitar acentos y caracteres especiales)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .trim();
  };

  // Filtrar pipelines con búsqueda mejorada
  const filteredPipelines = searchTerm
    ? pipelines.filter((p: Pipeline) => {
        const searchTermNormalized = normalizeText(searchTerm);
        const nameNormalized = normalizeText(p.name || '');
        const descriptionNormalized = normalizeText(p.description || '');
        
        return nameNormalized.includes(searchTermNormalized) || 
               descriptionNormalized.includes(searchTermNormalized);
      })
    : pipelines;

  // Ya no necesitamos una función de navegación separada
  // porque usaremos el componente Link directamente

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
                        onClick={() => handlePipelineSelect(pipeline)}
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