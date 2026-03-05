'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from '@/types';

interface AuthUser {
    email: string;
    role: UserRole;
    full_name: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => { success: boolean; error?: string };
    logout: () => void;
}

const USERS: Record<string, { password: string; role: UserRole; full_name: string }> = {
    'cristiermurache@gmail.com': { password: 'ParolaAdmin123!', role: 'admin', full_name: 'Administrator' },
    'ermurachealex108@gmail.com': { password: 'ParolaReceptie456!', role: 'receptioner', full_name: 'Recepționeră' },
};

const AuthContext = createContext<AuthContextType>({
    user: null, loading: true,
    login: () => ({ success: false }),
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('au_user');
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
        }
        setLoading(false);
    }, []);

    const login = (email: string, password: string) => {
        const entry = USERS[email.toLowerCase()];
        if (!entry || entry.password !== password) {
            return { success: false, error: 'Email sau parolă greșită' };
        }
        const u: AuthUser = { email: email.toLowerCase(), role: entry.role, full_name: entry.full_name };
        setUser(u);
        localStorage.setItem('au_user', JSON.stringify(u));
        return { success: true };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('au_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
