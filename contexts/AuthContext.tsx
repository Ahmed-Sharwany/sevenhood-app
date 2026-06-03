import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications } from '@/lib/notifications';

// ─── JWT Claim Helpers ────────────────────────────────────────────────────────

/**
 * Extract custom claims injected by the auth-hook Edge Function.
 * Falls back gracefully if the hook hasn't run yet (e.g. existing sessions).
 */
function getClaimsFromSession(session: Session | null) {
  if (!session) return null;
  // Supabase stores the decoded JWT payload in session.user.app_metadata
  // but custom hook claims land in the raw JWT under the top-level payload.
  // We decode the access_token manually to get them.
  try {
    const [, payload] = session.access_token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      resident_id:  decoded.resident_id  as string | null,
      unit_id:      decoded.unit_id      as string | null,
      building_id:  decoded.building_id  as string | null,
      project_id:   decoded.project_id   as string | null,
      role:         decoded.role         as string | null,
      language:     (decoded.language    as 'en' | 'ar') ?? 'en',
    };
  } catch {
    return null;
  }
}

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
  language: 'en' | 'ar';
  onboarding_completed: boolean;
  activated_at: string | null;
  units: Unit;
  [key: string]: unknown;
};

/**
 * Snapshot of a resident_invitation row returned by verify_invitation().
 * Held in context while the resident completes sign-up / OTP verification.
 */
export type PendingInvitation = {
  invitation_id: string;
  language: 'en' | 'ar';
  sent_to_email: string | null;
  resident: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  unit: {
    id: string;
    unit_number: string;
    floor: number | null;
    tower: string | null;
    bedrooms: number | null;
    area_sqm: number | null;
  };
  building: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
    location: string | null;
  };
};

export type JwtClaims = {
  resident_id:  string | null;
  unit_id:      string | null;
  building_id:  string | null;
  project_id:   string | null;
  role:         string | null;
  language:     'en' | 'ar';
};

type AuthContextValue = {
  resident: Resident | null;
  session: Session | null;
  claims: JwtClaims | null;
  loading: boolean;

  // ── Existing auth ──────────────────────────────────────────
  sendOTP:   (email: string) => Promise<{ error: string | null }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut:   () => Promise<void>;

  // ── Invitation flow ────────────────────────────────────────
  /** Pending invitation being processed (between verify and accept steps) */
  pendingInvitation: PendingInvitation | null;

  /** Validate a deep-link token (PATH 1: operator-initiated) */
  verifyInvitationToken: (token: string) => Promise<{ error: string | null }>;

  /** Validate an activation code (PATH 2: self-serve, e.g. "ABCD-1234") */
  verifyActivationCode: (code: string) => Promise<{ error: string | null }>;

  /**
   * Link the newly-authenticated auth user to the resident record.
   * Call this AFTER the resident has verified their email OTP, during the invitation flow.
   */
  acceptInvitation: (authUserId: string) => Promise<{ error: string | null }>;

  /** Clear the pending invitation (e.g. on back navigation) */
  clearPendingInvitation: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fast path: reconstruct the Resident shell from JWT claims.
 * Used when claims are present so we skip a DB round-trip on app load.
 * The full resident profile (name, avatar, etc.) is still fetched once,
 * but subsequent loads use the cached object.
 */
async function fetchResidentByIdLight(residentId: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select(
      `*, units(
        id, unit_number, floor, tower, building_id,
        buildings(id, name, image_url, floors, units_count, project_id, projects(id, name, location))
      )`
    )
    .eq('id', residentId)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] fetchResidentByIdLight error:', error.message);
    return null;
  }
  return data as Resident | null;
}

async function fetchResidentByEmail(email: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select(
      `*, units(
        id, unit_number, floor, tower, building_id,
        buildings(id, name, image_url, floors, units_count, project_id, projects(id, name, location))
      )`
    )
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] fetchResidentByEmail error:', error.message);
    return null;
  }

  return data as Resident | null;
}

async function fetchResidentByAuthUserId(authUserId: string): Promise<Resident | null> {
  const { data, error } = await supabase
    .from('residents')
    .select(
      `*, units(
        id, unit_number, floor, tower, building_id,
        buildings(id, name, image_url, floors, units_count, project_id, projects(id, name, location))
      )`
    )
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] fetchResidentByAuthUserId error:', error.message);
    return null;
  }

  return data as Resident | null;
}

/**
 * Parse the JSON returned by verify_invitation() RPC into PendingInvitation.
 * Returns null if the result is not valid.
 */
function parseInvitationResult(result: unknown): PendingInvitation | null {
  if (typeof result !== 'object' || result === null) return null;
  const r = result as Record<string, unknown>;
  if (!r.valid) return null;
  return result as PendingInvitation;
}

/**
 * Resolve a resident from a session.
 * Uses JWT claims (fast path) when available, falls back to DB lookup.
 */
async function resolveResident(session: Session): Promise<Resident | null> {
  const claims = getClaimsFromSession(session);

  // Fast path: JWT has resident_id from the auth hook
  if (claims?.resident_id) {
    return fetchResidentByIdLight(claims.resident_id);
  }

  // Slow path: hook hasn't run or session predates it
  return fetchResidentByAuthUserId(session.user.id)
    ?? (session.user.email ? fetchResidentByEmail(session.user.email) : null);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,            setSession]            = useState<Session | null>(null);
  const [resident,           setResident]           = useState<Resident | null>(null);
  const [claims,             setClaims]             = useState<JwtClaims | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [pendingInvitation,  setPendingInvitation]  = useState<PendingInvitation | null>(null);

  // Register for push notifications whenever a resident logs in
  useEffect(() => {
    if (resident?.id) {
      registerForPushNotifications(resident.id).catch(console.warn);
    }
  }, [resident?.id]);

  // On mount: restore existing session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const s = data.session ?? null;
      setSession(s);
      setClaims(getClaimsFromSession(s));
      if (s?.user) {
        const r = await resolveResident(s);
        if (mounted) setResident(r);
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
      setClaims(getClaimsFromSession(s ?? null));
      if (s?.user) {
        const r = await resolveResident(s);
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

  // ── sendOTP ──────────────────────────────────────────────────────────────
  // Used by the standard login flow AND during invitation OTP verification.

  const sendOTP = async (email: string): Promise<{ error: string | null }> => {
    // If we have a pending invitation, use the resident's email from the invitation.
    // Otherwise, check the resident exists in our whitelist.
    if (!pendingInvitation) {
      const existing = await fetchResidentByEmail(email);
      if (!existing) {
        return { error: 'This email is not registered. Please contact your building management.' };
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  // ── verifyOTP ────────────────────────────────────────────────────────────

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

    if (s?.user) {
      // If there's a pending invitation, accept it now to link auth_user_id → resident
      if (pendingInvitation) {
        const acceptResult = await acceptInvitation(s.user.id);
        if (acceptResult.error) {
          // Non-fatal: resident is authed, but link failed — log and continue
          console.warn('[AuthContext] acceptInvitation warning:', acceptResult.error);
        }
        // Fetch resident fresh after link
        const r = await fetchResidentByAuthUserId(s.user.id);
        if (!r) {
          await supabase.auth.signOut();
          setSession(null);
          return { error: 'Account not found. Please contact your building management.' };
        }
        setResident(r);
        setPendingInvitation(null);
        return { error: null };
      }

      // Standard flow: lookup by auth_user_id or email
      const r = await fetchResidentByAuthUserId(s.user.id)
        ?? await fetchResidentByEmail(email);

      if (!r) {
        await supabase.auth.signOut();
        setSession(null);
        return { error: 'Account not found. Please contact your building management.' };
      }
      setResident(r);
    }

    return { error: null };
  };

  // ── signOut ──────────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setResident(null);
    setClaims(null);
    setPendingInvitation(null);
  };

  // ── verifyInvitationToken ────────────────────────────────────────────────

  const verifyInvitationToken = async (
    token: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.rpc('verify_invitation', {
      p_token: token,
      p_activation_code: null,
    });

    if (error) {
      return { error: error.message };
    }

    const inv = parseInvitationResult(data);
    if (!inv) {
      const errMsg = (data as Record<string, string>)?.message
        ?? (data as Record<string, string>)?.error
        ?? 'Invalid or expired invitation link.';
      return { error: errMsg };
    }

    setPendingInvitation(inv);
    return { error: null };
  };

  // ── verifyActivationCode ─────────────────────────────────────────────────

  const verifyActivationCode = async (
    code: string
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.rpc('verify_invitation', {
      p_token: null,
      p_activation_code: code,
    });

    if (error) {
      return { error: error.message };
    }

    const inv = parseInvitationResult(data);
    if (!inv) {
      const raw = data as Record<string, string>;
      // Map DB error codes to user-friendly messages
      if (raw?.error === 'already_used') {
        return {
          error: 'This code has already been used. If this is a mistake, contact your building management.',
        };
      }
      if (raw?.error === 'expired') {
        return {
          error: 'This code has expired. Please ask your operator to send you a new one.',
        };
      }
      if (raw?.error === 'revoked') {
        return {
          error: 'This invitation has been cancelled. Please contact your building management.',
        };
      }
      return { error: raw?.message ?? 'Invalid activation code. Please check and try again.' };
    }

    setPendingInvitation(inv);
    return { error: null };
  };

  // ── acceptInvitation ─────────────────────────────────────────────────────

  const acceptInvitation = async (
    authUserId: string
  ): Promise<{ error: string | null }> => {
    if (!pendingInvitation) {
      return { error: 'No pending invitation to accept.' };
    }

    const { data, error } = await supabase.rpc('accept_invitation', {
      p_invitation_id: pendingInvitation.invitation_id,
      p_auth_user_id:  authUserId,
      p_ip:            null, // IP not available client-side
    });

    if (error) {
      return { error: error.message };
    }

    const result = data as Record<string, unknown>;
    if (!result?.success) {
      return { error: (result?.error as string) ?? 'Failed to activate account.' };
    }

    return { error: null };
  };

  // ── clearPendingInvitation ────────────────────────────────────────────────

  const clearPendingInvitation = () => setPendingInvitation(null);

  return (
    <AuthContext.Provider
      value={{
        resident,
        session,
        claims,
        loading,
        sendOTP,
        verifyOTP,
        signOut,
        pendingInvitation,
        verifyInvitationToken,
        verifyActivationCode,
        acceptInvitation,
        clearPendingInvitation,
      }}
    >
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
