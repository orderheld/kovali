import { Plus } from "lucide-react";
import type { FaqItem } from "@/content/types";
import { RichText } from "./rich-text";

/** Accessible FAQ built on native <details>, works without JavaScript. */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line in-[.bg-cloud]:divide-cloud-line in-[.bg-cloud]:border-cloud-line">
      {items.map((item) => (
        <details key={item.question} className="group py-1">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-[1.0625rem] font-medium text-ink transition-colors marker:hidden hover:text-blue [&::-webkit-details-marker]:hidden">
            <h3 className="font-medium tracking-[-0.01em]">{item.question}</h3>
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-white text-blue transition-colors group-open:border-blue group-open:bg-blue group-open:text-white"
            >
              <Plus className="size-4 transition-transform duration-200 group-open:rotate-45" />
            </span>
          </summary>
          <p className="max-w-3xl pb-6 pr-12 leading-relaxed text-slate">
            <RichText text={item.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
