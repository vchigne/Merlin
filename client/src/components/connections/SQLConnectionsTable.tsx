import { useCallback } from "react";
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
import { useSQLConnections } from "@/hooks/use-sql-connections";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SQLConnectionsTable() {
  const { data: sqlConnections, isLoading, error } = useSQLConnections();
  const [, setLocation] = useLocation();

  const handleViewDetails = useCallback((id: string) => {
    setLocation(`/connections/sql/${id}`);
  }, [setLocation]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SQL Connections</CardTitle>
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
          <CardTitle>SQL Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading SQL connections</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SQL Connections</CardTitle>
      </CardHeader>
      <CardContent>
        {sqlConnections && sqlConnections.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sqlConnections.map((conn: {
                id: string;
                name: string;
                driver: string;
                connstring: string;
                updated_at?: string;
              }) => (
                <TableRow key={conn.id}>
                  <TableCell className="font-medium">{conn.name}</TableCell>
                  <TableCell>{conn.driver}</TableCell>
                  <TableCell>
                    {conn.updated_at ? (
                      <Badge variant="outline">
                        {formatDistanceToNow(new Date(conn.updated_at), { addSuffix: true })}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(conn.id)}
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
          <p className="text-muted-foreground text-center py-4">No SQL connections found</p>
        )}
      </CardContent>
    </Card>
  );
}