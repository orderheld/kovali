import { CalendarClock, Mail, MessageSquare, Phone, Settings2 } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Card, CardBody, CardHeader } from "@/components/admin/ui";
import { listActivities } from "@/lib/admin/activities";
import { formatDateTime } from "@/lib/admin/format";
import type { OwnerRef } from "@/lib/admin/owner";
import { addNote, deleteNote } from "./actions";
import { NoteForm } from "./note-form";

const icons = { notiz: MessageSquare, anruf: Phone, e_mail: Mail, termin: CalendarClock, system: Settings2 } as const;

/** Notes and history of one record, newest first, with a form for a new note. */
export async function ActivityFeed({ owner, title = "Notizen und Verlauf" }: { owner: OwnerRef; title?: string }) {
  const items = await listActivities(owner);
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-5">
        <NoteForm action={addNote.bind(null, owner)} />
        {items.length ? (
          <ol className="space-y-4 border-t border-line pt-4">
            {items.map((a) => {
              const Icon = icons[a.kind as keyof typeof icons] ?? MessageSquare;
              return (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-mist text-slate">
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-line text-ink">{a.body}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                      <time dateTime={a.createdAt.toISOString()}>{formatDateTime(a.createdAt)}</time>
                      {a.kind !== "system" ? (
                        <ActionButton action={deleteNote.bind(null, a.id)} confirm="Diese Notiz löschen?" variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
                          Löschen
                        </ActionButton>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="border-t border-line pt-4 text-sm text-slate">Noch keine Einträge.</p>
        )}
      </CardBody>
    </Card>
  );
}
