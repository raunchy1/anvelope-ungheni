'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import {
    Home, FilePlus, Search, LogOut,
    PlusCircle, MinusCircle, FileText,
    Package, UserSearch, Hotel, ChevronLeft, ChevronRight
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

function NavItem({ item, collapsed, pathname }: {
    item: { label: string; href: string; icon: React.ElementType };
    collapsed: boolean;
    pathname: string;
}) {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    return (
        <Link
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '8px' : '8px 11px',
            }}
        >
            <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.label}</span>}
        </Link>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved === 'true') setCollapsed(true);
        setMounted(true);
    }, []);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            localStorage.setItem('sidebar-collapsed', String(!prev));
            return !prev;
        });
    };

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

    const sidebarWidth = collapsed ? 64 : 240;

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className="sidebar hide-mobile"
                style={{
                    width: sidebarWidth,
                    transition: mounted ? 'width 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none',
                    overflow: 'hidden',
                }}
            >
                {/* Logo + collapse toggle */}
                <div style={{
                    padding: collapsed ? '20px 14px 16px' : '20px 16px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    transition: 'padding 0.22s, gap 0.22s',
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
                    {!collapsed && (
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>ANVELOPE</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>Ungheni</div>
                        </div>
                    )}

                    {/* Collapse toggle */}
                    <button
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Extinde sidebar' : 'Restrânge sidebar'}
                        className="sidebar-toggle-btn"
                    >
                        {collapsed
                            ? <ChevronRight size={13} strokeWidth={2.5} />
                            : <ChevronLeft size={13} strokeWidth={2.5} />
                        }
                    </button>
                </div>

                {/* Nav sections */}
                <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                    {!collapsed && (
                        <div style={{ padding: '0 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Fișe Service
                        </div>
                    )}
                    {collapsed && <div style={{ height: 6 }} />}
                    {fiseNav.map(item => (
                        <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: collapsed ? '8px 10px' : '8px 16px' }} />

                    {!collapsed && (
                        <div style={{ padding: '0 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Stocuri
                        </div>
                    )}
                    {collapsed && <div style={{ height: 6 }} />}
                    {stocuriNav.map(item => (
                        <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: collapsed ? '8px 10px' : '8px 16px' }} />

                    {!collapsed && (
                        <div style={{ padding: '0 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Hotel Anvelope
                        </div>
                    )}
                    {collapsed && <div style={{ height: 6 }} />}
                    {hotelNav.map(item => (
                        <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
                    ))}
                </div>

                {/* User + Logout */}
                <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
                    {!collapsed && (
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
                    )}
                    <button
                        onClick={handleLogout}
                        className="nav-item"
                        title={collapsed ? 'Ieșire' : undefined}
                        style={{
                            color: 'var(--text-dim)',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? '8px' : '8px 11px',
                        }}
                    >
                        <LogOut size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                        {!collapsed && 'Ieșire'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className="main-content"
                style={{
                    marginLeft: sidebarWidth,
                    transition: mounted ? 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none',
                }}
            >
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
