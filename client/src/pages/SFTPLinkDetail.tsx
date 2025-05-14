import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, 
  ExternalLink, 
  Server, 
  User, 
  Lock, 
  Calendar, 
  Download, 
  Upload 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSFTPLinkDetail, useSFTPLinkUsage } from "@/hooks/use-sftp-links";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SFTPLinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sftpLink, isLoading, error } = useSFTPLinkDetail(id);
  const { data: usageData, isLoading: isLoadingUsage } = useSFTPLinkUsage(id);
  
  useDocumentTitle(sftpLink ? `SFTP Link: ${sftpLink.name}` : "SFTP Link Details");
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/connections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !sftpLink) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/connections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">SFTP Link Not Found</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Could not load SFTP link details. The link may not exist or there was an error.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/connections">Return to Connections</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/connections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{sftpLink.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SFTP Connection Details</CardTitle>
            <CardDescription>
              Connection details and configuration for this SFTP link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Server className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Server</p>
                    <p className="text-sm text-muted-foreground">{sftpLink.server}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Server className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Port</p>
                    <p className="text-sm text-muted-foreground">{sftpLink.port}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Username</p>
                    <p className="text-sm text-muted-foreground">{sftpLink.user}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Lock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">••••••••</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {sftpLink.created_at ? (
                        <>
                          {format(new Date(sftpLink.created_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(sftpLink.created_at), { addSuffix: true })}
                          </Badge>
                        </>
                      ) : (
                        "Unknown"
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {sftpLink.updated_at ? (
                        <>
                          {format(new Date(sftpLink.updated_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(sftpLink.updated_at), { addSuffix: true })}
                          </Badge>
                        </>
                      ) : (
                        "Unknown"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              How this SFTP link is being used in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="downloaders">
              <TabsList className="mb-4">
                <TabsTrigger value="downloaders">
                  <Download className="h-4 w-4 mr-2" />
                  Downloaders
                </TabsTrigger>
                <TabsTrigger value="uploaders">
                  <Upload className="h-4 w-4 mr-2" />
                  Uploaders
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="downloaders">
                {isLoadingUsage ? (
                  <Skeleton className="h-40 w-full" />
                ) : usageData?.downloaders?.length ? (
                  <div className="space-y-4">
                    {usageData.downloaders.map((downloader: any) => (
                      <Card key={downloader.id}>
                        <CardHeader className="py-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{downloader.name}</CardTitle>
                            <Badge variant="outline">{downloader.output}</Badge>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No downloaders are using this SFTP link
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="uploaders">
                {isLoadingUsage ? (
                  <Skeleton className="h-40 w-full" />
                ) : usageData?.uploaders?.length ? (
                  <div className="space-y-4">
                    {usageData.uploaders.map((uploader: any) => (
                      <Card key={uploader.id}>
                        <CardHeader className="py-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{uploader.name}</CardTitle>
                            <Badge variant="outline">{uploader.input}</Badge>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No uploaders are using this SFTP link
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}