import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';
import { createPipelineTemplate } from './pipeline-analyzer';

// Tipos para las plantillas de pipeline
export interface PipelineTemplateInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  file_path: string;
}

export interface PipelineTemplateFilter {
  type?: string;
  tag?: string;
  search?: string;
}

const TEMPLATES_DIR = path.join(process.cwd(), 'templates', 'pipelines');

/**
 * Clase para gestionar plantillas de pipelines
 */
export class PipelineTemplateManager {
  
  /**
   * Obtiene todas las plantillas existentes
   */
  async getAllTemplates(filter?: PipelineTemplateFilter): Promise<PipelineTemplateInfo[]> {
    try {
      // Verificar que el directorio existe, si no, crearlo
      await this.ensureTemplateDirectory();
      
      // Leer todos los archivos YAML en el directorio
      const files = await fs.readdir(TEMPLATES_DIR);
      const yamlFiles = files.filter(file => 
        file.endsWith('.yaml') || file.endsWith('.yml')
      );
      
      // Cargar y analizar cada archivo
      const templates: PipelineTemplateInfo[] = [];
      
      for (const file of yamlFiles) {
        try {
          const filePath = path.join(TEMPLATES_DIR, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = YAML.parse(content);
          
          // Extraer metadatos para la lista
          templates.push({
            id: template.id || path.basename(file, path.extname(file)),
            name: template.name || 'Unnamed Template',
            description: template.description || '',
            type: template.type || 'unknown',
            tags: template.tags || [],
            created_at: template.created_at || '',
            updated_at: template.updated_at || '',
            file_path: filePath
          });
        } catch (err) {
          console.error(`Error parsing template file ${file}:`, err);
        }
      }
      
      // Aplicar filtros si existen
      let filteredTemplates = templates;
      
      if (filter) {
        if (filter.type) {
          filteredTemplates = filteredTemplates.filter(t => 
            t.type === filter.type
          );
        }
        
        if (filter.tag) {
          filteredTemplates = filteredTemplates.filter(t => 
            t.tags.includes(filter.tag)
          );
        }
        
        if (filter.search) {
          const search = filter.search.toLowerCase();
          filteredTemplates = filteredTemplates.filter(t => 
            t.name.toLowerCase().includes(search) || 
            t.description.toLowerCase().includes(search) ||
            t.tags.some(tag => tag.toLowerCase().includes(search))
          );
        }
      }
      
      return filteredTemplates;
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene una plantilla específica por ID
   */
  async getTemplateById(id: string): Promise<any> {
    try {
      // Construir la ruta al archivo
      const filePath = path.join(TEMPLATES_DIR, `${id}.yaml`);
      
      // Leer y parsear el archivo
      const content = await fs.readFile(filePath, 'utf8');
      return YAML.parse(content);
    } catch (error) {
      console.error(`Error al obtener plantilla ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Crea una nueva plantilla basada en un pipeline existente
   */
  async createTemplateFromPipeline(pipelineId: string, templateName?: string): Promise<string> {
    try {
      await this.ensureTemplateDirectory();
      
      // Generar la plantilla
      const template = await createPipelineTemplate(pipelineId);
      
      // Añadir metadatos
      const now = new Date().toISOString();
      template.id = `template_${Date.now()}`;
      template.created_at = now;
      template.updated_at = now;
      template.type = this.determineTemplateType(template);
      
      if (templateName) {
        template.name = templateName;
      }
      
      // Guardar plantilla en un archivo YAML
      const yamlContent = YAML.stringify(template);
      const filePath = path.join(TEMPLATES_DIR, `${template.id}.yaml`);
      await fs.writeFile(filePath, yamlContent, 'utf8');
      
      return template.id;
    } catch (error) {
      console.error('Error al crear plantilla desde pipeline:', error);
      throw error;
    }
  }
  
  /**
   * Guarda una plantilla personalizada
   */
  async saveTemplate(template: any): Promise<string> {
    try {
      await this.ensureTemplateDirectory();
      
      // Validar plantilla mínima
      if (!template.name) {
        throw new Error('La plantilla debe tener un nombre');
      }
      
      // Completar metadatos
      const now = new Date().toISOString();
      
      if (!template.id) {
        template.id = `template_${Date.now()}`;
      }
      
      if (!template.created_at) {
        template.created_at = now;
      }
      
      template.updated_at = now;
      
      if (!template.type) {
        template.type = this.determineTemplateType(template);
      }
      
      // Guardar plantilla en un archivo YAML
      const yamlContent = YAML.stringify(template);
      const filePath = path.join(TEMPLATES_DIR, `${template.id}.yaml`);
      await fs.writeFile(filePath, yamlContent, 'utf8');
      
      return template.id;
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      throw error;
    }
  }
  
  /**
   * Elimina una plantilla
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const filePath = path.join(TEMPLATES_DIR, `${id}.yaml`);
      
      // Comprobar si el archivo existe
      try {
        await fs.access(filePath);
      } catch (err) {
        // El archivo no existe
        return false;
      }
      
      // Eliminar el archivo
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error al eliminar plantilla ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Se asegura de que exista el directorio para las plantillas
   */
  private async ensureTemplateDirectory(): Promise<void> {
    try {
      await fs.access(TEMPLATES_DIR);
    } catch (err) {
      // El directorio no existe, así que lo creamos
      await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    }
  }
  
  /**
   * Determina el tipo de una plantilla basado en su contenido
   */
  private determineTemplateType(template: any): string {
    if (!template.units || template.units.length === 0) {
      return 'empty';
    }
    
    const types = template.units.map((unit: any) => unit.type);
    
    // Contar los diferentes tipos
    const counts: Record<string, number> = {};
    for (const type of types) {
      counts[type] = (counts[type] || 0) + 1;
    }
    
    // Extraer la distribución
    const total = types.length;
    const typeDistribution = Object.entries(counts).map(
      ([type, count]) => ({ type, percentage: (count / total) * 100 })
    );
    
    // Ordenar por porcentaje descendente
    typeDistribution.sort((a, b) => b.percentage - a.percentage);
    
    // Si un tipo representa más del 50%, ese es el tipo principal
    if (typeDistribution[0].percentage >= 50) {
      return typeDistribution[0].type;
    }
    
    // Si hay unidades que llaman a otros pipelines, es "composite"
    if (types.includes('call_pipeline')) {
      return 'composite';
    }
    
    // En caso contrario, es "mixed"
    return 'mixed';
  }
}