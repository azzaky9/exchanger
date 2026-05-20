import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: '/signin',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl, headers } }) {
            const isLoggedIn = !!auth?.user;
            const isApiRoute = nextUrl.pathname.startsWith('/api') && !nextUrl.pathname.startsWith('/api/auth');
            const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard');

            // Routes that allow API Key access
            const isApiKeyRoute = [
                '/api/transactions/check-settlement',
                '/api/transactions/settlement',
                '/api/transactions/upload-invoice',
                '/api/transactions/upload-tx',
                '/api/transactions/create-exchange',
                '/api/exchange-rates/current',
                '/api/exchange-rates/reference-rate'
            ].some(route => nextUrl.pathname.startsWith(route));

            const hasApiKey = headers.get('Authorization')?.startsWith('users API-Key ');

            if (isApiRoute) {
                if (isApiKeyRoute && hasApiKey) {
                    return true; // Bypass NextAuth, allow route handler to validate API Key
                }
                if (!isLoggedIn) {
                    return Response.json({ error: "Unauthorized" }, { status: 401 });
                }
            }

            if (isDashboardRoute) {
                if (!isLoggedIn) {
                    return false; // automatically redirects to pages.signIn
                }
            }

            return true;
        },
        jwt({ token, user }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (user) token.role = (user as any).role
            return token
        },
        session({ session, token }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session.user as any).role = token.role
            return session
        },
    },
    providers: [],
} satisfies NextAuthConfig;
