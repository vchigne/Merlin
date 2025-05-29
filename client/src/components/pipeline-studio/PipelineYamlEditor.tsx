import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { convertPipelineToYaml, convertYamlToPipeline } from '@/lib/pipeline-yaml-converter';
import { useToast } from '@/hooks/use-toast';

interface PipelineYamlEditorProps {
  pipelineData: any;
  pipelineUnits: any[];
  onYamlToPipelineConvert?: (pipelineData: any, pipelineUnits: any[]) => void;
  isReadOnly?: boolean;
}

export default function PipelineYamlEditor({ 
  pipelineData, 
  pipelineUnits, 
  onYamlToPipelineConvert,
  isReadOnly = false
}: PipelineYamlEditorProps) {
  const [yamlContent, setYamlContent] = useState<string>('');
  const [isValidYaml, setIsValidYaml] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Generar YAML cuando cambian los datos del pipeline
  useEffect(() => {
    if (pipelineData && pipelineUnits) {
      try {
        const yaml = convertPipelineToYaml(pipelineData, pipelineUnits);
        setYamlContent(yaml);
        setIsValidYaml(true);
        setValidationErrors([]);
      } catch (error) {
        console.error('Error al generar YAML:', error);
        setValidationErrors(['Error al generar YAML desde el pipeline']);
        setIsValidYaml(false);
      }
    }
  }, [pipelineData, pipelineUnits]);

  // Validar YAML cuando cambia el contenido
  const validateYaml = (content: string) => {
    try {
      // Validación básica de estructura YAML
      const lines = content.split('\n');
      const errors: string[] = [];
      
      // Verificar que tenga las secciones básicas
      if (!content.includes('name:')) {
        errors.push('Falta el campo "name" del pipeline');
      }
      
      if (!content.includes('units:')) {
        errors.push('Falta la sección "units"');
      }

      // Verificar indentación básica
      let inUnitsSection = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === 'units:') {
          inUnitsSection = true;
          continue;
        }
        
        if (inUnitsSection && line.trim() && !line.startsWith('  ')) {
          if (!line.startsWith(' ') && line.includes(':')) {
            inUnitsSection = false;
          }
        }
      }

      setValidationErrors(errors);
      setIsValidYaml(errors.length === 0);
      
      return errors.length === 0;
    } catch (error) {
      setValidationErrors(['YAML inválido: Error de sintaxis']);
      setIsValidYaml(false);
      return false;
    }
  };

  // Manejar cambios en el contenido YAML
  const handleYamlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    setYamlContent(content);
    validateYaml(content);
  };

  // Copiar YAML al clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      toast({
        title: "Copiado",
        description: "YAML copiado al portapapeles",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive"
      });
    }
  };

  // Descargar YAML como archivo
  const downloadYaml = () => {
    try {
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pipelineData?.name || 'pipeline'}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Descargado",
        description: "Archivo YAML descargado correctamente",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive"
      });
    }
  };

  // Aplicar cambios YAML al pipeline
  const applyYamlChanges = () => {
    if (!isValidYaml) {
      toast({
        title: "YAML inválido",
        description: "Corrige los errores antes de aplicar los cambios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { pipelineData: newPipelineData, pipelineUnits: newPipelineUnits } = 
        convertYamlToPipeline(yamlContent);
      
      if (onYamlToPipelineConvert) {
        onYamlToPipelineConvert(newPipelineData, newPipelineUnits);
        toast({
          title: "Cambios aplicados",
          description: "El pipeline se ha actualizado desde el YAML",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error al convertir",
        description: "No se pudo convertir el YAML al formato de pipeline",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Editor YAML</h3>
          {isValidYaml ? (
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              <span className="text-sm">YAML válido</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="text-sm">YAML inválido</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadYaml}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          
          {!isReadOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={applyYamlChanges}
              disabled={!isValidYaml}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Aplicar Cambios
            </Button>
          )}
        </div>
      </div>

      {/* Errores de validación */}
      {validationErrors.length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Errores de validación:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Editor YAML */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Definición YAML del Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <Textarea
              value={yamlContent}
              onChange={handleYamlChange}
              readOnly={isReadOnly}
              className={`min-h-[580px] font-mono text-sm resize-none ${
                isValidYaml ? 'border-green-200' : 'border-red-200'
              }`}
              placeholder="# El contenido YAML del pipeline aparecerá aquí..."
            />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Alert>
        <AlertDescription>
          <p className="text-sm text-muted-foreground">
            Este editor muestra la representación YAML del pipeline actual. 
            {!isReadOnly && ' Puedes editarlo directamente y aplicar los cambios al pipeline visual.'}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}