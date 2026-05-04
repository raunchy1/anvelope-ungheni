'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/shared/AppShell';
import {
  FileText, Package, Users, TrendingUp,
  PlusCircle, Search, ArrowRight, ArrowUpRight, Activity, AlertTriangle, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';



function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return count;
}

function StatCard({ icon: Icon, label, value, accent, suffix = '' }: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  suffix?: string;
}) {
  const animated = useCountUp(value);

  return (
    <div className="stat-card-new" style={{ '--accent-color': accent } as React.CSSProperties}>
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: accent + '18',
        filter: 'blur(16px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: accent + '18',
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <ArrowUpRight size={14} strokeWidth={2} style={{ color: accent, opacity: 0.5, marginTop: 4 }} />
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6, color: 'var(--text)' }}>
        {animated}{suffix}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, borderRadius: '0 0 var(--radius) var(--radius)',
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        opacity: 0.4,
      }} />
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, desc, accent }: {
  href: string; icon: React.ElementType; title: string; desc: string; accent: string;
}) {
  return (
    <Link href={href} className="quick-action-card" style={{ '--qa-accent': accent } as React.CSSProperties}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: accent + '18',
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'transform 0.2s',
      }}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div className="qa-link-label" style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: accent, fontWeight: 600,
        opacity: 0.9,
        flexShrink: 0,
      }}>
        Accesează <ArrowRight size={13} strokeWidth={2.5} />
      </div>
    </Link>
  );
}

const SERVICE_CATEGORIES = [
  { name: 'Vulcanizare', key: 'vulcanizare', color: '#3b82f6' },
  { name: 'Jante', key: 'vopsit_jante', color: '#a78bfa' },
  { name: 'Aer Cond.', key: 'aer_conditionat', color: '#22c55e' },
  { name: 'Frână', key: 'frana', color: '#f59e0b' },
  { name: 'Hotel', key: 'hotel_anvelope', color: '#f97316' },
];

// FIX M6: O(n) algorithm with Map-based grouping instead of O(n²)
function buildChartData(fiseData: any[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('ro-RO', { month: 'short' }),
      count: 0,
    };
  });

  // O(n) single pass for month counts
  fiseData.forEach((f: any) => {
    const dateStr = f.data_intrarii || f.created_at;
    if (!dateStr) return;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find(mo => mo.key === key);
    if (m) m.count++;
  });

  // O(n) single pass for service categories using Map
  const categoryCounts = new Map<string, number>();
  SERVICE_CATEGORIES.forEach(cat => categoryCounts.set(cat.key, 0));

  fiseData.forEach((f: any) => {
    SERVICE_CATEGORIES.forEach(cat => {
      if (cat.key === 'hotel_anvelope') {
        if (f.hotel_anvelope?.activ) {
          categoryCounts.set(cat.key, (categoryCounts.get(cat.key) || 0) + 1);
        }
      } else {
        const s = f.servicii?.[cat.key];
        if (s && Object.values(s).some(v => Boolean(v))) {
          categoryCounts.set(cat.key, (categoryCounts.get(cat.key) || 0) + 1);
        }
      }
    });
  });

  const serviceCounts = SERVICE_CATEGORIES.map(cat => ({
    name: cat.name,
    color: cat.color,
    count: categoryCounts.get(cat.key) || 0,
  }));

  return { months, serviceCounts };
}

export default function Home() {
  const [stats, setStats] = useState({
    fise: 0,
    produse: 0,
    clienti: 0,
    lowStock: 0,
    profitStoc: 0
  });
  const [chartData, setChartData] = useState<{
    months: { key: string; label: string; count: number }[];
    serviceCounts: { name: string; color: string; count: number }[];
  }>({ months: [], serviceCounts: [] });
  const [isLoading, setIsLoading] = useState(true);

  // FIX M5: Single fetch for all data with pagination
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch ALL data for accurate statistics
        const [fiseRes, stocRes, cliRes] = await Promise.all([
          fetch('/api/fise?all=true'),
          fetch('/api/stocuri?limit=10000'),
          fetch('/api/clienti?all=true')
        ]);

        const [fiseDataRaw, stocData, cliDataRaw] = await Promise.all([
          fiseRes.json(),
          stocRes.json(),
          cliRes.json()
        ]);

        // Handle paginated response
        const fiseData = fiseDataRaw.data || fiseDataRaw || [];
        const cliData = cliDataRaw.data || cliDataRaw || [];

        const stocDataArray = Array.isArray(stocData) ? stocData : [];

        // FIX C1: Safe Math.max with empty array guard
        const maxNum = fiseData.length > 0
          ? Math.max(...fiseData.map((f: any) => parseInt(f.numar_fisa) || 0), 0)
          : 0;

        // FIX m14: Safe arithmetic with null coalescing
        const lowStockCount = stocDataArray.filter((a: any) =>
          (a.cantitate ?? 0) <= (a.stoc_minim ?? 2)
        ).length;

        const totalProfit = stocDataArray.reduce((acc: number, a: any) =>
          acc + ((((a.pret_vanzare ?? 0) - (a.pret_achizitie ?? 0)) * (a.cantitate ?? 0))), 0
        );

        setStats({
          fise: fiseData.length,
          produse: stocDataArray.reduce((acc: number, a: any) => acc + (a.cantitate ?? 0), 0),
          clienti: Array.isArray(cliData) ? cliData.length : 0,
          lowStock: lowStockCount,
          profitStoc: totalProfit
        });

        setChartData(buildChartData(fiseData));

      } catch (e) {
        console.error('Error fetching dashboard stats', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);



  return (
    <AppShell>
      <div className="fade-in" style={{ maxWidth: 980, paddingBottom: 48 }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 8px var(--green)',
              animation: 'pulse-dot 2s infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Sistem Activ</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.03em' }}>
            Bun venit
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            Panou de administrare · Anvelope Ungheni
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 40
        }}>
          <StatCard icon={FileText} label="Fișe Service" value={stats.fise} accent="#3b82f6" />
          <StatCard icon={Package} label="Total Anvelope" value={stats.produse} accent="#22c55e" />
          <StatCard
            icon={AlertTriangle}
            label="Stoc Scăzut"
            value={stats.lowStock}
            accent={stats.lowStock > 0 ? "#f59e0b" : "#22c55e"}
          />
          <StatCard icon={TrendingUp} label="Profit Estimat" value={stats.profitStoc} accent="#22c55e" suffix=" MDL" />
        </div>



        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
          <QuickAction
            href="/fise/new"
            icon={PlusCircle}
            title="Fișă Nouă"
            desc="Creează o fișă de service nouă pentru un client."
            accent="#3b82f6"
          />
          <QuickAction
            href="/fise"
            icon={FileText}
            title="Toate Fișele"
            desc="Vezi și gestionează istoricul fișelor de service."
            accent="#3b82f6"
          />
          <QuickAction
            href="/stocuri"
            icon={Package}
            title="Gestiune Stocuri"
            desc="Verifică stocurile disponibile și adaugă mișcări."
            accent="#22c55e"
          />
          <QuickAction
            href="/clienti"
            icon={Search}
            title="Bază de Clienți"
            desc="Caută informații despre clienți și istoricul mașinilor."
            accent="#a78bfa"
          />
        </div>

        {/* Section title — Activitate & Statistici */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={15} strokeWidth={2} color="var(--accent)" />
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Activitate &amp; Statistici
          </h2>
          <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
        </div>




        {/* Charts */}
        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Monthly activity chart */}
            <div className="glass" style={{ padding: '20px 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fișe / Lună
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData.months} barCategoryGap="30%">
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-muted)', fontWeight: 600 }}
                    cursor={{ fill: 'var(--surface-3)' }}
                    formatter={(v: any) => [v, 'Fișe']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.months.map((_, i) => (
                      <Cell key={i} fill={i === chartData.months.length - 1 ? '#f97316' : '#3b82f6'} fillOpacity={i === chartData.months.length - 1 ? 1 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Services per category */}
            <div className="glass" style={{ padding: '20px 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Servicii Prestate
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData.serviceCounts} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-muted)', fontWeight: 600 }}
                    cursor={{ fill: 'var(--surface-3)' }}
                    formatter={(v: any) => [v, 'Fișe']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.serviceCounts.map((s, i) => (
                      <Cell key={i} fill={s.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
