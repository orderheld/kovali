"use client";

import { useState } from "react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";
import { profileVariants, rateUnits } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { consentMethods, marginInfo, parseAmountInput } from "../rules";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Records the candidate's consent for this mandate: when, in which form, with a note. */
export function ConsentForm({ action, today, submitLabel = "Einwilligung erfassen" }: { action: Action; today: string; submitLabel?: string }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_11rem_minmax(0,1fr)]">
        <TextField name="consentDate" label="Datum" type="date" defaultValue={today} max={today} required />
        <SelectField name="consentMethod" label="Form" options={consentMethods} defaultValue="e_mail" required />
        <TextField name="consentNote" label="Notiz" placeholder="z. B. Telefon 13.10.2026, Antwort auf Anfrage" hint="Bei mündlicher Einwilligung Pflicht." />
      </div>
      <SubmitButton size="sm">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

/** Withdrawal or objection; by default it blocks every further hand-over of the candidate. */
export function WithdrawalForm({ action, today }: { action: Action; today: string }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_11rem_minmax(0,1fr)]">
        <TextField name="withdrawalDate" label="Datum" type="date" defaultValue={today} max={today} required />
        <SelectField name="withdrawalMethod" label="Mitgeteilt per" options={consentMethods} defaultValue="e_mail" required />
        <TextField name="withdrawalReason" label="Notiz" placeholder="z. B. möchte nicht mehr vorgeschlagen werden" />
      </div>
      <CheckboxField
        name="allMandates"
        label="Für alle Mandate dieser Fachperson"
        hint="Widerspruch gegen jede weitere Weitergabe: Bei allen noch nicht vorgeschlagenen Mandaten wird die Einwilligung entfernt."
        defaultChecked
      />
      <SubmitButton size="sm" variant="danger">
        Widerruf erfassen
      </SubmitButton>
    </ActionForm>
  );
}

interface Terms {
  profileVariant: string;
  rateBuy: number | null;
  rateSell: number | null;
  rateUnit: string | null;
  feedback: string | null;
  notes: string | null;
}

function MarginPreview({ sell, buy, unit }: { sell: string; buy: string; unit: string }) {
  const info = marginInfo(parseAmountInput(sell), parseAmountInput(buy), unit);
  return (
    <p aria-live="polite" className="text-sm sm:col-span-2">
      <span className="text-slate">Marge: </span>
      {info ? (
        <span
          className={cn(
            "font-medium",
            info.tone === "red" ? "text-red-700" : info.tone === "amber" ? "text-amber-800" : "text-emerald-700",
          )}
        >
          {info.text}
          {info.tone === "red" ? " – KOVALI würde draufzahlen." : info.tone === "amber" ? " – knapp." : null}
        </span>
      ) : (
        <span className="text-slate">Einkaufs- und Verkaufssatz eingeben.</span>
      )}
    </p>
  );
}

function TermsFields({ terms, variantLocked }: { terms: Terms; variantLocked: boolean }) {
  const [live, setLive] = useState({
    buy: terms.rateBuy?.toString() ?? "",
    sell: terms.rateSell?.toString() ?? "",
    unit: terms.rateUnit ?? "stunde",
  });
  return (
    // Reads the rates from the form on every change for the margin preview.
    <div
      className="grid gap-3 sm:grid-cols-2"
      onChange={(e) => {
        const form = (e.currentTarget as HTMLElement).closest("form");
        if (!form) return;
        const fd = new FormData(form);
        setLive({ buy: String(fd.get("rateBuy") ?? ""), sell: String(fd.get("rateSell") ?? ""), unit: String(fd.get("rateUnit") ?? "stunde") });
      }}
    >
      {variantLocked ? <input type="hidden" name="profileVariant" value={terms.profileVariant} /> : null}
      <SelectField
        name={variantLocked ? "profileVariantShown" : "profileVariant"}
        label="Dossier"
        options={profileVariants}
        defaultValue={terms.profileVariant}
        disabled={variantLocked}
        hint={variantLocked ? "So vorgeschlagen; bleibt dokumentiert." : "Anonymisiert: ohne Namen und Kontaktdaten."}
      />
      <SelectField name="rateUnit" label="Einheit" options={rateUnits} defaultValue={terms.rateUnit ?? "stunde"} required />
      <TextField name="rateBuy" label="Einkaufssatz" inputMode="decimal" suffix="CHF" defaultValue={terms.rateBuy} hint="Was die Fachperson erhält." />
      <TextField name="rateSell" label="Verkaufssatz" inputMode="decimal" suffix="CHF" defaultValue={terms.rateSell} hint="Was der Auftraggeber bezahlt." />
      <MarginPreview sell={live.sell} buy={live.buy} unit={live.unit} />
      <TextAreaField name="feedback" label="Rückmeldung des Auftraggebers" rows={3} defaultValue={terms.feedback} className="sm:col-span-2" />
      <TextAreaField name="notes" label="Interne Notizen" rows={3} defaultValue={terms.notes} className="sm:col-span-2" />
    </div>
  );
}

/** Dossier variant, rates with live margin, client feedback and notes of one submission. */
export function TermsForm({ action, terms, variantLocked }: { action: Action; terms: Terms; variantLocked: boolean }) {
  return (
    <ActionForm action={action} submitLabel="Speichern" className="space-y-4">
      <TermsFields terms={terms} variantLocked={variantLocked} />
    </ActionForm>
  );
}
