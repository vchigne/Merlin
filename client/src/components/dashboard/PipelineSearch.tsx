import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown } from "lucide-react";

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
  const [filteredPipelines, setFilteredPipelines] = useState<any[]>([]);

  // Filtrar pipelines basados en la búsqueda con prioridad a coincidencias al inicio de palabras
  useEffect(() => {
    if (pipelines) {
      if (searchQuery.trim() === "") {
        setFilteredPipelines(pipelines);
      } else {
        const query = searchQuery.toLowerCase();
        
        // Función que puntúa la relevancia de la coincidencia
        const scoreMatch = (text: string, query: string): number => {
          if (!text) return 0;
          const lowerText = text.toLowerCase();
          
          // Mayor puntuación si coincide desde el inicio
          if (lowerText.startsWith(query)) return 100;
          
          // Buscar coincidencias con siglas/acrónimos
          // Si el query es en mayúsculas, consideramos que es una sigla/acrónimo
          if (searchQuery === searchQuery.toUpperCase() && searchQuery.length > 1) {
            // Extraer todas las letras mayúsculas para formar una posible sigla
            const upperCaseLetters = text.split('').filter(char => char === char.toUpperCase() && char.match(/[A-Z]/));
            const possibleAcronym = upperCaseLetters.join('').toLowerCase();
            
            if (possibleAcronym.includes(query)) return 90;
          }
          
          // Buscar coincidencias al inicio de las palabras
          const words = lowerText.split(/\s+/);
          for (const word of words) {
            if (word.startsWith(query)) return 80;
          }
          
          // Buscar coincidencias especiales para siglas como MDLZ
          if (searchQuery.toUpperCase() === searchQuery) {
            // Verificamos si la búsqueda es una sigla
            // Comprobamos si hay coincidencia con alguna palabra que está en mayúsculas
            const uppercaseWords = text.match(/[A-Z]{2,}/g) || [];
            for (const word of uppercaseWords) {
              if (word.toLowerCase().includes(query)) {
                return 70;
              }
            }
            
            // Casos especiales - coincidencias directas por acronimos conocidos
            const specialAcronyms: Record<string, string[]> = {
              'MDLZ': ['mondelez', 'mondelēz'],
              'MCD': ['mcdonalds'],
              'KO': ['coca', 'cola', 'cocacola'],
              'PG': ['procter', 'gamble', 'procterandgamble']
            };
            
            if (specialAcronyms[searchQuery.toUpperCase()]) {
              for (const keyword of specialAcronyms[searchQuery.toUpperCase()]) {
                if (lowerText.includes(keyword)) {
                  return 95; // Alta prioridad para estos casos especiales
                }
              }
            }
          }
          
          // Buscar coincidencias en cualquier parte, pero con menor prioridad
          if (lowerText.includes(query)) return 50;
          
          return 0;
        };
        
        // Filtrar y ordenar por puntuación
        const filtered = pipelines
          .map(pipeline => {
            // Para debugging
            console.log(`Pipeline: ${pipeline.name}, Query: ${query}`);
            
            const nameScore = scoreMatch(pipeline.name, query);
            const descScore = pipeline.description ? scoreMatch(pipeline.description, query) : 0;
            
            // Para debugging
            if (nameScore > 0 || descScore > 0) {
              console.log(`Match! Name score: ${nameScore}, Desc score: ${descScore}`);
            }
            
            return {
              ...pipeline,
              score: Math.max(nameScore, descScore)
            };
          })
          .filter(p => p.score > 0)
          .sort((a, b) => b.score - a.score);
        
        console.log(`Found ${filtered.length} matches for query: ${query}`);
        setFilteredPipelines(filtered);
      }
    }
  }, [pipelines, searchQuery, searchQuery]);

  // Obtener el nombre del pipeline seleccionado
  const getSelectedPipelineName = () => {
    if (!selectedPipelineId || !pipelines) return "Seleccionar pipeline";
    const selected = pipelines.find((p) => p.id === selectedPipelineId);
    return selected ? selected.name : "Seleccionar pipeline";
  };

  return (
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
                    <p className="text-sm font-medium flex items-center">
                      {pipeline.name}
                      {pipeline.score >= 100 && (
                        <span className="ml-2 text-xs px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-sm">
                          Exacta
                        </span>
                      )}
                      {pipeline.score >= 95 && pipeline.score < 100 && (
                        <span className="ml-2 text-xs px-1 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-sm">
                          Empresa
                        </span>
                      )}
                      {pipeline.score >= 90 && pipeline.score < 95 && (
                        <span className="ml-2 text-xs px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-sm">
                          Acrónimo
                        </span>
                      )}
                      {pipeline.score >= 80 && pipeline.score < 90 && (
                        <span className="ml-2 text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-sm">
                          Inicio
                        </span>
                      )}
                      {pipeline.score >= 70 && pipeline.score < 80 && (
                        <span className="ml-2 text-xs px-1 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-sm">
                          Sigla
                        </span>
                      )}
                    </p>
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
  );
}