/**
 * Gestor de layouts de pipeline
 * Permite guardar y cargar configuraciones de posiciones de nodos en archivos YAML locales
 * sin necesidad de modificar el esquema de la base de datos Hasura
 */

// Importaciones necesarias
import yaml from 'yaml';

// Interfaz para guardar la posición de un nodo
interface NodePosition {
  id: string;
  x: number;
  y: number;
  minimized?: boolean;
}

// Interfaz para el layout completo
interface PipelineLayout {
  pipelineId: string;
  positions: NodePosition[];
  updatedAt: string;
}

/**
 * Clase para gestionar los layouts de pipelines
 */
export class PipelineLayoutManager {
  private static instance: PipelineLayoutManager;
  private layouts: Map<string, PipelineLayout> = new Map();
  
  /**
   * Constructor privado para implementar patrón Singleton
   */
  private constructor() {
    this.loadLayouts();
  }
  
  /**
   * Obtener la instancia única del gestor
   */
  public static getInstance(): PipelineLayoutManager {
    if (!PipelineLayoutManager.instance) {
      PipelineLayoutManager.instance = new PipelineLayoutManager();
    }
    return PipelineLayoutManager.instance;
  }
  
  /**
   * Cargar layouts almacenados en localStorage
   */
  private loadLayouts(): void {
    try {
      const storedLayouts = localStorage.getItem('pipelineLayouts');
      if (storedLayouts) {
        const parsedLayouts = JSON.parse(storedLayouts);
        Object.entries(parsedLayouts).forEach(([key, value]) => {
          this.layouts.set(key, value as PipelineLayout);
        });
      }
    } catch (error) {
      console.error('Error al cargar layouts de pipelines:', error);
    }
  }
  
  /**
   * Guardar layouts en localStorage
   */
  private saveLayouts(): void {
    try {
      const layoutsObj: Record<string, PipelineLayout> = {};
      this.layouts.forEach((layout, key) => {
        layoutsObj[key] = layout;
      });
      localStorage.setItem('pipelineLayouts', JSON.stringify(layoutsObj));
    } catch (error) {
      console.error('Error al guardar layouts de pipelines:', error);
    }
  }
  
  /**
   * Exportar layout a YAML para descarga manual
   */
  public exportLayoutYAML(pipelineId: string): string | null {
    const layout = this.layouts.get(pipelineId);
    if (!layout) return null;
    
    return yaml.stringify(layout);
  }
  
  /**
   * Importar layout desde YAML
   */
  public importLayoutFromYAML(yamlContent: string): boolean {
    try {
      const layout = yaml.parse(yamlContent) as PipelineLayout;
      if (!layout.pipelineId || !Array.isArray(layout.positions)) {
        return false;
      }
      
      this.saveLayout(layout.pipelineId, layout.positions);
      return true;
    } catch (error) {
      console.error('Error al importar layout desde YAML:', error);
      return false;
    }
  }
  
  /**
   * Guardar posiciones de nodos para un pipeline específico
   */
  public saveLayout(pipelineId: string, positions: NodePosition[]): void {
    const layout: PipelineLayout = {
      pipelineId,
      positions,
      updatedAt: new Date().toISOString()
    };
    
    this.layouts.set(pipelineId, layout);
    this.saveLayouts();
  }
  
  /**
   * Cargar posiciones de nodos para un pipeline específico
   */
  public getLayout(pipelineId: string): NodePosition[] | null {
    const layout = this.layouts.get(pipelineId);
    return layout ? layout.positions : null;
  }
  
  /**
   * Aplicar posiciones guardadas a nodos de un pipeline
   */
  public applyLayoutToNodes(pipelineId: string, nodes: any[]): any[] {
    const positions = this.getLayout(pipelineId);
    if (!positions) return nodes;
    
    return nodes.map(node => {
      const savedPosition = positions.find(pos => pos.id === node.id);
      if (savedPosition) {
        return {
          ...node,
          position: {
            x: savedPosition.x,
            y: savedPosition.y
          }
        };
      }
      return node;
    });
  }
  
  /**
   * Extraer posiciones de nodos para guardar
   */
  public extractPositionsFromNodes(nodes: any[]): NodePosition[] {
    return nodes.map(node => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y
    }));
  }
  
  /**
   * Borrar layout guardado para un pipeline
   */
  public deleteLayout(pipelineId: string): void {
    this.layouts.delete(pipelineId);
    this.saveLayouts();
  }
}

// Exportar instancia única
export const pipelineLayoutManager = PipelineLayoutManager.getInstance();