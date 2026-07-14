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
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkRole(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      await supabase.from("profiles").update({ role: "owner" }).eq("user_id", authUser.id);
    }

    setLoading(false);
  }

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
    setIsOwner(false);
  }

  return (
    <AuthContext.Provider value={{ user, isOwner, loading, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
