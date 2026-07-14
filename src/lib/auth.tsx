import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const OWNER_LOGINS = ["Harsha240105", "MdShaharali"];

interface AuthCtx {
  user: User | null;
  isOwner: boolean;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, isOwner: false, loading: true,
  signInWithGitHub: async () => {}, signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error("OAuth error:", error.message);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function getLogin(): string | null {
    if (!user) return null;
    const m = user.user_metadata;
    return m?.login ?? m?.user_name ?? null;
  }

  function getAvatar(): string | null {
    if (!user) return null;
    return user.user_metadata?.avatar_url ?? null;
  }

  function getName(): string {
    if (!user) return "User";
    const m = user.user_metadata;
    return m?.full_name ?? m?.name ?? m?.login ?? "User";
  }

  const login = getLogin();
  const isOwner = login !== null && OWNER_LOGINS.includes(login);

  return (
    <AuthContext.Provider value={{ user, isOwner, loading, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
