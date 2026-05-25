import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  location: string;
};

export type Building = {
  id: string;
  name: string;
  project_id: string;
  image_url: string | null;
  floors: number | null;
  units_count: number | null;
  projects: Project;
};

export type Unit = {
  id: string;
  unit_number: string;
  floor: number;
  tower: string | null;
  building_id: string;
  buildings: Building;
};

export type Resident = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  units: Unit;
  [key: string]: unknown;
};

type AuthContextValue = {
  resident: Resident | null;
  session: Session | null;
  loading: boolean;
  sendOTP: (email: string) => Promise<{ error: string | null }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchResident(email: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select(
      '*, units(id, unit_number, floor, tower, building_id, buildings(id, name, image_url, floors, units_count, project_id, projects(id, name, location)))'
    )
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] fetchResident error:', error.message);
    return null;
  }

  return data as Resident | null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore existing session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const s = data.session ?? null;
      setSession(s);
      if (s?.user?.email) {
        const r = await fetchResident(s.user.email);
        if (mounted) setResident(r);
      }
      if (mounted) setLoading(false);
    });

    // Listen for auth state changes (token refresh, sign-out, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
      if (s?.user?.email) {
        const r = await fetchResident(s.user.email);
        if (mounted) setResident(r);
      } else {
        setResident(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ── sendOTP ────────────────────────────────────────────────────────────────

  const sendOTP = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  // ── verifyOTP ──────────────────────────────────────────────────────────────

  const verifyOTP = async (
    email: string,
    token: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      return { error: error.message };
    }

    const s = data.session ?? null;
    setSession(s);

    if (s?.user?.email) {
      const r = await fetchResident(s.user.email);
      setResident(r);
    }

    return { error: null };
  };

  // ── signOut ────────────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setResident(null);
  };

  return (
    <AuthContext.Provider value={{ resident, session, loading, sendOTP, verifyOTP, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
