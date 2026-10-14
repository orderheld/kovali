import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/shell";
import { legalEntityName, site } from "@/config/site";
import { portalCandidate } from "@/lib/portal/data";
import { requireCandidate } from "@/lib/portal/session";
import { countNewVacancies } from "@/lib/portal/vacancies";
import { logout } from "./actions";

/** Everything behind the portal login. Pages check the session again themselves. */
export const instant = false;

export default async function PortalAppLayout({ children }: LayoutProps<"/portal">) {
  const session = await requireCandidate();
  await connection();
  const [person, newVacancies] = await Promise.all([portalCandidate(session.candidateId), countNewVacancies(session.candidateId)]);
  if (!person) redirect("/portal/login");
  return (
    <PortalShell name={`${person.firstName} ${person.lastName}`} counts={{ vacancies: newVacancies }} logout={logout} contact={{ entity: legalEntityName(), email: site.contact.email.value }}>
      {children}
    </PortalShell>
  );
}
