import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const OWNER_LOGINS = ["Harsha240105", "MdShaharali"];

export interface Profile {
  user_id: string;
  role: "owner" | "viewer";
  display_name: string | null;
  avatar_url: string | null;
  login: string | null;
}

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  isOwner: boolean;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, profile: null, isOwner: false, loading: true,
  signInWithGitHub: async () => {}, signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(authUser: User) {
    const meta = authUser.user_metadata;
    const login: string | null = meta?.login ?? meta?.user_name ?? null;
    const avatar: string | null = meta?.avatar_url ?? null;
    const name: string | null = meta?.full_name ?? meta?.name ?? login;
    const isOrgOwner = login !== null && OWNER_LOGINS.includes(login);

    let { data } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).single();

    if (!data) {
      const { data: inserted } = await supabase
        .from("profiles")
        .insert({ user_id: authUser.id, role: isOrgOwner ? "owner" : "viewer", display_name: name, avatar_url: avatar, login })
        .select()
        .single();
      data = inserted;
    } else if (isOrgOwner && data.role !== "owner") {
      await supabase.from("profiles").update({ role: "owner" }).eq("user_id", authUser.id);
      data = { ...data, role: "owner" };
    }

    setProfile(data);
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
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, isOwner: profile?.role === "owner", loading, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
