import { useParams, Link } from "wouter";
import { 
  ArrowLeft, 
  Terminal, 
  Folder,
  Code,
  Calendar,
  Clock,
  Tag
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
import { useCommandDetail, useCommandUsage } from "@/hooks/use-commands";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: command, isLoading, error } = useCommandDetail(id);
  const { data: usageData, isLoading: isLoadingUsage } = useCommandUsage(id);
  
  useDocumentTitle(command ? `Command: ${command.name}` : "Command Details");
  
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

  if (error || !command) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/connections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Command Not Found</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Could not load command details. The command may not exist or there was an error.
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
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{command.name || 'Unnamed Command'}</h1>
          {command.instant && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              Instant
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Command Details</CardTitle>
            <CardDescription>
              {command.description || 'No description provided for this command'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Terminal className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Target</p>
                    <p className="text-sm text-muted-foreground">{command.target || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Folder className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Working Directory</p>
                    <p className="text-sm text-muted-foreground">{command.working_directory || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Code className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Arguments</p>
                    <p className="text-sm text-muted-foreground font-mono">{command.args || 'No arguments'}</p>
                  </div>
                </div>

                {command.dq_process_id && (
                  <div className="flex items-start">
                    <Terminal className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">DQProcess</p>
                      <div className="mt-1">
                        {command.dq_process ? (
                          <div>
                            <Badge variant="secondary" className="mb-1">
                              {command.dq_process.name}
                            </Badge>
                            {command.dq_process.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {command.dq_process.description}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">ID: {command.dq_process_id}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {command.labels && command.labels.length > 0 && (
                  <div className="flex items-start">
                    <Tag className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Labels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {command.labels.map((label: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Return Output</p>
                    <p className="text-sm text-muted-foreground">
                      {command.return_output ? 'Yes' : 'No'}
                      {command.return_output && command.return_output_type && (
                        <Badge variant="outline" className="ml-2">
                          Type: {command.return_output_type}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {command.created_at ? (
                        <>
                          {format(new Date(command.created_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(command.created_at), { addSuffix: true })}
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
                      {command.updated_at ? (
                        <>
                          {format(new Date(command.updated_at), "PPP")}
                          <Badge variant="outline" className="ml-2">
                            {formatDistanceToNow(new Date(command.updated_at), { addSuffix: true })}
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

            {command.raw_script && (
              <div className="mt-6">
                <p className="font-medium mb-2">Script Content</p>
                <Card className="bg-muted/40 border border-muted">
                  <CardContent className="p-4">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap break-all">
                      {command.raw_script}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {command.dq_process_id && command.dq_process && (
          <Card>
            <CardHeader>
              <CardTitle>DQProcess Association</CardTitle>
              <CardDescription>
                This command is linked to a DQProcess
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <p className="font-medium">Process Name</p>
                    <Badge variant="secondary" className="mt-1">
                      {command.dq_process.name}
                    </Badge>
                  </div>
                </div>
                
                {command.dq_process.description && (
                  <div>
                    <p className="font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">
                      {command.dq_process.description}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {command.dq_process.created_at && (
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(command.dq_process.created_at), "PPP")}
                      </p>
                    </div>
                  )}
                  
                  {command.dq_process.updated_at && (
                    <div>
                      <p className="font-medium">Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(command.dq_process.updated_at), "PPP")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Usage in Pipelines</CardTitle>
            <CardDescription>
              How this command is being used in pipelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <Skeleton className="h-40 w-full" />
            ) : usageData?.command?.merlin_agent_PipelineUnit?.length ? (
              <div className="space-y-4">
                {usageData.command.merlin_agent_PipelineUnit.map((unit: any) => (
                  <Card key={unit.id}>
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{unit.pipeline.name}</CardTitle>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/pipelines/${unit.pipeline.id}`}>
                            View Pipeline
                          </Link>
                        </Button>
                      </div>
                      <CardDescription>
                        Agent: {unit.pipeline.agent_passport?.name || 'Unknown'}
                        {unit.pipeline.description && (
                          <p className="mt-1">{unit.pipeline.description}</p>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {unit.comment && (
                          <div className="col-span-full">
                            <p className="font-medium text-muted-foreground">Comment</p>
                            <p>{unit.comment}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-muted-foreground">Position</p>
                          <p>x: {unit.posx || '0'}, y: {unit.posy || '0'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Created</p>
                          <p>{unit.created_at ? format(new Date(unit.created_at), "PPP") : "Unknown"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Updated</p>
                          <p>{unit.updated_at ? format(new Date(unit.updated_at), "PPP") : "Unknown"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                This command is not used in any pipelines
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}