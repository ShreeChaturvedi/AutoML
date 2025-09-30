/**
 * DataStats - Display dataset statistics
 *
 * Shows:
 * - Total rows
 * - Column count
 * - Dataset size (if available)
 * - Data quality indicators
 *
 * TODO: Add more detailed statistics when backend integration is complete
 * TODO: Add column-level statistics (data types, missing values, etc.)
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DataPreview } from '@/types/file';
import { BarChart3, Table as TableIcon, Columns } from 'lucide-react';

interface DataStatsProps {
  preview: DataPreview;
}

export function DataStats({ preview }: DataStatsProps) {
  const stats = [
    {
      label: 'Total Rows',
      value: preview.totalRows.toLocaleString(),
      icon: BarChart3,
      color: 'text-blue-500'
    },
    {
      label: 'Columns',
      value: preview.headers.length.toLocaleString(),
      icon: Columns,
      color: 'text-green-500'
    },
    {
      label: 'Preview Rows',
      value: preview.previewRows.toLocaleString(),
      icon: TableIcon,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Dataset Overview</h3>

      <div className="grid grid-cols-1 gap-2">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <IconComponent className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Column Names */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-foreground">Columns</h4>
        <div className="flex flex-wrap gap-1">
          {preview.headers.map((header) => (
            <Badge key={header} variant="secondary" className="text-xs">
              {header}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}