import { PageHeader, Tabs } from "@/components/admin/ui";

export type PrivacyTab = "aufbewahrung" | "einwilligung" | "auskunft" | "loeschprotokoll" | "verzeichnis";

const tabs: { key: PrivacyTab; label: string; href: string }[] = [
  { key: "aufbewahrung", label: "Aufbewahrung", href: "/admin/datenschutz" },
  { key: "einwilligung", label: "Einwilligungen", href: "/admin/datenschutz/einwilligung" },
  { key: "auskunft", label: "Auskunft", href: "/admin/datenschutz/auskunft" },
  { key: "loeschprotokoll", label: "Löschprotokoll", href: "/admin/datenschutz/loeschprotokoll" },
  { key: "verzeichnis", label: "Verzeichnis", href: "/admin/datenschutz/verzeichnis" },
];

/** Header and tabs shared by all Datenschutz pages. */
export function PrivacyHeader({ active, counts = {}, actions }: { active: PrivacyTab; counts?: Partial<Record<PrivacyTab, number>>; actions?: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Datenschutz"
        description="Aufbewahrung, Einwilligungen, Auskunft und Nachweise nach dem Datenschutzgesetz (DSG). Nichts wird automatisch gelöscht: Du entscheidest jeden Schritt."
        actions={actions}
      />
      <Tabs items={tabs.map((t) => ({ label: t.label, href: t.href, active: t.key === active, count: counts[t.key] || undefined }))} />
    </>
  );
}
