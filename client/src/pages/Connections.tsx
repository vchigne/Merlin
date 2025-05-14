import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentTitle } from '@/hooks/use-document-title';
import SFTPLinksTable from '@/components/connections/SFTPLinksTable';
import SQLConnectionsTable from '@/components/connections/SQLConnectionsTable';
import CommandsTable from '@/components/connections/CommandsTable';

export default function ConnectionsPage() {
  useDocumentTitle('Conexiones - Merlin Dashboard');
  const [activeTab, setActiveTab] = useState('sftp');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Conexiones</h1>
        </div>

        <Tabs defaultValue="sftp" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="sftp">SFTP Links</TabsTrigger>
            <TabsTrigger value="sql">SQL Connections</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>

          <Separator className="mb-8" />
          
          <TabsContent value="sftp" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Conexiones SFTP</CardTitle>
              </CardHeader>
              <CardContent>
                <SFTPLinksTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sql" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Conexiones SQL</CardTitle>
              </CardHeader>
              <CardContent>
                <SQLConnectionsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commands" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Comandos</CardTitle>
              </CardHeader>
              <CardContent>
                <CommandsTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}