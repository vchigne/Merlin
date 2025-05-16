import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings2 } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [abortOnError, setAbortOnError] = useState(false);
  
  // Inicializar campos con datos del pipeline
  useEffect(() => {
    if (pipelineData) {
      setName(pipelineData.name || '');
      setDescription(pipelineData.description || '');
      setAgentId(pipelineData.agent_passport_id || '');
      setAbortOnError(pipelineData.abort_on_error === true);
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
  
  const handleAgentChange = (value: string) => {
    if (readOnly) return;
    setAgentId(value);
    onChange({ ...pipelineData, agent_passport_id: value });
  };
  
  const handleAbortOnErrorChange = (checked: boolean) => {
    if (readOnly) return;
    setAbortOnError(checked);
    onChange({ ...pipelineData, abort_on_error: checked });
  };
  
  return (
    <DraggablePanel
      title="Propiedades del Pipeline"
      icon={<Settings2 className="h-4 w-4 text-indigo-500" />}
      initialPosition={initialPosition}
      id="pipeline-properties"
      minWidth={320}
      maxWidth={350}
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
            className="text-sm h-9"
          />
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
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="pipeline-agent" className="text-xs">Agente</Label>
          <Select
            value={agentId}
            onValueChange={handleAgentChange}
            disabled={readOnly}
          >
            <SelectTrigger id="pipeline-agent" className="text-sm h-9">
              <SelectValue placeholder="Seleccionar agente" />
            </SelectTrigger>
            <SelectContent>
              {agentOptions.map((agent) => (
                <SelectItem key={agent.value} value={agent.value}>
                  <div className="flex items-center">
                    <span className="mr-2">
                      <span 
                        className={`inline-block w-2 h-2 rounded-full ${
                          agent.is_healthy ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                    </span>
                    {agent.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="pipeline-abort-on-error" className="text-xs">
            Abortar en caso de error
          </Label>
          <Switch
            id="pipeline-abort-on-error"
            checked={abortOnError}
            onCheckedChange={handleAbortOnErrorChange}
            disabled={readOnly}
          />
        </div>
      </div>
    </DraggablePanel>
  );
};

export default DraggablePipelineProperties;