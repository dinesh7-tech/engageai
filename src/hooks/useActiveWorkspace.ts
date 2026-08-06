import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  timezone: string;
  country: string;
  plan: string;
  owner_id: string;
}

const STORAGE_KEY = "engage_active_workspace";
const CHANGE_EVENT = "engage_active_workspace_change";

export function useActiveWorkspace() {
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch workspaces the current user is a member of
  const fetchWorkspaces = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setWorkspaceList([]);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setWorkspaceList([]);
      setLoading(false);
      return;
    }

    const wsIds = memberships.map((m) => m.workspace_id);
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name, slug, category, logo_url, timezone, country, plan, owner_id")
      .in("id", wsIds);

    const list = (workspaces || []) as Workspace[];
    setWorkspaceList(list);

    // If stored activeId is not in list, default to first
    if (list.length > 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || !list.find((w) => w.id === stored)) {
        localStorage.setItem(STORAGE_KEY, list[0]!.id);
        setActiveId(list[0]!.id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkspaces();

    const handleStorageChange = () => {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current && current !== activeId) {
        setActiveId(current);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(CHANGE_EVENT, handleStorageChange);
    };
  }, [fetchWorkspaces, activeId]);

  const setActiveWorkspace = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const createWorkspace = async (fields: {
    name: string;
    category: string;
    timezone: string;
    country: string;
    logo_url?: string | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Use the WorkspaceProvisioningService to idempotently perform creation
    const { WorkspaceProvisioningService } = await import("@/lib/provisioning");
    
    // Ensure profile exists first
    await WorkspaceProvisioningService.ensureProfile(user.id, user.user_metadata?.full_name || "");
    
    const wsId = await WorkspaceProvisioningService.provisionWorkspace({
      userId: user.id,
      name: fields.name,
      category: fields.category,
      timezone: fields.timezone,
      country: fields.country,
    });

    // Refresh workspace list
    await fetchWorkspaces();
    setActiveWorkspace(wsId);
    
    // Get provisioned workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", wsId)
      .single();
      
    return ws as Workspace;
  };

  const activeWorkspace = workspaceList.find((w) => w.id === activeId) || workspaceList[0] || null;

  return {
    activeId,
    activeWorkspace,
    workspaceList,
    loading,
    setActiveWorkspace,
    createWorkspace,
    refetch: fetchWorkspaces,
  };
}
