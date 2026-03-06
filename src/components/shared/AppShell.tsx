'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
    Home, FilePlus, Search, LogOut,
    PlusCircle, MinusCircle, FileText,
    Package, UserSearch, Hotel
} from 'lucide-react';

const fiseNav = [
    { label: 'Acasă', href: '/', icon: Home },
    { label: 'Adaugă Fișă', href: '/fise/new', icon: FilePlus },
    { label: 'Căutare Clienți', href: '/clienti', icon: UserSearch },
];

const stocuriNav = [
    { label: 'Dashboard Stocuri', href: '/stocuri', icon: Package },
    { label: 'Intrare', href: '/stocuri/intrare', icon: PlusCircle },
    { label: 'Ieșire', href: '/stocuri/iesire', icon: MinusCircle },
    { label: 'Căutare', href: '/stocuri/cautare', icon: Search },
    { label: 'Raport', href: '/stocuri/raport', icon: FileText },
];

const hotelNav = [
    { label: 'Registru Hotel', href: '/hotel', icon: Hotel },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!loading && !user) {
        router.push('/login');
        return null;
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>Se încarcă...</div>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar hide-mobile">
                {/* Logo */}
                <div style={{
                    padding: '20px 16px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        overflow: 'hidden', flexShrink: 0,
                    }}>
                        <Image
                            src="/logo.svg"
                            alt="Anvelope Ungheni"
                            width={36}
                            height={36}
                            style={{ borderRadius: 8, objectFit: 'cover' }}
                        />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em' }}>ANVELOPE</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Ungheni</div>
                    </div>
                </div>

                {/* Nav sections */}
                <div style={{ flex: 1, padding: '12px 0' }}>

                    {/* Fișe Service */}
                    <div style={{ marginBottom: 4 }}>
                        <div style={{
                            padding: '0 16px 6px',
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            Fișe Service
                        </div>
                        {fiseNav.map(item => (
                            <Link key={item.href} href={item.href}
                                className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                                <item.icon size={16} strokeWidth={1.75} />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 16px' }} />

                    {/* Stocuri */}
                    <div style={{ marginBottom: 4 }}>
                        <div style={{
                            padding: '0 16px 6px',
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            Stocuri
                        </div>
                        {stocuriNav.map(item => (
                            <Link key={item.href} href={item.href}
                                className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                                <item.icon size={16} strokeWidth={1.75} />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 16px' }} />

                    {/* Hotel */}
                    <div>
                        <div style={{
                            padding: '0 16px 6px',
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--text-dim)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            Hotel Anvelope
                        </div>
                        {hotelNav.map(item => (
                            <Link key={item.href} href={item.href}
                                className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                                <item.icon size={16} strokeWidth={1.75} />
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* User + Logout */}
                <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
                    <div style={{
                        padding: '6px 11px 10px',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.full_name}
                        </span>
                        <span className={`badge ${user?.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                            {user?.role}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="nav-item" style={{ color: 'var(--text-dim)' }}>
                        <LogOut size={16} strokeWidth={1.75} />
                        Ieșire
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="bottom-nav show-mobile-only">
                <Link href="/" className={pathname === '/' ? 'active' : ''}>
                    <Home size={22} strokeWidth={1.75} />
                    <span>Acasă</span>
                </Link>
                <Link href="/fise/new" className={pathname === '/fise/new' ? 'active' : ''}>
                    <FilePlus size={22} strokeWidth={1.75} />
                    <span>Fișă Nouă</span>
                </Link>
                <Link href="/clienti" className={pathname === '/clienti' ? 'active' : ''}>
                    <Search size={22} strokeWidth={1.75} />
                    <span>Căutare</span>
                </Link>
                <button onClick={handleLogout}>
                    <LogOut size={22} strokeWidth={1.75} />
                    <span>Ieșire</span>
                </button>
            </nav>
        </>
    );
}
