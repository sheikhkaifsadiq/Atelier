import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Share2, Copy, Check, Loader2, Globe, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { setSessionShare } from "@/lib/share.functions";

const CONSENT_KEY = "atelier:share-consent-v1";

export function ShareChatButton({
  sessionId,
  variant = "ghost",
  size = "sm",
  asMenuItem = false,
}: {
  sessionId: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "icon";
  asMenuItem?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const share = useServerFn(setSessionShare);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasConsent(localStorage.getItem(CONSENT_KEY) === "1");
    }
  }, []);

  const enableMut = useMutation({
    mutationFn: () => share({ data: { id: sessionId, enable: true } }),
    onSuccess: (res) => setToken(res.shareToken),
    onError: (e: Error) => toast.error(e.message),
  });

  const disableMut = useMutation({
    mutationFn: () => share({ data: { id: sessionId, enable: false } }),
    onSuccess: () => {
      setToken(null);
      toast.success("Chat is private again. The link no longer works.");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const url = token ? `${window.location.origin}/share/${token}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o && hasConsent && !token) enableMut.mutate();
  };

  const grantConsent = () => {
    localStorage.setItem(CONSENT_KEY, "1");
    setHasConsent(true);
    if (!token) enableMut.mutate();
  };

  const showConsent = open && !hasConsent;
  const showLink = open && hasConsent;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {asMenuItem ? (
          <button
            className="w-full flex items-center px-2 py-1.5 text-sm rounded hover:bg-accent"
            onClick={(e) => {
              e.preventDefault();
              handleOpen(true);
            }}
          >
            <Share2 className="w-4 h-4 mr-2" /> Share
          </button>
        ) : (
          <Button variant={variant} size={size} className="gap-2">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {showConsent && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Make this chat public?
              </DialogTitle>
              <DialogDescription>
                Anyone with the link will be able to view this conversation. It may
                include personal details you've shared — names, emails, files,
                opinions, or anything else you typed. Review the chat before sharing.
                You can make it private again at any time.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={grantConsent}>
                <Globe className="w-4 h-4 mr-2" />
                I understand, create link
              </Button>
            </DialogFooter>
          </>
        )}

        {showLink && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> Share this chat
              </DialogTitle>
              <DialogDescription>
                Anyone with the link can view this conversation and "Continue this
                chat" to fork their own private copy — your chat stays unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={enableMut.isPending ? "Generating link…" : url} />
              <Button onClick={copy} disabled={!url} size="icon" variant="secondary">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter className="sm:justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => disableMut.mutate()}
                disabled={disableMut.isPending || enableMut.isPending}
              >
                {disableMut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Make chat private
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
