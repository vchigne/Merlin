import { useParams, Link } from "wouter";
import { 
  ArrowLeft, 
  Database, 
  Server, 
  FileCode, 
  Calendar
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
import { useSQLConnectionDetail, useSQLConnectionUsage } from "@/hooks/use-sql-connections";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SQLConnectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sqlConnection, isLoading, error } = useSQLConnectionDetail(id);
  const { data: usageData, isLoading: isLoadingUsage } = useSQLConnectionUsage(id);
  
  useDocumentTitle(sqlConnection ? `SQL Connection: ${sqlConnection.name}` : "SQL Connection Details");
  
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

  if (error || !sqlConnection) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/connections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">SQL Connection Not Found</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Could not load SQL connection details. The connection may not exist or there was an error.
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
        <h1 className="text-2xl font-bold">{sqlConnection.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SQL Connection Details</CardTitle>
            <CardDescription>
              Connection details and configuration for this database connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Database className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Driver</p>
                    <p className="text-sm text-muted-foreground">{sqlConnection.driver || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <FileCode className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Connection String</p>
                    <p className="text-sm text-muted-foreground opacity-80 font-mono text-xs break-all">
                      {sqlConnection.connstring ? 
                        sqlConnection.connstring.replace(/password=\w+/gi, 'password=*****') : 
                        'Not specified'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {sqlConnection.created_at ? (
                        <>
                          {format(new Date(sqlConnection.created_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(sqlConnection.created_at), { addSuffix: true })}
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
                      {sqlConnection.updated_at ? (
                        <>
                          {format(new Date(sqlConnection.updated_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(sqlConnection.updated_at), { addSuffix: true })}
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
              How this SQL connection is being used in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="queries">
              <TabsList className="mb-4">
                <TabsTrigger value="queries">
                  <FileCode className="h-4 w-4 mr-2" />
                  Queries
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="queries">
                {isLoadingUsage ? (
                  <Skeleton className="h-40 w-full" />
                ) : usageData?.queries?.length ? (
                  <div className="space-y-4">
                    {usageData.queries.map(query => (
                      <Card key={query.id}>
                        <CardHeader className="py-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{query.name}</CardTitle>
                            <Badge variant={query.enabled ? "success" : "secondary"}>
                              {query.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {query.query_string || 'No query string'}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No queries are using this SQL connection
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