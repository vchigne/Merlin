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
    const mdlzPipelines = pipelines.filter(p => 
      p.name?.includes('MDLZ') || 
      p.description?.includes('MDLZ') || 
      p.id?.includes('MDLZ')
    );
    
    setDebugResults([
      `Total de pipelines: ${pipelines.length}`,
      `Pipelines que contienen "MDLZ": ${mdlzPipelines.length}`,
      ...mdlzPipelines.map(p => `- "${p.name}" (ID: ${p.id?.substring(0, 8)}...)`)
    ]);
    
    setShowDebug(true);
  };
  
  // Usar useMemo para filtrar pipelines
  const filteredPipelines = useMemo(() => {
    if (!pipelines || pipelines.length === 0) {
      setDebugResults([`No hay pipelines disponibles`]);
      return [];
    }
    
    if (searchQuery.trim() === "") {
      setDebugResults([`Mostrando todos los ${pipelines.length} pipelines`]);
      return pipelines;
    }
    
    const query = searchQuery.toLowerCase();
    
    // Comprobar si estamos buscando MDLZ, en ese caso probamos todas las variantes
    if (query === 'mdlz') {
      findMDLZPipelines();
    }
    
    // Filtro mejorado con prioridad para coincidencias exactas
    const results = pipelines.filter(pipeline => {
      const nameMatch = pipeline.name?.toLowerCase().includes(query) || false;
      const descMatch = pipeline.description?.toLowerCase().includes(query) || false;
      const idMatch = pipeline.id?.toLowerCase().includes(query) || false;
      
      return nameMatch || descMatch || idMatch;
    });
    
    setDebugResults(prev => [
      ...prev,
      `Buscando "${query}" - Resultados: ${results.length}`
    ]);
    
    return results;
  }, [pipelines, searchQuery]);

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