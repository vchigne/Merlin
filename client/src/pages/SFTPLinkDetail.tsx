import { useState } from 'react';
import { useParams, Link as WouterLink } from 'wouter';
import { 
  ArrowLeft, 
  Server, 
  Download, 
  Upload, 
  ClipboardCheck, 
  Eye, 
  EyeOff,
  Clock,
  User,
  Building
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useSFTPLinkDetail, useSFTPLinkUsage } from '@/hooks/use-sftp-links';
import { useDocumentTitle } from '@/hooks/use-document-title';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SFTPLinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sftpLink, isLoading: isLoadingDetail } = useSFTPLinkDetail(id);
  const { data: usage, isLoading: isLoadingUsage } = useSFTPLinkUsage(id);
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  useDocumentTitle(`${sftpLink?.name || 'Conexión SFTP'} - Merlin Dashboard`);

  if (isLoadingDetail || isLoadingUsage) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center">
            <Button variant="outline" size="sm" className="mr-4" asChild>
              <WouterLink to="/connections">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </WouterLink>
            </Button>
            <h1 className="text-2xl font-bold">Cargando detalles...</h1>
          </div>
          
          <div className="flex items-center justify-center mt-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sftpLink) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center">
            <Button variant="outline" size="sm" className="mr-4" asChild>
              <WouterLink to="/connections">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </WouterLink>
            </Button>
            <h1 className="text-2xl font-bold">Conexión no encontrada</h1>
          </div>
          
          <Card className="mt-6 border-destructive">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>La conexión SFTP solicitada no existe o ha sido eliminada.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const downloaders = usage?.downloaders || [];
  const uploaders = usage?.uploaders || [];

  // Combinamos todas las unidades asociadas a downloaders y uploaders
  const allPipelineUnits = [
    ...downloaders.flatMap(d => d.merlin_agent_PipelineUnit || []),
    ...uploaders.flatMap(u => u.merlin_agent_PipelineUnit || [])
  ];

  // Crear un mapa de agentes únicos
  const uniqueAgents = new Map();
  allPipelineUnits.forEach(unit => {
    if (unit.pipeline?.agent_passport) {
      uniqueAgents.set(
        unit.pipeline.agent_passport.id, 
        unit.pipeline.agent_passport
      );
    }
  });

  // Crear un mapa de pipelines únicos
  const uniquePipelines = new Map();
  allPipelineUnits.forEach(unit => {
    if (unit.pipeline) {
      uniquePipelines.set(
        unit.pipeline.id, 
        unit.pipeline
      );
    }
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="mr-4" asChild>
            <WouterLink to="/connections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </WouterLink>
          </Button>
          <h1 className="text-2xl font-bold">{sftpLink.name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2 text-primary" />
                Detalles de Conexión SFTP
              </CardTitle>
              <CardDescription>
                Información detallada sobre esta conexión SFTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Host</h3>
                  <p className="font-medium">{sftpLink.host}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Puerto</h3>
                  <p className="font-medium">{sftpLink.port}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Usuario</h3>
                  <p className="font-medium flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {sftpLink.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Contraseña</h3>
                  <p className="font-medium flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 p-0 mr-2"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {passwordVisible ? "**********" : "••••••••••"}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Fecha Creación</h3>
                  <p className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(sftpLink.created_at), 'PPpp', { locale: es })}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Última Actualización</h3>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(sftpLink.updated_at), { 
                      addSuffix: true,
                      locale: es
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Uso</CardTitle>
              <CardDescription>
                Uso de esta conexión SFTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Downloaders:</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {downloaders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Uploaders:</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {uploaders.length}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Agentes:</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {uniqueAgents.size}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Pipelines:</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {uniquePipelines.size}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="downloaders" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="downloaders">
              <Download className="h-4 w-4 mr-2" />
              Downloaders
            </TabsTrigger>
            <TabsTrigger value="uploaders">
              <Upload className="h-4 w-4 mr-2" />
              Uploaders
            </TabsTrigger>
            <TabsTrigger value="usage">
              <Building className="h-4 w-4 mr-2" />
              Usado por
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloaders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Downloaders</CardTitle>
                <CardDescription>Operaciones de descarga que utilizan esta conexión</CardDescription>
              </CardHeader>
              <CardContent>
                {downloaders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Download className="mx-auto h-12 w-12 opacity-30 mb-2" />
                    <p>No hay downloaders configurados para esta conexión.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Directorio Salida</TableHead>
                        <TableHead>Retorna Salida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloaders.map(downloader => (
                        <TableRow key={downloader.id}>
                          <TableCell className="font-mono text-xs">
                            {downloader.id}
                          </TableCell>
                          <TableCell>{downloader.name}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={downloader.output}>
                              {downloader.output}
                            </div>
                          </TableCell>
                          <TableCell>
                            {downloader.return_output ? (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                <ClipboardCheck className="h-3 w-3 mr-1" />
                                Sí
                              </Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uploaders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Uploaders</CardTitle>
                <CardDescription>Operaciones de subida que utilizan esta conexión</CardDescription>
              </CardHeader>
              <CardContent>
                {uploaders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="mx-auto h-12 w-12 opacity-30 mb-2" />
                    <p>No hay uploaders configurados para esta conexión.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Directorio Entrada</TableHead>
                        <TableHead>Retorna Salida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploaders.map(uploader => (
                        <TableRow key={uploader.id}>
                          <TableCell className="font-mono text-xs">
                            {uploader.id}
                          </TableCell>
                          <TableCell>{uploader.name}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={uploader.input}>
                              {uploader.input}
                            </div>
                          </TableCell>
                          <TableCell>
                            {uploader.return_output ? (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                <ClipboardCheck className="h-3 w-3 mr-1" />
                                Sí
                              </Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Usado Por</CardTitle>
                <CardDescription>Agentes y pipelines que utilizan esta conexión</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="agents">
                  <TabsList>
                    <TabsTrigger value="agents">Agentes</TabsTrigger>
                    <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                  </TabsList>

                  <TabsContent value="agents" className="mt-4">
                    {uniqueAgents.size === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="mx-auto h-12 w-12 opacity-30 mb-2" />
                        <p>No hay agentes utilizando esta conexión.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from(uniqueAgents.values()).map(agent => (
                            <TableRow key={agent.id}>
                              <TableCell className="font-mono text-xs">
                                {agent.id}
                              </TableCell>
                              <TableCell>{agent.name}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <WouterLink to={`/agents/${agent.id}`}>
                                    Ver agente
                                  </WouterLink>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="pipelines" className="mt-4">
                    {uniquePipelines.size === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Server className="mx-auto h-12 w-12 opacity-30 mb-2" />
                        <p>No hay pipelines utilizando esta conexión.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from(uniquePipelines.values()).map(pipeline => (
                            <TableRow key={pipeline.id}>
                              <TableCell className="font-mono text-xs">
                                {pipeline.id}
                              </TableCell>
                              <TableCell>{pipeline.name}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <WouterLink to={`/pipelines/${pipeline.id}`}>
                                    Ver pipeline
                                  </WouterLink>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}