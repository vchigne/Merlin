import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useNavigate } from 'wouter';

interface EditPipelineButtonProps {
  pipelineId: string;
  onClose?: () => void;
}

/**
 * Botón para editar un pipeline, navega a la página de edición.
 * Opcionalmente puede cerrar un diálogo antes de navegar.
 */
export default function EditPipelineButton({ pipelineId, onClose }: EditPipelineButtonProps) {
  const [, navigate] = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Editando pipeline:", pipelineId);
    
    // Si hay una función de cierre, la llamamos primero
    if (onClose) {
      onClose();
    }
    
    // Esperamos brevemente para dar tiempo a que se cierre el diálogo si es necesario
    setTimeout(() => {
      navigate(`/pipeline-studio/${pipelineId}`);
    }, 100);
  };

  return (
    <Button 
      size="sm" 
      variant="default"
      onClick={handleClick}
    >
      <Edit className="mr-1 h-4 w-4" />
      Editar
    </Button>
  );
}