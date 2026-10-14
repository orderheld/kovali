"use client";

import { startTransition, useActionState, useId, useLayoutEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Copy, Link2, Loader2, Mail } from "lucide-react";
import { ActionForm, FieldShell, TextAreaField } from "@/components/admin/form";
import { buttonClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";
import { completeStammdaten, createPortalInvitation, rejectChange, renewPortalLink, sendPortalLinkEmail } from "./actions";
import { linkIdle, type LinkState } from "./link-state";

/**
 * Interactive parts of /admin/portal. Next.js keeps visited pages mounted but hidden (React
 * Activity); a one-time link must not reappear when Ferhat comes back to the page, so these
 * components start fresh each time they are shown again (same approach as ActionForm).
 */

function useFreshKey() {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return generation;
}

const control =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink transition-colors placeholder:text-slate/55 hover:border-slate/40 focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none aria-[invalid=true]:border-red-600";

export type EmailMode = "send" | "dry-run" | "off";

// --- One-time link --------------------------------------------------------------

/** Shows a just-issued link once, with copy and (if configured) sending by e-mail. */
export function LinkPanel({ link, emailMode, message }: { link: Extract<LinkState, { status: "success" }>["link"]; emailMode: EmailMode; message?: string }) {
  const [copied, setCopied] = useState(false);
  const [sending, start] = useTransition();
  const [sent, setSent] = useState<ActionState | null>(null);
  const id = useId();
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4" role="status">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
        <Link2 aria-hidden className="size-4" />
        {message ?? "Link erstellt."} Er wird nur jetzt angezeigt.
      </p>
      <label htmlFor={id} className="mt-3 block text-[0.8125rem] font-medium text-ink">
        {link.kind === "einladung" ? "Einladungslink" : "Link zum Passwort setzen"} für {link.email}
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input id={id} readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className={cn(control, "font-mono text-[0.8125rem]")} />
        <button
          type="button"
          className={buttonClass("secondary", "md", "shrink-0")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link.url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              document.getElementById(id)?.focus();
            }
          }}
        >
          {copied ? <Check aria-hidden className="size-4 text-emerald-700" /> : <Copy aria-hidden className="size-4" />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <p className="mt-2 text-[0.8125rem] text-slate">Gültig bis {link.expiresAt}, nur einmal verwendbar. Ein neuer Link macht diesen ungültig.</p>
      {emailMode !== "off" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={sending || sent?.status === "success"}
            className={buttonClass("primary", "sm")}
            onClick={() =>
              start(async () => {
                setSent(await sendPortalLinkEmail(link.accountId, link.token));
              })
            }
          >
            {sending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Mail aria-hidden className="size-4" />}
            Per E-Mail senden{emailMode === "dry-run" ? " (Testmodus)" : ""}
          </button>
          {sent && sent.status !== "idle" ? (
            <span role="status" className={cn("text-[0.8125rem]", sent.status === "error" ? "text-red-700" : "text-emerald-800")}>
              {sent.message}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// --- Invitation -----------------------------------------------------------------

type InviteCandidate = { id: number; label: string; email: string | null };

function InviteFormInner({ candidates, fixed, emailMode }: { candidates: InviteCandidate[]; fixed?: InviteCandidate; emailMode: EmailMode }) {
  const [state, action, pending] = useActionState(createPortalInvitation, linkIdle);
  const [candidateId, setCandidateId] = useState<string>(fixed ? String(fixed.id) : "");
  const [email, setEmail] = useState(fixed?.email ?? "");
  const selectId = useId();
  const emailId = useId();
  const errors = state.status === "error" ? state.errors : undefined;

  if (state.status === "success") {
    return <LinkPanel link={state.link} emailMode={emailMode} message={state.message} />;
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state.status === "error" ? (
        <p role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {fixed ? (
          <input type="hidden" name="candidateId" value={fixed.id} />
        ) : (
          <FieldShell id={selectId} label="Person" required error={errors?.candidateId}>
            <select
              id={selectId}
              name="candidateId"
              value={candidateId}
              aria-invalid={errors?.candidateId ? true : undefined}
              onChange={(e) => {
                setCandidateId(e.target.value);
                // The login e-mail starts as the candidate's e-mail and stays editable.
                setEmail(candidates.find((c) => String(c.id) === e.target.value)?.email ?? "");
              }}
              className={cn(control, "pr-8")}
            >
              <option value="">Bitte wählen</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </FieldShell>
        )}
        <FieldShell id={emailId} label="E-Mail-Adresse für die Anmeldung" required error={errors?.email} className={fixed ? "sm:col-span-2" : undefined}>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors?.email ? true : undefined}
            className={control}
          />
        </FieldShell>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || (!fixed && !candidateId)} className={buttonClass("primary")}>
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Zugang erstellen
        </button>
        <span className="text-[0.8125rem] text-slate">Der Einladungslink gilt 7 Tage. Es wird nichts automatisch versendet.</span>
      </div>
    </form>
  );
}

export function InviteForm(props: { candidates: InviteCandidate[]; fixed?: InviteCandidate; emailMode: EmailMode }) {
  const key = useFreshKey();
  return <InviteFormInner key={key} {...props} />;
}

// --- New link for an existing account ---------------------------------------------

function RenewLinkInner({ accountId, emailMode, active }: { accountId: number; emailMode: EmailMode; active: boolean }) {
  const [state, setState] = useState<LinkState>(linkIdle);
  const [pending, start] = useTransition();
  if (state.status === "success") return <LinkPanel link={state.link} emailMode={emailMode} message={state.message} />;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={buttonClass("secondary", "sm")}
        onClick={() => {
          if (active && !window.confirm("Neuen Link erstellen? Damit kann die Person ein neues Passwort setzen. Ein bisheriger Link wird ungültig.")) return;
          start(async () => setState(await renewPortalLink(accountId)));
        }}
      >
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Link2 aria-hidden className="size-4" />}
        Neuer Link
      </button>
      {state.status === "error" ? (
        <span role="status" className="text-[0.8125rem] text-red-700">
          {state.message}
        </span>
      ) : null}
    </span>
  );
}

export function RenewLinkButton(props: { accountId: number; emailMode: EmailMode; active: boolean }) {
  const key = useFreshKey();
  return <RenewLinkInner key={key} {...props} />;
}

// --- Review forms -----------------------------------------------------------------

/** "Ablehnen" opens a short form; the note is shown to the candidate. */
function RejectFormInner({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger", "sm")}>
        Ablehnen
      </button>
    );
  }
  return (
    <div className="w-full rounded-lg border border-red-200 bg-red-50/40 p-4">
      <ActionForm
        action={rejectChange.bind(null, requestId)}
        submitLabel="Ablehnen"
        submitVariant="danger"
        className="space-y-4"
        secondary={
          <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost")}>
            Abbrechen
          </button>
        }
      >
        <TextAreaField name="note" label="Begründung (sieht die Person im Portal)" required rows={3} maxLength={1000} />
      </ActionForm>
    </div>
  );
}

export function RejectForm({ requestId }: { requestId: number }) {
  const key = useFreshKey();
  return <RejectFormInner key={key} requestId={requestId} />;
}

export function CompleteForm({ requestId }: { requestId: number }) {
  return (
    <ActionForm action={completeStammdaten.bind(null, requestId)} submitLabel="Erledigt" className="space-y-4">
      <TextAreaField name="note" label="Notiz an die Person (optional)" rows={2} maxLength={1000} hint="Zum Beispiel: «Adresse angepasst.»" />
    </ActionForm>
  );
}
