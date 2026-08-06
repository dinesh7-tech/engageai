import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, RefreshCw, ArrowRight, Loader2, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Your Email — EngageAI" },
      { name: "description", content: "Verify your email address to continue to EngageAI Onboarding." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Continuously check email verification status via Auth State change & Polling
  useEffect(() => {
    async function checkVerificationState() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      setUserEmail(user.email || "");

      if (user.email_confirmed_at) {
        setIsVerified(true);
        toast.success("Email verified! Redirecting to onboarding...");
        setTimeout(() => {
          navigate({ to: "/onboarding" });
        }, 1500);
      }
    }

    checkVerificationState();

    // Listen for auth state change (e.g. user clicks link in email on same browser)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        toast.success("Email verified successfully!");
        setTimeout(() => {
          navigate({ to: "/onboarding" });
        }, 1500);
      }
    });

    // Interval poll user state every 3.5 seconds
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setIsVerified(true);
        clearInterval(interval);
        setTimeout(() => {
          navigate({ to: "/onboarding" });
        }, 1200);
      }
    }, 3500);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate]);

  const handleManualRefresh = async () => {
    setChecking(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    setChecking(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (user?.email_confirmed_at) {
      setIsVerified(true);
      toast.success("Email verified! Redirecting...");
      setTimeout(() => {
        navigate({ to: "/onboarding" });
      }, 1000);
    } else {
      toast.info("Email not confirmed yet. Please check your inbox or spam folder.");
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || !userEmail) return;
    setResending(true);
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/verify-email` : "https://engageai-gold.vercel.app/verify-email";
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: userEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    setResending(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification link sent! Check your inbox.");
      setCooldown(60);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Premium Aurora Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 my-8"
      >
        <Card className="bg-zinc-900/90 border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <Logo className="h-8" />
            </div>

            <AnimatePresence mode="wait">
              {isVerified ? (
                <motion.div
                  key="verified"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4 py-4"
                >
                  <div className="size-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/10 animate-bounce">
                    <CheckCircle2 className="size-10 text-emerald-400" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">✓ Email Verified!</h2>
                    <p className="text-xs text-zinc-400">
                      Your identity has been authenticated. Redirecting you to onboarding setup...
                    </p>
                  </div>

                  <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 gap-1.5 shadow-lg">
                    <Loader2 className="size-4 animate-spin" /> Moving to Onboarding...
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="unverified"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Verification Mail Graphic */}
                  <div className="relative size-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-2xl">
                    <Mail className="size-10 text-indigo-400 animate-pulse" />
                    <Badge variant="outline" className="absolute -top-2 -right-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">
                      Required
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Email Address</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      We have sent a verification link to{" "}
                      <span className="text-white font-semibold underline decoration-indigo-500/50">{userEmail || "your email"}</span>.
                      Please click the link in your email to proceed to EngageAI workspace setup.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2.5 pt-2">
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg transition-all"
                    >
                      Open Gmail <ExternalLink className="size-3.5" />
                    </a>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={handleManualRefresh}
                        disabled={checking}
                        className="h-9 text-xs border-white/10 gap-1.5 text-zinc-300 hover:text-white"
                      >
                        {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        Refresh Status
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleResendEmail}
                        disabled={resending || cooldown > 0}
                        className="h-9 text-xs border-white/10 gap-1.5 text-zinc-300 hover:text-white"
                      >
                        {resending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : cooldown > 0 ? (
                          `Resend in ${cooldown}s`
                        ) : (
                          "Resend Email"
                        )}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        navigate({ to: "/auth" });
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 h-8"
                    >
                      Change Email / Logout
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
