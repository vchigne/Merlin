import { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/hasura-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Server, Plus, Download, Copy, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QRCodeSVG } from 'qrcode.react';

// Define schema for form validation
const agentFormSchema = z.object({
  name: z.string().min(1, "Se requiere un nombre para el agente"),
  description: z.string().optional(),
  agent_version_id: z.string().default("latest.win.x64"),
  auto_clean_update: z.boolean().default(true),
  check_agent_update: z.boolean().default(true),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

// Default values for the form
const defaultValues: Partial<AgentFormValues> = {
  name: "",
  description: "",
  agent_version_id: "latest.win.x64",
  auto_clean_update: true,
  check_agent_update: true,
};

export default function CreateAgent() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize form
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues,
  });

  // Watch form fields for real-time updates
  const watchName = form.watch("name");
  const watchDescription = form.watch("description");

  // Auto-generate description if empty
  const getDescription = () => {
    if (watchDescription) return watchDescription;
    if (watchName) return `Agente Merlin para ${watchName}`;
    return "";
  };

  // Get agent versions
  const { data: versionData, isLoading: isLoadingVersions } = useQuery({
    queryKey: ['/api/agent-versions'],
    queryFn: async () => {
      const result = await executeQuery(`
        query GetAgentVersions {
          merlin_agent_AgentVersion {
            version
            url
            created_at
            updated_at
          }
        }
      `);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data.merlin_agent_AgentVersion;
    },
  });

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      const finalValues = {
        name: values.name,
        description: values.description || getDescription(),
        agent_version_id: values.agent_version_id,
        enabled: true,
        auto_clean_update: values.auto_clean_update,
        check_agent_update: values.check_agent_update,
        is_testing: false,
        watch: true,
        is_healthy: true,
      };

      const result = await executeQuery(`
        mutation CreateAgent($agent: merlin_agent_AgentPassport_insert_input!) {
          insert_merlin_agent_AgentPassport_one(object: $agent) {
            id
            name
            description
            enabled
          }
        }
      `, { agent: finalValues });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data.insert_merlin_agent_AgentPassport_one;
    },
    onSuccess: (data) => {
      setCreatedAgentId(data.id);
      setIsSuccess(true);
      toast({
        title: "Agente creado exitosamente",
        description: `El agente "${data.name}" ha sido creado y está listo para conectarse.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al crear el agente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: AgentFormValues) => {
    createAgentMutation.mutate(values);
  };

  // Handle download ENV file
  const downloadEnvFile = () => {
    if (!createdAgentId) return;
    
    const content = `PASSPORT=${createdAgentId}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merlin.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy passport ID to clipboard
  const copyPassportId = () => {
    if (createdAgentId) {
      navigator.clipboard.writeText(createdAgentId);
      toast({
        title: "ID de pasaporte copiado",
        description: "El ID de pasaporte ha sido copiado al portapapeles.",
      });
    }
  };

  // Success view - shown after agent creation
  if (isSuccess && createdAgentId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/agents")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Agentes
          </Button>
          <h1 className="text-2xl font-bold dark:text-white">Agente Creado Exitosamente</h1>
        </div>

        <Card className="border-green-300 dark:border-green-800 animate-fadeIn">
          <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-green-500" />
                  <span>Agente Creado</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  Tu nuevo agente está listo para ser configurado
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                Listo para Conectar
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2 space-y-2">
                <h3 className="text-md font-semibold">ID de Pasaporte</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-sm flex-1 break-all">
                    {createdAgentId}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyPassportId}
                    className="flex items-center"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar ID
                  </Button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Este ID identifica de manera única a tu agente y es requerido para la conexión.
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center space-y-2 border rounded-md p-4">
                <QRCodeSVG 
                  value={createdAgentId || ""} 
                  size={150}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"M"}
                  includeMargin={false}
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">Escanea el código QR para el ID de pasaporte</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Create a temporary canvas to generate PNG
                    const canvas = document.createElement("canvas");
                    const qrSize = 300;
                    canvas.width = qrSize;
                    canvas.height = qrSize;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      // Draw white background
                      ctx.fillStyle = "#FFFFFF";
                      ctx.fillRect(0, 0, qrSize, qrSize);
                      
                      // Create a temporary QR code SVG
                      const tempContainer = document.createElement("div");
                      tempContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 29 29">
                        ${document.querySelector('svg[data-testid="qr-code"]')?.innerHTML || ""}
                      </svg>`;
                      
                      // Convert SVG to image
                      const svg = new Blob([tempContainer.innerHTML], {type: 'image/svg+xml'});
                      const url = URL.createObjectURL(svg);
                      const img = new Image();
                      img.onload = () => {
                        ctx.drawImage(img, 0, 0, qrSize, qrSize);
                        URL.revokeObjectURL(url);
                        
                        // Download the image
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "merlin-passport-qr.png";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        });
                      };
                      img.src = url;
                    }
                  }}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QR
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-md font-semibold">Instrucciones de Instalación</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-full h-6 w-6 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Descargar Archivo de Configuración</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Haz clic en el botón de abajo para descargar el archivo de entorno para tu agente.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadEnvFile}
                      className="mt-2 flex items-center"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Merlin.env
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-full h-6 w-6 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Instalar Cliente Merlin</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Instala la aplicación Cliente Merlin en la máquina destino.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-full h-6 w-6 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Configurar el Agente</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Durante la instalación, proporciona el archivo de entorno descargado o ingresa el ID de pasaporte manualmente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-primary-100 dark:bg-primary-900/20 rounded-full h-6 w-6 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Verificar Conexión</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Regresa al panel de Agentes para verificar que tu agente esté en línea y conectado.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/agents/${createdAgentId}`)}
                      className="mt-2 flex items-center"
                    >
                      <Server className="mr-2 h-4 w-4" />
                      Ver Agente
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end space-x-2 border-t border-slate-200 dark:border-slate-700 pt-4">
            <Button variant="secondary" onClick={() => navigate("/agents")}>
              Cerrar
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Create agent form view
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/agents")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Agentes
        </Button>
        <h1 className="text-2xl font-bold dark:text-white">Crear Nuevo Agente</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5 text-primary-500" />
                Información del Agente
              </CardTitle>
              <CardDescription>
                Información básica sobre el agente que estás creando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Agente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingresa el nombre del agente" {...field} />
                    </FormControl>
                    <FormDescription>
                      Un nombre descriptivo para identificar este agente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={watchName ? `Agente Merlin para ${watchName}` : "Ingresa una descripción"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción opcional del propósito del agente. Si se deja vacío, se generará automáticamente una descripción.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_version_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Version</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingVersions ? (
                          <SelectItem value="latest.win.x64">Loading versions...</SelectItem>
                        ) : (
                          versionData?.map((version: any) => (
                            <SelectItem key={version.version} value={version.version}>
                              {version.version}
                            </SelectItem>
                          )) || <SelectItem value="latest.win.x64">latest.win.x64</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Which version of the agent to install.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>
                Additional settings for the agent (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="auto_clean_update"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-clean Updates</FormLabel>
                      <FormDescription>
                        Automatically clean up old files after updates.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="check_agent_update"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Check for Updates</FormLabel>
                      <FormDescription>
                        Automatically check for agent updates.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-medium">Production Mode</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Agent will run in production mode
                    </p>
                  </div>
                  <Badge>Enabled by Default</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This setting determines whether the agent runs in production mode. Testing mode can be enabled by administrators only.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-medium">Agent Monitoring</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Enable activity monitoring for this agent
                    </p>
                  </div>
                  <Badge>Enabled by Default</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Monitoring allows the system to track agent health and performance. This setting is enabled by default.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-5">
              <Button 
                variant="outline" 
                onClick={() => navigate("/agents")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAgentMutation.isPending}
              >
                {createAgentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Agent
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}