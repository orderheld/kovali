import { Container } from "@/components/ui/container";
import { facts } from "@/content/company";

export function Facts() {
  return (
    <section aria-label="KOVALI auf einen Blick" className="border-b border-line bg-white">
      <Container>
        <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`flex flex-col gap-2 py-8 md:px-8 md:py-10 md:first:pl-0 ${i % 2 === 1 ? "pl-5 md:pl-8" : "pr-5"} ${i < 2 ? "border-b border-line md:border-b-0" : ""}`}
            >
              <dt className="order-2 text-sm leading-snug text-slate">{f.label}</dt>
              <dd className="order-1 text-4xl font-semibold tracking-tight text-ink md:text-[2.75rem]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
