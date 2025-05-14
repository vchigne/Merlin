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
  Server,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSFTPLinks } from '@/hooks/use-sftp-links';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SFTPLinksTable() {
  const { data: sftpLinks, isLoading, error } = useSFTPLinks();
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
      title: "Error al cargar conexiones SFTP",
      description: "No se pudieron cargar las conexiones. Intente nuevamente más tarde.",
      variant: "destructive",
    });
    
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Error al cargar las conexiones SFTP. Por favor, intente nuevamente más tarde.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredLinks = sftpLinks?.filter(link => 
    link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conexión..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Server className="mx-auto h-12 w-12 opacity-30 mb-2" />
          <p>No se encontraron conexiones SFTP.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nombre</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Puerto</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell>{link.host}</TableCell>
                  <TableCell>{link.port}</TableCell>
                  <TableCell>{link.username}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(link.created_at), {
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
                      <Link to={`/connections/sftp/${link.id}`}>
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