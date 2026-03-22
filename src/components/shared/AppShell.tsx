'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import {
    Home, FilePlus, Search, LogOut,
    PlusCircle, MinusCircle, FileText,
    Package, UserSearch, Hotel, ChevronLeft, ChevronRight,
    Sun, Moon, Plus
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
                padding: collapsed ? '9px' : '9px 12px',
            }}
        >
            <Icon size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
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
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const savedCollapsed = localStorage.getItem('sidebar-collapsed');
        if (savedCollapsed === 'true') setCollapsed(true);
        const savedDark = localStorage.getItem('dark-mode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedDark !== null ? savedDark === 'true' : prefersDark;
        setDarkMode(isDark);
        document.documentElement.classList.toggle('dark', isDark);
        setMounted(true);
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const next = !prev;
            localStorage.setItem('dark-mode', String(next));
            document.documentElement.classList.toggle('dark', next);
            return next;
        });
    };

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
                    padding: collapsed ? '18px 12px 14px' : '18px 16px 14px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 12,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    transition: 'padding 0.22s, gap 0.22s',
                }}>
                    <div style={{
                        width: collapsed ? 40 : 48, height: collapsed ? 40 : 48,
                        borderRadius: 12,
                        overflow: 'hidden', flexShrink: 0,
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                        transition: 'width 0.22s, height 0.22s',
                    }}>
                        <Image
                            src="/logo-transparent.png"
                            alt="Anvelope Ungheni"
                            width={collapsed ? 40 : 48}
                            height={collapsed ? 40 : 48}
                            style={{ objectFit: 'contain', padding: 4 }}
                        />
                    </div>
                    {!collapsed && (
                        <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
                            <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.05em', whiteSpace: 'nowrap', color: 'var(--text)' }}>ANVELOPE</div>
                            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.04em' }}>Ungheni</div>
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

                {/* User + Logout + Dark Mode */}
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
                    <div style={{ display: 'flex', gap: 4, padding: collapsed ? '0 0 4px' : '0 0 4px' }}>
                        <button
                            onClick={toggleDarkMode}
                            className="nav-item"
                            title={darkMode ? 'Mod luminos' : 'Mod întunecat'}
                            style={{
                                color: 'var(--text-dim)',
                                justifyContent: 'center',
                                padding: '8px',
                                flex: collapsed ? undefined : '0 0 auto',
                                width: collapsed ? '100%' : 36,
                            }}
                        >
                            {darkMode
                                ? <Sun size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                                : <Moon size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                            }
                        </button>
                        <button
                            onClick={handleLogout}
                            className="nav-item"
                            title={collapsed ? 'Ieșire' : undefined}
                            style={{
                                color: 'var(--text-dim)',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                padding: collapsed ? '8px' : '8px 11px',
                                flex: 1,
                            }}
                        >
                            <LogOut size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                            {!collapsed && 'Ieșire'}
                        </button>
                    </div>
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
                    <Home size={22} strokeWidth={2.2} />
                    <span>Acasă</span>
                </Link>
                <Link href="/fise/new" className={pathname === '/fise/new' ? 'active' : ''}>
                    <FilePlus size={22} strokeWidth={2.2} />
                    <span>Fișă Nouă</span>
                </Link>
                <Link href="/clienti" className={pathname === '/clienti' ? 'active' : ''}>
                    <Search size={22} strokeWidth={2.2} />
                    <span>Căutare</span>
                </Link>
                <button onClick={handleLogout}>
                    <LogOut size={22} strokeWidth={2.2} />
                    <span>Ieșire</span>
                </button>
            </nav>

            {/* FAB — desktop only, hidden on /fise/new */}
            {pathname !== '/fise/new' && (
                <Link href="/fise/new" className="fab hide-mobile" title="Fișă Nouă">
                    <Plus size={24} strokeWidth={2.5} />
                </Link>
            )}
        </>
    );
}
