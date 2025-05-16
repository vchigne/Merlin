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
import { Info, Check, X, AlertTriangle } from "lucide-react";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propiedades del Pipeline</CardTitle>
        <CardDescription>Configura las propiedades básicas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pipeline-name">Nombre</Label>
          <Input
            id="pipeline-name"
            placeholder="Nombre del pipeline"
            value={name}
            onChange={handleNameChange}
            disabled={readOnly}
            className={!name ? "border-red-300" : ""}
          />
          {!name && (
            <p className="text-xs text-red-500">El nombre es obligatorio</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-description">Descripción</Label>
          <Textarea
            id="pipeline-description"
            placeholder="Descripción del pipeline"
            value={description}
            onChange={handleDescriptionChange}
            disabled={readOnly}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-agent">Agente</Label>
          <Select
            value={agentId}
            onValueChange={handleAgentChange}
            disabled={readOnly}
          >
            <SelectTrigger
              id="pipeline-agent"
              className={!agentId ? "border-red-300" : ""}
            >
              <SelectValue placeholder="Selecciona un agente" />
            </SelectTrigger>
            <SelectContent>
              {agentOptions.map((agent) => (
                <SelectItem 
                  key={agent.value} 
                  value={agent.value}
                  className="flex items-center"
                >
                  <div className="flex items-center w-full">
                    <span className="flex-grow">{agent.label}</span>
                    {agent.is_healthy ? (
                      <Check className="h-4 w-4 text-green-500 ml-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 ml-2" />
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

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="abort-on-error">Abortar en error</Label>
            <p className="text-sm text-muted-foreground">
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

        <div className="rounded-md bg-blue-50 p-4 mt-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Información
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Asegúrate de seleccionar un agente que esté en línea (marcado con ✓) 
                  para poder ejecutar el pipeline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}