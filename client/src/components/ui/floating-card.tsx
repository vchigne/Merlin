import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Minimize, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  defaultExpanded?: boolean;
  id: string; // Identificador único para guardar la posición
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onClose?: () => void;
}

const FloatingCard: React.FC<FloatingCardProps> = ({
  title,
  icon,
  children,
  defaultPosition = { x: 20, y: 20 },
  onPositionChange,
  defaultExpanded = true,
  id,
  minWidth = 300,
  maxWidth = 400,
  className,
  onClose
}) => {
  // Estados para la posición, expansión y arrastre
  const [position, setPosition] = useState(defaultPosition);
  const [expanded, setExpanded] = useState(defaultExpanded);
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
      if (onPositionChange) {
        onPositionChange(position);
      }
    }
  }, [position, isDragging, id, onPositionChange]);

  // Guardar el estado expandido cuando cambia
  useEffect(() => {
    if (id) {
      localStorage.setItem(`panel-expanded-${id}`, String(expanded));
    }
  }, [expanded, id]);

  // Manejar el final del arrastre
  const handleDragEnd = (_e: any, info: any) => {
    setIsDragging(false);
    // Actualizar la posición con el offset del arrastre
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    });
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
      onDragStart={() => setIsDragging(true)}
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
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
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

export default FloatingCard;