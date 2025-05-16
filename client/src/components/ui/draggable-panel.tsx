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
  id: string; // Identificador único para guardar la posición
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onClose?: () => void;
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  icon,
  children,
  initialPosition = { x: 20, y: 20 },
  id,
  minWidth = 300,
  maxWidth = 400,
  className,
  onClose
}) => {
  // Estados para la posición, expansión y arrastre
  const [position, setPosition] = useState(initialPosition);
  const [expanded, setExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Cargar la posición guardada al inicializar
  useEffect(() => {
    if (id) {
      try {
        const savedPosition = localStorage.getItem(`panel-position-${id}`);
        if (savedPosition) {
          setPosition(JSON.parse(savedPosition));
        }
        
        const savedExpanded = localStorage.getItem(`panel-expanded-${id}`);
        if (savedExpanded !== null) {
          setExpanded(savedExpanded === 'true');
        }
      } catch (error) {
        console.error('Error loading panel position:', error);
      }
    }
  }, [id]);

  // Guardar la posición cuando cambia
  useEffect(() => {
    if (id && !isDragging) {
      localStorage.setItem(`panel-position-${id}`, JSON.stringify(position));
    }
  }, [position, isDragging, id]);

  // Guardar el estado expandido cuando cambia
  useEffect(() => {
    if (id) {
      localStorage.setItem(`panel-expanded-${id}`, String(expanded));
    }
  }, [expanded, id]);

  // Manejar el inicio del arrastre
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  // Manejar el final del arrastre
  const handleDragEnd = (_e: any, info: any) => {
    setIsDragging(false);
    
    // Actualizar la posición con el offset del arrastre
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    };
    
    // Asegurarse de que la posición está dentro de los límites de la ventana
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Límites de seguridad
    if (newPosition.x < 0) newPosition.x = 0;
    if (newPosition.y < 0) newPosition.y = 0;
    if (newPosition.x > viewportWidth - 50) newPosition.x = viewportWidth - 50;
    if (newPosition.y > viewportHeight - 50) newPosition.y = viewportHeight - 50;
    
    setPosition(newPosition);
  };

  // Asegurar que el panel esté dentro de los límites de la ventana
  useEffect(() => {
    const checkBoundaries = () => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      // Evitar que el panel se salga por la izquierda o arriba
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      
      // Evitar que el panel se salga por la derecha o abajo
      // Dejamos al menos 40px del panel visible
      if (newX + rect.width > viewportWidth) {
        newX = Math.max(0, viewportWidth - 40);
      }
      
      if (newY + rect.height > viewportHeight) {
        newY = Math.max(0, viewportHeight - 40);
      }
      
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    };
    
    checkBoundaries();
    window.addEventListener('resize', checkBoundaries);
    
    return () => window.removeEventListener('resize', checkBoundaries);
  }, [position, expanded]);

  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        zIndex: 999,
        left: position.x,
        top: position.y,
        touchAction: 'none' // Para mejor soporte en dispositivos táctiles
      }}
    >
      <Card 
        className={cn(
          'shadow-lg overflow-hidden transition-all duration-200',
          isDragging ? 'opacity-80' : 'opacity-100',
          className
        )}
        style={{
          width: expanded ? `${minWidth}px` : 'auto',
          minWidth: expanded ? `${minWidth}px` : 'auto',
          maxWidth: expanded ? `${maxWidth}px` : 'auto',
        }}
      >
        <CardHeader 
          className={cn(
            'p-2 flex flex-row items-center justify-between cursor-grab border-b',
            !expanded && 'border-b-0'
          )}
        >
          <div className="flex items-center space-x-2">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {icon && <span className="text-primary">{icon}</span>}
            <CardTitle className={cn(
              "text-sm font-medium truncate",
              !expanded && "text-xs"
            )}>
              {title}
            </CardTitle>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full"
              onClick={() => setExpanded(!expanded)}
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
          <CardContent className="p-3 overflow-auto max-h-[calc(100vh-150px)]">
            {children}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
};

export default DraggablePanel;