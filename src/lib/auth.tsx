import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const OWNER_LOGINS = ["Harsha240105", "MdShaharali"];

interface AuthCtx {
  user: User | null;
  isOwner: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, isOwner: false, loading: true, authError: null,
  signInWithGitHub: async () => {}, signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error_description");
    if (err) {
      setAuthError(decodeURIComponent(err));
      window.history.replaceState({}, "", window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) { setAuthError(error.message); setLoading(false); return; }
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth]", event, session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user);
      else { setIsOwner(false); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkRole(authUser: User) {
    const login = authUser.user_metadata?.login ?? authUser.user_metadata?.user_name ?? null;
    const owner = login !== null && OWNER_LOGINS.includes(login);
    setIsOwner(owner);

    if (owner) {
      const { error } = await supabase.from("profiles").upsert(
        { user_id: authUser.id, role: "owner", display_name: authUser.user_metadata?.full_name, avatar_url: authUser.user_metadata?.avatar_url },
        { onConflict: "user_id" }
      );
      if (error) console.warn("[auth] profile upsert:", error.message);
    }

    setLoading(false);
  }

  const signInWithGitHub = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      console.error("[auth] OAuth error:", error.message);
    }
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsOwner(false);
  }

  return (
    <AuthContext.Provider value={{ user, isOwner, loading, authError, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
