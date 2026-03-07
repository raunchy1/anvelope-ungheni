'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/shared/AppShell';
import {
  FileText, Package, Users, TrendingUp,
  PlusCircle, Search, ArrowRight, ArrowUpRight, Activity, AlertTriangle, Zap
} from 'lucide-react';

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

export default function Home() {
  const [stats, setStats] = useState({
    fise: 0,
    produse: 0,
    clienti: 0,
    lowStock: 0,
    profitStoc: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [fiseRes, stocRes, cliRes] = await Promise.all([
          fetch('/api/fise'),
          fetch('/api/stocuri'),
          fetch('/api/clienti')
        ]);
        const [fiseData, stocData, cliData] = await Promise.all([
          fiseRes.json(),
          stocRes.json(),
          cliRes.json()
        ]);

        const stocDataArray = Array.isArray(stocData) ? stocData : [];
        const lowStockCount = stocDataArray.filter((a: any) => a.cantitate <= (a.stoc_minim || 2)).length;
        const totalProfit = stocDataArray.reduce((acc: number, a: any) => acc + ((a.pret_vanzare - a.pret_achizitie) * a.cantitate), 0);

        setStats({
          fise: Array.isArray(fiseData) ? fiseData.length : 0,
          produse: stocDataArray.reduce((acc: number, a: any) => acc + a.cantitate, 0),
          clienti: Array.isArray(cliData) ? cliData.length : 0,
          lowStock: lowStockCount,
          profitStoc: totalProfit
        });
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

        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Zap size={15} strokeWidth={2} color="var(--accent)" />
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Acțiuni Rapide
          </h2>
          <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 4 }} />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      </div>
    </AppShell>
  );
}
