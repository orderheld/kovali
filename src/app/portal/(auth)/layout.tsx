import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DiagonalAccent } from "@/components/sections/page-hero";

/** Public pages of the portal (login, invitation, password): centred card on the brand grid. */
export const instant = false;

export default function PortalAuthLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)] opacity-60" />
      <DiagonalAccent className="pointer-events-none absolute -top-10 -right-16 hidden h-[34rem] md:block" />
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-10 pb-10 sm:pt-16">
        <Link href="/portal/login" className="mx-auto rounded p-1" aria-label="KOVALI Kandidatenportal">
          <Logo className="h-8 w-auto" />
        </Link>
        <p className="mt-3 text-center text-[0.8125rem] font-medium tracking-[0.14em] text-slate uppercase">Kandidatenportal</p>
        <div className="mt-8">{children}</div>
        <p className="mt-auto pt-10 text-center text-[0.8125rem] text-slate">
          <Link href="/datenschutz" className="hover:text-blue hover:underline">
            Datenschutz
          </Link>
          <span aria-hidden className="mx-2">·</span>
          <Link href="/impressum" className="hover:text-blue hover:underline">
            Impressum
          </Link>
          <span aria-hidden className="mx-2">·</span>
          <Link href="/" className="hover:text-blue hover:underline">
            kovali.ch
          </Link>
        </p>
      </main>
    </div>
  );
}

