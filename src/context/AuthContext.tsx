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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, status, approved_at, approved_by, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("PROFILE ERROR:", error.message);
      return null;
    }

    return data as Profile | null;
  } catch (err) {
    console.error("PROFILE LOAD ERROR:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applySession = async (session: Session | null) => {
      const currentUser = session?.user ?? null;

      if (!active) return;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        if (active) setLoading(false);
        return;
      }

      const prof = await loadProfile(currentUser.id);

      if (!active) return;
      setProfile(prof);
      setLoading(false);
    };

    const init = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("GET SESSION ERROR:", error.message);
        }

        await applySession(session);
      } catch (err) {
        console.error("AUTH INIT ERROR:", err);
        if (!active) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      // loading'ди улам true кыла бербейбиз
      void applySession(session);
    });

    const emergencyStop = setTimeout(() => {
      if (!active) return;
      setLoading(false);
    }, 5000);

    return () => {
      active = false;
      clearTimeout(emergencyStop);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
    }

    return { error };
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SIGN OUT ERROR:", err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}