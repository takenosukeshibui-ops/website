import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function middleware(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const protectedRoutes = ['/dashboard'];
    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
