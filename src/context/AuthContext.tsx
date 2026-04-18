import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { fetchProfileById, type IProfileRow } from "../api/profiles";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: IProfileRow | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<IProfileRow | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<IProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (currentSession: Session | null) => {
    const currentUser = currentSession?.user ?? null;

    setSession(currentSession);
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    try {
      const profileData = await fetchProfileById(currentUser.id);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error("PROFILE ERROR:", error);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;
        await applySession(session ?? null);
      } catch (error) {
        console.error("AUTH INIT ERROR:", error);

        if (cancelled) return;
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      setLoading(true);
      void applySession(nextSession ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const refreshProfile = async (): Promise<IProfileRow | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }

    setLoading(true);
    try {
      const profileData = await fetchProfileById(user.id);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error("REFRESH PROFILE ERROR:", error);
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}