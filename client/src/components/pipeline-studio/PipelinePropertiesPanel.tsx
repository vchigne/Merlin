import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Check, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface PipelinePropertiesPanelProps {
  pipelineData: any;
  agentOptions: Array<{ label: string; value: string; is_healthy: boolean }>;
  onChange: (updatedData: any) => void;
  readOnly?: boolean;
}

export default function PipelinePropertiesPanel({
  pipelineData,
  agentOptions,
  onChange,
  readOnly = false,
}: PipelinePropertiesPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [abortOnError, setAbortOnError] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Sincronizar estados con los datos del pipeline
  useEffect(() => {
    if (pipelineData) {
      setName(pipelineData.name || "");
      setDescription(pipelineData.description || "");
      setAgentId(pipelineData.agent_passport_id || "");
      setAbortOnError(pipelineData.abort_on_error !== false);
    }
  }, [pipelineData]);

  // Manejar cambios en los campos
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const newName = e.target.value;
    setName(newName);
    onChange({ ...pipelineData, name: newName });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const newDescription = e.target.value;
    setDescription(newDescription);
    onChange({ ...pipelineData, description: newDescription });
  };

  const handleAgentChange = (newAgentId: string) => {
    if (readOnly) return;
    setAgentId(newAgentId);
    onChange({ ...pipelineData, agent_passport_id: newAgentId });
  };

  const handleAbortOnErrorChange = (checked: boolean) => {
    if (readOnly) return;
    setAbortOnError(checked);
    onChange({ ...pipelineData, abort_on_error: checked });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card>
      <CardHeader className="py-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Propiedades del Pipeline</CardTitle>
          {!isExpanded && (
            <CardDescription className="text-xs">
              {name ? name : "Sin nombre"} - {agentId ? "Agente seleccionado" : "Sin agente"}
            </CardDescription>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleExpanded}
          className="h-7 w-7 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pipeline-name" className="text-xs">Nombre</Label>
            <Input
              id="pipeline-name"
              placeholder="Nombre del pipeline"
              value={name}
              onChange={handleNameChange}
              disabled={readOnly}
              className={`text-sm h-8 ${!name ? "border-red-300" : ""}`}
            />
            {!name && (
              <p className="text-xs text-red-500">El nombre es obligatorio</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pipeline-description" className="text-xs">Descripción</Label>
            <Textarea
              id="pipeline-description"
              placeholder="Descripción del pipeline"
              value={description}
              onChange={handleDescriptionChange}
              disabled={readOnly}
              className="text-sm min-h-[60px]"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pipeline-agent" className="text-xs">Agente</Label>
            <Select
              value={agentId}
              onValueChange={handleAgentChange}
              disabled={readOnly}
            >
              <SelectTrigger
                id="pipeline-agent"
                className={`text-sm h-8 ${!agentId ? "border-red-300" : ""}`}
              >
                <SelectValue placeholder="Selecciona un agente" />
              </SelectTrigger>
              <SelectContent>
                {agentOptions.map((agent) => (
                  <SelectItem 
                    key={agent.value} 
                    value={agent.value}
                    className="flex items-center text-sm"
                  >
                    <div className="flex items-center w-full">
                      <span className="flex-grow">{agent.label}</span>
                      {agent.is_healthy ? (
                        <Check className="h-3 w-3 text-green-500 ml-2" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500 ml-2" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!agentId && (
              <p className="text-xs text-red-500">
                Debes seleccionar un agente
              </p>
            )}
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="abort-on-error" className="text-xs">Abortar en error</Label>
              <p className="text-xs text-muted-foreground">
                Detener el pipeline si ocurre un error
              </p>
            </div>
            <Switch
              id="abort-on-error"
              checked={abortOnError}
              onCheckedChange={handleAbortOnErrorChange}
              disabled={readOnly}
            />
          </div>

          <div className="rounded-md bg-blue-50 p-2 mt-2">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-4 w-4 text-blue-400" />
              </div>
              <div className="ml-2">
                <h3 className="text-xs font-medium text-blue-800">
                  Información
                </h3>
                <div className="mt-1 text-xs text-blue-700">
                  <p>
                    Asegúrate de seleccionar un agente que esté en línea (marcado con ✓) 
                    para poder ejecutar el pipeline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}