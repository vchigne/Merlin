import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date in a standard format
export function formatDate(dateString: string, formatStr = "yyyy-MM-dd HH:mm:ss"): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "unknown time ago";
  }
}

// Format date in a friendly human-readable format
export function formatFriendlyDate(dateString: string, includeTime = true): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // For very recent timestamps (less than 1 minute), show "Justo ahora"
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) {
      return "Justo ahora";
    }
    
    // For times less than 24 hours ago, show relative time
    const diffInHours = Math.floor(diffInSeconds / 3600);
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    }
    
    // For today, show "Hoy a las HH:MM"
    if (isToday(date)) {
      return `Hoy a las ${format(date, "HH:mm")}`;
    }
    
    // For yesterday, show "Ayer a las HH:MM"
    if (isYesterday(date)) {
      return `Ayer a las ${format(date, "HH:mm")}`;
    }
    
    // For this week, show day of week
    if (isThisWeek(date)) {
      return format(date, includeTime ? "EEEE 'a las' HH:mm" : "EEEE", { locale: es });
    }
    
    // For this year, show day and month
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, includeTime ? "d 'de' MMMM 'a las' HH:mm" : "d 'de' MMMM", { locale: es });
    }
    
    // For other dates, include the year
    return format(date, includeTime ? "d 'de' MMMM yyyy 'a las' HH:mm" : "d 'de' MMMM yyyy", { locale: es });
  } catch (error) {
    console.error("Error formatting friendly date:", error);
    return dateString;
  }
}

// Get string representation of status with appropriate coloring
export function getStatusStyle(status: string): {
  badgeClass: string;
  icon: string;
  label: string;
} {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === "healthy" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "success"
  ) {
    return {
      badgeClass: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      icon: "check-circle",
      label: status.charAt(0).toUpperCase() + status.slice(1),
    };
  } else if (
    normalizedStatus === "warning" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "in progress" ||
    normalizedStatus === "running"
  ) {
    return {
      badgeClass: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      icon: "clock",
      label: status === "running" ? "Running" : status.charAt(0).toUpperCase() + status.slice(1),
    };
  } else if (
    normalizedStatus === "error" ||
    normalizedStatus === "failed" ||
    normalizedStatus === "aborted" ||
    normalizedStatus === "offline"
  ) {
    return {
      badgeClass: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
      icon: "alert-circle",
      label: status.charAt(0).toUpperCase() + status.slice(1),
    };
  }

  // Default
  return {
    badgeClass: "bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400",
    icon: "help-circle",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Parse JSON safely
export function safeJsonParse(jsonString: string, fallback: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
}

// Determine agent health status based on ping history and job execution success rates
export function determineAgentStatus(
  agent: { 
    is_healthy?: boolean,
    AgentPassportPing?: { last_ping_at: string }[],
    PipelineJobQueues?: { completed: boolean, running: boolean, aborted: boolean }[]
  }
): {
  status: string,
  pingRatePercent: number,
  jobSuccessRatePercent: number,
  lastPingMinutes: number,
  jobsAnalyzed: number
} {
  // Default values
  const result = {
    status: "offline",
    pingRatePercent: 0,
    jobSuccessRatePercent: 0,
    lastPingMinutes: -1,
    jobsAnalyzed: 0
  };
  
  // PASO 1: Verificar el último ping para determinar conectividad básica
  const lastPing = agent.AgentPassportPing?.[0]?.last_ping_at;
  if (!lastPing) {
    return result; // Sin ping registrado = offline
  }
  
  const now = new Date();
  const lastPingDate = new Date(lastPing);
  const diffMinutes = (now.getTime() - lastPingDate.getTime()) / (1000 * 60);
  result.lastPingMinutes = Math.round(diffMinutes);
  
  // Si no hay ping en los últimos 60 minutos, el agente está offline
  if (diffMinutes > 60) {
    return result;
  }
  
  // PASO 2: Calcular tasa de pings recibidos (últimos 10 pings)
  // Considerando intervalos de 30 minutos entre pings
  const pings = agent.AgentPassportPing || [];
  if (pings.length > 0) {
    // Estimamos cuántos pings deberíamos haber recibido en las últimas 5 horas
    // (10 pings con intervalo de 30 minutos = 5 horas)
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    // Contamos cuántos pings hemos recibido en ese período
    // Nota: Si hay menos de 10 pings disponibles, eso también indica una tasa más baja
    const receivedPings = pings.filter(ping => 
      new Date(ping.last_ping_at) >= fiveHoursAgo
    ).length;
    
    // Calculamos qué porcentaje representa de los 10 esperados
    result.pingRatePercent = Math.min(100, Math.round((receivedPings / 10) * 100));
  }
  
  // PASO 3: Calcular tasa de éxito de trabajos
  const jobs = agent.PipelineJobQueues || [];
  if (jobs.length > 0) {
    result.jobsAnalyzed = jobs.length;
    
    // Contamos trabajos exitosos (completed=true, aborted=false)
    const successfulJobs = jobs.filter(job => job.completed && !job.aborted).length;
    result.jobSuccessRatePercent = Math.round((successfulJobs / jobs.length) * 100);
  }
  
  // PASO 4: Determinar estado final combinando todos los factores
  
  // Error: Más del 50% de los trabajos fallaron o más del 50% de los pings esperados no fueron recibidos
  if (result.jobSuccessRatePercent < 50 || result.pingRatePercent < 50) {
    result.status = "error";
    return result;
  }
  
  // Warning: Ping entre 30-60 minutos, tasa de éxito de trabajos entre 50-80%, o tasa de fallos de ping entre 50-80%
  if (diffMinutes > 30 || result.jobSuccessRatePercent < 80 || result.pingRatePercent < 80) {
    result.status = "warning";
    return result;
  }
  
  // Healthy: Ping en los últimos 30 minutos, más del 80% de trabajos exitosos, y menos del 20% de fallos de ping
  result.status = "healthy";
  return result;
}

// Strip HTML tags from text
export function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, "");
}

// Convert pipeline coordinates to flow coordinates
export function convertToFlowCoordinates(
  pipelineUnits: any[],
  baseScaleX = 300,
  baseScaleY = 200,
  baseOffsetX = 50,
  baseOffsetY = 50
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  if (!pipelineUnits || !pipelineUnits.length) {
    return { nodes, edges };
  }
  
  // Ordenar las unidades para darles una posición consistente
  // Primero por tipo (para agrupar tipos similares) y luego por ID
  const sortedUnits = [...pipelineUnits].sort((a, b) => {
    const typeA = getUnitType(a);
    const typeB = getUnitType(b);
    
    if (typeA !== typeB) {
      return typeA.localeCompare(typeB);
    }
    
    return a.id.localeCompare(b.id);
  });
  
  // Asignar posiciones en una disposición de árbol simple
  // Si no hay información de posición en los datos
  const lacksPosInfo = sortedUnits.every(unit => 
    (unit.posx === 0 || unit.posx === null || unit.posx === undefined) && 
    (unit.posy === 0 || unit.posy === null || unit.posy === undefined)
  );
  
  // Crear nodos con posiciones calculadas
  sortedUnits.forEach((unit, index) => {
    // Determinar la posición usando un layout automático si es necesario
    let x, y;
    
    if (lacksPosInfo) {
      // Disposición automática: zigzag vertical
      const col = Math.floor(index / 3);
      const row = index % 3;
      x = col * baseScaleX + baseOffsetX;
      y = row * baseScaleY + baseOffsetY;
    } else {
      // Usar las coordenadas existentes (si están disponibles)
      x = (unit.posx || 0) * baseScaleX + baseOffsetX;
      y = (unit.posy || 0) * baseScaleY + baseOffsetY;
    }
    
    // Genera una mejor etiqueta para el nodo
    const unitType = getUnitType(unit);
    const typeLabel = getTypeReadableLabel(unitType);
    
    // Si hay un comentario, úsalo como etiqueta principal
    // De lo contrario, usa un tipo más descriptivo + ID corto
    const nodeLabel = unit.comment 
      ? unit.comment 
      : `${typeLabel} ${unit.id.substring(0, 6)}`;
    
    nodes.push({
      id: unit.id,
      type: 'pipelineNode',
      data: {
        label: nodeLabel,
        description: getUnitDescription(unit, unitType),
        type: unitType,
        unit: unit,
      },
      position: { x, y },
    });
  });
  
  // Si no tenemos información de conexión explícita (pipeline_unit_id)
  // creamos conexiones secuenciales según el orden de los nodos
  const noConnectionInfo = sortedUnits.every(unit => !unit.pipeline_unit_id);
  
  if (noConnectionInfo && nodes.length > 1) {
    // Crear conexiones secuenciales entre todos los nodos
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: false,
      });
    }
  } else {
    // Usar la información de conexión real si está disponible
    sortedUnits.forEach((unit) => {
      if (unit.pipeline_unit_id) {
        edges.push({
          id: `e-${unit.pipeline_unit_id}-${unit.id}`,
          source: unit.pipeline_unit_id,
          target: unit.id,
          animated: false,
        });
      }
    });
  }
  
  return { nodes, edges };
}

// Obtener etiqueta legible del tipo de unidad
function getTypeReadableLabel(type: string): string {
  switch (type) {
    case 'command': return 'Comando';
    case 'query': return 'Consulta SQL';
    case 'sftp_download': return 'Descarga SFTP';
    case 'sftp_upload': return 'Subida SFTP';
    case 'zip': return 'Compresión';
    case 'unzip': return 'Descompresión';
    case 'pipeline': return 'Pipeline';
    default: return 'Unidad';
  }
}

// Obtener descripción más detallada de la unidad
function getUnitDescription(unit: any, type: string): string {
  switch (type) {
    case 'command':
      return unit.command_id ? `Ejecuta comando en el sistema` : '';
    case 'query':
      return unit.query_queue_id ? `Ejecuta consulta en base de datos` : '';
    case 'sftp_download':
      return unit.sftp_downloader_id ? `Descarga archivos desde servidor remoto` : '';
    case 'sftp_upload':
      return unit.sftp_uploader_id ? `Sube archivos a servidor remoto` : '';
    case 'zip':
      return unit.zip_id ? `Comprime archivos en archivo ZIP` : '';
    case 'unzip':
      return unit.unzip_id ? `Extrae archivos de archivo ZIP` : '';
    case 'pipeline':
      return unit.call_pipeline ? `Llama a otro pipeline` : '';
    default:
      return '';
  }
}

// Get unit type based on which ID fields are filled
function getUnitType(unit: any): string {
  if (unit.command_id) return 'command';
  if (unit.query_queue_id) return 'query';
  if (unit.sftp_downloader_id) return 'sftp_download';
  if (unit.sftp_uploader_id) return 'sftp_upload';
  if (unit.zip_id) return 'zip';
  if (unit.unzip_id) return 'unzip';
  if (unit.call_pipeline) return 'pipeline';
  return 'unknown';
}
