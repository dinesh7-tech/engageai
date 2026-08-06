import { createServerFn } from "@tanstack/react-start";

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
};

export interface DemoSignUpInput {
  email: string;
  password: string;
  fullName: string;
}

export const demoSignUpUser = createServerFn({ method: "POST" })
  .inputValidator((input: DemoSignUpInput) => input)
  .handler(async ({ data }) => {
    if (!data || !data.email || !data.password) {
      throw new Error("Email and password are required.");
    }

    const admin = await getAdminClient();
    const email = data.email.trim().toLowerCase();

    // 1. Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email);

    if (existing) {
      // User exists. Update password and confirm email to allow instant login.
      const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(
        existing.id,
        {
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.fullName.trim() }
        }
      );

      if (updateErr) {
        throw new Error(`User exists, but updating credentials failed: ${updateErr.message}`);
      }

      return {
        success: true,
        isExisting: true,
        user: updated.user,
        message: "Account already exists. Credentials updated for instant demo login."
      };
    }

    // 2. Create user with email_confirm: true using admin client (bypasses SMTP and rate limits)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim() }
    });

    if (createErr) {
      throw new Error(`Failed to create user account: ${createErr.message}`);
    }

    return {
      success: true,
      isExisting: false,
      user: newUser.user,
      message: "Account created successfully. Email verification is disabled for this demo."
    };
  });
