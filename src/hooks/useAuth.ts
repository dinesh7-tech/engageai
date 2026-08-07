import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | null>(null);

  useEffect(() => {
    // Check hash/query for recovery type on mount
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (hash.includes("type=recovery") || search.includes("type=recovery")) {
        setIsPasswordRecovery(true);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      const u = sess?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes cleanly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setAuthEvent(event);
      const u = session?.user ?? null;
      setUser(u);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setLoading(false);
        // Do NOT fetch profile or trigger dashboard redirects
        return;
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsPasswordRecovery(false);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        // If it's a normal signed-in session without recovery type in hash
        if (typeof window !== "undefined" && !window.location.hash.includes("type=recovery")) {
          setIsPasswordRecovery(false);
        }
        if (u) fetchProfile(u.id);
        else setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      setProfile(data ? { id: data.id, full_name: data.full_name, avatar_url: data.avatar_url } : null);
    } catch (e) {
      console.warn("Fetch profile failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  return {
    user,
    profile,
    loading,
    signOut,
    initials,
    isPasswordRecovery,
    authEvent
  };
}

