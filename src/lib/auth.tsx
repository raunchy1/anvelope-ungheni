'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { UserRole } from '@/types';

interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

// FIX C7: Removed hardcoded plaintext passwords - migrated to Supabase Auth
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => ({ success: false }),
    logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // FIX m12: Proper error handling with try-catch
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    await fetchUserProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Auth error:', err);
                setLoading(false);
            }
        };
        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', userId)
                .single();

            if (data) {
                const { data: userData } = await supabase.auth.getUser();
                setUser({
                    id: userId,
                    email: userData.user?.email || '',
                    role: data.role,
                    full_name: data.full_name,
                });
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                return { success: false, error: 'Email sau parolă greșită' };
            }
            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: 'Eroare la autentificare' };
        }
    };

    const logout = async (): Promise<void> => {
        await supabase.auth.signOut();
        setUser(null);
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
