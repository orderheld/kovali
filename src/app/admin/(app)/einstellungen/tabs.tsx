import { PageHeader, Tabs } from "@/components/admin/ui";

export type SettingsTab = "sicherheit" | "audit" | "firma" | "system";

const tabs: { key: SettingsTab; label: string; href: string }[] = [
  { key: "sicherheit", label: "Sicherheit", href: "/admin/einstellungen" },
  { key: "audit", label: "Protokoll", href: "/admin/einstellungen/audit" },
  { key: "firma", label: "Firma", href: "/admin/einstellungen/firma" },
  { key: "system", label: "System", href: "/admin/einstellungen/system" },
];

/** Header and tabs shared by all Einstellungen pages. */
export function SettingsHeader({ active }: { active: SettingsTab }) {
  return (
    <>
      <PageHeader title="Einstellungen" description="Sicherheit, Protokoll, Firmendaten von KOVALI und Systemzustand." />
      <Tabs items={tabs.map((t) => ({ label: t.label, href: t.href, active: t.key === active }))} />
    </>
  );
}
