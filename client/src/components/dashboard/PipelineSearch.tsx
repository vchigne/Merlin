import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search } from "lucide-react";

interface PipelineSearchProps {
  pipelines: any[];
  selectedPipelineId: string | null;
  onSelectPipeline: (id: string) => void;
  isLoading?: boolean;
}

export default function PipelineSearch({
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  isLoading = false
}: PipelineSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Función para manejar la apertura del menú desplegable
  const handleFocus = () => {
    setOpen(true);
  };

  // Función para manejar el cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setOpen(true);
  };

  // Función de búsqueda principal
  const performSearch = (query: string) => {
    if (!pipelines || pipelines.length === 0) {
      setFilteredResults([]);
      return;
    }
    
    if (query.trim() === "") {
      setFilteredResults(pipelines);
      return;
    }

    // Búsqueda insensible a mayúsculas/minúsculas
    const upperQuery = query.toUpperCase();
    
    // Filtrar pipelines por nombre, descripción o ID
    const results = pipelines.filter(pipeline => 
      (pipeline.name?.toUpperCase().includes(upperQuery) || 
       pipeline.description?.toUpperCase().includes(upperQuery) || 
       pipeline.id?.toUpperCase().includes(upperQuery))
    );
    
    setFilteredResults(results);
  };
  
  // Seleccionar un pipeline
  const selectPipeline = (pipeline: any) => {
    onSelectPipeline(pipeline.id);
    setOpen(false);
  };
  
  // Actualizar resultados cuando cambia la búsqueda o los pipelines
  useEffect(() => {
    performSearch(searchQuery);
  }, [pipelines, searchQuery]);
  
  // Para acceder en la UI
  const filteredPipelines = filteredResults;

  // Obtener el nombre del pipeline seleccionado
  const getSelectedPipelineName = () => {
    if (!selectedPipelineId || !pipelines) return "Seleccionar pipeline";
    const selected = pipelines.find((p) => p.id === selectedPipelineId);
    return selected ? selected.name : "Seleccionar pipeline";
  };

  return (
    <div>
      <div className="flex space-x-2 items-center mb-2">
        <div className="flex-grow relative">
          <div className="relative">
            <Input
              ref={searchInputRef}
              className="w-full pr-10"
              placeholder="Buscar pipeline..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleFocus}
            />
            <div className="absolute right-3 top-2">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          
          {/* Dropdown con resultados */}
          {open && searchQuery.trim() !== "" && filteredPipelines.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full z-50 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 shadow-lg">
              <ScrollArea className="h-[250px]">
                {filteredPipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer
                      ${selectedPipelineId === pipeline.id ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
                    onClick={() => selectPipeline(pipeline)}
                  >
                    <div className="flex items-center">
                      {selectedPipelineId === pipeline.id && (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pipeline.name}</p>
                        {pipeline.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {pipeline.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
          
          {/* Mensaje de "No se encontraron pipelines" */}
          {open && searchQuery.trim() !== "" && filteredPipelines.length === 0 && (
            <div className="absolute left-0 top-full mt-1 p-4 w-full z-50 text-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 shadow-lg">
              No se encontraron pipelines
            </div>
          )}
        </div>
        
        <Button
          variant="outline"
          className="whitespace-nowrap"
        >
          {isLoading ? "Cargando..." : (selectedPipelineId ? getSelectedPipelineName() : "Seleccionar pipeline")}
        </Button>
      </div>
    </div>
  );
}