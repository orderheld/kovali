"use client";

import { useState } from "react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";
import { manualConsentMethods, profileVariants, rateUnits } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { marginInfo, parseAmountInput, type MarginVat } from "../rules";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Records the candidate's consent for this mandate: when, in which form, for which dossier
 * (anonymised or with the name; defaults to the submission's dossier), with a note. With
 * `fixedScope` the scope is not asked (e.g. "Einwilligung mit Namen erfassen").
 */
export function ConsentForm({
  action,
  today,
  defaultScope,
  fixedScope,
  submitLabel = "Einwilligung erfassen",
}: {
  action: Action;
  today: string;
  defaultScope: string;
  fixedScope?: "anonym" | "namentlich";
  submitLabel?: string;
}) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_11rem_minmax(0,1fr)]">
        <TextField name="consentDate" label="Datum" type="date" defaultValue={today} max={today} required />
        <SelectField name="consentMethod" label="Form" options={manualConsentMethods} defaultValue="email" required />
        {fixedScope ? (
          <input type="hidden" name="consentScope" value={fixedScope} />
        ) : (
          <SelectField
            name="consentScope"
            label="Gilt für das Dossier"
            options={profileVariants}
            defaultValue={defaultScope === "namentlich" ? "namentlich" : "anonym"}
            hint="Wofür die Fachperson zugestimmt hat."
            required
          />
        )}
        <TextField
          name="consentNote"
          label="Notiz"
          placeholder="z. B. Telefon 13.10.2026, Antwort auf Anfrage"
          hint="Bei mündlicher Einwilligung Pflicht."
          className="sm:col-span-full"
        />
      </div>
      <SubmitButton size="sm">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

/**
 * Withdrawal for this mandate, or (checkbox) an objection to every further hand-over of the
 * candidate, which also blocks new shortlist entries until it is lifted.
 */
export function WithdrawalForm({ action, today }: { action: Action; today: string }) {
  return (
    <ActionForm action={action} hideSubmit className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_11rem_minmax(0,1fr)]">
        <TextField name="withdrawalDate" label="Datum" type="date" defaultValue={today} max={today} required />
        <SelectField name="withdrawalMethod" label="Mitgeteilt per" options={manualConsentMethods} defaultValue="email" required />
        <TextField name="withdrawalReason" label="Notiz" placeholder="z. B. möchte nicht mehr vorgeschlagen werden" hint="Wer, wie, warum; keine heiklen Angaben." />
      </div>
      <CheckboxField
        name="allMandates"
        label="Widerspruch für alle Mandate dieser Fachperson"
        hint="Keine weitere Weitergabe und kein neues Vormerken, bei keinem Mandat. Alle offenen Vorschläge gelten als widerrufen."
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

function MarginPreview({ sell, buy, unit, vat }: { sell: string; buy: string; unit: string; vat: MarginVat }) {
  const info = marginInfo(parseAmountInput(sell), parseAmountInput(buy), unit, unit, vat);
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

function TermsFields({ terms, variantLocked, consentAnonymousOnly, vat }: { terms: Terms; variantLocked: boolean; consentAnonymousOnly: boolean; vat: MarginVat }) {
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
        hint={
          variantLocked
            ? "So vorgeschlagen; bleibt dokumentiert."
            : consentAnonymousOnly
              ? "Die Einwilligung gilt nur für das anonymisierte Dossier. Mit Namen erst nach einer Einwilligung mit Namen."
              : "Anonymisiert: ohne Namen und Kontaktdaten."
        }
      />
      <SelectField name="rateUnit" label="Einheit" options={rateUnits} defaultValue={terms.rateUnit ?? "stunde"} required />
      <TextField name="rateBuy" label="Einkaufssatz" inputMode="decimal" suffix="CHF" defaultValue={terms.rateBuy} hint="Was die Fachperson erhält." />
      <TextField name="rateSell" label="Verkaufssatz" inputMode="decimal" suffix="CHF" defaultValue={terms.rateSell} hint="Was der Auftraggeber bezahlt." />
      <MarginPreview sell={live.sell} buy={live.buy} unit={live.unit} vat={vat} />
      <TextAreaField name="feedback" label="Rückmeldung des Auftraggebers" rows={3} defaultValue={terms.feedback} className="sm:col-span-2" />
      <TextAreaField name="notes" label="Interne Notizen" rows={3} defaultValue={terms.notes} className="sm:col-span-2" />
    </div>
  );
}

/**
 * Dossier variant, rates with live margin, client feedback and notes of one submission. `vat`
 * says whether the subcontractor's VAT is a cost for KOVALI (see marginInfo).
 */
export function TermsForm({
  action,
  terms,
  variantLocked,
  consentAnonymousOnly = false,
  vat,
}: {
  action: Action;
  terms: Terms;
  variantLocked: boolean;
  /** A valid consent that covers the anonymised dossier only (e.g. from the portal). */
  consentAnonymousOnly?: boolean;
  vat: MarginVat;
}) {
  return (
    <ActionForm action={action} submitLabel="Speichern" className="space-y-4">
      <TermsFields terms={terms} variantLocked={variantLocked} consentAnonymousOnly={consentAnonymousOnly} vat={vat} />
    </ActionForm>
  );
}
