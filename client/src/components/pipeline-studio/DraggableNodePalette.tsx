import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FloatingPanel } from '@/components/ui/floating-panel';
import {
  Command,
  Download,
  Upload,
  File,
  FileText,
  Plus,
  Database,
  Hash,
  Server,
  SquareStack,
  Layers,
  Boxes
} from 'lucide-react';

export const NODE_TYPE_ICON_MAP: Record<string, React.ReactNode> = {
  Command: <Command className="h-5 w-5 text-amber-500" />,
  QueryQueue: <Database className="h-5 w-5 text-blue-500" />,
  SFTPDownloader: <Download className="h-5 w-5 text-green-500" />,
  SFTPUploader: <Upload className="h-5 w-5 text-red-500" />,
  Zip: <File className="h-5 w-5 text-purple-500" />,
  UnZip: <FileText className="h-5 w-5 text-indigo-500" />,
  CallPipeline: <SquareStack className="h-5 w-5 text-cyan-500" />,
  "Pipeline Start": <Hash className="h-5 w-5 text-emerald-500" />,
  "Unit Group": <Layers className="h-5 w-5 text-teal-500" />,
  "SQL Connection": <Server className="h-5 w-5 text-rose-500" />,
  "Pipeline": <Boxes className="h-5 w-5 text-orange-500" />
};

const NODE_CATEGORIES = [
  {
    title: 'Comandos',
    items: [
      { type: 'Command', label: 'Comando' },
      { type: 'CallPipeline', label: 'Llamar Pipeline' }
    ]
  },
  {
    title: 'Archivos',
    items: [
      { type: 'Zip', label: 'Comprimir' },
      { type: 'UnZip', label: 'Descomprimir' },
      { type: 'SFTPDownloader', label: 'Descargar SFTP' },
      { type: 'SFTPUploader', label: 'Subir SFTP' }
    ]
  },
  {
    title: 'Datos',
    items: [
      { type: 'QueryQueue', label: 'Cola de Consultas' }
    ]
  }
];

interface NodePaletteProps {
  onAddNode: (type: string) => void;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  readOnly?: boolean;
}

export default function DraggableNodePalette({
  onAddNode,
  defaultPosition = { x: 20, y: 20 },
  onPositionChange,
  readOnly = false
}: NodePaletteProps) {
  const [position, setPosition] = useState(defaultPosition);

  // Almacenar la posición en localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('nodePalettePosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Error parsing saved node palette position', e);
      }
    }
  }, []);

  const handlePositionChange = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
    localStorage.setItem('nodePalettePosition', JSON.stringify(newPosition));
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  return (
    <FloatingPanel
      title="Paleta de Nodos"
      defaultPosition={position}
      onPositionChange={handlePositionChange}
      width={280}
      icon={<Plus className="h-4 w-4" />}
      id="node-palette"
    >
      <ScrollArea className="h-[calc(100vh-300px)] pr-2">
        <div className="space-y-4">
          {NODE_CATEGORIES.map((category, index) => (
            <div key={category.title} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">{category.title}</h3>
              <div className="grid grid-cols-2 gap-2">
                {category.items.map((item) => (
                  <Button
                    key={item.type}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => !readOnly && onAddNode(item.type)}
                    disabled={readOnly}
                  >
                    <div className="flex items-center space-x-2">
                      <div>{NODE_TYPE_ICON_MAP[item.type] || <Plus className="h-4 w-4" />}</div>
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
              {index < NODE_CATEGORIES.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </FloatingPanel>
  );
}