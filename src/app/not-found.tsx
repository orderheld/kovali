import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mainNav } from "@/content/navigation";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-mist">
      <div aria-hidden className="grid-lines absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative py-24 md:py-32">
        <p className="font-mono text-sm text-blue">Fehler 404</p>
        <h1 className="mt-4 max-w-2xl text-h1 font-semibold">Diese Seite wurde nicht gefunden</h1>
        <p className="mt-6 max-w-xl text-lead text-slate">
          Die Adresse ist möglicherweise veraltet oder falsch geschrieben. Diese Seiten helfen weiter:
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="font-medium text-blue hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink href="/" arrow className="mt-10">
          Zur Startseite
        </ButtonLink>
      </Container>
    </section>
  );
}
