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
    // Fetch basic counts for dashboard stats
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

  const QuickAction = ({ href, icon: Icon, title, desc, color }: any) => (
    <Link href={href} className="glass slide-up" style={{
      padding: 24,
      textDecoration: 'none',
      color: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: `rgba(${color}, 0.1)`,
        color: `rgb(${color})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={24} />
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: `rgb(${color})`, fontWeight: 500 }}>
        Accesează <ArrowRight size={14} />
      </div>
    </Link>
  );

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: `rgba(${color}, 0.1)`,
        color: `rgb(${color})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{isLoading ? '...' : value}</div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="fade-in" style={{ paddingBottom: 40 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Salut! 👋</h1>
          <p style={{ color: 'var(--text-dim)' }}>Bine ai venit în panoul de administrare Anvelope Ungheni.</p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 40
        }}>
          <StatCard icon={FileText} label="Fișe Service" value={stats.fise} color="33, 150, 243" />
          <StatCard icon={Package} label="Produse în Stoc" value={stats.produse} color="76, 175, 80" />
          <StatCard icon={Users} label="Clienți" value={stats.clienti} color="156, 39, 176" />
          <StatCard icon={TrendingUp} label="Activitate" value="Activ" color="255, 152, 0" />
        </div>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={20} color="var(--blue)" />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Acțiuni Rapide</h2>
        </div>

        {/* Quick Actions Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20
        }}>
          <QuickAction
            href="/fise/new"
            icon={PlusCircle}
            title="Fișă Nouă"
            desc="Creează o fișă de service nouă pentru un client."
            color="33, 150, 243"
          />
          <QuickAction
            href="/fise"
            icon={FileText}
            title="Toate Fișele"
            desc="Vezi și gestionează istoricul fișelor de service."
            color="33, 150, 243"
          />
          <QuickAction
            href="/stocuri"
            icon={Package}
            title="Gestiune Stocuri"
            desc="Verifică stocurile disponibile și adaugă mișcări."
            color="76, 175, 80"
          />
          <QuickAction
            href="/clienti"
            icon={Search}
            title="Bază de Clienți"
            desc="Caută informații despre clienți și istoricul mașinilor."
            color="156, 39, 176"
          />
        </div>
      </div>
    </AppShell>
  );
}
