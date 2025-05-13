import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { executeQuery, validateReadOnlyQuery } from "@/lib/hasura-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Save, 
  AlertTriangle, 
  X, 
  CheckCircle, 
  Clock, 
  Download,
  Copy,
  List,
  Code
} from "lucide-react";

const defaultQuery = `# Example Query - This is a read-only environment
# Try exploring the Merlin system with queries like this:

query GetAgents {
  merlin_agent_AgentPassport(limit: 10) {
    id
    name
    description
    is_healthy
    enabled
    AgentPassportPing(limit: 1) {
      last_ping_at
      hostname
      ips
    }
  }
}`;

export default function GraphQLExplorer() {
  const [query, setQuery] = useState(defaultQuery);
  const [variables, setVariables] = useState("{}");
  const [queryHistory, setQueryHistory] = useState<{ query: string; timestamp: number }[]>([]);
  const [activeTab, setActiveTab] = useState("query");
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  // Execute query
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['/api/graphql/explorer', { query: '', variables: {} }],
    queryFn: async () => null,
    enabled: false,
  });

  const handleQueryExecution = async () => {
    // First, validate if the query is read-only
    if (!validateReadOnlyQuery(query)) {
      toast({
        title: "Read-Only Restriction",
        description: "Only read-only queries are allowed. Write operations (insert, update, delete, etc.) are not permitted.",
        variant: "destructive",
      });
      return;
    }

    // Parse variables if provided
    let parsedVariables = {};
    try {
      parsedVariables = variables ? JSON.parse(variables) : {};
    } catch (err) {
      toast({
        title: "Invalid Variables",
        description: "Please ensure variables are in valid JSON format.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executeQuery(query, parsedVariables);
      
      // Add to history
      setQueryHistory((prev) => [
        { query, timestamp: Date.now() },
        ...prev.slice(0, 9), // Keep only the last 10 queries
      ]);
      
      // Switch to results tab
      setActiveTab("result");
      
      return result;
    } catch (err) {
      console.error("Query execution error:", err);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteQuery = () => {
    refetch();
  };

  const handleCopyQuery = (historicQuery: string) => {
    setQuery(historicQuery);
    setActiveTab("query");
  };

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Content has been copied to your clipboard.",
        });
      },
      (err) => {
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard: " + err,
          variant: "destructive",
        });
      }
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const truncateQuery = (query: string, maxLength = 50) => {
    // Remove comments and whitespace
    const cleanQuery = query.replace(/\s+/g, ' ').replace(/^#.*$/gm, '').trim();
    return cleanQuery.length > maxLength
      ? cleanQuery.substring(0, maxLength) + '...'
      : cleanQuery;
  };

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle>GraphQL Explorer</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              READ ONLY
            </Badge>
            <Button 
              onClick={handleExecuteQuery} 
              disabled={isLoading || isExecuting}
              className="space-x-1"
            >
              <Play className="h-4 w-4" />
              <span>Execute</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
          {/* Left sidebar - Query history */}
          <div className="hidden md:block border-r border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">Query History</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueryHistory([])}
                disabled={queryHistory.length === 0}
                className="h-7 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[550px]">
              {queryHistory.length === 0 ? (
                <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                  No query history yet
                </div>
              ) : (
                <div className="space-y-2">
                  {queryHistory.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => handleCopyQuery(item.query)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(item.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToClipboard(item.query);
                          }}
                          className="h-5 w-5"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="sr-only">Copy</span>
                        </Button>
                      </div>
                      <div className="font-mono">{truncateQuery(item.query)}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Main content - Query editor and results */}
          <div className="col-span-1 md:col-span-2">
            <Tabs defaultValue="query" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-200 dark:border-slate-700">
                <TabsList className="p-0 h-10 rounded-none">
                  <TabsTrigger value="query" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:shadow-none">
                    <Code className="h-4 w-4 mr-2" />
                    Query
                  </TabsTrigger>
                  <TabsTrigger value="variables" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:shadow-none">
                    <List className="h-4 w-4 mr-2" />
                    Variables
                  </TabsTrigger>
                  <TabsTrigger value="result" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:shadow-none">
                    <Download className="h-4 w-4 mr-2" />
                    Result
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="query" className="p-0 m-0">
                <div className="h-[550px] p-2">
                  <textarea
                    className="w-full h-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your GraphQL query here..."
                    spellCheck={false}
                  />
                </div>
              </TabsContent>
              <TabsContent value="variables" className="p-0 m-0">
                <div className="h-[550px] p-2">
                  <textarea
                    className="w-full h-full p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-600"
                    value={variables}
                    onChange={(e) => setVariables(e.target.value)}
                    placeholder="Enter variables as JSON (optional)"
                    spellCheck={false}
                  />
                </div>
              </TabsContent>
              <TabsContent value="result" className="p-0 m-0">
                <div className="h-[550px] p-2">
                  {isLoading || isExecuting ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : error ? (
                    <Alert variant="destructive" className="m-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {error instanceof Error ? error.message : "An unknown error occurred"}
                      </AlertDescription>
                    </Alert>
                  ) : data ? (
                    <pre className="p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md overflow-auto h-full">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      <p>Execute a query to see results</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
