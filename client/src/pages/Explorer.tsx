import GraphQLExplorer from "@/components/explorer/GraphQLExplorer";

export default function Explorer() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">GraphQL Explorer</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Explore the Merlin system data model using GraphQL queries
        </p>
      </div>
      
      {/* GraphQL Explorer component */}
      <GraphQLExplorer />
    </div>
  );
}
