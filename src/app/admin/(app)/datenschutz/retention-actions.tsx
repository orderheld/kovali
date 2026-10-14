"use client";

import { useLayoutEffect, useState } from "react";
import { CalendarPlus, EyeOff, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import { ActionButton, ActionForm, SubmitButton, TextField } from "@/components/admin/form";
import type { ActionState } from "@/lib/admin/forms";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface RetentionActionsProps {
  /** Display number, e.g. K-0042 (confirm texts never repeat the name). */
  no: string;
  hasConsent: boolean;
  documents: number;
  contracts: number;
  minDate?: string;
  maxDate?: string;
  /** Without it there is no "Verlängern" (e.g. on the Auskunft page). */
  extendAction?: FormAction;
  anonymiseAction: () => Promise<ActionState>;
  deleteAction: () => Promise<ActionState>;
}

/**
 * Buttons of one due record. Hidden pages stay mounted (React Activity), so the open
 * extension form is closed again when the page is shown the next time.
 */
export function RetentionActions(props: RetentionActionsProps) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return <RetentionActionsInner key={generation} {...props} />;
}

function RetentionActionsInner({ no, hasConsent, documents, contracts, minDate, maxDate, extendAction, anonymiseAction, deleteAction }: RetentionActionsProps) {
  const [extending, setExtending] = useState(false);
  const formId = `verlaengern-${no}`;

  const anonymiseConfirm = [
    `${no} anonymisieren?`,
    "",
    "Entfernt werden: Name, E-Mail, Telefon, Adresse, Geburtsdatum, Nationalität, Kurzprofil, Notizen, Lohnvorstellung, Kunden in den Projekten, Einwilligung, " +
      `${documents === 1 ? "1 Dokument" : `${documents} Dokumente`}, Portal-Konto, Freigaben, Änderungsanträge und der Verlauf.`,
    "Es bleiben ohne Namen: Rolle, Kompetenzen, Sprachen, Satz und die Vorschläge an Auftraggeber (für die Statistik).",
    contracts ? `${contracts === 1 ? "Der Vertrag bleibt" : `Die ${contracts} Verträge bleiben`} 10 Jahre aufbewahrt (Art. 958f OR).` : "",
    "",
    "Das lässt sich nicht rückgängig machen.",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  const deleteConfirm = [
    `${no} endgültig löschen?`,
    "",
    "Profil, Dokumente, Vorschläge, Portal-Konto, Freigaben und Verlauf werden vollständig gelöscht. Im Löschprotokoll bleibt nur die Nummer.",
    contracts ? `${contracts === 1 ? "Der Vertrag bleibt" : `Die ${contracts} Verträge bleiben`} ohne Verknüpfung erhalten (Aufbewahrungspflicht).` : "",
    "",
    "Das lässt sich nicht rückgängig machen.",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        {extendAction ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            aria-expanded={extending}
            aria-controls={formId}
            onClick={() => setExtending((v) => !v)}
          >
            <CalendarPlus aria-hidden className="size-4" />
            Verlängern
          </button>
        ) : null}
        <ActionButton action={anonymiseAction} confirm={anonymiseConfirm} icon={<EyeOff aria-hidden className="size-4" />}>
          Anonymisieren
        </ActionButton>
        <ActionButton action={deleteAction} confirm={deleteConfirm} variant="danger" icon={<Trash2 aria-hidden className="size-4" />}>
          Löschen
        </ActionButton>
      </div>
      {extending && extendAction ? (
        <div id={formId} className="rounded-md border border-line bg-mist/50 p-4">
          <ActionForm action={extendAction} hideSubmit className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <TextField
                name="retentionUntil"
                label="Aufbewahren bis"
                type="date"
                required
                min={minDate}
                max={maxDate}
                defaultValue={maxDate}
              />
              <TextField
                name="note"
                label="Begründung"
                required
                placeholder={hasConsent ? "z. B. Einwilligung per E-Mail vom 10.10.2026" : "z. B. laufendes Mandat M-0012"}
                hint="Wird im Verlauf des Kandidaten festgehalten."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton size="sm">Verlängerung speichern</SubmitButton>
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setExtending(false)}>
                Abbrechen
              </button>
            </div>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
