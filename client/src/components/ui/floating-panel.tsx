import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Button } from './button';
import { ChevronUp, ChevronDown, Maximize, Minimize, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingPanelProps {
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  initialExpanded?: boolean;
  className?: string;
  width?: string | number;
  icon?: ReactNode;
  id?: string;
}

export function FloatingPanel({
  title,
  children,
  defaultPosition = { x: 20, y: 20 },
  onPositionChange,
  initialExpanded = true,
  className,
  width = 320,
  icon,
  id
}: FloatingPanelProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Calcular el ancho real teniendo en cuenta si es un número o string
  const actualWidth = typeof width === 'number' ? `${width}px` : width;

  // Iniciar el arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      setIsDragging(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      
      // Calcular el offset para que el panel no salte al cursor
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      
      // Prevenir selección de texto durante el arrastre
      e.preventDefault();
    }
  };

  // Manejar el arrastre con touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (panelRef.current && e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
      
      // Calcular el offset para el touch
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
    }
  };

  // Global mouse/touch move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && panelRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Actualizar posición
        setPosition({ x: newX, y: newY });
        
        // Notificar cambio de posición
        if (onPositionChange) {
          onPositionChange({ x: newX, y: newY });
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && panelRef.current && e.touches.length === 1) {
        const newX = e.touches[0].clientX - dragOffset.x;
        const newY = e.touches[0].clientY - dragOffset.y;
        
        // Actualizar posición
        setPosition({ x: newX, y: newY });
        
        // Notificar cambio de posición
        if (onPositionChange) {
          onPositionChange({ x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    // Agregar event listeners
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  // Evitar que el panel salga de la ventana
  useEffect(() => {
    if (panelRef.current) {
      const handleResize = () => {
        const panelRect = panelRef.current?.getBoundingClientRect();
        if (panelRect) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          let newX = position.x;
          let newY = position.y;
          
          // Verificar si el panel está fuera del viewport
          if (newX < 0) newX = 0;
          if (newY < 0) newY = 0;
          if (newX + panelRect.width > viewportWidth) newX = viewportWidth - panelRect.width;
          if (newY + panelRect.height > viewportHeight) newY = viewportHeight - panelRect.height;
          
          if (newX !== position.x || newY !== position.y) {
            setPosition({ x: newX, y: newY });
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [position]);

  return (
    <Card 
      ref={panelRef}
      className={cn(
        'absolute shadow-md overflow-hidden transition-all z-40',
        isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab',
        expanded ? 'shadow-lg' : 'shadow-sm',
        className
      )}
      style={{
        width: expanded ? actualWidth : 'auto',
        left: position.x,
        top: position.y,
        transition: isDragging ? 'none' : 'width 0.2s ease, height 0.2s ease, opacity 0.2s ease',
      }}
      id={id}
    >
      <CardHeader 
        className={cn(
          'py-2 flex flex-row items-center justify-between cursor-grab',
          expanded ? 'border-b' : 'border-none'
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center space-x-2 cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground mr-1" />
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="h-6 w-6 p-0 rounded-full"
          aria-label={expanded ? "Minimizar" : "Expandir"}
        >
          {expanded ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </Button>
      </CardHeader>
      
      {expanded && (
        <CardContent className={cn('p-3 transition-all')}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}