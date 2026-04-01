import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// FIX C8: Restored session verification middleware
export async function middleware(request: Request) {
    const url = new URL(request.url);

    // Public routes bypass auth
    const publicRoutes = ['/login', '/_next', '/static', '/favicon.ico', '/api'];
    if (publicRoutes.some(route => url.pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { /* noop for middleware */ },
            },
        }
    );

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        return NextResponse.next();
    } catch (err) {
        console.error('Middleware auth error:', err);
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
