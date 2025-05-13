import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel = "vs last period",
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 rounded-md p-3">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                {title}
              </dt>
              <dd>
                {loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded"></div>
                ) : (
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {typeof trend === 'number' && (
        <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 flex items-center text-xs">
          <span 
            className={cn(
              "font-medium flex items-center",
              trend > 0 
                ? "text-green-600 dark:text-green-400" 
                : trend < 0 
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-600 dark:text-slate-400"
            )}
          >
            {trend > 0 ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : trend < 0 ? (
              <ArrowDown className="h-3 w-3 mr-1" />
            ) : null}
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-slate-500 dark:text-slate-400 ml-2">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
