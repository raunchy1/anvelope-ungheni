'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/shared/AppShell';
import {
  FileText, Package, Users, TrendingUp,
  PlusCircle, Search, ArrowRight, Activity
} from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({
    fise: 0,
    produse: 0,
    clienti: 0
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

        setStats({
          fise: Array.isArray(fiseData) ? fiseData.length : 0,
          produse: Array.isArray(stocData) ? stocData.length : 0,
          clienti: Array.isArray(cliData) ? cliData.length : 0
        });
      } catch (e) {
        console.error("Error fetching dashboard stats", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ icon: Icon, label, value, accent }: {
    icon: React.ElementType; label: string; value: string | number; accent: string;
  }) => (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: accent + '14',
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
          {isLoading ? <span style={{ color: 'var(--text-dim)', fontSize: 18 }}>—</span> : value}
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ href, icon: Icon, title, desc, accent }: {
    href: string; icon: React.ElementType; title: string; desc: string; accent: string;
  }) => (
    <Link href={href} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: 22,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: accent + '14',
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 5, letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 13, color: accent, fontWeight: 500,
        opacity: 0.85,
      }}>
        Accesează <ArrowRight size={13} strokeWidth={2} />
      </div>
    </Link>
  );

  return (
    <AppShell>
      <div className="fade-in" style={{ maxWidth: 960, paddingBottom: 40 }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 5, letterSpacing: '-0.02em' }}>
            Bun venit
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            Panou de administrare · Anvelope Ungheni
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
          marginBottom: 40,
        }}>
          <StatCard icon={FileText} label="Fișe Service" value={stats.fise} accent="#3b82f6" />
          <StatCard icon={Package} label="Produse în Stoc" value={stats.produse} accent="#22c55e" />
          <StatCard icon={Users} label="Clienți" value={stats.clienti} accent="#a78bfa" />
          <StatCard icon={TrendingUp} label="Activitate" value="Activ" accent="#f59e0b" />
        </div>

        {/* Section title */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 16,
        }}>
          <Activity size={16} strokeWidth={1.75} color="var(--text-dim)" />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Acțiuni Rapide
          </h2>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
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
