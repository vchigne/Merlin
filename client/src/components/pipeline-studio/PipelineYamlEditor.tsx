import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { parse, stringify } from "yaml";
import { useToast } from "@/hooks/use-toast";

interface PipelineYamlEditorProps {
  value: string;
  onChange: (yaml: string) => void;
  readOnly?: boolean;
}

export default function PipelineYamlEditor({
  value,
  onChange,
  readOnly = false,
}: PipelineYamlEditorProps) {
  const [yamlContent, setYamlContent] = useState(value || "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Actualizar el contenido YAML cuando cambia el valor de entrada
  useEffect(() => {
    setYamlContent(value || "");
    setError(null);
  }, [value]);

  // Procesar cambios en el editor YAML
  const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    
    const newYaml = e.target.value;
    setYamlContent(newYaml);
    
    try {
      // Intentar parsear el YAML para validarlo
      parse(newYaml); // Solo validamos la sintaxis
      setError(null);
      
      // Solo notificar cambios válidos
      onChange(newYaml);
    } catch (err: any) {
      setError(`Error de sintaxis: ${err.message}`);
    }
  };

  // Copiar contenido al portapapeles
  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopied(true);
    
    toast({
      title: "Copiado al portapapeles",
      description: "El YAML ha sido copiado.",
      duration: 2000,
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="relative">
        <Textarea
          value={yamlContent}
          onChange={handleYamlChange}
          disabled={readOnly}
          placeholder="# El contenido YAML del pipeline se mostrará aquí"
          className="font-mono text-sm min-h-[500px] resize-y"
        />
        
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2 bg-background"
          onClick={handleCopyYaml}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copiar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}