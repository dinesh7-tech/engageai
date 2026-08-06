import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EngageAI" },
      { name: "description", content: "Manage your EngageAI profile, workspace members, roles, channels and notification preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, initials } = useAuth();
  const { activeWorkspace } = useActiveWorkspace();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    whatsapp: true,
    email: true,
    push: false,
    weeklyDigest: true,
    aiSuggestions: true,
  });

  useEffect(() => {
    if (profile) setName(profile.full_name || "");
    if (user) setEmail(user.email || "");
  }, [profile, user]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Profile, team, channels and workspace preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="members">Members & roles</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="p-name">Full name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={email} disabled />
            </div>
            <Separator />
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="panel divide-y divide-border">
            <div className="flex flex-wrap items-center gap-3 p-5">
              <div className="min-w-0">
                <p className="font-medium">{profile?.full_name || "Owner"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Owner</Badge>
            </div>
          </div>
          <Button className="mt-4" onClick={() => toast.success("Invite link copied to clipboard")}>
            Invite teammate
          </Button>
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="wa">WhatsApp Business number</Label>
              <Input id="wa" placeholder="+91 XXXXXXXXXX" />
              <p className="text-xs text-muted-foreground">
                Connect a Twilio or Meta Cloud API account to start sending automated messages.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Email sender</Label>
              <Input id="sender" placeholder="hello@company.com" />
            </div>
            <Separator />
            <Button onClick={() => toast.success("Channel settings saved")}>Save channels</Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="panel max-w-xl divide-y divide-border">
            {([
              ["whatsapp", "WhatsApp alerts", "Queue, event and feedback alerts over WhatsApp"],
              ["email", "Email alerts", "Daily summaries and escalations"],
              ["push", "Push notifications", "Browser push for urgent events"],
              ["weeklyDigest", "Weekly digest", "Performance recap every Monday"],
              ["aiSuggestions", "AI suggestions", "Proactive recommendations from the copilot"],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  className="ml-auto"
                  checked={prefs[key]}
                  onCheckedChange={(v) => {
                    setPrefs((p) => ({ ...p, [key]: v }));
                    toast.success(`${label} ${v ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
