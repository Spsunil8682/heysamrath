import type { Metadata } from "next";
import { deleteMessage, setMessageHandled } from "@/app/admin/_actions/messages";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { getBusinessToday } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, tz] = await Promise.all([
    supabase.from("contact_messages").select("*").order("handled").order("created_at", { ascending: false }).limit(200),
    getBusinessToday(supabase).catch(() => ({ timezone: "UTC" })),
  ]);
  if (error) return <ErrorState title="Messages unavailable" />;
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Messages</h1>
      {data.length === 0 ? (
        <EmptyState title="No messages yet">Messages from the contact form appear here.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {data.map((m) => (
            <li key={m.id} className={`rounded-2xl border p-5 ${m.handled ? "border-line bg-charcoal opacity-70" : "border-gold/40 bg-panel"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted">
                    <a href={`mailto:${m.email}`} className="hover:text-gold">{m.email}</a>
                    {m.phone && <> · <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="hover:text-gold">{m.phone}</a></>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!m.handled && <Badge className="border-gold/50 text-gold">New</Badge>}
                  <span className="text-xs text-subtle">{formatDateTime(m.created_at, tz.timezone)}</span>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{m.message}</p>
              <div className="mt-4 flex gap-2">
                <ActionButton action={setMessageHandled.bind(null, m.id, !m.handled)}>{m.handled ? "Mark as new" : "Mark handled"}</ActionButton>
                <ActionButton
                  variant="ghost"
                  action={deleteMessage.bind(null, m.id)}
                  confirm={{ title: "Delete this message?", body: "This cannot be undone.", confirmLabel: "Delete", danger: true }}
                >
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
