import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import DraggablePanel from '@/components/ui/draggable-panel';
import {
  Command,
  Database, 
  Download,
  Upload,
  Archive,
  File,
  Plus,
  SquareStack
} from 'lucide-react';

// Definición de los tipos de nodos disponibles
const NODE_TYPES = [
  {
    category: 'Comandos',
    items: [
      { type: 'commandNode', label: 'Comando', icon: <Command className="h-4 w-4 text-amber-500" /> },
      { type: 'callPipelineNode', label: 'Llamar Pipeline', icon: <SquareStack className="h-4 w-4 text-cyan-500" /> }
    ]
  },
  {
    category: 'Datos',
    items: [
      { type: 'queryNode', label: 'Consulta SQL', icon: <Database className="h-4 w-4 text-blue-500" /> }
    ]
  },
  {
    category: 'Archivos',
    items: [
      { type: 'sftpDownloaderNode', label: 'Descargar SFTP', icon: <Download className="h-4 w-4 text-green-500" /> },
      { type: 'sftpUploaderNode', label: 'Subir SFTP', icon: <Upload className="h-4 w-4 text-red-500" /> },
      { type: 'zipNode', label: 'Comprimir', icon: <Archive className="h-4 w-4 text-purple-500" /> },
      { type: 'unzipNode', label: 'Descomprimir', icon: <File className="h-4 w-4 text-indigo-500" /> }
    ]
  }
];

interface NodePaletteProps {
  onAddNode: (type: string) => void;
  initialPosition?: { x: number, y: number };
  readOnly?: boolean;
}

const NodePalette: React.FC<NodePaletteProps> = ({
  onAddNode,
  initialPosition = { x: 20, y: 70 },
  readOnly = false
}) => {
  return (
    <DraggablePanel
      title="Paleta de Nodos"
      icon={<Plus className="h-4 w-4 text-green-600" />}
      initialPosition={initialPosition}
      id="node-palette"
      minWidth={250}
      className="bg-card/95 backdrop-blur-md"
    >
      <ScrollArea className="h-[calc(100vh-250px)] pr-3">
        <div className="space-y-4">
          {NODE_TYPES.map((category, categoryIndex) => (
            <div key={category.category} className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                {category.category}
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {category.items.map((item) => (
                  <Button
                    key={item.type}
                    variant="outline"
                    size="sm"
                    onClick={() => !readOnly && onAddNode(item.type)}
                    disabled={readOnly}
                    className="justify-start h-auto py-1.5 px-3"
                  >
                    <div className="flex items-center space-x-2 text-left">
                      {item.icon}
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
              
              {categoryIndex < NODE_TYPES.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </DraggablePanel>
  );
};

export default NodePalette;