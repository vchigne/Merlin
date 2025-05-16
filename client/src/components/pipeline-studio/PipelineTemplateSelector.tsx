import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Database, Upload, Download, Workflow, FileArchive, FileCode, Code, ArrowLeft, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface PipelineTemplateProps {
  onSelect: (template: any) => void;
}

export default function PipelineTemplateSelector({ onSelect }: PipelineTemplateProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const { toast } = useToast();

  // Cargar las plantillas de pipeline y clasificarlas
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        // En un entorno real, esta sería una llamada a la API para obtener las plantillas
        // Aquí vamos a simular una llamada utilizando las plantillas que ya tenemos
        
        // Buscar plantillas en la carpeta templates/pipelines
        const response = await fetch('/api/pipeline-templates');
        
        if (!response.ok) {
          throw new Error('No se pudieron cargar las plantillas');
        }
        
        const data = await response.json();
        
        // Extraer todas las categorías y etiquetas únicas
        const allCategories = new Set<string>();
        const allTags = new Set<string>();
        
        data.forEach((template: any) => {
          if (template.category) {
            allCategories.add(template.category);
          }
          
          if (template.tags && Array.isArray(template.tags)) {
            template.tags.forEach((tag: string) => {
              allTags.add(tag);
            });
          }
        });
        
        setTemplates(data);
        setCategories(Array.from(allCategories));
        setTags(Array.from(allTags));
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar las plantillas:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las plantillas de pipeline."
        });
        setLoading(false);
      }
    };
    
    fetchTemplates();
  }, []);

  // Filtrar las plantillas según los criterios de búsqueda
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (template.tags && template.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesCategory = !categoryFilter || template.category === categoryFilter;
    
    const matchesTag = !tagFilter || (template.tags && template.tags.includes(tagFilter));
    
    return matchesSearch && matchesCategory && matchesTag;
  });

  // Clasificar plantillas por categoría
  const getTemplatesByCategory = () => {
    if (!categoryFilter) {
      // Si no hay filtro de categoría, agrupar por categoría
      const groupedTemplates: { [key: string]: any[] } = {};
      
      filteredTemplates.forEach(template => {
        const category = template.category || 'sin-categoria';
        if (!groupedTemplates[category]) {
          groupedTemplates[category] = [];
        }
        groupedTemplates[category].push(template);
      });
      
      return groupedTemplates;
    } else {
      // Si hay filtro de categoría, devolver solo las plantillas filtradas
      return { [categoryFilter]: filteredTemplates };
    }
  };

  // Obtener un ícono para la categoría
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'data-processing':
        return <Database className="h-5 w-5 text-blue-500" />;
      case 'file-transfer':
        return <Upload className="h-5 w-5 text-green-500" />;
      case 'data-export':
        return <Download className="h-5 w-5 text-purple-500" />;
      case 'integration':
        return <Workflow className="h-5 w-5 text-amber-500" />;
      case 'compression':
        return <FileArchive className="h-5 w-5 text-red-500" />;
      case 'scripting':
        return <FileCode className="h-5 w-5 text-indigo-500" />;
      case 'automation':
        return <Code className="h-5 w-5 text-emerald-500" />;
      default:
        return <Workflow className="h-5 w-5 text-slate-500" />;
    }
  };

  // Obtener un color para el tipo de plantilla
  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'command':
        return 'bg-blue-100 text-blue-800';
      case 'sql':
        return 'bg-green-100 text-green-800';
      case 'sftp':
        return 'bg-purple-100 text-purple-800';
      case 'zip':
        return 'bg-amber-100 text-amber-800';
      case 'unzip':
        return 'bg-indigo-100 text-indigo-800';
      case 'composite':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Renderizar la plantilla como una tarjeta
  const renderTemplateCard = (template: any) => {
    return (
      <Card 
        key={template.id} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelect(template)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {template.metadata?.icon && (
              <span className={`text-${template.metadata.color || 'slate-500'}`}>
                {getCategoryIcon(template.category)}
              </span>
            )}
            {template.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {template.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-wrap gap-1 mb-1">
            {template.tags && template.tags.map((tag: string) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className={getTemplateTypeColor(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            {template.metadata?.complexity && (
              <span className="inline-block mr-2">
                Complejidad: {template.metadata.complexity}
              </span>
            )}
            <span className="inline-block">
              Versión: {template.version || '1.0'}
            </span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            size="sm" 
            variant="default" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template);
            }}
          >
            Seleccionar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Renderizar las plantillas agrupadas por categoría
  const renderTemplateGroups = () => {
    const groupedTemplates = getTemplatesByCategory();
    
    if (Object.keys(groupedTemplates).length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-500">No se encontraron plantillas que coincidan con los criterios de búsqueda.</p>
        </div>
      );
    }
    
    return Object.entries(groupedTemplates).map(([category, templates]) => (
      <div key={category} className="mb-6">
        <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
          {getCategoryIcon(category)}
          {category === 'data-processing' && 'Procesamiento de Datos'}
          {category === 'file-transfer' && 'Transferencia de Archivos'}
          {category === 'data-export' && 'Exportación de Datos'}
          {category === 'integration' && 'Integración'}
          {category === 'compression' && 'Compresión de Archivos'}
          {category === 'scripting' && 'Scripts y Comandos'}
          {category === 'automation' && 'Automatización'}
          {category === 'sin-categoria' && 'Otras Plantillas'}
          {!['data-processing', 'file-transfer', 'data-export', 'integration', 'compression', 'scripting', 'automation', 'sin-categoria'].includes(category) && category}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {templates.map(renderTemplateCard)}
        </div>
      </div>
    ));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar plantillas..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'data-processing' && 'Procesamiento de Datos'}
                  {category === 'file-transfer' && 'Transferencia de Archivos'}
                  {category === 'data-export' && 'Exportación de Datos'}
                  {category === 'integration' && 'Integración'}
                  {category === 'compression' && 'Compresión de Archivos'}
                  {category === 'scripting' && 'Scripts y Comandos'}
                  {category === 'automation' && 'Automatización'}
                  {!['data-processing', 'file-transfer', 'data-export', 'integration', 'compression', 'scripting', 'automation'].includes(category) && category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Etiquetas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las etiquetas</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-slate-500">Cargando plantillas...</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          {renderTemplateGroups()}
        </ScrollArea>
      )}
    </div>
  );
}