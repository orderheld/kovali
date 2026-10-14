/** White card used by the public portal pages (login, invitation, password). */
export function AuthCard({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_3px_rgb(11_23_51/0.06),0_12px_32px_-16px_rgb(11_23_51/0.18)] sm:p-7">
      <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
      {intro ? <div className="mt-1.5 mb-6 text-[0.9375rem] leading-relaxed text-slate">{intro}</div> : <div className="mb-6" />}
      {children}
    </div>
  );
}
