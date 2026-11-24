import { Plus } from "lucide-react";
import type { FaqItem } from "@/content/types";
import { RichText } from "./rich-text";

/**
 * Accessible FAQ built on native <details>, works without JavaScript. Hairline rows; the plus icon
 * turns into a cross when a question is open.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line in-[.bg-cloud]:divide-cloud-line in-[.bg-cloud]:border-cloud-line">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-left text-navy transition-colors marker:hidden hover:text-blue [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.125rem] font-medium leading-snug tracking-[-0.01em]">{item.question}</h3>
            <Plus
              aria-hidden
              strokeWidth={1.5}
              className="mt-0.5 size-5 shrink-0 text-blue transition-transform duration-200 group-open:rotate-45"
            />
          </summary>
          <p className="-mt-1 pb-7 pr-10 leading-relaxed text-slate">
            <RichText text={item.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
