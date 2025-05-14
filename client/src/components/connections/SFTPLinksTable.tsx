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
import { Eye } from "lucide-react";
import { useSFTPLinks } from "@/hooks/use-sftp-links";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SFTPLinksTable() {
  const { data: sftpLinks, isLoading, error } = useSFTPLinks();
  const [, setLocation] = useLocation();

  const handleViewDetails = (id: string) => {
    setLocation(`/connections/sftp/${id}`);
  };

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
      <CardHeader>
        <CardTitle>SFTP Connections</CardTitle>
      </CardHeader>
      <CardContent>
        {sftpLinks && sftpLinks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sftpLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell>{link.host}</TableCell>
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
          <p className="text-muted-foreground text-center py-4">No SFTP connections found</p>
        )}
      </CardContent>
    </Card>
  );
}