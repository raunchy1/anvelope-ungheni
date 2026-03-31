'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Download, Printer, ArrowLeft, Package, Wrench, Hotel, DollarSign, Users, AlertTriangle, RefreshCw, FileText, Info } from 'lucide-react';
import Link from 'next/link';
import { generateMonthlyPDF } from '@/lib/reports/pdf-generator';

interface RaportData {
  success: boolean;
  perioada: { an: number; luna: number; luna_nume: string; zile_luna: number; zile_lucratoare: number };
  kpi: {
    venit_total: number; profit_total: number; stoc_bucati: number; stoc_venit: number; stoc_profit: number;
    servicii_fise: number; servicii_total: number; servicii_vulcanizare: number; servicii_ac: number;
    servicii_frana: number; servicii_jante: number; hotel_active: number; hotel_ridicate?: number; hotel_venit?: number;
  };
  vanzari: Array<{ id: number; data: string; brand: string; dimensiune: string; cantitate: number; pret_vanzare: number; profit_total: number }>;
  servicii: { lista: any[]; total_vulcanizare: number; total_ac: number; total_frana: number; total_jante: number };
  zilnic: Array<{ data: string; vanzari: number; profit: number; fise: number; total: number }>;
  top: { branduri: Array<[string, number]>; dimensiuni: Array<[string, number]>; mecanici: Array<{ nume: string; fise: number; venit: number }> };
  comparativ: { venit: any; profit: any };
  filters: { mecanici: string[] };
}

export default function RaportLunarPage() {
  const [data, setData] = useState<RaportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [an, setAn] = useState(new Date().getFullYear());
  const [luna, setLuna] = useState(new Date().getMonth() + 1);
  const [mecanic, setMecanic] = useState('');
  const [isPDFGenerating, setIsPDFGenerating] = useState(false);

  const luni = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  const ani = useMemo(() => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i), []);

  useEffect(() => {
    fetch(`/api/raport/lunar?an=${an}&luna=${luna}${mecanic ? `&mecanic=${mecanic}` : ''}`)
      .then(r => r.json())
      .then(r => { if (r.success) setData(r); })
      .finally(() => setLoading(false));
  }, [an, luna, mecanic]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-500 border-t-transparent" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      Nu există date
    </div>
  );

  const { kpi, perioada, comparativ, top, zilnic } = data;
  const hasVanzari = data.vanzari.length > 0;
  const hasServicii = data.servicii.lista.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-red-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 no-print">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Raport Lunar</h1>
                <p className="text-orange-100 text-sm">{perioada.luna_nume} {perioada.an}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button 
                onClick={() => { setIsPDFGenerating(true); generateMonthlyPDF(data, setIsPDFGenerating); }}
                disabled={isPDFGenerating}
                className="flex items-center gap-2 px-3 py-2 bg-white text-orange-600 rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {isPDFGenerating ? '...' : <FileText className="w-4 h-4" />} PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-4 no-print">
            <select value={luna} onChange={(e) => setLuna(Number(e.target.value))} className="bg-white/10 rounded px-3 py-1.5 text-sm">
              {luni.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}
            </select>
            <select value={an} onChange={(e) => setAn(Number(e.target.value))} className="bg-white/10 rounded px-3 py-1.5 text-sm">
              {ani.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {data.filters.mecanici.length > 0 && (
              <select value={mecanic} onChange={(e) => setMecanic(e.target.value)} className="bg-white/10 rounded px-3 py-1.5 text-sm">
                <option value="">Toți mecanicii</option>
                {data.filters.mecanici.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        
        {/* KPI Cards - Simplificat */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI value={`${kpi.venit_total.toLocaleString('ro-MD')} MDL`} label="Venit Total" trend={comparativ.venit} icon={<DollarSign />} color="bg-green-600" />
          <KPI value={`${kpi.profit_total.toLocaleString('ro-MD')} MDL`} label="Profit Total" trend={comparativ.profit} icon={<TrendingUp />} color="bg-orange-600" />
          <KPI value={kpi.stoc_bucati.toString()} label="Bucăți Vândute" icon={<Package />} color="bg-blue-600" />
          <KPI value={kpi.servicii_fise.toString()} label="Fișe Service" icon={<Wrench />} color="bg-purple-600" />
        </section>

        {/* Secțiunea Vânzări */}
        {hasVanzari && (
          <Section title="Vânzări Anvelope din Stoc" icon={<Package className="w-5 h-5" />}>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatBox label="Venit Stoc" value={`${kpi.stoc_venit.toLocaleString('ro-MD')} MDL`} />
              <StatBox label="Profit Stoc" value={`${kpi.stoc_profit.toLocaleString('ro-MD')} MDL`} color="text-green-400" />
              <StatBox label="Bucăți" value={kpi.stoc_bucati} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafic Venit pe Zile */}
              <div className="bg-slate-900 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Venit pe Zile</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={zilnic}>
                    <defs>
                      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="data" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} formatter={(v: any) => `${v?.toLocaleString('ro-MD')} MDL`} />
                    <Area type="monotone" dataKey="total" stroke="#f97316" fill="url(#v)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Top Branduri */}
              <div className="bg-slate-900 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Top Branduri</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={top.branduri.slice(0, 5).map(([n, v]) => ({ n, v }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="n" type="category" width={100} stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                    <Bar dataKey="v" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabel Vânzări */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Produs</th>
                    <th className="text-center p-3 font-medium">Cant.</th>
                    <th className="text-right p-3 font-medium">Preț</th>
                    <th className="text-right p-3 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vanzari.slice(0, 15).map(v => (
                    <tr key={v.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                      <td className="p-3 text-slate-400">{new Date(v.data).toLocaleDateString('ro-MD')}</td>
                      <td className="p-3">
                        <div className="font-medium">{v.brand}</div>
                        <div className="text-xs text-slate-500">{v.dimensiune}</div>
                      </td>
                      <td className="p-3 text-center">{v.cantitate}</td>
                      <td className="p-3 text-right">{(v.pret_vanzare * v.cantitate).toLocaleString('ro-MD')} MDL</td>
                      <td className="p-3 text-right text-green-400">+{v.profit_total.toLocaleString('ro-MD')} MDL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.vanzari.length > 15 && (
                <p className="text-center text-slate-500 text-sm py-3">... și încă {data.vanzari.length - 15} vânzări</p>
              )}
            </div>
          </Section>
        )}

        {/* Secțiunea Servicii */}
        {hasServicii && (
          <Section title="Servicii și Fișe" icon={<Wrench className="w-5 h-5" />}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatBox label="Vulcanizare" value={`${data.servicii.total_vulcanizare.toLocaleString('ro-MD')} MDL`} />
              <StatBox label="Aer Condiționat" value={`${data.servicii.total_ac.toLocaleString('ro-MD')} MDL`} />
              <StatBox label="Frână" value={`${data.servicii.total_frana.toLocaleString('ro-MD')} MDL`} />
              <StatBox label="Jante" value={`${data.servicii.total_jante.toLocaleString('ro-MD')} MDL`} />
              <StatBox label="TOTAL" value={`${kpi.servicii_total.toLocaleString('ro-MD')} MDL`} color="text-orange-400 font-bold" />
            </div>

            {/* Top Mecanici */}
            {top.mecanici.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top.mecanici.slice(0, 6).map((m, i) => (
                  <div key={m.nume} className="bg-slate-900 rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i < 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{m.nume}</div>
                      <div className="text-xs text-slate-500">{m.fise} fișe</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{m.venit.toLocaleString('ro-MD')} MDL</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Secțiunea Hotel */}
        {kpi.hotel_active > 0 && (
          <Section title="Hotel Anvelope" icon={<Hotel className="w-5 h-5" />}>
            <div className="grid grid-cols-3 gap-4">
              <StatBox label="Seturi Active" value={kpi.hotel_active} />
              <StatBox label="Seturi Ridicate" value={kpi.hotel_ridicate || 0} />
              <StatBox label="Venit Hotel" value={`${kpi.hotel_venit?.toLocaleString('ro-MD') || 0} MDL`} />
            </div>
          </Section>
        )}

        {/* Footer */}
        <footer className="text-center text-slate-600 text-sm pt-8 border-t border-slate-900">
          <p>ANVELOPE UNGHENI SRL • CF 102060004938</p>
          <p className="mt-1">Generat la {new Date().toLocaleString('ro-MD')}</p>
        </footer>
      </main>
    </div>
  );
}

// Componente helper simplificate
function KPI({ value, label, trend, icon, color }: { value: string; label: string; trend?: any; icon: React.ReactNode; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 bg-white/20 rounded">{icon}</div>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend.trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
            {trend.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.procent}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color || 'text-white'}`}>{value}</div>
    </div>
  );
}
