import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/use-document-title";
import SFTPLinksTable from "@/components/connections/SFTPLinksTable";
import SQLConnectionsTable from "@/components/connections/SQLConnectionsTable";
import CommandsTable from "@/components/connections/CommandsTable";

export default function ConnectionsPage() {
  useDocumentTitle("Connections");
  const [activeTab, setActiveTab] = useState("sftp");

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="sftp">SFTP Links</TabsTrigger>
            <TabsTrigger value="sql">SQL Connections</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sftp" className="space-y-4">
            <SFTPLinksTable />
          </TabsContent>
          
          <TabsContent value="sql" className="space-y-4">
            <SQLConnectionsTable />
          </TabsContent>
          
          <TabsContent value="commands" className="space-y-4">
            <CommandsTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}