import { getUserData, userLoginCredentials } from "@/app/actions/user-actions";
import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { IRolesMe, Permission, User, UserRole } from "./definitions";

export const authOptions = {
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const user = await userLoginCredentials({ email, password });

        if (!user.success) return null;

        if (user.data?.message !== "OK") return null;

        const token = user.data?.data;
        if (!token) return null;

        const meData = await getUserData({ apiToken: token });
        const userData = meData.data as unknown as User;

        if (!userData?.id) return null;

        return {
          apiToken: token,
          id: String(userData.id),
          name: userData.name,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
          status: userData.status,
          idEmployee: userData.idEmployee,
          isDoh: userData.isDoh,
          isLeader: userData.isLeader,
          roles: userData.roles,
          twoFactorEnabled: userData.twoFactorEnabled === true,
          twoFactorPending: userData.twoFactorPending === true,
          enableTutorials: userData.enableTutorials !== false,
          sessionType: userData.sessionType,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 10 * 365 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      // Tras verificar el código 2FA se reemplaza el token. Los datos se vuelven a leer
      // de /me con el token nuevo, nunca se toman tal cual de lo que manda el cliente.
      if (trigger === "update" && session?.user?.apiToken) {
        const newToken = String(session.user.apiToken);
        const meData = await getUserData({ apiToken: newToken });
        const userData = meData.data as unknown as User;

        if (meData.success && userData?.id) {
          token.apiToken = newToken;
          token.id = String(userData.id);
          token.name = userData.name;
          token.email = userData.email;
          token.role = userData.role;
          token.permissions = userData.permissions;
          token.status = userData.status;
          token.idEmployee = userData.idEmployee;
          token.isDoh = userData.isDoh;
          token.isLeader = userData.isLeader;
          token.roles = userData.roles;
          token.twoFactorEnabled = userData.twoFactorEnabled === true;
          token.twoFactorPending = userData.twoFactorPending === true;
          token.enableTutorials = userData.enableTutorials !== false;
          token.sessionType = userData.sessionType;
        }
      }

      // Al cambiar "Mostrar tutoriales" en el perfil, el valor se vuelve a leer de /me
      // con el token actual (no se toma lo que manda el cliente)
      if (trigger === "update" && session?.refreshTutorials && token.apiToken) {
        const meData = await getUserData({ apiToken: String(token.apiToken) });
        const userData = meData.data as unknown as User;
        if (meData.success && userData?.id) {
          token.enableTutorials = userData.enableTutorials !== false;
        }
      }

      if (user) {
        token.apiToken = user.apiToken;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.permissions = user.permissions;
        token.status = user.status;
        token.idEmployee = user.idEmployee;
        token.isDoh = user.isDoh;
        token.isLeader = user.isLeader;
        token.roles = user.roles;
        token.twoFactorEnabled = user.twoFactorEnabled;
        token.twoFactorPending = user.twoFactorPending;
        token.enableTutorials = user.enableTutorials;
        token.sessionType = user.sessionType;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.apiToken = token.apiToken as string;
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        session.user.permissions = token.permissions as Permission[];
        session.user.status = token.status as 1 | 2 | 3;
        session.user.idEmployee = token.idEmployee as number;
        session.user.isDoh = token.isDoh as boolean;
        session.user.isLeader = token.isLeader as boolean;
        session.user.roles = token.roles as IRolesMe;
        session.user.twoFactorEnabled = token.twoFactorEnabled === true;
        session.user.twoFactorPending = token.twoFactorPending === true;
        // Las sesiones iniciadas antes de este campo no lo traen: se muestran los tutoriales
        session.user.enableTutorials = token.enableTutorials !== false;
        session.user.sessionType = token.sessionType as "user" | "employee" | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth(authOptions);
