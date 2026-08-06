import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPublicFeedbackFormByToken, submitAttendeeFeedback } from "@/lib/feedback.functions";
import { toast } from "sonner";
import {
  Star,
  Sparkles,
  CheckCircle2,
  Smile,
  Frown,
  Meh,
  Send,
  Loader2,
  Award,
  Download,
  Building2,
  PartyPopper,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/f/$token")({
  component: PublicFeedbackPortal,
});

function PublicFeedbackPortal() {
  const { token } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [overallRating, setOverallRating] = useState(5);
  const [npsRating, setNpsRating] = useState(9);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        const res = await getPublicFeedbackFormByToken({ data: { token } });
        setData(res);
        if (res.submission?.status === "completed") {
          setSubmitted(true);
          setOverallRating(res.submission.rating || 5);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load feedback form");
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await submitAttendeeFeedback({
        data: {
          token,
          rating: overallRating,
          npsRating,
          responses: answers
        }
      });

      if (res.success) {
        setSubmitted(true);
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {}
        toast.success("Thank you! Your feedback has been submitted.");
      }
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="size-8 text-primary animate-spin mb-2" />
        <p className="text-xs text-zinc-400">Loading feedback portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <div className="panel p-8 max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl text-center space-y-3">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-rose-400">Feedback Link Invalid</h2>
          <p className="text-xs text-zinc-400">{error || "This feedback link has expired or is invalid."}</p>
        </div>
      </div>
    );
  }

  const { submission, event, questions } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background aurora glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10 my-8"
      >
        <Card className="bg-zinc-900/90 border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 border-b border-white/5 bg-gradient-to-b from-indigo-500/10 to-transparent relative text-center">
            <Badge variant="outline" className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-2">
              Official Event Feedback
            </Badge>
            <h1 className="text-xl font-bold text-white tracking-tight">{event?.name || "Event Feedback"}</h1>
            <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1">
              <Building2 className="size-3.5" /> Organized by EngageAI OS
            </p>
          </div>

          <CardContent className="p-6">
            {submitted ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Thank You for Your Feedback!</h2>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Your response has been recorded. Your feedback helps us continuously elevate our events.
                  </p>
                </div>

                {/* Optional Certificate Download */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 justify-center">
                    <Award className="size-4 text-emerald-400" /> Certificate Unlocked
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Your participation certificate for {event?.name} is ready for download.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5"
                    onClick={() => toast.success("Downloading official participation certificate...")}
                  >
                    <Download className="size-3.5" /> Download Certificate
                  </Button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Greeting */}
                <div className="text-xs text-zinc-400 border-b border-white/5 pb-3">
                  Hi <span className="text-white font-bold">{submission.attendee_name}</span>, please spend 30 seconds rating your experience.
                </div>

                {/* Overall Rating (1-5 Stars) */}
                <div className="space-y-2 text-center">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    How would you rate overall <span className="text-white">{event?.name}</span>?
                  </label>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOverallRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`size-8 ${star <= overallRating ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net Promoter Score (NPS 0-10) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-zinc-300 block text-center">
                    How likely are you to recommend this event to a friend? (NPS 0-10)
                  </label>
                  <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNpsRating(num)}
                        className={`size-8 rounded-lg text-xs font-mono font-bold transition-all ${
                          npsRating === num
                            ? "bg-indigo-600 text-white border border-indigo-400 shadow-md"
                            : "bg-zinc-800 text-zinc-400 border border-white/5 hover:bg-zinc-700"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Template Questions */}
                {Array.isArray(questions) && questions.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-white/5">
                    {questions.map((q: any) => (
                      <div key={q.id} className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-zinc-300 block">
                          {q.label} {q.required && <span className="text-rose-400">*</span>}
                        </label>

                        {q.type === "long-text" ? (
                          <Textarea
                            placeholder="Share your thoughts..."
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            className="bg-zinc-950 border-white/10 text-xs min-h-[70px]"
                          />
                        ) : (
                          <Input
                            placeholder="Your answer..."
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            className="bg-zinc-950 border-white/10 text-xs h-9"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs h-10 gap-1.5 shadow-lg"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit Feedback
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
