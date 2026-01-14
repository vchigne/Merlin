import * as fs from 'fs';
import * as path from 'path';

interface ParsedSchedule {
  label: string;
  timeOfDay: string;
  frequencyType: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: string;
  daysOfMonth?: string;
  targets: {
    pipelineId: string;
    clientName: string;
    pipelineName: string;
  }[];
}

export function parseSchedulerFile(content: string): ParsedSchedule[] {
  const schedules: ParsedSchedule[] = [];
  
  const cronFunctionPattern = /def\s+(cron_\w+)\s*\(\s*\):/g;
  const pipelinePattern = /"([a-f0-9-]{36})"\s*,?\s*#\s*\[([^\]]+)\]\s*(?:pipeline\s+de\s+)?(.+)/gi;
  const timePattern = /cron_(\d{2})_(\d{2})_(am|pm)_PE/i;
  const dayOfWeekPattern = /day_of_every_week\s*\(\s*(?:day\s*=\s*)?\[([^\]]+)\]/gi;
  const dayOfMonthPattern = /day_of_every_month\s*\(\s*(?:day\s*=\s*)?\[([^\]]+)\]/gi;
  
  const functions = content.split(/(?=def\s+cron_)/);
  
  for (const funcBlock of functions) {
    if (!funcBlock.includes('def cron_')) continue;
    
    const funcNameMatch = funcBlock.match(/def\s+(cron_\w+)\s*\(/);
    if (!funcNameMatch) continue;
    
    const funcName = funcNameMatch[1];
    const timeMatch = funcName.match(timePattern);
    
    if (!timeMatch) continue;
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3].toLowerCase();
    
    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
    
    const timeOfDay = `${hours.toString().padStart(2, '0')}:${minutes}`;
    
    const mainPipelines: { pipelineId: string; clientName: string; pipelineName: string }[] = [];
    const weeklySchedules: Map<string, { pipelineId: string; clientName: string; pipelineName: string }[]> = new Map();
    const monthlySchedules: Map<string, { pipelineId: string; clientName: string; pipelineName: string }[]> = new Map();
    
    const mainBlockMatch = funcBlock.match(/add_ppls_to_cron\s*\(\s*ppl_ids\s*=\s*\[([\s\S]*?)\]\s*\)/);
    if (mainBlockMatch) {
      const pipelinesBlock = mainBlockMatch[1];
      let pipelineMatch;
      const pipelineRegex = /"([a-f0-9-]{36})"\s*,?\s*#\s*\[([^\]]+)\]\s*(?:pipeline\s+de\s+)?(.+)/gi;
      
      while ((pipelineMatch = pipelineRegex.exec(pipelinesBlock)) !== null) {
        if (pipelinesBlock.indexOf('#' + pipelineMatch[0].split('#')[1]) > 0) {
          const lineStart = pipelinesBlock.lastIndexOf('\n', pipelinesBlock.indexOf(pipelineMatch[0]));
          const beforeMatch = pipelinesBlock.substring(lineStart, pipelinesBlock.indexOf(pipelineMatch[0]));
          if (beforeMatch.includes('#')) continue;
        }
        
        mainPipelines.push({
          pipelineId: pipelineMatch[1],
          clientName: pipelineMatch[2].trim(),
          pipelineName: pipelineMatch[3].trim().replace(/,\s*$/, '')
        });
      }
    }
    
    let weeklyMatch;
    const weeklyRegex = /day_of_every_week\s*\(\s*(?:day\s*=\s*)?\[([^\]]+)\]\s*,\s*(?:method\s*=\s*)?add_ppls_to_cron\s*,\s*args\s*=\s*\[([\s\S]*?)\]\s*\)/gi;
    while ((weeklyMatch = weeklyRegex.exec(funcBlock)) !== null) {
      const days = weeklyMatch[1].trim();
      const pipelinesBlock = weeklyMatch[2];
      
      const pipelines: { pipelineId: string; clientName: string; pipelineName: string }[] = [];
      const pipelineRegex2 = /"([a-f0-9-]{36})"\s*,?\s*#\s*\[([^\]]+)\]\s*(?:pipeline\s+de\s+)?(.+)/gi;
      let pm;
      while ((pm = pipelineRegex2.exec(pipelinesBlock)) !== null) {
        pipelines.push({
          pipelineId: pm[1],
          clientName: pm[2].trim(),
          pipelineName: pm[3].trim().replace(/,\s*$/, '')
        });
      }
      
      if (pipelines.length > 0) {
        weeklySchedules.set(days, pipelines);
      }
    }
    
    let monthlyMatch;
    const monthlyRegex = /day_of_every_month\s*\(\s*(?:day\s*=\s*)?\[([^\]]+)\]\s*,\s*(?:method\s*=\s*)?add_ppls_to_cron\s*,\s*args\s*=\s*\[([\s\S]*?)\]\s*\)/gi;
    while ((monthlyMatch = monthlyRegex.exec(funcBlock)) !== null) {
      const days = monthlyMatch[1].trim();
      const pipelinesBlock = monthlyMatch[2];
      
      const pipelines: { pipelineId: string; clientName: string; pipelineName: string }[] = [];
      const pipelineRegex3 = /"([a-f0-9-]{36})"\s*,?\s*#\s*\[([^\]]+)\]\s*(?:pipeline\s+de\s+)?(.+)/gi;
      let pm;
      while ((pm = pipelineRegex3.exec(pipelinesBlock)) !== null) {
        pipelines.push({
          pipelineId: pm[1],
          clientName: pm[2].trim(),
          pipelineName: pm[3].trim().replace(/,\s*$/, '')
        });
      }
      
      if (pipelines.length > 0) {
        monthlySchedules.set(days, pipelines);
      }
    }
    
    if (mainPipelines.length > 0) {
      schedules.push({
        label: `Cron ${timeOfDay} PE - Diario`,
        timeOfDay,
        frequencyType: 'daily',
        targets: mainPipelines
      });
    }
    
    weeklySchedules.forEach((pipelines, days) => {
      schedules.push({
        label: `Cron ${timeOfDay} PE - Semanal (${days})`,
        timeOfDay,
        frequencyType: 'weekly',
        daysOfWeek: days,
        targets: pipelines
      });
    });
    
    monthlySchedules.forEach((pipelines, days) => {
      schedules.push({
        label: `Cron ${timeOfDay} PE - Mensual (${days})`,
        timeOfDay,
        frequencyType: 'monthly',
        daysOfMonth: days,
        targets: pipelines
      });
    });
  }
  
  return schedules;
}

export function parseSchedulerFileFromPath(filePath: string): ParsedSchedule[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSchedulerFile(content);
}
