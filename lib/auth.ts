import { AuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: `openid email profile ${DRIVE_SCOPE}`,
          access_type: 'offline',
          prompt: 'select_account consent', // consent ensures Drive scope is always granted
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: store tokens from account
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        return token;
      }

      // Token still valid
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Token expired — refresh it
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        });

        const refreshed = await response.json();

        if (!response.ok) throw refreshed;

        return {
          ...token,
          accessToken: refreshed.access_token,
          accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
          // Keep old refresh token if new one not provided
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error('Token refresh error:', error);
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },

    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export async function auth() {
  const session = await getServerSession(authOptions);
  return session as (typeof session & { accessToken?: string; error?: string }) | null;
}
