import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Search, X } from "lucide-react";
import { useSFTPLinks } from "@/hooks/use-sftp-links";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SFTPLink } from "@shared/types";

export default function SFTPLinksTable() {
  const { data: sftpLinks, isLoading, error } = useSFTPLinks();
  const [, setLocation] = useLocation();
  const [nameFilter, setNameFilter] = useState("");
  const [serverFilter, setServerFilter] = useState("");

  const handleViewDetails = useCallback((id: string) => {
    setLocation(`/connections/sftp/${id}`);
  }, [setLocation]);

  const handleClearFilters = useCallback(() => {
    setNameFilter("");
    setServerFilter("");
  }, []);

  // Filtrar los enlaces SFTP según los criterios
  const filteredLinks = sftpLinks?.filter((link: SFTPLink) => {
    // Verificar que los campos existan antes de usarlos
    const linkName = link.name || '';
    const linkServer = link.server || '';
    const linkUser = link.user || '';
    const linkPort = link.port?.toString() || '';
    
    const nameMatch = linkName.toLowerCase().includes(nameFilter.toLowerCase());
    const serverMatch = linkServer.toLowerCase().includes(serverFilter.toLowerCase());
    
    // Búsqueda de texto completo en todos los campos disponibles
    const fullTextMatch = nameFilter === '' || serverFilter === '' || 
      linkName.toLowerCase().includes(nameFilter.toLowerCase()) ||
      linkServer.toLowerCase().includes(nameFilter.toLowerCase()) ||
      linkUser.toLowerCase().includes(nameFilter.toLowerCase()) ||
      linkPort.includes(nameFilter) ||
      link.id.toLowerCase().includes(nameFilter.toLowerCase());
    
    return nameMatch && serverMatch && fullTextMatch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SFTP Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SFTP Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading SFTP connections</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>SFTP Connections</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          disabled={!nameFilter && !serverFilter}
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filter form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="nameFilter">Filter by Name</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="nameFilter"
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serverFilter">Filter by Server</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="serverFilter"
                placeholder="Filter by server..."
                value={serverFilter}
                onChange={(e) => setServerFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
        
        {/* Results counter */}
        <div className="text-sm text-muted-foreground mb-2">
          Showing {filteredLinks?.length || 0} of {sftpLinks?.length || 0} connections
        </div>

        {filteredLinks && filteredLinks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link: SFTPLink) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell>{link.server}</TableCell>
                  <TableCell>{link.port}</TableCell>
                  <TableCell>
                    {link.updated_at ? (
                      <Badge variant="outline">
                        {formatDistanceToNow(new Date(link.updated_at), { addSuffix: true })}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(link.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {sftpLinks?.length > 0 
              ? "No connections match your filters" 
              : "No SFTP connections found"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}