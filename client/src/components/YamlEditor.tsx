import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Download, Upload } from 'lucide-react';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onApply?: () => void;
  errors?: string[];
  readOnly?: boolean;
}

export function YamlEditor({ value, onChange, onApply, errors = [], readOnly = false }: YamlEditorProps) {
  const isValid = errors.length === 0;

  const downloadYaml = () => {
    const blob = new Blob([value], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controles del editor */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={isValid ? "default" : "destructive"}>
            {isValid ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                YAML Válido
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                {errors.length} Error{errors.length !== 1 ? 'es' : ''}
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadYaml}
            disabled={!value.trim()}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar YAML
          </Button>
          
          {onApply && !readOnly && (
            <Button
              onClick={onApply}
              disabled={!isValid || !value.trim()}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Aplicar Cambios
            </Button>
          )}
        </div>
      </div>

      {/* Errores de validación */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Errores en el YAML:</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Editor de texto */}
      <div className="border rounded-lg">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="# Pipeline YAML
name: 'Mi Pipeline'
description: 'Descripción del pipeline'
configuration:
  agent_passport_id: 'agent-id'
  abort_on_error: true
units: []"
          className="min-h-[500px] font-mono text-sm border-0 resize-none"
          readOnly={readOnly}
        />
      </div>

      {/* Información adicional */}
      <Alert>
        <AlertDescription>
          <div className="text-sm space-y-2">
            <div className="font-medium">Editor YAML:</div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Los cambios se validan en tiempo real</li>
              <li>Usa "Aplicar Cambios" para sincronizar con el editor visual</li>
              <li>Puedes descargar el YAML para uso externo</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}