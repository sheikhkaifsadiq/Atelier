import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/ChatView";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: () => <ChatView sessionId={undefined} />,
});
