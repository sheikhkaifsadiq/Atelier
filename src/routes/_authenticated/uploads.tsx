import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Mic, File as FileIcon, MessageSquare } from "lucide-react";
import { listMyUploads, type UploadRow } from "@/lib/uploads.functions";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/uploads")({
  component: UploadsPage,
});

function dateBucket(iso: string): "Today" | "Yesterday" | "This week" | "Earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfToday - oneDay) return "Yesterday";
  if (t >= startOfToday - 6 * oneDay) return "This week";
  return "Earlier";
}

function UploadsPage() {
  const fetchUploads = useServerFn(listMyUploads);
  const { data, isLoading } = useQuery({
    queryKey: ["my-uploads"],
    queryFn: () => fetchUploads(),
  });
  const uploads = (data?.uploads ?? []) as UploadRow[];

  const grouped: Record<string, UploadRow[]> = {};
  for (const u of uploads) {
    const k = dateBucket(u.created_at);
    (grouped[k] ??= []).push(u);
  }
  const order: Array<keyof typeof grouped> = ["Today", "Yesterday", "This week", "Earlier"];

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">My Uploads</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All the files you've sent in chats.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/chat">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to chat
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : uploads.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl">
            <p className="text-sm text-muted-foreground">
              Nothing yet — files you send in a chat will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {order.map((bucket) =>
              grouped[bucket]?.length ? (
                <section key={bucket}>
                  <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {bucket}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[bucket].map((u) => (
                      <UploadCard key={u.id} upload={u} />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadCard({ upload }: { upload: UploadRow }) {
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="rounded-lg overflow-hidden bg-muted/40 grid place-items-center min-h-[160px]">
        {upload.media_type === "image" && upload.mediaUrl ? (
          <a href={upload.mediaUrl} target="_blank" rel="noreferrer" className="w-full">
            <img
              src={upload.mediaUrl}
              alt="upload"
              className="w-full h-48 object-cover"
            />
          </a>
        ) : upload.media_type === "audio" && upload.mediaUrl ? (
          <div className="w-full p-3 flex items-center justify-center">
            <AudioPlayer src={upload.mediaUrl} variant="bot" />
          </div>
        ) : (
          <div className="text-muted-foreground p-6">
            <FileIcon className="w-10 h-10" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 px-1">
        <div className="text-muted-foreground shrink-0 mt-0.5">
          {upload.media_type === "image" ? (
            <ImageIcon className="w-3.5 h-3.5" />
          ) : upload.media_type === "audio" ? (
            <Mic className="w-3.5 h-3.5" />
          ) : (
            <FileIcon className="w-3.5 h-3.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {new Date(upload.created_at).toLocaleString()}
          </p>
          {upload.content && (
            <p className="text-sm truncate mt-0.5" title={upload.content}>
              {upload.content}
            </p>
          )}
        </div>
        <Link
          to="/chat/$sessionId"
          params={{ sessionId: upload.session_id }}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          title="Open chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
