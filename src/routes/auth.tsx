import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EngageAI" },
      { name: "description", content: "Sign in to EngageAI to manage queues, events, feedback and automations from one workspace." },
      { property: "og:title", content: "Sign in — EngageAI" },
      { property: "og:description", content: "One login for every EngageAI business automation module." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        checkWorkspaceAndRedirect();
      }
    });
  }, []);

  async function checkWorkspaceAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      navigate({ to: "/app" });
    } else {
      navigate({ to: "/onboarding" });
    }
  }

  async function handleLogin() {
    if (!email.includes("@") || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    await checkWorkspaceAndRedirect();
  }

  async function handleSignup() {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.includes("@") || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    
    // Explicitly wait for session stabilization
    let retries = 5;
    while (retries > 0) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) break;
      await new Promise((r) => setTimeout(r, 200));
      retries--;
    }
    
    navigate({ to: "/onboarding" });
  }

  async function handleReset() {
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Reset link sent to ${email}`);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="mb-6 flex items-center justify-center">
          <Logo />
        </Link>

        <div className="panel p-6 sm:p-8">
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Log in</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
              <TabsTrigger value="forgot" className="flex-1">Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="l-email">Work email</Label>
                <Input id="l-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-pass">Password</Label>
                <Input id="l-pass" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading} onClick={handleLogin}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-name">Full name</Label>
                <Input id="s-name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-email">Work email</Label>
                <Input id="s-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-pass">Password</Label>
                <Input id="s-pass" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" disabled={loading} onClick={handleSignup}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
              </Button>
            </TabsContent>

            <TabsContent value="forgot" className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                We'll email you a secure link to set a new password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="f-email">Work email</Label>
                <Input id="f-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button className="w-full gap-2" onClick={handleReset}>
                <Mail className="size-4" /> Send reset link
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by JWT sessions, role-based access and workspace isolation.
        </p>
      </motion.div>
    </div>
  );
}
