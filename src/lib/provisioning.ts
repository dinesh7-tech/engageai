import { supabase } from "@/integrations/supabase/client";

export interface ProvisioningStatus {
  workspace_id: string;
  current_step: string;
  completed_steps: string[];
  last_error?: string | null;
}

export class WorkspaceProvisioningService {
  /**
   * Idempotently upsert user profile if it doesn't exist
   * @deprecated Managed by create_workspace_transaction SQL RPC.
   */
  static async ensureProfile(userId: string, fullName: string): Promise<void> {
    // Deprecated: Managed by create_workspace_transaction
  }

  /**
   * Idempotently create workspace, membership, setup tracking, and config templates
   */
  static async provisionWorkspace(params: {
    userId?: string;
    name: string;
    category: string;
    timezone: string;
    country: string;
  }): Promise<string> {
    const { data: workspaceId, error } = await (supabase as any).rpc(
      "create_workspace_transaction",
      {
        p_name: params.name,
        p_category: params.category,
        p_timezone: params.timezone,
        p_country: params.country,
      }
    );

    if (error) {
      throw new Error(`Workspace provisioning failed: ${error.message}`);
    }

    if (!workspaceId) {
      throw new Error("Workspace provisioning failed: No workspace ID returned");
    }

    return workspaceId;
  }

  /**
   * @deprecated Managed by create_workspace_transaction
   */
  private static async ensureProvisioningStatusRecord(workspaceId: string): Promise<void> {
    // Deprecated: Managed by create_workspace_transaction
  }

  /**
   * @deprecated Managed by create_workspace_transaction
   */
  private static async seedInitialConfigs(workspaceId: string, category: string): Promise<void> {
    // Deprecated: Managed by create_workspace_transaction
  }

  /**
   * Retrieve current onboarding state for recovery checks
   */
  static async getProvisioningStatus(workspaceId: string): Promise<ProvisioningStatus | null> {
    const { data, error } = await (supabase as any)
      .from("workspace_provisioning_status")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) return null;
    return data as ProvisioningStatus | null;
  }
}
