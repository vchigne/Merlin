import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  const [showDebug, setShowDebug] = useState(false);
  const [debugResults, setDebugResults] = useState<string[]>([]);
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

  // Función principal de búsqueda que se llama en varios lugares
  const performSearch = (query: string) => {
    if (!pipelines || pipelines.length === 0) {
      setDebugResults([`No hay pipelines disponibles`]);
      setFilteredResults([]);
      return;
    }
    
    if (query.trim() === "") {
      setDebugResults([`Mostrando todos los ${pipelines.length} pipelines`]);
      setFilteredResults(pipelines);
      return;
    }

    // Usar toUpperCase para una búsqueda insensible a mayúsculas/minúsculas
    const upperQuery = query.toUpperCase();
    
    // Filtrar pipelines por nombre, descripción o ID
    const results = pipelines.filter(pipeline => 
      (pipeline.name?.toUpperCase().includes(upperQuery) || 
       pipeline.description?.toUpperCase().includes(upperQuery) || 
       pipeline.id?.toUpperCase().includes(upperQuery))
    );
    
    setDebugResults([
      `Total de pipelines: ${pipelines.length}`,
      `Resultados para "${query}": ${results.length}`,
      ...results.slice(0, 5).map(p => `- "${p.name}" (ID: ${p.id?.substring(0, 8)}...)`)
    ]);
    
    setFilteredResults(results);
  };
  
  // Función específica para buscar MDLZ
  const findMDLZPipelines = () => {
    setSearchQuery("MDLZ");
    performSearch("MDLZ");
    setShowDebug(true);
    setOpen(true);
    
    // Focus en el input después de la búsqueda
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
          onClick={() => {
            const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
            if (selectedPipeline) {
              alert(`Pipeline seleccionado: ${selectedPipeline.name}`);
            } else {
              alert('Ningún pipeline seleccionado');
            }
          }}
        >
          {isLoading ? "Cargando..." : (selectedPipelineId ? getSelectedPipelineName() : "Seleccionar pipeline")}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            setShowDebug(!showDebug);
            setOpen(true);
            if (!showDebug) {
              findMDLZPipelines();
            }
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Panel de depuración */}
      {showDebug && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">Diagnóstico de búsqueda</h4>
                <Badge variant={filteredPipelines.length > 0 ? 'default' : 'destructive'}>
                  {filteredPipelines.length} resultados
                </Badge>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md text-xs font-mono overflow-auto max-h-[200px]">
                {debugResults.map((line, index) => (
                  <div key={index} className="py-1">{line}</div>
                ))}
                {debugResults.length === 0 && (
                  <div className="text-slate-500 dark:text-slate-400">No hay información de depuración disponible</div>
                )}
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    findMDLZPipelines();
                    setOpen(true);
                  }}
                >
                  Buscar MDLZ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}