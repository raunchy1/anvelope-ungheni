'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    User, Phone, Car, Calendar, Wrench, ArrowLeft, Loader2,
    FileText, DollarSign, TrendingUp, Package, Eye, Printer,
    ChevronRight, Hash
} from 'lucide-react';
import { generateInvoice } from '@/utils/generate-invoice';

interface Vehicle {
    id: string;
    numar_masina: string;
    marca_model: string;
    dimensiune_anvelope: string;
    last_km: number | null;
    created_at: string;
}

interface FisaRecord {
    id: string;
    numar_fisa: string;
    numar_masina: string;
    marca_model: string;
    km_bord: number | null;
    dimensiune_anvelope: string;
    data_intrarii: string;
    mecanic: string;
    servicii: any;
    hotel_anvelope: any;
    observatii: string;
}

interface ClientProfile {
    id: string;
    nume: string;
    telefon: string;
    created_at: string;
    masini: Vehicle[];
    fise: FisaRecord[];
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

    useEffect(() => {
        fetchClientData();
    }, [id]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const [clientRes, fiseRes] = await Promise.all([
                fetch(`/api/clienti/${id}`),
                fetch(`/api/clienti/${id}/fise`)
            ]);

            if (!clientRes.ok) throw new Error('Client not found');

            const clientData = await clientRes.json();
            const fiseData = await fiseRes.json();

            setClient({
                ...clientData,
                fise: fiseData
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const stats = client?.fise ? {
        totalVizite: client.fise.length,
        totalCheltuit: client.fise.reduce((sum, f) => {
            const servicesTotal = f.servicii?.vulcanizare?.pret_total || 0;
            return sum + servicesTotal;
        }, 0),
        totalProfit: client.fise.reduce((sum, f) => {
            const stockProfit = f.servicii?.vulcanizare?.stoc_vanzare?.reduce((s: number, item: any) => 
                s + ((item.pret_unitate - (item.pret_achizitie || 0)) * item.cantitate), 0) || 0;
            return sum + stockProfit;
        }, 0),
        totalAnvelopeVandute: client.fise.reduce((sum, f) => {
            const bucati = f.servicii?.vulcanizare?.stoc_vanzare?.reduce((s: number, item: any) => s + item.cantitate, 0) || 0;
            return sum + bucati;
        }, 0)
    } : null;

    // Get last visit date for each vehicle
    const getVehicleLastVisit = (numarMasina: string) => {
        const vehicleFise = client?.fise.filter(f => f.numar_masina === numarMasina) || [];
        if (vehicleFise.length === 0) return null;
        return vehicleFise.sort((a, b) => 
            new Date(b.data_intrarii).getTime() - new Date(a.data_intrarii).getTime()
        )[0].data_intrarii;
    };

    // Filter fise by selected vehicle
    const filteredFise = selectedVehicle
        ? client?.fise.filter(f => f.numar_masina === selectedVehicle) || []
        : client?.fise || [];

    // Group fise by vehicle for display
    const fiseByVehicle = filteredFise.reduce((acc, fisa) => {
        const key = `${fisa.numar_masina} - ${fisa.marca_model}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(fisa);
        return acc;
    }, {} as Record<string, FisaRecord[]>);

    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} />
                <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>Se încarcă profilul clientului...</p>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <h2 style={{ color: 'var(--red)' }}>Eroare</h2>
                <p>{error || 'Clientul nu a fost găsit'}</p>
                <Link href="/clienti" className="glass-btn glass-btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
                    Înapoi la Clienți
                </Link>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Link href="/clienti" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                    <ArrowLeft size={14} /> Înapoi la Clienți
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, fontWeight: 700, color: 'white'
                    }}>
                        {client.nume.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{client.nume}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 14 }}>
                                <Phone size={14} /> {client.telefon || '—'}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                Client din {new Date(client.created_at).toLocaleDateString('ro-MD')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Calendar size={24} color="var(--blue)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Vizite</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{stats.totalVizite}</div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <DollarSign size={24} color="var(--green)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cheltuit</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{stats.totalCheltuit.toLocaleString('ro-MD')} MDL</div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <TrendingUp size={24} color="#f59e0b" />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit Generat</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>+{stats.totalProfit.toLocaleString('ro-MD')} MDL</div>
                        </div>
                    </div>

                    <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Package size={24} color="#a855f7" />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anvelope Cumpărate</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#a855f7' }}>{stats.totalAnvelopeVandute} buc</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicles Section */}
            <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Car size={20} color="var(--blue)" />
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Vehicule ({client.masini.length})</h2>
                    </div>
                    {selectedVehicle && (
                        <button 
                            onClick={() => setSelectedVehicle(null)}
                            className="glass-btn"
                            style={{ fontSize: 12 }}
                        >
                            Arată toate mașinile
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {client.masini.map((car) => {
                        const lastVisit = getVehicleLastVisit(car.numar_masina);
                        const isSelected = selectedVehicle === car.numar_masina;
                        const fiseCount = client.fise.filter(f => f.numar_masina === car.numar_masina).length;

                        return (
                            <div 
                                key={car.id}
                                onClick={() => setSelectedVehicle(isSelected ? null : car.numar_masina)}
                                style={{
                                    padding: 16, borderRadius: 12,
                                    background: isSelected ? 'rgba(59,130,246,0.15)' : 'var(--surface-2)',
                                    border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: isSelected ? 'var(--blue)' : 'rgba(59,130,246,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Car size={20} color={isSelected ? 'white' : 'var(--blue)'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{car.numar_masina}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{car.marca_model || '—'}</div>
                                    </div>
                                    <ChevronRight size={16} color="var(--text-dim)" style={{ opacity: isSelected ? 1 : 0.5 }} />
                                </div>
                                
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                    {car.dimensiune_anvelope && (
                                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{car.dimensiune_anvelope}</span>
                                    )}
                                    {car.last_km && (
                                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{car.last_km.toLocaleString()} km</span>
                                    )}
                                    {fiseCount > 0 && (
                                        <span className="badge" style={{ fontSize: 10, background: 'rgba(34,197,94,0.15)', color: 'var(--green)' }}>
                                            {fiseCount} fiș{fiseCount === 1 ? 'ă' : 'e'}
                                        </span>
                                    )}
                                </div>
                                
                                {lastVisit && (
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={11} /> Ultima vizită: {new Date(lastVisit).toLocaleDateString('ro-MD')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Service History */}
            <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Wrench size={20} color="var(--blue)" />
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                            Istoric Service ({filteredFise.length} fiș{filteredFise.length === 1 ? 'ă' : 'e'})
                        </h2>
                    </div>
                    <Link 
                        href={`/fise/new?client_id=${client.id}`}
                        className="glass-btn glass-btn-primary"
                        style={{ textDecoration: 'none', fontSize: 13 }}
                    >
                        + Fișă Nouă
                    </Link>
                </div>

                {filteredFise.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                        <FileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <p>Nicio fișă service pentru {selectedVehicle ? 'acest vehicul' : 'acest client'}.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {Object.entries(fiseByVehicle).map(([vehicleKey, fiseList]) => (
                            <div key={vehicleKey}>
                                <div style={{ 
                                    fontSize: 12, color: 'var(--text-dim)', 
                                    marginBottom: 8, paddingLeft: 8,
                                    display: 'flex', alignItems: 'center', gap: 6 
                                }}>
                                    <Car size={12} /> {vehicleKey}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {fiseList
                                        .sort((a, b) => new Date(b.data_intrarii).getTime() - new Date(a.data_intrarii).getTime())
                                        .map((fisa) => {
                                            const hasStockSales = fisa.servicii?.vulcanizare?.stoc_vanzare?.length > 0;
                                            const stockTotal = hasStockSales 
                                                ? fisa.servicii.vulcanizare.stoc_vanzare.reduce((s: number, i: any) => s + (i.pret_unitate * i.cantitate), 0)
                                                : 0;
                                            const servicesTotal = fisa.servicii?.vulcanizare?.pret_total || 0;

                                            return (
                                                <div 
                                                    key={fisa.id}
                                                    className="glass"
                                                    style={{ 
                                                        padding: 16, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: 16,
                                                        flexWrap: 'wrap'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
                                                        <div style={{
                                                            width: 44, height: 44, borderRadius: 10,
                                                            background: 'var(--surface-2)',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>
                                                                {new Date(fisa.data_intrarii).toLocaleDateString('ro-MD', { month: 'short' }).toUpperCase()}
                                                            </span>
                                                            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>
                                                                {new Date(fisa.data_intrarii).getDate()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>Fișă #{fisa.numar_fisa}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{fisa.data_intrarii}</div>
                                                        </div>
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 200 }}>
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                                                            {fisa.servicii?.vulcanizare?.service_complet_r && (
                                                                <span className="badge badge-blue" style={{ fontSize: 10 }}>Service R</span>
                                                            )}
                                                            {fisa.servicii?.aer_conditionat?.serviciu_ac && (
                                                                <span className="badge badge-blue" style={{ fontSize: 10 }}>A/C</span>
                                                            )}
                                                            {fisa.servicii?.frana?.schimbat_placute && (
                                                                <span className="badge" style={{ fontSize: 10, background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}>Frână</span>
                                                            )}
                                                            {fisa.hotel_anvelope?.activ && (
                                                                <span className="badge" style={{ fontSize: 10, background: 'rgba(34,197,94,0.15)', color: 'var(--green)' }}>Hotel</span>
                                                            )}
                                                            {hasStockSales && (
                                                                <span className="badge" style={{ fontSize: 10, background: 'rgba(251,191,36,0.2)', color: '#d97706' }}>
                                                                    {fisa.servicii.vulcanizare.stoc_vanzare.reduce((s: number, i: any) => s + i.cantitate, 0)} anvelope
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                                            Mecanic: {fisa.mecanic || '—'}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'right', minWidth: 120 }}>
                                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
                                                            {(servicesTotal + stockTotal).toLocaleString('ro-MD')} MDL
                                                        </div>
                                                        {hasStockSales && (
                                                            <div style={{ fontSize: 11, color: '#d97706' }}>
                                                                +{stockTotal.toLocaleString('ro-MD')} MDL anvelope
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <Link 
                                                            href={`/fise/${fisa.id}`}
                                                            className="glass-btn"
                                                            style={{ textDecoration: 'none', padding: '8px 12px' }}
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                        <button 
                                                            onClick={() => fetch(`/api/fise/${fisa.id}`).then(r => r.json()).then(data => generateInvoice(data))}
                                                            className="glass-btn"
                                                            style={{ padding: '8px 12px' }}
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
