import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Info } from "lucide-react";
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
  
  // Función dedicada para buscar MDLZ
  const findMDLZPipelines = () => {
    // Buscamos sin importar mayúsculas/minúsculas
    const mdlzPipelines = pipelines.filter(p => 
      (p.name?.toUpperCase().includes('MDLZ') || 
      p.description?.toUpperCase().includes('MDLZ') || 
      p.id?.toUpperCase().includes('MDLZ'))
    );
    
    setDebugResults([
      `Total de pipelines: ${pipelines.length}`,
      `Pipelines que contienen "MDLZ": ${mdlzPipelines.length}`,
      ...mdlzPipelines.slice(0, 5).map(p => `- "${p.name}" (ID: ${p.id?.substring(0, 8)}...)`)
    ]);
    
    setShowDebug(true);
    
    // Si hay resultados, actualiza también los pipelines filtrados para mostrarlos
    if (mdlzPipelines.length > 0) {
      setFilteredResults(mdlzPipelines);
      // No actualizamos la consulta para evitar un ciclo infinito con el useEffect
      if (searchQuery !== "MDLZ") {
        setSearchQuery("MDLZ");
      }
    }
  };
  
  // Estado local para el filtrado
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  
  // Función de filtrado que se ejecuta cuando cambia la búsqueda
  useEffect(() => {
    if (!pipelines || pipelines.length === 0) {
      setDebugResults([`No hay pipelines disponibles`]);
      setFilteredResults([]);
      return;
    }
    
    if (searchQuery.trim() === "") {
      setDebugResults([`Mostrando todos los ${pipelines.length} pipelines`]);
      setFilteredResults(pipelines);
      return;
    }
    
    // Usar toUpperCase para ser consistente con la búsqueda de MDLZ
    const query = searchQuery.toUpperCase();
    
    // Comprobar si estamos buscando MDLZ explícitamente
    if (query === 'MDLZ') {
      findMDLZPipelines();
      return; // La función findMDLZPipelines ya actualiza filteredPipelines
    }
    
    // Filtro mejorado que busca en mayúsculas para ser consistente
    const results = pipelines.filter(pipeline => {
      const nameMatch = pipeline.name?.toUpperCase().includes(query) || false;
      const descMatch = pipeline.description?.toUpperCase().includes(query) || false;
      const idMatch = pipeline.id?.toUpperCase().includes(query) || false;
      
      return nameMatch || descMatch || idMatch;
    });
    
    setDebugResults([
      `Total de pipelines: ${pipelines.length}`,
      `Resultados para "${searchQuery}": ${results.length}`
    ]);
    
    setFilteredResults(results);
  }, [pipelines, searchQuery]);
  
  // Usamos el estado local en lugar del useMemo
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[250px] justify-between"
              disabled={isLoading}
            >
              {isLoading ? "Cargando..." : getSelectedPipelineName()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput
                placeholder="Buscar pipeline..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9"
              />
              <CommandEmpty>No se encontraron pipelines</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[300px]">
                  {filteredPipelines.map((pipeline) => (
                    <CommandItem
                      key={pipeline.id}
                      value={pipeline.id}
                      onSelect={(value) => {
                        onSelectPipeline(value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedPipelineId === pipeline.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pipeline.name}</p>
                        {pipeline.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {pipeline.description}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            setShowDebug(!showDebug);
            if (!showDebug && searchQuery.toLowerCase() === 'mdlz') {
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
                <Badge variant={debugResults.length > 0 ? 'default' : 'destructive'}>
                  {debugResults.length} resultados
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
                  onClick={() => findMDLZPipelines()}
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