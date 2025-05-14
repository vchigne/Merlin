import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/lib/hasura-client";
import { determineAgentStatus } from "@/lib/utils";
import { AGENT_HEALTH_STATUS_QUERY } from "@shared/queries";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Laptop, Check, AlertTriangle, AlertCircle, Wifi } from "lucide-react";

export default function AgentStatusCards() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/agents/status'],
    queryFn: async () => {
      const result = await executeQuery(AGENT_HEALTH_STATUS_QUERY);
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data.merlin_agent_AgentPassport;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    // Set up interval for refreshing relative times
    const interval = setInterval(() => {
      if (data) {
        refetch();
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [data, refetch]);

  // Process agent status data
  const statusCounts = {
    total: 0,
    healthy: 0,
    warning: 0,
    error: 0,
    offline: 0
  };

  if (data) {
    statusCounts.total = data.length;
    
    data.forEach((agent: any) => {
      // Usamos el nuevo algoritmo avanzado para determinar el estado
      const healthInfo = determineAgentStatus(agent);
      
      switch (healthInfo.status) {
        case 'healthy':
          statusCounts.healthy++;
          break;
        case 'warning':
          statusCounts.warning++;
          break;
        case 'error':
          statusCounts.error++;
          break;
        case 'offline':
          statusCounts.offline++;
          break;
      }
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="pb-2">
              <Skeleton className="h-12 w-16" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="col-span-full bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400">No se pudieron cargar los datos de estado de los agentes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card de Total Agentes */}
      <Card className="overflow-hidden border-l-4 border-l-slate-400 dark:border-l-slate-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-slate-700 dark:text-slate-200">
            <Laptop className="mr-2 h-5 w-5 text-slate-600 dark:text-slate-400" />
            Total Agentes
          </CardTitle>
          <CardDescription>Todos los agentes registrados</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">
            {statusCounts.total}
          </p>
        </CardContent>
        <CardFooter>
          <Link 
            href="/agents" 
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
          >
            Ver todos los agentes
          </Link>
        </CardFooter>
      </Card>

      {/* Card de Agentes Saludables */}
      <Card className="overflow-hidden border-l-4 border-l-green-400 dark:border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-green-700 dark:text-green-400">
            <Check className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
            Agentes Saludables
          </CardTitle>
          <CardDescription>Funcionando correctamente</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {statusCounts.healthy}
          </p>
        </CardContent>
        <CardFooter>
          <Link 
            href="/agents?status=healthy" 
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
          >
            Ver agentes saludables
          </Link>
        </CardFooter>
      </Card>

      {/* Card de Agentes con Advertencia */}
      <Card className="overflow-hidden border-l-4 border-l-amber-400 dark:border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-600 dark:text-amber-400" />
            Con Advertencia
          </CardTitle>
          <CardDescription>Requieren atención</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {statusCounts.warning}
          </p>
        </CardContent>
        <CardFooter>
          <Link 
            href="/agents?status=warning" 
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
          >
            Ver agentes con advertencia
          </Link>
        </CardFooter>
      </Card>

      {/* Card de Agentes con Problemas */}
      <Card className="overflow-hidden border-l-4 border-l-red-400 dark:border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
            Con Problemas
          </CardTitle>
          <CardDescription>Errores o sin conexión</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {statusCounts.error + statusCounts.offline}
          </p>
          <div className="flex text-xs mt-1 space-x-3">
            <span className="text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" /> Errores: {statusCounts.error}
            </span>
            <span className="text-slate-600 dark:text-slate-400 flex items-center">
              <Wifi className="h-3 w-3 mr-1" /> Sin conexión: {statusCounts.offline}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Link 
            href="/agents?status=problem" 
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
          >
            Ver agentes con problemas
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}