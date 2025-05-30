import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

const YAML_DIR = path.join(process.cwd(), 'yamls');

// Tipos para las estructuras YAML
interface PipelinePosition {
  id: string;
  x: number;
  y: number;
}

interface PipelinePositions {
  [unitId: string]: PipelinePosition;
}

interface PipelineYAML {
  id: string;
  name: string;
  description?: string;
  units: Array<{
    id: string;
    type: string;
    name: string;
    config: any;
    index?: number;
  }>;
  created_at?: string;
  updated_at?: string;
}

// Funciones para manejar archivos de posiciones (_{uuid}.yaml)
export async function loadPipelinePositions(pipelineId: string): Promise<PipelinePositions | null> {
  try {
    const filePath = path.join(YAML_DIR, `_${pipelineId}.yaml`);
    const content = await fs.readFile(filePath, 'utf8');
    return YAML.parse(content) as PipelinePositions;
  } catch (error) {
    // Si el archivo no existe, retornar null para usar posiciones por defecto
    return null;
  }
}

export async function savePipelinePositions(pipelineId: string, positions: PipelinePositions): Promise<void> {
  try {
    await fs.mkdir(YAML_DIR, { recursive: true });
    const filePath = path.join(YAML_DIR, `_${pipelineId}.yaml`);
    const yamlContent = YAML.stringify(positions, {
      indent: 2,
      lineWidth: 0
    });
    await fs.writeFile(filePath, yamlContent, 'utf8');
  } catch (error) {
    console.error('Error saving pipeline positions:', error);
    throw error;
  }
}

// Funciones para manejar archivos de pipeline principal ({uuid}.yaml)
export async function loadPipelineYAML(pipelineId: string): Promise<PipelineYAML | null> {
  try {
    const filePath = path.join(YAML_DIR, `${pipelineId}.yaml`);
    const content = await fs.readFile(filePath, 'utf8');
    return YAML.parse(content) as PipelineYAML;
  } catch (error) {
    return null;
  }
}

export async function savePipelineYAML(pipelineId: string, pipelineData: PipelineYAML): Promise<void> {
  try {
    await fs.mkdir(YAML_DIR, { recursive: true });
    const filePath = path.join(YAML_DIR, `${pipelineId}.yaml`);
    const yamlContent = YAML.stringify(pipelineData, {
      indent: 2,
      lineWidth: 0
    });
    await fs.writeFile(filePath, yamlContent, 'utf8');
  } catch (error) {
    console.error('Error saving pipeline YAML:', error);
    throw error;
  }
}

// Función para convertir datos de Hasura a formato YAML
export function convertHasuraToPipelineYAML(hasuraData: any): PipelineYAML {
  return {
    id: hasuraData.id,
    name: hasuraData.name,
    description: hasuraData.description,
    units: hasuraData.units?.map((unit: any) => ({
      id: unit.id,
      type: unit.type || 'Unknown',
      name: unit.name || unit.displayName || `Unit ${unit.index || 0}`,
      config: {
        command: unit.command,
        sql_query: unit.sql_query,
        zip_config: unit.zip_config,
        sftp_config: unit.sftp_config,
        // Agregar otros campos según sea necesario
      },
      index: unit.index
    })) || [],
    created_at: hasuraData.created_at,
    updated_at: hasuraData.updated_at
  };
}

// Función para verificar si el YAML del pipeline está actualizado
export async function isPipelineYAMLUpToDate(pipelineId: string, hasuraUpdatedAt: string): Promise<boolean> {
  try {
    const pipelineYAML = await loadPipelineYAML(pipelineId);
    if (!pipelineYAML) return false;
    
    return pipelineYAML.updated_at === hasuraUpdatedAt;
  } catch (error) {
    return false;
  }
}