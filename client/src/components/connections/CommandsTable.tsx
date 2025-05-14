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
import { useCommands } from "@/hooks/use-commands";
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
import { Command } from "@shared/types";

export default function CommandsTable() {
  const { data: commands, isLoading, error } = useCommands();
  const [, setLocation] = useLocation();
  const [nameFilter, setNameFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [instantFilter, setInstantFilter] = useState<string>("");

  const handleViewDetails = useCallback((id: string) => {
    setLocation(`/connections/command/${id}`);
  }, [setLocation]);

  const handleClearFilters = useCallback(() => {
    setNameFilter("");
    setTargetFilter("");
    setInstantFilter("");
  }, []);

  // Extraer todos los targets únicos para el select
  const uniqueTargets = commands 
    ? Array.from(new Set(commands.map((cmd: Command) => cmd.target)))
        .filter(target => !!target) // Eliminar valores nulos o vacíos
    : [];

  // Filtrar los comandos según los criterios
  const filteredCommands = commands?.filter((command: Command) => {
    const nameMatch = command.name.toLowerCase().includes(nameFilter.toLowerCase());
    const targetMatch = !targetFilter || command.target.includes(targetFilter);
    const instantMatch = instantFilter === "" || 
                         (instantFilter === "true" && command.instant) || 
                         (instantFilter === "false" && !command.instant);
    return nameMatch && targetMatch && instantMatch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commands</CardTitle>
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
          <CardTitle>Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading commands</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Commands</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          disabled={!nameFilter && !targetFilter && !instantFilter}
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filter form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            <Label htmlFor="targetFilter">Filter by Target</Label>
            <Select
              value={targetFilter}
              onValueChange={setTargetFilter}
            >
              <SelectTrigger id="targetFilter">
                <SelectValue placeholder="All targets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All targets</SelectItem>
                {uniqueTargets.map((target: string) => (
                  <SelectItem key={target} value={target}>{target}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instantFilter">Instant Commands</Label>
            <Select
              value={instantFilter}
              onValueChange={setInstantFilter}
            >
              <SelectTrigger id="instantFilter">
                <SelectValue placeholder="All commands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All commands</SelectItem>
                <SelectItem value="true">Instant only</SelectItem>
                <SelectItem value="false">Not instant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Results counter */}
        <div className="text-sm text-muted-foreground mb-2">
          Showing {filteredCommands?.length || 0} of {commands?.length || 0} commands
        </div>

        {filteredCommands && filteredCommands.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Instant</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommands.map((command: Command) => (
                <TableRow key={command.id}>
                  <TableCell className="font-medium">{command.name}</TableCell>
                  <TableCell>{command.target}</TableCell>
                  <TableCell>
                    <Badge variant={command.instant ? "secondary" : "default"}>
                      {command.instant ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {command.updated_at ? (
                      <Badge variant="outline">
                        {formatDistanceToNow(new Date(command.updated_at), { addSuffix: true })}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(command.id)}
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
            {commands?.length > 0 
              ? "No commands match your filters" 
              : "No commands found"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}