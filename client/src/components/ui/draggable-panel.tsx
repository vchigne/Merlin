import React, { ReactNode } from 'react';
import FloatingCard from './floating-card';

interface DraggablePanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  id: string;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  onClose?: () => void;
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  title,
  icon,
  children,
  initialPosition,
  id,
  minWidth,
  maxWidth,
  className,
  onClose
}) => {
  return (
    <FloatingCard
      title={title}
      icon={icon}
      defaultPosition={initialPosition}
      id={id}
      minWidth={minWidth}
      maxWidth={maxWidth}
      className={className}
      onClose={onClose}
    >
      {children}
    </FloatingCard>
  );
};

export default DraggablePanel;