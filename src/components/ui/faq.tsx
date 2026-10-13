import { Plus } from "lucide-react";
import type { FaqItem } from "@/content/types";
import { RichText } from "./rich-text";

/** Accessible FAQ built on native <details>, works without JavaScript. */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.question} className="group py-1">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left text-[1.0625rem] font-medium text-ink marker:hidden hover:text-blue [&::-webkit-details-marker]:hidden">
            <h3 className="font-medium">{item.question}</h3>
            <Plus
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-blue transition-transform duration-200 group-open:rotate-45"
            />
          </summary>
          <p className="max-w-3xl pb-6 leading-relaxed text-slate">
            <RichText text={item.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
