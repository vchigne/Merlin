// Gestor de plantillas para el Pipeline Studio
import { nanoid } from 'nanoid';

// Tipo para las plantillas de pipeline
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  metadata: {
    complexity: 'simple' | 'medium' | 'complex';
    icon?: string;
    color?: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  units: any[];
}

// Clase para gestionar las plantillas
export class PipelineTemplateManager {
  private static instance: PipelineTemplateManager;
  private templates: PipelineTemplate[];

  private constructor() {
    this.templates = [
      // Plantilla simple de comando
      {
        id: 'command-template',
        name: 'Comando Único',
        description: 'Ejecuta un único comando en el agente',
        category: 'scripting',
        tags: ['command', 'simple'],
        version: '1.0',
        metadata: {
          complexity: 'simple',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Ejecutar Comando',
            command_id: '',
            properties: {
              working_directory: '',
              target: 'cmd.exe',
              args: ''
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla de SQL Export
      {
        id: 'sql-export-template',
        name: 'Exportación SQL',
        description: 'Exporta datos desde una consulta SQL a un archivo',
        category: 'data-export',
        tags: ['sql', 'export'],
        version: '1.0',
        metadata: {
          complexity: 'medium',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Ejecutar Consulta SQL',
            query_queue_id: '',
            properties: {
              sqlconn_id: '',
              query_string: 'SELECT * FROM tabla WHERE condicion = 1',
              path: 'C:\\exports\\datos.csv'
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla SFTP Downloader
      {
        id: 'sftp-download-template',
        name: 'Descarga SFTP',
        description: 'Descarga archivos desde un servidor SFTP',
        category: 'file-transfer',
        tags: ['sftp', 'download'],
        version: '1.0',
        metadata: {
          complexity: 'medium',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Descargar desde SFTP',
            sftp_downloader_id: '',
            properties: {
              sftp_link_id: '',
              output: 'C:\\downloads\\',
              return_output: true
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla SFTP Uploader
      {
        id: 'sftp-upload-template',
        name: 'Subida SFTP',
        description: 'Sube archivos a un servidor SFTP',
        category: 'file-transfer',
        tags: ['sftp', 'upload'],
        version: '1.0',
        metadata: {
          complexity: 'medium',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Subir a SFTP',
            sftp_uploader_id: '',
            properties: {
              sftp_link_id: '',
              input: 'C:\\uploads\\file.txt',
              return_output: true
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla de Compresión ZIP
      {
        id: 'zip-template',
        name: 'Comprimir Archivos',
        description: 'Comprime archivos en un archivo ZIP',
        category: 'compression',
        tags: ['zip', 'compression'],
        version: '1.0',
        metadata: {
          complexity: 'simple',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Crear ZIP',
            zip_id: '',
            properties: {
              input: 'C:\\files\\*.*',
              output: 'C:\\zips\\archive.zip',
              return_output: true
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla de Descompresión UNZIP
      {
        id: 'unzip-template',
        name: 'Descomprimir Archivos',
        description: 'Extrae archivos de un ZIP',
        category: 'compression',
        tags: ['unzip', 'extraction'],
        version: '1.0',
        metadata: {
          complexity: 'simple',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Extraer ZIP',
            unzip_id: '',
            properties: {
              input: 'C:\\zips\\archive.zip',
              output: 'C:\\extracted\\',
              return_output: true
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla de SQL a ZIP a SFTP
      {
        id: 'sql-zip-sftp-template',
        name: 'SQL → ZIP → SFTP',
        description: 'Exporta datos SQL, los comprime y sube vía SFTP',
        category: 'integration',
        tags: ['sql', 'zip', 'sftp', 'composite'],
        version: '1.0',
        metadata: {
          complexity: 'complex',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Ejecutar Consulta SQL',
            query_queue_id: '',
            properties: {
              sqlconn_id: '',
              query_string: 'SELECT * FROM tabla WHERE condicion = 1',
              path: 'C:\\exports\\datos.csv'
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Comprimir Datos',
            zip_id: '',
            properties: {
              input: 'C:\\exports\\datos.csv',
              output: 'C:\\exports\\datos.zip',
              return_output: true
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Subir a SFTP',
            sftp_uploader_id: '',
            properties: {
              sftp_link_id: '',
              input: 'C:\\exports\\datos.zip',
              return_output: true
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla de SFTP a UNZIP a Comando
      {
        id: 'sftp-unzip-command-template',
        name: 'SFTP → UNZIP → Comando',
        description: 'Descarga archivo SFTP, descomprime y ejecuta script',
        category: 'integration',
        tags: ['sftp', 'unzip', 'command', 'composite'],
        version: '1.0',
        metadata: {
          complexity: 'complex',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Descargar desde SFTP',
            sftp_downloader_id: '',
            properties: {
              sftp_link_id: '',
              output: 'C:\\downloads\\script.zip',
              return_output: true
            },
            options: {
              retry_count: 1,
              retry_after_milliseconds: 5000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Extraer ZIP',
            unzip_id: '',
            properties: {
              input: 'C:\\downloads\\script.zip',
              output: 'C:\\extracted\\',
              return_output: true
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Ejecutar Script',
            command_id: '',
            properties: {
              working_directory: 'C:\\extracted\\',
              target: 'powershell.exe',
              args: '-File .\\script.ps1'
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 120000,
              continue_on_error: false
            }
          }
        ]
      },
      
      // Plantilla WANKA (basada en pipeline real)
      {
        id: 'wanka-template',
        name: '[SAN_FERNANDO] pipeline de MAPELLI ACOSTA WANKA',
        description: 'Pipeline especializado para procesamiento de datos tipo WANKA',
        category: 'data-processing',
        tags: ['command', 'sftp', 'specialized'],
        version: '1.0',
        metadata: {
          complexity: 'complex',
          author: 'Merlin',
          createdAt: '2025-05-01T00:00:00Z',
        },
        units: [
          {
            id: nanoid(),
            name: 'Limpieza inicial',
            command_id: '',
            properties: {
              working_directory: 'C:\\merlin\\wanka',
              target: 'cmd.exe',
              args: '/c del /q C:\\merlin\\wanka\\*.* > nul 2>&1'
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 30000,
              continue_on_error: true
            }
          },
          {
            id: nanoid(),
            name: 'Descargar desde SFTP',
            sftp_downloader_id: '',
            properties: {
              sftp_link_id: '',
              output: 'C:\\merlin\\wanka\\datos_raw.zip',
              return_output: true
            },
            options: {
              retry_count: 2,
              retry_after_milliseconds: 10000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Extraer ZIP',
            unzip_id: '',
            properties: {
              input: 'C:\\merlin\\wanka\\datos_raw.zip',
              output: 'C:\\merlin\\wanka\\',
              return_output: true
            },
            options: {
              retry_count: 1,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Procesar datos',
            command_id: '',
            properties: {
              working_directory: 'C:\\merlin\\wanka',
              target: 'powershell.exe',
              args: '-File .\\process_wanka.ps1 -InputFile datos.csv -OutputFile resultado.csv'
            },
            options: {
              retry_count: 1,
              timeout_milliseconds: 600000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Comprimir resultados',
            zip_id: '',
            properties: {
              input: 'C:\\merlin\\wanka\\resultado.csv',
              output: 'C:\\merlin\\wanka\\resultado.zip',
              return_output: true
            },
            options: {
              retry_count: 0,
              timeout_milliseconds: 60000,
              continue_on_error: false
            }
          },
          {
            id: nanoid(),
            name: 'Subir a SFTP',
            sftp_uploader_id: '',
            properties: {
              sftp_link_id: '',
              input: 'C:\\merlin\\wanka\\resultado.zip',
              return_output: true
            },
            options: {
              retry_count: 2,
              retry_after_milliseconds: 10000,
              timeout_milliseconds: 300000,
              continue_on_error: false
            }
          }
        ]
      }
    ];
  }

  // Implementación de Singleton
  public static getInstance(): PipelineTemplateManager {
    if (!PipelineTemplateManager.instance) {
      PipelineTemplateManager.instance = new PipelineTemplateManager();
    }
    return PipelineTemplateManager.instance;
  }

  // Obtener todas las plantillas
  public getTemplates(): PipelineTemplate[] {
    return this.templates;
  }

  // Obtener una plantilla por ID
  public getTemplateById(id: string): PipelineTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  // Buscar plantillas por texto
  public searchTemplates(searchText: string): PipelineTemplate[] {
    if (!searchText) return this.templates;
    
    const lowerSearchText = searchText.toLowerCase();
    
    return this.templates.filter(template => 
      template.name.toLowerCase().includes(lowerSearchText) ||
      template.description.toLowerCase().includes(lowerSearchText) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerSearchText))
    );
  }

  // Filtrar plantillas por categoría
  public filterByCategory(category: string): PipelineTemplate[] {
    if (!category) return this.templates;
    
    return this.templates.filter(template => template.category === category);
  }

  // Filtrar plantillas por etiqueta
  public filterByTag(tag: string): PipelineTemplate[] {
    if (!tag) return this.templates;
    
    return this.templates.filter(template => 
      template.tags.includes(tag)
    );
  }

  // Agregar una nueva plantilla
  public addTemplate(template: Omit<PipelineTemplate, 'id'>): PipelineTemplate {
    const newTemplate: PipelineTemplate = {
      ...template,
      id: `template-${nanoid()}`
    };
    
    this.templates.push(newTemplate);
    return newTemplate;
  }
}