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
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<IProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (currentSession: Session | null) => {
      if (!isMounted) return;

      setLoading(true);

      const currentUser = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const profileData = await fetchProfileById(currentUser.id);
        if (!isMounted) return;
        setProfile(profileData);
      } catch (error) {
        console.error("PROFILE ERROR:", error);
        if (!isMounted) return;
        setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        await applySession(session ?? null);
      } catch (error) {
        console.error("AUTH INIT ERROR:", error);
        if (!isMounted) return;

        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await applySession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    setLoading(true);

    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      setLoading(true);
      const profileData = await fetchProfileById(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error("REFRESH PROFILE ERROR:", error);
      setProfile(null);
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
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}