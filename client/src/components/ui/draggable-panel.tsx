import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Minimize, Maximize, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggablePanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onClose?: () => void;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  defaultExpanded?: boolean;
  id?: string;
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  icon,
  children,
  initialPosition = { x: 20, y: 20 },
  onPositionChange,
  onClose,
  minWidth = 300,
  maxWidth = 400,
  className,
  defaultExpanded = true,
  id
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Al iniciar, intentar cargar la posición guardada
  useEffect(() => {
    if (id) {
      const savedPosition = localStorage.getItem(`panel-position-${id}`);
      if (savedPosition) {
        try {
          const parsedPosition = JSON.parse(savedPosition);
          setPosition(parsedPosition);
        } catch (e) {
          console.error('Error al cargar posición guardada:', e);
        }
      }
      
      const savedExpandedState = localStorage.getItem(`panel-expanded-${id}`);
      if (savedExpandedState !== null) {
        setExpanded(savedExpandedState === 'true');
      }
    }
  }, [id]);

  // Guardar posición cuando cambia
  useEffect(() => {
    if (id && !isDragging) {
      localStorage.setItem(`panel-position-${id}`, JSON.stringify(position));
      if (onPositionChange) {
        onPositionChange(position);
      }
    }
  }, [position, isDragging, id, onPositionChange]);

  // Guardar estado expandido cuando cambia
  useEffect(() => {
    if (id) {
      localStorage.setItem(`panel-expanded-${id}`, String(expanded));
    }
  }, [expanded, id]);

  // Manejar fin del arrastre
  const handleDragEnd = (_e: any, info: any) => {
    setIsDragging(false);
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    });
  };

  // Asegurar que el panel no se salga de la pantalla
  useEffect(() => {
    const checkBoundaries = () => {
      if (!panelRef.current) return;
      
      const rect = panelRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      // Evitar que el panel se salga por la izquierda o arriba
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      
      // Evitar que el panel se salga por la derecha o abajo
      // Dejamos al menos 50px del panel visible
      if (newX + rect.width > viewportWidth) {
        newX = Math.max(0, viewportWidth - 50);
      }
      
      if (newY + rect.height > viewportHeight) {
        newY = Math.max(0, viewportHeight - 50);
      }
      
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    };
    
    checkBoundaries();
    window.addEventListener('resize', checkBoundaries);
    
    return () => window.removeEventListener('resize', checkBoundaries);
  }, [position, panelRef.current]);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <motion.div
      ref={panelRef}
      drag
      dragMomentum={false}
      dragListener={false}
      dragElastic={0}
      dragConstraints={constraintsRef}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className="absolute z-50"
      style={{ 
        left: position.x, 
        top: position.y,
        touchAction: 'none'
      }}
      id={id}
    >
      <div ref={constraintsRef}>
        <Card 
          className={cn(
            'overflow-hidden transition-all border rounded-md shadow-lg backdrop-blur-sm',
            isDragging ? 'opacity-80' : 'opacity-100',
            expanded ? 'shadow-xl' : 'shadow-md',
            className
          )}
          style={{ 
            width: expanded ? `${minWidth}px` : 'auto',
            minWidth: expanded ? `${minWidth}px` : 'auto',
            maxWidth: expanded ? `${maxWidth}px` : 'auto'
          }}
        >
          <CardHeader 
            className={cn(
              'py-2 px-3 flex flex-row items-center justify-between cursor-grab border-b',
              !expanded && 'border-b-0'
            )}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
                setIsDragging(true);
                const dragHandlers = (window as any).framerDragControls;
                if (dragHandlers) {
                  const control = dragHandlers.get(panelRef.current);
                  if (control) control.start(e);
                }
              }
            }}
          >
            <div className="flex items-center space-x-2 drag-handle">
              <GripVertical className="h-4 w-4 text-muted-foreground drag-handle" />
              
              {icon && <div className="text-primary drag-handle">{icon}</div>}
              
              <CardTitle className={cn(
                "text-sm font-medium drag-handle",
                !expanded && "flex items-center w-full"
              )}>
                {title}
              </CardTitle>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={toggleExpanded}
                title={expanded ? "Minimizar" : "Expandir"}
              >
                {expanded ? (
                  <Minimize className="h-3.5 w-3.5" />
                ) : (
                  <Maximize className="h-3.5 w-3.5" />
                )}
              </Button>
              
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                  onClick={onClose}
                  title="Cerrar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          
          {expanded && (
            <CardContent className="p-3 overflow-y-auto">
              {children}
            </CardContent>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

export default DraggablePanel;