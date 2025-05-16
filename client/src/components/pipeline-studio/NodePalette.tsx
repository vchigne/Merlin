import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  Database,
  Download,
  Upload,
  Archive,
  File as FileIcon,
  ExternalLink
} from 'lucide-react';
import DraggablePanel from '@/components/ui/draggable-panel';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  if (readOnly) return null;

  return (
    <DraggablePanel
      title="Añadir Nodos"
      icon={<Command className="h-4 w-4" />}
      initialPosition={initialPosition}
      id="node-palette"
      minWidth={220}
      maxWidth={250}
      className="bg-card/95 backdrop-blur-md"
    >
      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-2">
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('commandNode')}
          >
            <Command className="mr-2 h-4 w-4 text-amber-500" />
            Comando
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('queryNode')}
          >
            <Database className="mr-2 h-4 w-4 text-blue-500" />
            Consulta SQL
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('sftpDownloaderNode')}
          >
            <Download className="mr-2 h-4 w-4 text-green-500" />
            SFTP Descarga
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('sftpUploaderNode')}
          >
            <Upload className="mr-2 h-4 w-4 text-red-500" />
            SFTP Subida
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('zipNode')}
          >
            <Archive className="mr-2 h-4 w-4 text-purple-500" />
            Comprimir
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('unzipNode')}
          >
            <FileIcon className="mr-2 h-4 w-4 text-indigo-500" />
            Descomprimir
          </Button>
          
          <Button
            className="w-full justify-start text-left text-sm"
            size="sm"
            variant="outline"
            onClick={() => onAddNode('callPipelineNode')}
          >
            <ExternalLink className="mr-2 h-4 w-4 text-cyan-500" />
            Llamar Pipeline
          </Button>
        </div>
      </ScrollArea>
    </DraggablePanel>
  );
};

export default NodePalette;