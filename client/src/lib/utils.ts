import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

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

// Determine agent health status based on ping time and health flag
export function determineAgentStatus(isHealthy: boolean, lastPingAt?: string): string {
  if (!isHealthy) return "error";
  
  if (!lastPingAt) return "offline";
  
  const lastPing = new Date(lastPingAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastPing.getTime()) / (1000 * 60);
  
  if (diffMinutes > 10) return "offline";
  if (diffMinutes > 5) return "warning";
  return "healthy";
}

// Strip HTML tags from text
export function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, "");
}

// Convert pipeline coordinates to flow coordinates
export function convertToFlowCoordinates(
  pipelineUnits: any[],
  baseScaleX = 180,
  baseScaleY = 100,
  baseOffsetX = 50,
  baseOffsetY = 50
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  if (!pipelineUnits || !pipelineUnits.length) {
    return { nodes, edges };
  }
  
  // Crear un mapa para detectar y resolver colisiones de posición
  const positionMap: Record<string, number> = {};
  
  // Create nodes
  pipelineUnits.forEach((unit) => {
    // Obtener posición base
    let x = (unit.posx || 0) * baseScaleX + baseOffsetX;
    let y = (unit.posy || 0) * baseScaleY + baseOffsetY;
    
    // Crear una clave para la posición
    const posKey = `${x},${y}`;
    
    // Si ya hay un nodo en esta posición, desplazarlo
    if (positionMap[posKey]) {
      // Incrementar el contador
      positionMap[posKey]++;
      
      // Desplazar este nodo en diagonal según el contador
      const offset = positionMap[posKey] * 80;
      x += offset;
      y += offset;
    } else {
      // Registrar esta posición
      positionMap[posKey] = 1;
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
    
    // Create edge if this unit has a parent
    if (unit.pipeline_unit_id) {
      edges.push({
        id: `e-${unit.pipeline_unit_id}-${unit.id}`,
        source: unit.pipeline_unit_id,
        target: unit.id,
        animated: false,
      });
    }
  });
  
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
