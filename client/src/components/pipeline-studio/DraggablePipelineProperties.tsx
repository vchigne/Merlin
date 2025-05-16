import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Info, Settings2, AlertTriangle, Check } from 'lucide-react';
import DraggablePanel from '@/components/ui/draggable-panel';

interface AgentOption {
  label: string;
  value: string;
  is_healthy: boolean;
}

interface PipelinePropertiesProps {
  pipelineData: any;
  onChange: (updatedData: any) => void;
  agentOptions: AgentOption[];
  readOnly?: boolean;
  initialPosition?: { x: number, y: number };
}

const DraggablePipelineProperties: React.FC<PipelinePropertiesProps> = ({
  pipelineData,
  onChange,
  agentOptions,
  readOnly = false,
  initialPosition = { x: window.innerWidth - 350, y: 70 }
}) => {
  // Funciones para manejar cambios en las propiedades
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onChange({ ...pipelineData, name: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onChange({ ...pipelineData, description: e.target.value });
  };

  const handleAgentChange = (value: string) => {
    if (readOnly) return;
    onChange({ ...pipelineData, agent_passport_id: value });
  };

  const handleAbortOnErrorChange = (checked: boolean) => {
    if (readOnly) return;
    onChange({ ...pipelineData, abort_on_error: checked });
  };

  // Valores de los campos
  const name = pipelineData?.name || '';
  const description = pipelineData?.description || '';
  const agentId = pipelineData?.agent_passport_id || '';
  const abortOnError = pipelineData?.abort_on_error !== false;

  return (
    <DraggablePanel
      title="Propiedades del Pipeline"
      icon={<Settings2 className="h-4 w-4 text-blue-600" />}
      initialPosition={initialPosition}
      id="pipeline-properties"
      minWidth={320}
      className="bg-card/95 backdrop-blur-md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pipeline-name" className="text-xs">Nombre</Label>
          <Input
            id="pipeline-name"
            value={name}
            onChange={handleNameChange}
            disabled={readOnly}
            placeholder="Nombre del pipeline"
            className={`text-sm h-9 ${!name ? 'border-red-400' : ''}`}
          />
          {!name && (
            <p className="text-xs text-red-500">El nombre es obligatorio</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-description" className="text-xs">Descripción</Label>
          <Textarea
            id="pipeline-description"
            value={description}
            onChange={handleDescriptionChange}
            disabled={readOnly}
            placeholder="Descripción del pipeline"
            className="text-sm min-h-[80px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-agent" className="text-xs">Agente</Label>
          <Select
            value={agentId}
            onValueChange={handleAgentChange}
            disabled={readOnly}
          >
            <SelectTrigger 
              id="pipeline-agent" 
              className={`text-sm h-9 ${!agentId ? 'border-red-400' : ''}`}
            >
              <SelectValue placeholder="Selecciona un agente" />
            </SelectTrigger>
            <SelectContent>
              {agentOptions.map((agent) => (
                <SelectItem 
                  key={agent.value} 
                  value={agent.value}
                  className="flex items-center text-sm py-1.5"
                >
                  <div className="flex items-center justify-between w-full pr-2">
                    <span>{agent.label}</span>
                    {agent.is_healthy ? (
                      <Check className="h-3.5 w-3.5 text-green-500 ml-2 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!agentId && (
            <p className="text-xs text-red-500">Debes seleccionar un agente</p>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
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

        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 mt-1">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-4 w-4 text-blue-500" />
            </div>
            <div className="ml-2">
              <h3 className="text-xs font-medium text-blue-800 dark:text-blue-300">
                Información
              </h3>
              <div className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                <p>
                  Asegúrate de seleccionar un agente que esté en línea (marcado con ✓) 
                  para poder ejecutar el pipeline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default DraggablePipelineProperties;