'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = login(email, password);
        if (result.success) {
            router.push('/');
        } else {
            setError(result.error || 'Email sau parolă greșită');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        }}>
            <div className="fade-in" style={{ maxWidth: 380, width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56,
                        borderRadius: 12,
                        overflow: 'hidden',
                        margin: '0 auto 20px',
                        border: '1px solid var(--border)',
                    }}>
                        <Image
                            src="/logo.svg"
                            alt="Anvelope Ungheni"
                            width={56}
                            height={56}
                            style={{ borderRadius: 12, objectFit: 'cover' }}
                            priority
                        />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>
                        ANVELOPE <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Ungheni</span>
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                        Sistem intern de administrare
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass" style={{ padding: 24 }}>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <label className="form-label">Email</label>
                            <input
                                className="glass-input"
                                type="email"
                                placeholder="adresa@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Parolă</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="glass-input"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: 42 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none',
                                        color: 'var(--text-dim)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p style={{
                                color: 'var(--red)', fontSize: 13,
                                padding: '8px 12px',
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.15)',
                                borderRadius: 6,
                            }}>
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="glass-btn glass-btn-primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '11px 20px', marginTop: 4 }}
                        >
                            <LogIn size={16} />
                            {loading ? 'Se autentifică...' : 'Autentificare'}
                        </button>
                    </form>
                </div>

                {/* Credentials hint */}
                <div style={{
                    marginTop: 12, padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--text-dim)',
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' }}>Conturi disponibile</div>
                    <div style={{ marginBottom: 2 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Admin: </span>
                        cristiermurache@gmail.com / ParolaAdmin123!
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Recepție: </span>
                        ermurachealex108@gmail.com / ParolaReceptie456!
                    </div>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 20, textAlign: 'center' }}>
                    Service Roți ANVELOPE Ungheni · Mun. Ungheni, str. Decebal 62A/1
                </p>
            </div>
        </div>
    );
}
