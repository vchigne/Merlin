import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { executeQuery } from "@/lib/hasura-client";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface EditableDescriptionProps {
  pipelineId: string;
  description: string | null;
  className?: string;
  compact?: boolean;
}

export function EditableDescription({ pipelineId, description, className = "", compact = false }: EditableDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setValue(description || "");
  }, [description]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value === (description || "")) {
      setIsEditing(false);
      return;
    }

    if (!pipelineId) {
      toast({
        title: "Error",
        description: "No se puede identificar el pipeline.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await executeQuery(`
        mutation UpdatePipelineDescription($id: uuid!, $description: String!) {
          update_merlin_agent_Pipeline_by_pk(
            pk_columns: {id: $id}
            _set: {description: $description}
          ) {
            id
            description
          }
        }
      `, { id: pipelineId, description: value });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      toast({
        title: "Descripción actualizada",
        description: "La descripción del pipeline se guardó correctamente.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pipelines', pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['/api/pipeline', pipelineId] });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo actualizar la descripción.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(description || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${compact ? 'text-xs' : ''}`}
          placeholder="Ej: pipeline de CHIMU para la fabrica [MDLZ]"
          disabled={isSaving}
        />
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <>
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
              title="Guardar (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
              title="Cancelar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-1.5 ${className}`}>
      <span className={`text-slate-500 dark:text-slate-400 ${compact ? 'text-xs truncate max-w-[200px]' : 'text-sm'}`}>
        {description || <span className="italic text-slate-400 dark:text-slate-500">Sin descripción</span>}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsEditing(true);
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
        title="Editar descripción"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
