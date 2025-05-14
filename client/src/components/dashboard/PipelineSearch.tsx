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

  // Filtrar pipelines basados en la búsqueda
  useEffect(() => {
    if (pipelines) {
      if (searchQuery.trim() === "") {
        setFilteredPipelines(pipelines);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = pipelines.filter(
          (pipeline) =>
            pipeline.name.toLowerCase().includes(query) ||
            (pipeline.description && pipeline.description.toLowerCase().includes(query))
        );
        setFilteredPipelines(filtered);
      }
    }
  }, [pipelines, searchQuery]);

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
                  <div>
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
  );
}