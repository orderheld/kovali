import { PageHeader, Tabs } from "@/components/admin/ui";
import { portalCounts } from "@/lib/portal/admin";

export type PortalTab = "aenderungen" | "dokumente" | "interesse" | "zugaenge";

/**
 * Title and tabs of /admin/portal. The first three counts add up to the navigation badge
 * (open changes + unconfirmed uploads + unreviewed interest and withdrawals).
 */
export async function PortalHeader({ active, accounts }: { active: PortalTab; accounts?: number }) {
  const counts = await portalCounts();
  return (
    <>
      <PageHeader
        title="Kandidatenportal"
        description="Was Kandidatinnen und Kandidaten im Portal geändert, hochgeladen oder beantwortet haben, und ihre Zugänge."
      />
      <Tabs
        items={[
          { label: "Änderungen", href: "/admin/portal", active: active === "aenderungen", count: counts.changes },
          { label: "Dokumente", href: "/admin/portal/dokumente", active: active === "dokumente", count: counts.uploads },
          { label: "Interesse", href: "/admin/portal/interesse", active: active === "interesse", count: counts.answers },
          { label: "Zugänge", href: "/admin/portal/zugaenge", active: active === "zugaenge", count: accounts },
        ]}
      />
    </>
  );
}
