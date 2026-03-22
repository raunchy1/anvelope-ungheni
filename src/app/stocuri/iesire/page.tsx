'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Search, Plus, Minus, ShoppingCart, Package, TrendingUp, 
    DollarSign, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
    Snowflake, Sun, CloudSun, Wind, X, Trash2, Calculator,
    CreditCard, Receipt
} from 'lucide-react';
import type { Anvelopa } from '@/types';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface CartItem {
    product: Anvelopa;
    quantity: number;
    totalPrice: number;
    totalProfit: number;
}

interface SaleSummary {
    totalItems: number;
    totalRevenue: number;
    totalProfit: number;
}

// Season styling
const sezonConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
    'Iarnă': { 
        icon: <Snowflake size={16} />, 
        color: '#60a5fa', 
        bg: 'rgba(96,165,250,0.12)',
        border: 'rgba(96,165,250,0.3)'
    },
    'Vară': { 
        icon: <Sun size={16} />, 
        color: '#fbbf24', 
        bg: 'rgba(251,191,36,0.12)',
        border: 'rgba(251,191,36,0.3)'
    },
    'All-Season': { 
        icon: <CloudSun size={16} />, 
        color: '#34d399', 
        bg: 'rgba(52,211,153,0.12)',
        border: 'rgba(52,211,153,0.3)'
    },
    'M+S': { 
        icon: <Wind size={16} />, 
        color: '#a78bfa', 
        bg: 'rgba(167,139,250,0.12)',
        border: 'rgba(167,139,250,0.3)'
    },
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function POSStockExitPage() {
    // ─── STATE ───
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Anvelopa | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSale, setLastSale] = useState<SaleSummary | null>(null);
    const [error, setError] = useState('');
    const searchRef = useRef<HTMLDivElement>(null);

    // ─── LOAD DATA ───
    useEffect(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => { 
                setAnvelope(data); 
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, []);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── SEARCH RESULTS ───
    const searchResults = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];
        const q = query.toLowerCase();
        return anvelope.filter(a => 
            a.cantitate > 0 && (
                a.brand.toLowerCase().includes(q) || 
                a.dimensiune.toLowerCase().includes(q) || 
                a.sezon.toLowerCase().includes(q) ||
                (a.furnizor && a.furnizor.toLowerCase().includes(q)) ||
                (a.cod_produs && a.cod_produs.toLowerCase().includes(q))
            )
        ).slice(0, 10);
    }, [query, anvelope]);

    // ─── SELECT PRODUCT ───
    const selectProduct = useCallback((product: Anvelopa) => {
        setSelectedProduct(product);
        setQuantity(1);
        setError('');
        setQuery(`${product.brand} ${product.dimensiune}`);
        setShowDropdown(false);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedProduct(null);
        setQuantity(1);
        setError('');
        setQuery('');
        setShowDropdown(false);
    }, []);

    // ─── QUANTITY CONTROLS ───
    const maxQty = selectedProduct?.cantitate || 0;
    
    const updateQuantity = useCallback((newQty: number) => {
        if (newQty >= 1 && newQty <= maxQty) {
            setQuantity(newQty);
            setError('');
        } else if (newQty > maxQty) {
            setQuantity(maxQty);
            setError(`Stoc maxim: ${maxQty} bucăți`);
        }
    }, [maxQty]);

    const increaseQty = () => updateQuantity(quantity + 1);
    const decreaseQty = () => updateQuantity(quantity - 1);

    // ─── CART OPERATIONS ───
    const addToCart = useCallback(() => {
        if (!selectedProduct || quantity <= 0) return;
        
        if (quantity > selectedProduct.cantitate) {
            setError(`Stoc insuficient. Disponibil: ${selectedProduct.cantitate}`);
            return;
        }

        const profitPerBuc = selectedProduct.pret_vanzare - (selectedProduct.pret_achizitie || 0);
        
        setCart(prev => {
            const existing = prev.find(item => item.product.id === selectedProduct.id);
            if (existing) {
                const newQty = existing.quantity + quantity;
                if (newQty > selectedProduct.cantitate) {
                    setError(`Total în coș (${newQty}) depășește stocul (${selectedProduct.cantitate})`);
                    return prev;
                }
                return prev.map(item => 
                    item.product.id === selectedProduct.id
                        ? {
                            ...item,
                            quantity: newQty,
                            totalPrice: newQty * selectedProduct.pret_vanzare,
                            totalProfit: newQty * profitPerBuc
                        }
                        : item
                );
            }
            return [...prev, {
                product: selectedProduct,
                quantity,
                totalPrice: quantity * selectedProduct.pret_vanzare,
                totalProfit: quantity * profitPerBuc
            }];
        });

        clearSelection();
        setError('');
    }, [selectedProduct, quantity, clearSelection]);

    const removeFromCart = useCallback((productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    }, []);

    const updateCartQuantity = useCallback((productId: number, newQty: number) => {
        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }
        
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            if (newQty > item.product.cantitate) {
                setError(`Stoc insuficient pentru ${item.product.brand}`);
                return item;
            }
            const profitPerBuc = item.product.pret_vanzare - (item.product.pret_achizitie || 0);
            return {
                ...item,
                quantity: newQty,
                totalPrice: newQty * item.product.pret_vanzare,
                totalProfit: newQty * profitPerBuc
            };
        }));
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setCart([]);
        setError('');
    }, []);

    // ─── CART TOTALS ───
    const cartTotals = useMemo(() => {
        return cart.reduce((acc, item) => ({
            totalItems: acc.totalItems + item.quantity,
            totalRevenue: acc.totalRevenue + item.totalPrice,
            totalProfit: acc.totalProfit + item.totalProfit
        }), { totalItems: 0, totalRevenue: 0, totalProfit: 0 } as SaleSummary);
    }, [cart]);

    // ─── SUBMIT SALE ───
    const handleSubmit = async () => {
        if (cart.length === 0) return;
        
        if (!confirm(`Sigur vrei să procesezi vânzarea?\n\nTotal: ${cartTotals.totalRevenue.toLocaleString('ro-MD')} MDL\nProduse: ${cartTotals.totalItems} buc`)) {
            return;
        }

        setProcessing(true);
        setError('');

        try {
            // Process each cart item
            for (const item of cart) {
                const profitPerBuc = item.product.pret_vanzare - (item.product.pret_achizitie || 0);
                const newQty = item.product.cantitate - item.quantity;

                // 1. Update stock
                const updateRes = await fetch('/api/stocuri', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.product.id, cantitate: newQty }),
                });
                const updateData = await updateRes.json();
                if (!updateData.success) throw new Error(`Eroare la ${item.product.brand}`);

                // 2. Record movement
                await fetch('/api/stocuri/miscari', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        anvelopa_id: item.product.id,
                        tip: 'iesire',
                        cantitate: item.quantity,
                        data: new Date().toISOString().split('T')[0],
                        motiv_iesire: 'vanzare',
                        pret_achizitie: item.product.pret_achizitie,
                        pret_vanzare: item.product.pret_vanzare,
                        profit_per_bucata: profitPerBuc,
                        profit_total: item.totalProfit,
                    }),
                });
            }

            // Update local stock data
            setAnvelope(prev => prev.map(a => {
                const cartItem = cart.find(c => c.product.id === a.id);
                if (cartItem) {
                    return { ...a, cantitate: a.cantitate - cartItem.quantity };
                }
                return a;
            }));

            setLastSale(cartTotals);
            setShowSuccess(true);
            setCart([]);
            
            setTimeout(() => {
                setShowSuccess(false);
                setLastSale(null);
            }, 5000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    // ─── RENDER ───
    if (loading) {
        return (
            <div className="fade-in" style={{ 
                minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 16
            }}>
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--blue)' }} />
                <div style={{ color: 'var(--text-dim)' }}>Se încarcă stocul...</div>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
            {/* Header */}
            <header style={{ marginBottom: 24 }}>
                <Link href="/stocuri" style={{ 
                    fontSize: 13, color: 'var(--blue)', textDecoration: 'none', 
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16
                }}>
                    <ArrowLeft size={16} /> Înapoi la Stocuri
                </Link>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 16,
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', boxShadow: '0 8px 24px rgba(239,68,68,0.3)'
                        }}>
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Ieșire Stoc POS</h1>
                            <p style={{ color: 'var(--text-dim)', margin: '4px 0 0', fontSize: 14 }}>
                                Vânzare rapidă cu gestionare coș
                            </p>
                        </div>
                    </div>

                    {/* Cart Summary Mini */}
                    {cart.length > 0 && (
                        <div style={{
                            padding: '12px 20px', borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                            border: '2px solid rgba(59,130,246,0.3)',
                            display: 'flex', alignItems: 'center', gap: 12
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'var(--blue)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 14
                            }}>
                                {cart.length}
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Total</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>
                                    {cartTotals.totalRevenue.toLocaleString('ro-MD')} MDL
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Success Message */}
            {showSuccess && lastSale && (
                <div className="fade-in" style={{
                    padding: 28, borderRadius: 24, marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                    border: '2px solid rgba(34,197,94,0.4)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <CheckCircle2 size={32} color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
                        Vânzare efectuată cu succes!
                    </h3>
                    <div style={{ 
                        display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20,
                        flexWrap: 'wrap'
                    }}>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Produse vândute</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{lastSale.totalItems} buc</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Total încasat</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>
                                {lastSale.totalRevenue.toLocaleString('ro-MD')} MDL
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Profit realizat</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>
                                +{lastSale.totalProfit.toLocaleString('ro-MD')} MDL
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="fade-in" style={{
                    padding: 16, borderRadius: 16, marginBottom: 20,
                    background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', gap: 12
                }}>
                    <AlertCircle size={22} color="var(--red)" />
                    <span style={{ color: 'var(--red)', fontWeight: 500, flex: 1 }}>{error}</span>
                    <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={18} color="var(--red)" />
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
                {/* LEFT COLUMN - Search & Product Selection */}
                <div>
                    {/* Search */}
                    <div ref={searchRef} className="glass" style={{ padding: 24, marginBottom: 20 }}>
                        <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
                            Caută Produs
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Search size={20} style={{ 
                                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-dim)' 
                            }} />
                            <input 
                                style={{ 
                                    width: '100%', padding: '16px 16px 16px 52', fontSize: 16,
                                    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
                                    borderRadius: 16, outline: 'none'
                                }} 
                                placeholder="Scrie brand, dimensiune, sezon sau cod..."
                                value={query} 
                                onChange={e => { 
                                    setQuery(e.target.value); 
                                    setShowDropdown(e.target.value.length >= 2);
                                    if (selectedProduct) setSelectedProduct(null);
                                }}
                                onFocus={() => query.length >= 2 && setShowDropdown(true)}
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                            <div style={{ 
                                marginTop: 12, maxHeight: 320, overflowY: 'auto',
                                borderRadius: 16, background: 'rgba(15,23,42,0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ 
                                    padding: '12px 16px', fontSize: 11, color: 'var(--text-dim)',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {searchResults.length} rezultate găsite
                                </div>
                                {searchResults.map(product => {
                                    const config = sezonConfig[product.sezon] || sezonConfig['All-Season'];
                                    const stockColor = product.cantitate === 0 ? 'var(--red)' : 
                                        product.cantitate <= 4 ? '#fbbf24' : 'var(--green)';
                                    
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => selectProduct(product)}
                                            style={{
                                                padding: 16, cursor: 'pointer',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 12,
                                                background: config.bg,
                                                border: `2px solid ${config.border}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: config.color
                                            }}>
                                                {config.icon}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                                                    {product.brand}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                                    {product.dimensiune} • {product.sezon}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>
                                                    {product.pret_vanzare} MDL
                                                </div>
                                                <div style={{ fontSize: 12, color: stockColor, fontWeight: 600 }}>
                                                    {product.cantitate} buc
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* No Results */}
                        {showDropdown && query.length >= 2 && searchResults.length === 0 && (
                            <div style={{ 
                                marginTop: 12, padding: 24, textAlign: 'center',
                                borderRadius: 16, background: 'rgba(15,23,42,0.5)'
                            }}>
                                <Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                                <div style={{ color: 'var(--text-dim)' }}>Nu există produse</div>
                            </div>
                        )}
                    </div>

                    {/* Selected Product Detail */}
                    {selectedProduct && (
                        <div className="fade-in">
                            {/* Product Card */}
                            <div style={{
                                padding: 24, borderRadius: 24, marginBottom: 20,
                                background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
                                border: '2px solid rgba(59,130,246,0.3)',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3), 0 0 30px rgba(59,130,246,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            background: sezonConfig[selectedProduct.sezon]?.bg || 'rgba(255,255,255,0.1)',
                                            border: `2px solid ${sezonConfig[selectedProduct.sezon]?.border || 'rgba(255,255,255,0.2)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: sezonConfig[selectedProduct.sezon]?.color || 'white'
                                        }}>
                                            {sezonConfig[selectedProduct.sezon]?.icon || <Package size={24} />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                                                {selectedProduct.brand}
                                            </h3>
                                            <div style={{ fontSize: 16, color: 'var(--text-dim)' }}>
                                                {selectedProduct.dimensiune}
                                            </div>
                                            <div style={{ 
                                                fontSize: 12, marginTop: 6,
                                                color: sezonConfig[selectedProduct.sezon]?.color,
                                                background: sezonConfig[selectedProduct.sezon]?.bg,
                                                padding: '4px 10px', borderRadius: 20,
                                                display: 'inline-block'
                                            }}>
                                                {selectedProduct.sezon}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={clearSelection}
                                        style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            background: 'rgba(239,68,68,0.15)', border: 'none',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <X size={18} color="var(--red)" />
                                    </button>
                                </div>

                                {/* Stock & Prices */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12
                                }}>
                                    <div style={{
                                        padding: 16, borderRadius: 16, textAlign: 'center',
                                        background: selectedProduct.cantitate <= 4 ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
                                        border: `2px solid ${selectedProduct.cantitate <= 4 ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                    }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Stoc</div>
                                        <div style={{ 
                                            fontSize: 24, fontWeight: 800,
                                            color: selectedProduct.cantitate <= 4 ? '#fbbf24' : '#4ade80'
                                        }}>
                                            {selectedProduct.cantitate}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>buc</div>
                                    </div>

                                    <div style={{
                                        padding: 16, borderRadius: 16, textAlign: 'center',
                                        background: 'rgba(251,191,36,0.1)', border: '2px solid rgba(251,191,36,0.2)'
                                    }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Achiziție</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
                                            {selectedProduct.pret_achizitie}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>MDL</div>
                                    </div>

                                    <div style={{
                                        padding: 16, borderRadius: 16, textAlign: 'center',
                                        background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.2)'
                                    }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Vânzare</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>
                                            {selectedProduct.pret_vanzare}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>MDL</div>
                                    </div>

                                    <div style={{
                                        padding: 16, borderRadius: 16, textAlign: 'center',
                                        background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.2)'
                                    }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Profit/buc</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>
                                            {selectedProduct.pret_vanzare - (selectedProduct.pret_achizitie || 0)}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>MDL</div>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity Control */}
                            <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                                <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'block' }}>
                                    Cantitate
                                </label>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                    <button
                                        onClick={decreaseQty}
                                        disabled={quantity <= 1}
                                        style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            background: quantity <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.15)',
                                            border: `2px solid ${quantity <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.3)'}`,
                                            cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <Minus size={24} color={quantity <= 1 ? 'rgba(255,255,255,0.3)' : 'var(--red)'} />
                                    </button>

                                    <input
                                        type="number"
                                        min={1}
                                        max={maxQty}
                                        value={quantity}
                                        onChange={e => updateQuantity(parseInt(e.target.value) || 1)}
                                        style={{
                                            flex: 1, height: 64, fontSize: 32, fontWeight: 800, textAlign: 'center',
                                            background: 'rgba(255,255,255,0.05)', borderRadius: 16,
                                            border: `3px solid ${quantity > maxQty ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
                                            color: quantity > maxQty ? 'var(--red)' : 'inherit'
                                        }}
                                    />

                                    <button
                                        onClick={increaseQty}
                                        disabled={quantity >= maxQty}
                                        style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            background: quantity >= maxQty ? 'rgba(255,255,255,0.03)' : 'rgba(34,197,94,0.15)',
                                            border: `2px solid ${quantity >= maxQty ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.3)'}`,
                                            cursor: quantity >= maxQty ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        <Plus size={24} color={quantity >= maxQty ? 'rgba(255,255,255,0.3)' : 'var(--green)'} />
                                    </button>
                                </div>

                                {/* Quick Quantity Buttons */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {[1, 2, 4, 6, 8, 10, 12].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => updateQuantity(q)}
                                            disabled={q > maxQty}
                                            style={{
                                                padding: '10px 18px', borderRadius: 12,
                                                background: quantity === q ? 'var(--blue)' : 'rgba(255,255,255,0.05)',
                                                border: `2px solid ${quantity === q ? 'var(--blue)' : 'rgba(255,255,255,0.1)'}`,
                                                color: quantity === q ? 'white' : 'inherit',
                                                fontWeight: 600, cursor: q > maxQty ? 'not-allowed' : 'pointer',
                                                opacity: q > maxQty ? 0.4 : 1, fontSize: 14
                                            }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>

                                {quantity > maxQty && (
                                    <div style={{
                                        marginTop: 12, padding: 12, borderRadius: 12,
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        color: 'var(--red)', fontSize: 13, fontWeight: 500,
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                        <AlertCircle size={16} />
                                        Stoc insuficient! Maxim: {maxQty} buc
                                    </div>
                                )}
                            </div>

                            {/* Live Calculation */}
                            <div style={{
                                padding: 24, borderRadius: 24, marginBottom: 20,
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
                                border: '2px solid rgba(34,197,94,0.2)'
                            }}>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Calculator size={18} /> Calcul Live
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ padding: 20, borderRadius: 16, background: 'rgba(0,0,0,0.2)' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Total Vânzare</div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>
                                            {(quantity * selectedProduct.pret_vanzare).toLocaleString('ro-MD')} MDL
                                        </div>
                                    </div>
                                    <div style={{ padding: 20, borderRadius: 16, background: 'rgba(34,197,94,0.15)' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Profit Total</div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>
                                            +{(quantity * (selectedProduct.pret_vanzare - (selectedProduct.pret_achizitie || 0))).toLocaleString('ro-MD')} MDL
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                onClick={addToCart}
                                disabled={quantity <= 0 || quantity > maxQty}
                                style={{
                                    width: '100%', padding: '18px 24px', borderRadius: 16,
                                    background: quantity <= 0 || quantity > maxQty ? 'rgba(255,255,255,0.05)' : 'var(--blue)',
                                    border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
                                    cursor: quantity <= 0 || quantity > maxQty ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                }}
                            >
                                <Plus size={22} />
                                Adaugă în Coș
                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 14 }}>
                                    {(quantity * selectedProduct.pret_vanzare).toLocaleString('ro-MD')} MDL
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!selectedProduct && cart.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
                            <ShoppingCart size={64} style={{ opacity: 0.2, marginBottom: 20 }} />
                            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Coșul este gol</h3>
                            <p>Caută și selectează produse pentru a începe vânzarea</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN - Cart */}
                <div>
                    <div className="glass" style={{ padding: 20, position: 'sticky', top: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <ShoppingCart size={22} color="var(--blue)" />
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Coș de Vânzare</h3>
                            {cart.length > 0 && (
                                <span style={{
                                    marginLeft: 'auto', background: 'var(--blue)', color: 'white',
                                    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700
                                }}>
                                    {cart.length}
                                </span>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                                <Receipt size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                                <p style={{ fontSize: 14 }}>Niciun produs în coș</p>
                            </div>
                        ) : (
                            <>
                                {/* Cart Items */}
                                <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
                                    {cart.map(item => (
                                        <div key={item.product.id} style={{
                                            padding: 14, borderRadius: 12, marginBottom: 10,
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.product.brand}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{item.product.dimensiune}</div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        background: 'rgba(239,68,68,0.1)', border: 'none',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    <Trash2 size={14} color="var(--red)" />
                                                </button>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer'
                                                    }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span style={{ fontWeight: 700, minWidth: 30, textAlign: 'center' }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    disabled={item.quantity >= item.product.cantitate}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        background: item.quantity >= item.product.cantitate ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                                                        border: 'none', cursor: item.quantity >= item.product.cantitate ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
                                                    {item.product.pret_vanzare} MDL/buc
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <span style={{ color: 'var(--text-dim)' }}>Total:</span>
                                                <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
                                                    {item.totalPrice.toLocaleString('ro-MD')} MDL
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                <span style={{ color: 'var(--text-dim)' }}>Profit:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--green)' }}>
                                                    +{item.totalProfit.toLocaleString('ro-MD')} MDL
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Clear Cart */}
                                <button
                                    onClick={clearCart}
                                    style={{
                                        width: '100%', padding: 10, marginBottom: 16,
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 12, color: 'var(--red)', fontSize: 13,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}
                                >
                                    <Trash2 size={14} /> Golește Coșul
                                </button>

                                {/* Cart Totals */}
                                <div style={{
                                    padding: 20, borderRadius: 16,
                                    background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.8))',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Produse:</span>
                                        <span style={{ fontWeight: 600 }}>{cartTotals.totalItems} buc</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                                        <span style={{ color: 'var(--text-dim)' }}>Subtotal:</span>
                                        <span style={{ fontWeight: 600 }}>{cartTotals.totalRevenue.toLocaleString('ro-MD')} MDL</span>
                                    </div>
                                    <div style={{ 
                                        display: 'flex', justifyContent: 'space-between', 
                                        paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)',
                                        marginTop: 12
                                    }}>
                                        <span style={{ fontSize: 14 }}>Profit Total:</span>
                                        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                                            +{cartTotals.totalProfit.toLocaleString('ro-MD')} MDL
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={processing || cart.length === 0}
                                    style={{
                                        width: '100%', marginTop: 16, padding: '18px 24px', borderRadius: 16,
                                        background: processing ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--green), #16a34a)',
                                        border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
                                        cursor: processing ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        boxShadow: processing ? 'none' : '0 8px 24px rgba(34,197,94,0.3)'
                                    }}
                                >
                                    {processing ? (
                                        <><Loader2 className="animate-spin" size={22} /> Se procesează...</>
                                    ) : (
                                        <>
                                            <CreditCard size={22} />
                                            Confirmă Vânzarea
                                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 14 }}>
                                                {cartTotals.totalRevenue.toLocaleString('ro-MD')} MDL
                                            </span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
