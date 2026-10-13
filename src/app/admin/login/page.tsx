import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getAdminSession } from "@/lib/admin/auth/session";
import { adminEnv, isAdminConfigured } from "@/lib/admin/env";
import { safeAdminTarget } from "@/lib/admin/auth/login";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  await connection();
  if (!isAdminConfigured()) redirect("/admin/einrichtung");
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeAdminTarget(params.next) : undefined;
  if (await getAdminSession()) redirect(next ?? "/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto w-40" title="KOVALI" />
        <div className="mt-8 rounded-xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(11_23_51/0.06)]">
          <h1 className="text-lg font-semibold text-ink">Admin-Bereich</h1>
          <p className="mt-1 mb-6 text-sm text-slate">Nur für berechtigte Personen. Jede Anmeldung wird protokolliert.</p>
          <LoginForm withCode={Boolean(adminEnv.totpSecret)} next={next} />
        </div>
      </div>
    </main>
  );
}
