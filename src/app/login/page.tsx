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
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
            <div className="glass fade-in" style={{ maxWidth: 420, width: '100%', padding: 40, textAlign: 'center' }}>
                {/* Logo */}
                <div style={{
                    width: 180, height: 180, borderRadius: '50%', margin: '0 auto 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    filter: 'drop-shadow(0 0 30px rgba(33,150,243,0.45))',
                }}>
                    <Image
                        src="/logo.svg"
                        alt="Anvelope Ungheni"
                        width={180}
                        height={180}
                        style={{ borderRadius: '50%' }}
                        priority
                    />
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                    <span style={{ color: 'var(--blue)' }}>ANVELOPE</span>
                </h1>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Ungheni</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 32 }}>
                    Sistem intern de administrare
                </p>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 16 }}>
                        <input
                            className="glass-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                        <input
                            className="glass-input"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Parolă"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{ paddingRight: 44 }}
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
                        }}>
                            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        className="glass-btn glass-btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
                    >
                        <LogIn size={18} />
                        {loading ? 'Se autentifică...' : 'Autentificare'}
                    </button>
                </form>

                <div style={{
                    marginTop: 20, padding: 12, borderRadius: 12,
                    background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.15)',
                    fontSize: 12, color: 'var(--text-muted)', textAlign: 'left',
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--blue)' }}>🔑 Conturi disponibile:</div>
                    <div><strong>Admin:</strong> cristiermurache@gmail.com / ParolaAdmin123!</div>
                    <div><strong>Recepție:</strong> ermurachealex108@gmail.com / ParolaReceptie456!</div>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 20 }}>
                    Service Roți ANVELOPE Ungheni<br />
                    Mun. Ungheni, str. Decebal 62A/1
                </p>
            </div>
        </div>
    );
}
