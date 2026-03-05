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
    { label: 'Acasă', href: '/dashboard', icon: Home },
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

    // Redirect to login if not authenticated
    if (!loading && !user) {
        router.push('/login');
        return null;
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--blue)', fontSize: 16 }}>Se încarcă...</div>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar hide-mobile">
                {/* Logo */}
                <div style={{ padding: '20px 20px 16px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 8px',
                        overflow: 'hidden',
                        filter: 'drop-shadow(0 0 20px rgba(33,150,243,0.35))',
                    }}>
                        <Image
                            src="/logo.svg"
                            alt="Anvelope Ungheni"
                            width={72}
                            height={72}
                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>ANVELOPE</div>
                    <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>Ungheni</div>
                </div>

                {/* Fișe Service Nav */}
                <div style={{ padding: '16px 0 8px' }}>
                    <div style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        🔧 Fișe Service
                    </div>
                    {fiseNav.map(item => (
                        <Link key={item.href} href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Stocuri Nav */}
                <div style={{ padding: '8px 0' }}>
                    <div style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        📦 Stocuri
                    </div>
                    {stocuriNav.map(item => (
                        <Link key={item.href} href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Hotel Nav */}
                <div style={{ padding: '8px 0' }}>
                    <div style={{ padding: '0 20px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        🏨 Hotel
                    </div>
                    {hotelNav.map(item => (
                        <Link key={item.href} href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* User + Logout */}
                <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {user?.full_name} <span className={`badge ${user?.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>{user?.role}</span>
                    </div>
                    <button onClick={handleLogout} className="nav-item" style={{ color: 'var(--red)' }}>
                        <LogOut size={18} />
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
                <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
                    <Home size={24} />
                    <span>Acasă</span>
                </Link>
                <Link href="/fise/new" className={pathname === '/fise/new' ? 'active' : ''}>
                    <FilePlus size={24} />
                    <span>Adaugă Fișă</span>
                </Link>
                <Link href="/clienti" className={pathname === '/clienti' ? 'active' : ''}>
                    <Search size={24} />
                    <span>Căutare</span>
                </Link>
                <button onClick={handleLogout}>
                    <LogOut size={24} />
                    <span>Ieșire</span>
                </button>
            </nav>
        </>
    );
}
