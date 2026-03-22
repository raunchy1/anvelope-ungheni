'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, Plus, Minus, MinusCircle, ShoppingCart, Package, TrendingUp, 
    DollarSign, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
    Snowflake, Sun, CloudSun, Wind, X, Trash2
} from 'lucide-react';
import type { Anvelopa } from '@/types';
import Link from 'next/link';

// Season icons and colors
const sezonIcons: Record<string, React.ReactNode> = { 
    'Iarnă': <Snowflake size={16} />, 
    'Vară': <Sun size={16} />, 
    'All-Season': <CloudSun size={16} />, 
    'M+S': <Wind size={16} /> 
};
const sezonColors: Record<string, string> = { 
    'Iarnă': '#60a5fa', 
    'Vară': '#fbbf24', 
    'All-Season': '#34d399', 
    'M+S': '#a78bfa' 
};
const sezonBgColors: Record<string, string> = { 
    'Iarnă': 'rgba(96,165,250,0.1)', 
    'Vară': 'rgba(251,191,36,0.1)', 
    'All-Season': 'rgba(52,211,153,0.1)', 
    'M+S': 'rgba(167,139,250,0.1)' 
};

export default function StocuriIesirePage() {
    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Anvelopa | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);
    const [error, setError] = useState('');

    // ═══════════════════════════════════════════════════════════
    // LOAD DATA
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => { 
                setAnvelope(data); 
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, []);

    // Reload after sale
    const reloadStock = useCallback(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => setAnvelope(data));
    }, []);

    // ═══════════════════════════════════════════════════════════
    // SEARCH RESULTS
    // ═══════════════════════════════════════════════════════════
    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return anvelope.filter(a => 
            a.cantitate > 0 && (
                a.brand.toLowerCase().includes(q) || 
                a.dimensiune.toLowerCase().includes(q) || 
                (a.cod_produs && a.cod_produs.toLowerCase().includes(q))
            )
        ).slice(0, 20); // Limit to 20 results
    }, [query, anvelope]);

    // ═══════════════════════════════════════════════════════════
    // SELECT PRODUCT
    // ═══════════════════════════════════════════════════════════
    const selectProduct = (product: Anvelopa) => {
        setSelectedProduct(product);
        setQuantity(1);
        setError('');
        setQuery(`${product.brand} ${product.dimensiune}`);
    };

    const clearSelection = () => {
        setSelectedProduct(null);
        setQuantity(1);
        setError('');
        setQuery('');
    };

    // ═══════════════════════════════════════════════════════════
    // QUANTITY CONTROLS
    // ═══════════════════════════════════════════════════════════
    const maxQuantity = selectedProduct?.cantitate || 0;
    
    const increaseQty = () => {
        if (quantity < maxQuantity) {
            setQuantity(q => q + 1);
            setError('');
        }
    };

    const decreaseQty = () => {
        if (quantity > 1) {
            setQuantity(q => q - 1);
            setError('');
        }
    };

    const setQty = (val: number) => {
        if (val >= 1 && val <= maxQuantity) {
            setQuantity(val);
            setError('');
        } else if (val > maxQuantity) {
            setQuantity(maxQuantity);
            setError(`Stoc maxim: ${maxQuantity} buc`);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // CALCULATIONS
    // ═══════════════════════════════════════════════════════════
    const calculations = useMemo(() => {
        if (!selectedProduct) return null;
        
        const pretVanzare = selectedProduct.pret_vanzare;
        const pretAchizitie = selectedProduct.pret_achizitie || 0;
        const profitPerBuc = pretVanzare - pretAchizitie;
        
        return {
            totalVanzare: pretVanzare * quantity,
            profitTotal: profitPerBuc * quantity,
            profitPerBuc,
            remainingStock: selectedProduct.cantitate - quantity
        };
    }, [selectedProduct, quantity]);

    const isStockInsufficient = quantity > maxQuantity;

    // ═══════════════════════════════════════════════════════════
    // SUBMIT SALE
    // ═══════════════════════════════════════════════════════════
    const handleSubmit = async () => {
        if (!selectedProduct || quantity <= 0) return;
        
        if (quantity > selectedProduct.cantitate) {
            setError(`Stoc insuficient. Disponibil: ${selectedProduct.cantitate} buc`);
            return;
        }

        setSaving(true);
        setError('');

        try {
            const profitPerBuc = selectedProduct.pret_vanzare - (selectedProduct.pret_achizitie || 0);
            const profitTotal = profitPerBuc * quantity;

            // 1. Update stock
            const newQty = selectedProduct.cantitate - quantity;
            const updateRes = await fetch('/api/stocuri', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedProduct.id, cantitate: newQty }),
            });
            const updateData = await updateRes.json();
            if (!updateData.success) throw new Error(updateData.error || 'Eroare la actualizare stoc');

            // 2. Record movement
            await fetch('/api/stocuri/miscari', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anvelopa_id: selectedProduct.id,
                    tip: 'iesire',
                    cantitate: quantity,
                    data: new Date().toISOString().split('T')[0],
                    motiv_iesire: 'vanzare',
                    pret_achizitie: selectedProduct.pret_achizitie,
                    pret_vanzare: selectedProduct.pret_vanzare,
                    profit_per_bucata: profitPerBuc,
                    profit_total: profitTotal,
                }),
            });

            // Save last sale for success display
            setLastSale({
                product: selectedProduct,
                quantity,
                total: selectedProduct.pret_vanzare * quantity,
                profit: profitTotal
            });

            // Update local state
            setAnvelope(prev => prev.map(a => 
                a.id === selectedProduct.id ? { ...a, cantitate: newQty } : a
            ));

            setShowSuccess(true);
            
            // Reset after delay
            setTimeout(() => {
                setShowSuccess(false);
                setLastSale(null);
                clearSelection();
            }, 4000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    if (loading) {
        return (
            <div className="fade-in" style={{ 
                minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--blue)' }} />
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Link href="/stocuri" style={{ 
                    fontSize: 13, color: 'var(--blue)', textDecoration: 'none', 
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 
                }}>
                    <ArrowLeft size={16} /> Înapoi la Stocuri
                </Link>
                <h1 style={{ 
                    fontSize: 28, fontWeight: 800, display: 'flex', 
                    alignItems: 'center', gap: 12 
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--red), #ef4444)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white'
                    }}>
                        <ShoppingCart size={24} />
                    </div>
                    Ieșire Stoc POS
                </h1>
                <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>
                    Selectează produsul, cantitatea și confirmă vânzarea
                </p>
            </div>

            {/* Success Message */}
            {showSuccess && lastSale && (
                <div className="fade-in" style={{
                    padding: 24, borderRadius: 20, marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                    border: '2px solid rgba(34,197,94,0.3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(34,197,94,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckCircle2 size={24} color="var(--green)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                                Vânzare înregistrată cu succes!
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                {lastSale.product.brand} {lastSale.product.dimensiune} × {lastSale.quantity} buc
                            </div>
                        </div>
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12
                    }}>
                        <div style={{
                            padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.5)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Cantitate</div>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{lastSale.quantity} buc</div>
                        </div>
                        <div style={{
                            padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.5)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Total vânzare</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>
                                {lastSale.total.toLocaleString('ro-MD')} MDL
                            </div>
                        </div>
                        <div style={{
                            padding: 16, borderRadius: 14, background: 'rgba(34,197,94,0.15)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Profit</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>
                                +{lastSale.profit.toLocaleString('ro-MD')} MDL
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="fade-in" style={{
                    padding: 16, borderRadius: 16, marginBottom: 24,
                    background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <AlertCircle size={20} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontWeight: 500 }}>{error}</span>
                    <button 
                        onClick={() => setError('')}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <X size={16} color="var(--red)" />
                    </button>
                </div>
            )}

            {/* Search Section */}
            <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
                    Caută Produs
                </label>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ 
                        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-dim)' 
                    }} />
                    <input 
                        className="glass-input" 
                        style={{ 
                            paddingLeft: 48, paddingRight: selectedProduct ? 48 : 16,
                            fontSize: 16, height: 56
                        }} 
                        placeholder="Scrie brand, dimensiune sau cod produs..."
                        value={query} 
                        onChange={e => { 
                            setQuery(e.target.value); 
                            if (selectedProduct) setSelectedProduct(null);
                        }}
                    />
                    {selectedProduct && (
                        <button
                            onClick={clearSelection}
                            style={{
                                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8,
                                padding: 8, cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={16} color="var(--red)" />
                        </button>
                    )}
                </div>

                {/* Search Results - Product Cards */}
                {results.length > 0 && !selectedProduct && (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ 
                            fontSize: 12, color: 'var(--text-dim)', marginBottom: 12,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span>{results.length} produse găsite</span>
                            <span>Click pentru a selecta</span>
                        </div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12, maxHeight: 400, overflowY: 'auto', padding: 4
                        }}>
                            {results.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => selectProduct(product)}
                                    style={{
                                        padding: 16, borderRadius: 16, cursor: 'pointer',
                                        background: sezonBgColors[product.sezon] || 'rgba(255,255,255,0.05)',
                                        border: '2px solid transparent',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = sezonColors[product.sezon] || 'var(--blue)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <div style={{ 
                                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 
                                    }}>
                                        <span style={{ color: sezonColors[product.sezon] }}>
                                            {sezonIcons[product.sezon]}
                                        </span>
                                        <span style={{ 
                                            fontSize: 11, color: 'var(--text-dim)',
                                            background: 'rgba(0,0,0,0.2)', padding: '2px 8px',
                                            borderRadius: 20 
                                        }}>
                                            {product.sezon}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                                        {product.brand}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
                                        {product.dimensiune}
                                    </div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <span style={{
                                            fontSize: 16, fontWeight: 800, color: 'var(--blue)'
                                        }}>
                                            {product.pret_vanzare} MDL
                                        </span>
                                        <span style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: product.cantitate <= 4 ? 'var(--orange)' : 'var(--green)',
                                            background: product.cantitate <= 4 ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
                                            padding: '4px 10px', borderRadius: 20
                                        }}>
                                            {product.cantitate} buc
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {query.length >= 2 && results.length === 0 && !selectedProduct && (
                    <div style={{
                        textAlign: 'center', padding: 40, marginTop: 20,
                        color: 'var(--text-dim)'
                    }}>
                        <Package size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Nu există produse</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                            Încearcă alt termen de căutare
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Product - POS Interface */}
            {selectedProduct && calculations && (
                <div className="fade-in">
                    {/* Product Detail Card */}
                    <div style={{
                        padding: 24, borderRadius: 24, marginBottom: 20,
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ 
                                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 
                                }}>
                                    <span style={{ 
                                        color: sezonColors[selectedProduct.sezon],
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '6px 12px', borderRadius: 10,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        fontSize: 13
                                    }}>
                                        {sezonIcons[selectedProduct.sezon]}
                                        {selectedProduct.sezon}
                                    </span>
                                    <span style={{ 
                                        fontSize: 12, color: 'rgba(255,255,255,0.5)',
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: '4px 10px', borderRadius: 8
                                    }}>
                                        Raft {selectedProduct.locatie_raft}
                                    </span>
                                </div>
                                <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                                    {selectedProduct.brand}
                                </h2>
                                <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>
                                    {selectedProduct.dimensiune}
                                </div>
                            </div>
                            <div style={{
                                padding: '16px 24px', borderRadius: 20,
                                background: selectedProduct.cantitate <= 4 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)',
                                border: `2px solid ${selectedProduct.cantitate <= 4 ? 'rgba(251,191,36,0.4)' : 'rgba(34,197,94,0.4)'}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: selectedProduct.cantitate <= 4 ? '#fbbf24' : '#4ade80' }}>
                                    {selectedProduct.cantitate}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>buc disponibile</div>
                            </div>
                        </div>

                        {/* Price Info */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24,
                            padding: 20, borderRadius: 16, background: 'rgba(0,0,0,0.3)'
                        }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DollarSign size={14} /> Preț achiziție
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>
                                    {selectedProduct.pret_achizitie} <span style={{ fontSize: 14 }}>MDL</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DollarSign size={14} /> Preț vânzare
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#60a5fa' }}>
                                    {selectedProduct.pret_vanzare} <span style={{ fontSize: 14 }}>MDL</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <TrendingUp size={14} /> Profit / buc
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>
                                    {calculations.profitPerBuc} <span style={{ fontSize: 14 }}>MDL</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quantity Control */}
                    <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                        <label className="form-label" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
                            Cantitate
                        </label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                            <button
                                onClick={decreaseQty}
                                disabled={quantity <= 1}
                                style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: quantity <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.15)',
                                    border: '2px solid ' + (quantity <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.3)'),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <MinusCircle size={24} color={quantity <= 1 ? 'rgba(255,255,255,0.3)' : 'var(--red)'} />
                            </button>

                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQty(parseInt(e.target.value) || 1)}
                                min={1}
                                max={maxQuantity}
                                style={{
                                    flex: 1, height: 64, fontSize: 32, fontWeight: 800, textAlign: 'center',
                                    background: 'rgba(255,255,255,0.05)', border: `3px solid ${isStockInsufficient ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 16, color: isStockInsufficient ? 'var(--red)' : 'inherit'
                                }}
                            />

                            <button
                                onClick={increaseQty}
                                disabled={quantity >= maxQuantity}
                                style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: quantity >= maxQuantity ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.15)',
                                    border: '2px solid ' + (quantity >= maxQuantity ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.3)'),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: quantity >= maxQuantity ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Plus size={24} color={quantity >= maxQuantity ? 'rgba(255,255,255,0.3)' : 'var(--green)'} />
                            </button>
                        </div>

                        {/* Stock Warning */}
                        {isStockInsufficient && (
                            <div style={{
                                padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)',
                                fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <AlertCircle size={18} />
                                Stoc insuficient! Maxim disponibil: {maxQuantity} buc
                            </div>
                        )}

                        {/* Quick Quantity Buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                            {[1, 2, 4, 6, 8].map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQty(q)}
                                    disabled={q > maxQuantity}
                                    style={{
                                        padding: '10px 20px', borderRadius: 10,
                                        background: quantity === q ? 'var(--blue)' : 'rgba(255,255,255,0.05)',
                                        border: '1px solid ' + (quantity === q ? 'var(--blue)' : 'rgba(255,255,255,0.1)'),
                                        color: quantity === q ? 'white' : 'inherit',
                                        fontWeight: 600, cursor: q > maxQuantity ? 'not-allowed' : 'pointer',
                                        opacity: q > maxQuantity ? 0.5 : 1
                                    }}
                                >
                                    {q} buc
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Calculations */}
                    <div style={{
                        padding: 24, borderRadius: 24, marginBottom: 20,
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
                        border: '2px solid rgba(34,197,94,0.2)'
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={18} /> Calcul Live
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{
                                padding: 20, borderRadius: 16, background: 'rgba(0,0,0,0.2)'
                            }}>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                                    Total Vânzare
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>
                                    {calculations.totalVanzare.toLocaleString('ro-MD')} <span style={{ fontSize: 16 }}>MDL</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                                    {selectedProduct.pret_vanzare} × {quantity}
                                </div>
                            </div>

                            <div style={{
                                padding: 20, borderRadius: 16, background: 'rgba(34,197,94,0.15)'
                            }}>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                                    Profit Total
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
                                    +{calculations.profitTotal.toLocaleString('ro-MD')} <span style={{ fontSize: 16 }}>MDL</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                                    {calculations.profitPerBuc} × {quantity}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            marginTop: 16, padding: 14, borderRadius: 12,
                            background: 'rgba(255,255,255,0.05)', textAlign: 'center'
                        }}>
                            <span style={{ color: 'var(--text-dim)' }}>Sold după vânzare: </span>
                            <span style={{ 
                                fontWeight: 700, 
                                color: calculations.remainingStock <= 4 ? 'var(--orange)' : 'var(--green)'
                            }}>
                                {calculations.remainingStock} buc
                            </span>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={saving || isStockInsufficient || quantity <= 0}
                        style={{
                            width: '100%', padding: '20px 32px', borderRadius: 20,
                            background: saving || isStockInsufficient 
                                ? 'rgba(255,255,255,0.1)' 
                                : 'linear-gradient(135deg, var(--green), #16a34a)',
                            border: 'none', color: 'white', fontSize: 18, fontWeight: 700,
                            cursor: saving || isStockInsufficient ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                            transition: 'all 0.3s', boxShadow: saving || isStockInsufficient 
                                ? 'none' 
                                : '0 8px 24px rgba(34,197,94,0.3)'
                        }}
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin" size={24} /> Se procesează...</>
                        ) : isStockInsufficient ? (
                            <><AlertCircle size={24} /> Stoc insuficient</>
                        ) : (
                            <>
                                <ShoppingCart size={24} />
                                Confirmă Vânzarea
                                <span style={{ 
                                    background: 'rgba(255,255,255,0.2)', padding: '4px 12px',
                                    borderRadius: 20, fontSize: 14 
                                }}>
                                    {calculations.totalVanzare.toLocaleString('ro-MD')} MDL
                                </span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Initial Empty State */}
            {!selectedProduct && !query && (
                <div style={{
                    textAlign: 'center', padding: 60,
                    color: 'var(--text-dim)'
                }}>
                    <ShoppingCart size={64} style={{ marginBottom: 20, opacity: 0.3 }} />
                    <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                        Începe o vânzare
                    </div>
                    <div style={{ fontSize: 14 }}>
                        Scrie în căsuța de căutare pentru a găsi produse
                    </div>
                </div>
            )}
        </div>
    );
}
