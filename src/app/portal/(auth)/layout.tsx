import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Public pages of the portal (login, invitation, password): centred card on the paper background of the website. */
export const instant = false;

export default function PortalAuthLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-paper">
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

