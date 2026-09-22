"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface HistoryData {
  measured_at: string;
  water_level: number;
  warning_level: number | null;
  danger_level: number | null;
}

export function RiverGaugeChart({ stationId }: { stationId: string }) {
  const [data, setData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/history/${stationId}`);
        if (!res.ok) throw new Error("Failed to fetch history");
        const json = await res.json();
        if (Array.isArray(json)) {
          // Format dates for the chart
          const formatted = json.map((d: any) => ({
            ...d,
            formattedTime: new Date(d.measured_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setData(formatted);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [stationId]);

  if (loading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-border/80 bg-surface-2/60">
        <span className="text-sm font-semibold text-muted animate-pulse">Loading telemetry history...</span>
      </div>
    );
  }

  if (error || data.length === 0) {
    return null; // Fail gracefully, don't show chart if no data
  }

  // Get max warning/danger level to set Y axis domain properly
  const maxWaterLevel = Math.max(...data.map(d => d.water_level));
  const maxDanger = Math.max(...data.map(d => d.danger_level || 0));
  const yDomainMax = Math.max(maxWaterLevel * 1.1, maxDanger * 1.1, 1);

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-border/80 bg-surface-2/60 p-4">
      <div className="flex items-center justify-between text-xs mb-4">
        <span className="font-bold uppercase tracking-wider text-muted">24-Hour Hydrological Trend</span>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="formattedTime" 
              stroke="#888888" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="#888888" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `${value}m`}
              domain={[0, yDomainMax]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C1C', borderColor: '#333', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#888', marginBottom: '4px' }}
            />
            
            {/* Warning Line */}
            {data[0]?.warning_level && (
              <ReferenceLine 
                y={data[0].warning_level} 
                stroke="#F59E0B" 
                strokeDasharray="3 3" 
                label={{ position: 'insideTopLeft', value: 'Warn', fill: '#F59E0B', fontSize: 10 }} 
              />
            )}
            
            {/* Danger Line */}
            {data[0]?.danger_level && (
              <ReferenceLine 
                y={data[0].danger_level} 
                stroke="#EF4444" 
                strokeDasharray="3 3" 
                label={{ position: 'insideTopLeft', value: 'Danger', fill: '#EF4444', fontSize: 10 }} 
              />
            )}

            <Line 
              type="monotone" 
              dataKey="water_level" 
              name="Water Level (m)"
              stroke="#38bdf8" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
