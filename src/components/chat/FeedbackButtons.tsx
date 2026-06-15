import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown, Copy, Check, Share2, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rateResponse, reportMessage } from "@/lib/feedback.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const REPORT_REASONS = [
  { id: "inaccurate", label: "Inaccurate or misleading" },
  { id: "harmful", label: "Harmful or unsafe" },
  { id: "offensive", label: "Offensive or inappropriate" },
  { id: "private", label: "Leaks private info" },
  { id: "other", label: "Something else" },
];

export function FeedbackButtons({
  pipelineId,
  messageId,
  content,
}: {
  pipelineId?: string | null;
  messageId?: string;
  content: string;
}) {
  const rate = useServerFn(rateResponse);
  const report = useServerFn(reportMessage);
  const [score, setScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("inaccurate");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitScore = async (s: 1 | -1) => {
    if (!pipelineId) return;
    const next = score === s ? null : s;
    setScore(next);
    if (next === null) return;
    try {
      await rate({ data: { pipelineId, score: next } });
      toast.success(next === 1 ? "Thanks for the upvote" : "Feedback recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save feedback");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "From Atelier",
      text: content,
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.share && nav.canShare?.(shareData) !== false) {
        await nav.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(content);
      toast.success("Sharing not supported — copied instead");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Couldn't share");
      }
    }
  };

  const submitReport = async () => {
    setSubmitting(true);
    try {
      await report({
        data: {
          messageId,
          pipelineId: pipelineId ?? undefined,
          reason,
          details: details.trim() || undefined,
        },
      });
      toast.success("Report submitted. Thank you.");
      setReportOpen(false);
      setDetails("");
      setReason("inaccurate");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const btn = "p-1.5 rounded-md hover:bg-accent transition text-muted-foreground";

  return (
    <>
      <div className="flex items-center gap-0.5 pl-1">
        <button type="button" onClick={handleCopy} className={btn} aria-label="Copy response" title="Copy">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={handleShare} className={btn} aria-label="Share response" title="Share">
          <Share2 className="w-3.5 h-3.5" />
        </button>
        {pipelineId && (
          <>
            <button
              type="button"
              onClick={() => submitScore(1)}
              className={`${btn} ${score === 1 ? "!text-emerald-500" : ""}`}
              aria-label="Thumbs up"
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => submitScore(-1)}
              className={`${btn} ${score === -1 ? "!text-destructive" : ""}`}
              aria-label="Thumbs down"
              title="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className={btn}
          aria-label="Report response"
          title="Report"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this response</DialogTitle>
            <DialogDescription>
              Reports stay inside Atelier and help us improve. They are private to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">What's wrong?</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <RadioGroupItem value={r.id} id={`r-${r.id}`} />
                    <Label htmlFor={`r-${r.id}`} className="font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="report-details" className="text-sm font-medium">
                More detail <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Anything we should know?"
                rows={3}
                maxLength={2000}
                className="mt-1.5 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitReport} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
