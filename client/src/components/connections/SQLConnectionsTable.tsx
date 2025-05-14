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
import { useSQLConnections } from "@/hooks/use-sql-connections";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SQLConn } from "@shared/types";

export default function SQLConnectionsTable() {
  const { data: sqlConnections, isLoading, error } = useSQLConnections();
  const [, setLocation] = useLocation();
  const [nameFilter, setNameFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");

  const handleViewDetails = useCallback((id: string) => {
    setLocation(`/connections/sql/${id}`);
  }, [setLocation]);

  const handleClearFilters = useCallback(() => {
    setNameFilter("");
    setDriverFilter("all");
  }, []);

  // Extraer todos los drivers únicos para el select
  const uniqueDrivers = sqlConnections 
    ? Array.from(new Set(sqlConnections.map((conn: SQLConn) => conn.driver)))
    : [];

  // Filtrar las conexiones SQL según los criterios
  const filteredConnections = sqlConnections?.filter((conn: SQLConn) => {
    const nameMatch = conn.name.toLowerCase().includes(nameFilter.toLowerCase());
    const driverMatch = driverFilter === "all" || conn.driver === driverFilter;
    return nameMatch && driverMatch;
  });

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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>SQL Connections</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          disabled={!nameFilter && !driverFilter}
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
            <Label htmlFor="driverFilter">Filter by Driver</Label>
            <Select
              value={driverFilter}
              onValueChange={setDriverFilter}
            >
              <SelectTrigger id="driverFilter">
                <SelectValue placeholder="All drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                {uniqueDrivers.map((driver: string) => (
                  <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Results counter */}
        <div className="text-sm text-muted-foreground mb-2">
          Showing {filteredConnections?.length || 0} of {sqlConnections?.length || 0} connections
        </div>

        {filteredConnections && filteredConnections.length > 0 ? (
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
              {filteredConnections.map((conn: SQLConn) => (
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
          <p className="text-muted-foreground text-center py-4">
            {sqlConnections?.length > 0 
              ? "No connections match your filters" 
              : "No SQL connections found"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}