import { useState } from 'react';
import { Link } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ExternalLink,
  Search,
  Terminal,
  Clock,
  Check,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useCommands } from '@/hooks/use-commands';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CommandsTable() {
  const { data: commands, isLoading, error } = useCommands();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error al cargar comandos",
      description: "No se pudieron cargar los comandos. Intente nuevamente más tarde.",
      variant: "destructive",
    });
    
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error al cargar los comandos. Por favor, intente nuevamente más tarde.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredCommands = commands?.filter(cmd => 
    cmd.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.working_directory?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comando..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Terminal className="mx-auto h-12 w-12 opacity-30 mb-2" />
          <p>No se encontraron comandos.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nombre</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Directorio</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Ejecución</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommands.map((cmd) => (
                <TableRow key={cmd.id}>
                  <TableCell className="font-medium">{cmd.name}</TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={cmd.target}>
                      {cmd.target}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={cmd.working_directory}>
                      {cmd.working_directory}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={cmd.description}>
                      {cmd.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cmd.instant ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Instantánea
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Normal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(cmd.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link to={`/connections/commands/${cmd.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver detalles
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}