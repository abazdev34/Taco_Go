import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, status, approved_at, approved_by, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("PROFILE LOAD ERROR:", error.message);
    return null;
  }

  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (session: Session | null) => {
    const currentUser = session?.user ?? null;

    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const prof = await loadProfile(currentUser.id);
    setProfile(prof);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;

    const prof = await loadProfile(user.id);
    setProfile(prof);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const timeoutId = window.setTimeout(() => {
        if (!mounted) return;

        console.warn("AUTH TIMEOUT");

        setUser(null);
        setProfile(null);
        setLoading(false);
      }, 8000);

      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("GET SESSION ERROR:", error.message);
        }

        if (!mounted) return;

        await applySession(session);
      } catch (err) {
        console.error("AUTH INIT ERROR:", err);

        if (!mounted) return;

        setUser(null);
        setProfile(null);
        setLoading(false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!mounted) return;
        void applySession(session);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      alert("Сервер жооп бербей жатат. Интернет/DNS же VPN текшериңиз.");
    }, 10000);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    window.clearTimeout(timeoutId);

    if (error) {
      setLoading(false);
    }

    return { error };
  };

  const signOut = async () => {
    setLoading(true);

    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}