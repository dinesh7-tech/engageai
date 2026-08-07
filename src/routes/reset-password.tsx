import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  KeyRound, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — EngageAI" },
      { name: "description", content: "Create a new secure password for your EngageAI account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & session states
  const [checkingSession, setCheckingSession] = useState(true);
  const [isValidRecovery, setIsValidRecovery] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Requirement checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isMatching = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Strength score (0 to 5)
  const strengthScore = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const isFormValid = strengthScore === 5 && isMatching;

  useEffect(() => {
    // Inspect hash for errors or recovery token parameters
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";

      if (hash.includes("error=") || search.includes("error=")) {
        setCheckingSession(false);
        setIsValidRecovery(false);
        setErrorMessage("This password reset link has expired or is invalid.");
        return;
      }
    }

    // Verify Supabase Auth recovery session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsValidRecovery(true);
        } else {
          // Listen for PASSWORD_RECOVERY event if token exchange is in progress
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
            if (event === "PASSWORD_RECOVERY" || sess) {
              setIsValidRecovery(true);
              setCheckingSession(false);
            }
          });

          // Timeout fallback to show invalid state if no session after 1.5s
          setTimeout(() => {
            supabase.auth.getSession().then(({ data }) => {
              if (data.session) {
                setIsValidRecovery(true);
              } else {
                setIsValidRecovery(false);
                setErrorMessage("This password reset link has expired or is invalid.");
              }
              setCheckingSession(false);
            });
            subscription.unsubscribe();
          }, 1500);
          return;
        }
      } catch (err) {
        setIsValidRecovery(false);
        setErrorMessage("This password reset link has expired or is invalid.");
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      if (!isMatching) {
        toast.error("Passwords do not match");
      } else {
        toast.error("Please satisfy all password security requirements");
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message || "Failed to update password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success("✅ Password updated successfully");

      // Sign out recovery session and redirect to login
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <Loader2 className="size-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-zinc-400">Verifying password recovery session...</p>
      </div>
    );
  }

  // Requirement 7: Invalid or Expired link state
  if (!isValidRecovery && !success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-white">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md space-y-6 text-center"
        >
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-xl shadow-rose-500/10">
            <AlertCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Reset Link Expired</h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              {errorMessage || "This password reset link has expired or is invalid."}
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl gap-2 shadow-lg shadow-primary/20"
              onClick={() => navigate({ to: "/auth" })}
            >
              <RefreshCw className="size-4" />
              Request New Reset Link
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-sm rounded-xl"
              onClick={() => navigate({ to: "/auth" })}
            >
              <ArrowLeft className="size-4 mr-1.5" />
              Back to Login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-white">
      {/* Glassmorphism Backdrop Effects */}
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="mb-6 flex items-center justify-center">
          <Logo className="h-8" />
        </Link>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <AnimatePresence mode="wait">
            {success ? (
              // Requirement 6: Success state animation
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="size-8 animate-bounce" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-emerald-300">✅ Password Updated Successfully</h2>
                  <p className="text-xs text-zinc-400">Your password has been changed securely.</p>
                </div>

                <div className="pt-3 flex items-center justify-center gap-2 text-xs font-mono text-indigo-300 bg-indigo-500/10 py-2.5 px-4 rounded-xl border border-indigo-500/20">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Redirecting to login in 2 seconds...</span>
                </div>
              </motion.div>
            ) : (
              // Requirement 3: Reset Password Form
              <motion.form key="form-card" onSubmit={handlePasswordUpdate} className="space-y-5">
                <div className="space-y-1 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
                    <KeyRound className="size-3.5" />
                    <span>EngageAI Secure Reset</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Create New Password</h1>
                  <p className="text-xs text-zinc-400">Choose a strong password to secure your account access.</p>
                </div>

                {/* New Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs font-medium text-zinc-300">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10 text-xs bg-zinc-950/80 border-white/10 h-11 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Progress Bar */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">Password Strength:</span>
                      <span className={`font-bold ${
                        strengthScore <= 2 ? "text-rose-400" :
                        strengthScore === 3 ? "text-amber-400" :
                        strengthScore === 4 ? "text-emerald-400" : "text-teal-300"
                      }`}>
                        {strengthScore <= 1 ? "Weak" :
                         strengthScore === 2 ? "Fair" :
                         strengthScore === 3 ? "Good" :
                         strengthScore === 4 ? "Strong" : "Excellent"}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-1 p-0.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-all duration-300 ${
                            level <= strengthScore
                              ? strengthScore <= 2 ? "bg-rose-500" :
                                strengthScore === 3 ? "bg-amber-500" :
                                strengthScore === 4 ? "bg-emerald-500" : "bg-teal-400"
                              : "bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-medium text-zinc-300">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pr-10 text-xs bg-zinc-950/80 h-11 border-white/10 ${
                        confirmPassword.length > 0
                          ? isMatching ? "border-emerald-500/60 focus:border-emerald-500" : "border-rose-500/60 focus:border-rose-500"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !isMatching && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" /> Passwords do not match
                    </p>
                  )}
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Password Requirements
                  </span>

                  <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                      <CheckCircle2 className={`size-3.5 ${hasMinLength ? "text-emerald-400" : "opacity-30"}`} />
                      <span>At least 8 characters long</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasUppercase ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                      <CheckCircle2 className={`size-3.5 ${hasUppercase ? "text-emerald-400" : "opacity-30"}`} />
                      <span>At least 1 uppercase letter (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasLowercase ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                      <CheckCircle2 className={`size-3.5 ${hasLowercase ? "text-emerald-400" : "opacity-30"}`} />
                      <span>At least 1 lowercase letter (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                      <CheckCircle2 className={`size-3.5 ${hasNumber ? "text-emerald-400" : "opacity-30"}`} />
                      <span>At least 1 number (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-2 ${hasSpecial ? "text-emerald-400 font-semibold" : "text-zinc-500"}`}>
                      <CheckCircle2 className={`size-3.5 ${hasSpecial ? "text-emerald-400" : "opacity-30"}`} />
                      <span>At least 1 special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Update Password
                    </>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <Link to="/auth" className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1">
                    <ArrowLeft className="size-3.5" /> Back to Login
                  </Link>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
