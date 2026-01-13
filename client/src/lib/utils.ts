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
    id?: string,
    name?: string,
    is_healthy?: boolean,
    AgentPassportPing?: 
      | { last_ping_at: string, created_at?: string, hostname?: string, ips?: string } 
      | { last_ping_at: string, created_at?: string, hostname?: string, ips?: string }[],
    PipelineJobQueues?: { 
      id?: string, 
      completed: boolean, 
      running: boolean, 
      aborted: boolean,
      created_at?: string,
      updated_at?: string
    }[]
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
  console.log('Iniciando análisis de agente:', agent.id, agent.name);
  
  // Si el agente está marcado como saludable en la base de datos, no asumimos automáticamente que es healthy
  // Solo lo usamos como un dato más en la evaluación general
  if (agent.is_healthy) {
    console.log('Agente marcado como saludable en la base de datos');
    // No asignamos estado aquí, lo determinaremos basado en datos reales
  }
  
  // PASO 1: Verificar el estado explícito del agente (si existe)
  // Si está explícitamente marcado en la base de datos, respetamos ese valor
  // pero no hacemos status final, ya que aún necesitamos los datos de ping para completar el análisis
  if (agent.is_healthy === true) {
    console.log('Agente explícitamente marcado como healthy en la BD');
    // Guardamos el estado pero no lo hacemos final aún
    result.status = 'healthy';
  } else if (agent.is_healthy === false) {
    console.log('Agente explícitamente marcado como unhealthy en la BD');
    // Guardamos el estado pero no lo hacemos final aún
    result.status = 'error';
  }
  
  // El ping puede venir como objeto o como array
  let lastPing = null;
  if (agent.AgentPassportPing) {
    if (Array.isArray(agent.AgentPassportPing)) {
      // Si es un array, tomamos el primer elemento
      lastPing = agent.AgentPassportPing[0]?.last_ping_at;
    } else {
      // Si es un objeto, accedemos directamente
      lastPing = agent.AgentPassportPing.last_ping_at;
    }
  }
  
  console.log('Último ping:', lastPing ? new Date(lastPing).toISOString() : 'ninguno');
  
  if (!lastPing) {
    console.log('No hay pings registrados, agente offline');
    result.status = 'offline'; // Esto sobrescribe cualquier valor anterior de status
    result.pingRatePercent = 0;
    result.jobSuccessRatePercent = 0;
    return result; // Sin ping registrado = offline
  }
  
  const now = new Date();
  const lastPingDate = new Date(lastPing);
  const diffMinutes = (now.getTime() - lastPingDate.getTime()) / (1000 * 60);
  console.log('Minutos desde último ping:', diffMinutes);
  result.lastPingMinutes = Math.round(diffMinutes);
  
  // PASO 2: Calcular tasa de pings recibidos basada en data real
  console.log('Calculando ping rate:', {
    agentId: agent.id,
    agentName: agent.name,
    hasPings: lastPing !== undefined && lastPing !== null,
    lastPing: lastPing ? new Date(lastPing).toISOString() : 'none',
    diffMinutes: diffMinutes
  });
  
  // Tenemos un ping válido, calculamos la frescura del ping basado en minutos desde el último
  const hoursSinceLastPing = diffMinutes / 60;
  
  if (diffMinutes < 5) {
    // Muy reciente (menos de 5 minutos)
    result.pingRatePercent = 100;
    console.log('Ping muy reciente (<5 min), estableciendo frescura a 100%');
  } else if (hoursSinceLastPing < 8) {
    // Reciente pero no tanto (entre 5 minutos y 8 horas)
    // Calculamos un valor entre 50 y 90 dependiendo de cuánto tiempo ha pasado
    const hoursRange = 8; // 8 horas es el rango máximo para amarillo
    const maxPercentForRange = 90; // Máximo porcentaje para este rango
    const minPercentForRange = 50; // Mínimo porcentaje para este rango
    const percentRange = maxPercentForRange - minPercentForRange;
    
    // Fórmula: valor = max - (tiempoActual/tiempoMaximo) * rango
    const calculatedRate = Math.round(maxPercentForRange - (hoursSinceLastPing / hoursRange) * percentRange);
    result.pingRatePercent = calculatedRate;
    console.log('Ping reciente (5min-8h), estableciendo frescura a ' + calculatedRate + '%');
  } else {
    // Ping muy antiguo (más de 8 horas)
    result.pingRatePercent = 20; // Valor bajo pero visible en la UI
    console.log('Ping muy antiguo (>8h), estableciendo frescura a 20%');
  }
  
  // PASO 3: Calcular tasa de éxito de trabajos
  const jobs = agent.PipelineJobQueues || [];
  console.log('Calculando job success rate:', {
    agentId: agent.id,
    agentName: agent.name,
    totalJobs: jobs.length,
    // Solo imprimimos los primeros 2 trabajos para no sobrecargar los logs
    jobsData: jobs.slice(0, 2).map(job => ({
      id: job.id,
      completed: job.completed,
      running: job.running,
      aborted: job.aborted,
      created_at: job.created_at,
      updated_at: job.updated_at
    }))
  });
  
  if (jobs.length > 0) {
    result.jobsAnalyzed = jobs.length;
    
    // Contamos solo trabajos que han terminado (completed=true o aborted=true)
    const finishedJobs = jobs.filter(job => job.completed || job.aborted);
    console.log('Jobs finalizados:', finishedJobs.length, 'de', jobs.length);
    
    if (finishedJobs.length > 0) {
      // De los trabajos terminados, contamos los exitosos (completed=true, aborted=false)
      const successfulJobs = finishedJobs.filter(job => job.completed && !job.aborted).length;
      console.log('Jobs exitosos:', successfulJobs, 'de', finishedJobs.length);
      const calculatedRate = Math.round((successfulJobs / finishedJobs.length) * 100);
      // Usamos el valor calculado real, basado en datos
      result.jobSuccessRatePercent = calculatedRate;
      console.log('Job success rate calculado:', calculatedRate + '%');
    } else {
      // Si hay trabajos pero ninguno ha terminado, no podemos calcular el éxito (Unknown)
      console.log('No hay jobs finalizados, no es posible calcular tasa de éxito');
      result.jobSuccessRatePercent = 0; // Indicar que no tenemos datos suficientes
    }
  } else {
    // Si no hay trabajos recientes, no podemos calcular el éxito (Unknown)
    console.log('No hay jobs para el agente:', agent.id, agent.name);
    result.jobSuccessRatePercent = 0; // Valor real: no hay datos
  }
  
  // PASO 4: Determinar estado final combinando todos los factores, usando SOLO datos reales
  console.log('Determinando estado final del agente con las métricas calculadas:', {
    agentId: agent.id,
    agentName: agent.name,
    pingRatePercent: result.pingRatePercent,
    jobSuccessRatePercent: result.jobSuccessRatePercent,
    diffMinutes: diffMinutes,
    is_healthy: agent.is_healthy
  });
  
  // Si ya determinamos que está offline, mantenemos ese estado
  if (result.status === 'offline') {
    console.log('Agente ya marcado como offline, manteniendo estado');
    return result;
  }

  // Para agentes que tienen pings, utilizamos los nuevos criterios basados en tiempo
  // Usamos una verificación más robusta que no provoque errores de tipo
  if (typeof agent.is_healthy === 'undefined') { // Solo si no hay is_healthy explícito en la BD
    if (diffMinutes < 5) {
      // Ping muy reciente (menos de 5 minutos): consideramos el agente como saludable
      console.log('Ping muy reciente (<5 min), agente ACTIVO');
      result.status = 'healthy';
    } else if (diffMinutes < 480) { // 8 horas = 480 minutos
      // Ping en las últimas 8 horas: estado de advertencia
      console.log('Ping en las últimas 8 horas (5min-8h), estado: warning');
      result.status = 'warning';
    } else {
      // Ping demasiado antiguo: estado de error
      console.log('Ping demasiado antiguo (>8h), estado: error');
      result.status = 'error';
    }
    return result;
  }
  
  // Si hemos llegado aquí, hay una indicación explícita de is_healthy en la base de datos
  // que prevalece sobre nuestra evaluación automática, o el agente no tiene pings
  
  // Si llegamos aquí, tenemos datos tanto de ping como de jobs
  console.log('Evaluando estado basado en ping y datos de jobs');
  
  // Error: Sin ping en más de 60 minutos o más del 60% de los trabajos fallaron
  if (diffMinutes > 60 || (result.jobsAnalyzed > 2 && result.jobSuccessRatePercent < 40)) {
    result.status = "error";
    console.log('Criterios para estado error cumplidos:', {diffMinutes, jobsAnalyzed: result.jobsAnalyzed, jobSuccessRate: result.jobSuccessRatePercent});
    return result;
  }
  
  // Warning: Ping entre 30-60 minutos o más del 30% de los trabajos fallaron
  if (diffMinutes > 30 || (result.jobsAnalyzed > 2 && result.jobSuccessRatePercent < 70)) {
    result.status = "warning";
    console.log('Criterios para estado warning cumplidos:', {diffMinutes, jobsAnalyzed: result.jobsAnalyzed, jobSuccessRate: result.jobSuccessRatePercent});
    return result;
  }
  
  // Si ninguna condición se cumple, el agente está saludable
  result.status = "healthy";
  console.log('Ping reciente y buenos resultados en trabajos, agente saludable');
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
    
    // Obtener un nombre más descriptivo según el tipo
    let descriptiveName = '';
    
    if (unitType === 'command' && unit.command_id) {
      // Para comandos, usamos el nombre como título y mostraremos el comando y directorio más abajo
      if (unit.command_details && unit.command_details.name) {
        // Si tenemos los detalles precargados, usar el nombre de ahí
        descriptiveName = unit.command_details.name;
      } else {
        // Fallback a otros nombres disponibles
        descriptiveName = unit.command?.name || unit.comment || 'Comando';
      }
    } else if (unitType === 'query' && unit.query_queue_id) {
      // Intentar obtener información más descriptiva para consultas SQL
      descriptiveName = unit.query?.name || 'Consulta SQL';
    } else if (unitType === 'sftp_download') {
      descriptiveName = 'Descarga SFTP';
    } else if (unitType === 'sftp_upload') {
      descriptiveName = 'Subida SFTP';
    } else if (unitType === 'zip') {
      descriptiveName = 'Compresión ZIP';
    } else if (unitType === 'unzip') {
      descriptiveName = 'Extracción ZIP';
    }
    
    // Si hay un comentario, úsalo como etiqueta principal
    // De lo contrario, usa un tipo más descriptivo + un nombre adecuado
    const nodeLabel = unit.comment 
      ? unit.comment 
      : (descriptiveName || `${typeLabel}`);
    
    // Definir colores para cada tipo de nodo
    function getNodeColor(type: string): string {
      switch (type) {
        case 'command':
          return '#4f46e5'; // Indigo para comandos
        case 'query':
          return '#0ea5e9'; // Azul para consultas SQL
        case 'sftp_download':
          return '#10b981'; // Verde para SFTP descarga
        case 'sftp_upload':
          return '#84cc16'; // Lima para SFTP subida
        case 'zip':
          return '#f59e0b'; // Ámbar para compresión
        case 'unzip':
          return '#f97316'; // Naranja para descompresión
        case 'pipeline':
          return '#8b5cf6'; // Violeta para llamadas a pipeline
        default:
          return '#6b7280'; // Gris para desconocidos
      }
    }
    
    nodes.push({
      id: unit.id,
      type: 'pipelineNode',
      data: {
        label: nodeLabel,
        description: getUnitDescription(unit, unitType),
        type: unitType,
        unit: unit,
        style: {
          background: getNodeColor(unitType),
          color: '#ffffff',
          borderRadius: '8px',
          border: '1px solid ' + getNodeColor(unitType)
        }
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
      if (unit.command_id) {
        // Intentar extraer información más específica del comando
        if (unit.command) {
          if (unit.command.target && unit.command.args) {
            return `Ejecuta: ${unit.command.target} ${unit.command.args}`;
          } else if (unit.command.working_directory) {
            return `Ejecuta en: ${unit.command.working_directory}`;
          } else if (unit.command.name) {
            return `Comando: ${unit.command.name}`;
          }
        }
        return `Ejecuta comando en el sistema`;
      }
      return '';
    case 'query':
      if (unit.query_queue_id && unit.query_queue) {
        if (unit.query_queue.name) {
          return `Consulta SQL: ${unit.query_queue.name}`;
        }
      }
      return unit.query_queue_id ? `Ejecuta consulta en base de datos` : '';
    case 'sftp_download':
      if (unit.sftp_downloader_id && unit.sftp_downloader) {
        if (unit.sftp_downloader.output) {
          return `Descarga archivos a: ${unit.sftp_downloader.output}`;
        }
      }
      return unit.sftp_downloader_id ? `Descarga archivos desde servidor remoto` : '';
    case 'sftp_upload':
      if (unit.sftp_uploader_id && unit.sftp_uploader) {
        if (unit.sftp_uploader.input) {
          return `Sube el archivo: ${unit.sftp_uploader.input}`;
        }
      }
      return unit.sftp_uploader_id ? `Sube archivos a servidor remoto` : '';
    case 'zip':
      if (unit.zip_id && unit.zip) {
        if (unit.zip.output) {
          return `Comprime en: ${unit.zip.output}`;
        }
      }
      return unit.zip_id ? `Comprime archivos en archivo ZIP` : '';
    case 'unzip':
      if (unit.unzip_id && unit.unzip) {
        if (unit.unzip.input && unit.unzip.output) {
          return `Extrae ${unit.unzip.input} en ${unit.unzip.output}`;
        }
      }
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
