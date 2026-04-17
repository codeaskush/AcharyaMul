import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsApi } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MapPin, Briefcase, Baby, Heart, Globe, BarChart3 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          {sub && <Badge variant="outline" className="ml-auto text-[10px]">{sub}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({ data, color = 'bg-primary', maxItems = 10 }) {
  if (!data || data.length === 0) return <p className="text-xs text-muted-foreground italic py-4">No data</p>;
  const max = Math.max(...data.map(d => d.count));
  const items = data.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 shrink-0 truncate text-right">{item.name}</span>
          <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-xs font-semibold w-6 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ male, female, other, total }) {
  const mPct = total > 0 ? (male / total) * 100 : 0;
  const fPct = total > 0 ? (female / total) * 100 : 0;
  const oPct = total > 0 ? (other / total) * 100 : 0;

  // SVG donut
  const radius = 60;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { pct: mPct, color: '#4a90d9', label: 'Male', count: male },
    { pct: fPct, color: '#e91e8c', label: 'Female', count: female },
    { pct: oPct, color: '#9b59b6', label: 'Other', count: other },
  ].filter(s => s.count > 0);

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const dashLen = (seg.pct / 100) * circumference;
          const dashOffset = -offset;
          offset += dashLen;
          return (
            <circle
              key={i}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          );
        })}
        <text x="80" y="76" textAnchor="middle" className="text-2xl font-bold" fill="currentColor">{total}</text>
        <text x="80" y="94" textAnchor="middle" className="text-[10px]" fill="#9ca3af">members</text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-sm">{seg.label}</span>
            <span className="text-sm font-semibold ml-auto">{seg.count}</span>
            <span className="text-xs text-muted-foreground">({seg.pct.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PillChart({ data, colors }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const defaultColors = ['#4a90d9', '#e91e8c', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-8 rounded-full overflow-hidden flex">
        {data.map((item, i) => (
          <div
            key={i}
            className="h-full transition-all duration-500"
            style={{
              width: `${(item.count / total) * 100}%`,
              backgroundColor: (colors || defaultColors)[i % (colors || defaultColors).length],
              minWidth: item.count > 0 ? '2px' : 0,
            }}
            title={`${item.range || item.name}: ${item.count}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (colors || defaultColors)[i % (colors || defaultColors).length] }} />
            <span className="text-[10px] text-muted-foreground">{item.range || item.name}: {item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.get()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
        <p>No data available for analytics.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.analytics')}</h1>
        <p className="text-sm text-muted-foreground mt-1">Family insights and statistics</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Members" value={data.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Heart} label="Alive" value={data.alive} sub={`${((data.alive / data.total) * 100).toFixed(0)}%`} color="bg-green-100 text-green-600" />
        <StatCard icon={Users} label="Deceased" value={data.deceased} color="bg-stone-100 text-stone-600" />
        <StatCard icon={Baby} label="Generations" value={data.generations.length} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Gender + Age row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart male={data.gender.male} female={data.gender.female} other={data.gender.other} total={data.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Age Distribution</CardTitle>
            <CardDescription>Living members only</CardDescription>
          </CardHeader>
          <CardContent>
            <PillChart data={data.age_distribution} colors={['#c4e0f9', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']} />
          </CardContent>
        </Card>
      </div>

      {/* Location row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Where Members Live</CardTitle>
            <CardDescription>Current residence by country</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={data.residence_by_country} color="bg-cyan-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Residence by City</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.residence_by_city} color="bg-emerald-500" />
          </CardContent>
        </Card>
      </div>

      {/* Birth place + Occupation row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Place of Birth</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.birth_places} color="bg-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Occupations</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.occupations} color="bg-violet-500" />
          </CardContent>
        </Card>
      </div>

      {/* Generation breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Baby className="h-4 w-4" /> Members per Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {data.generations.map(g => {
              const maxCount = Math.max(...data.generations.map(x => x.count));
              const heightPct = (g.count / maxCount) * 100;
              return (
                <div key={g.generation} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold">{g.count}</span>
                  <div className="w-full rounded-t-lg bg-primary/80 transition-all duration-500" style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                  <span className="text-[10px] text-muted-foreground">Gen {g.generation}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
