import { Minus, Plus } from "lucide-react";
import type { FaqItem } from "@/content/types";
import { RichText } from "./rich-text";

/**
 * Accessible FAQ built on native <details>, works without JavaScript. A rounded list with
 * hairlines between the questions; the round icon shows a plus while a question is closed and
 * a minus while it is open. For light surfaces.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-left text-night transition-colors marker:hidden rounded-2xl hover:text-blue focus-visible:-outline-offset-2 sm:px-8 sm:py-6 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] sm:text-lg">{item.question}</h3>
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-blue transition-colors group-open:border-blue group-open:bg-blue group-open:text-white group-hover:border-blue/50"
            >
              <Plus strokeWidth={1.5} className="size-4 group-open:hidden" />
              <Minus strokeWidth={1.5} className="hidden size-4 group-open:block" />
            </span>
          </summary>
          <p className="-mt-1 px-6 pb-6 pr-16 leading-relaxed text-slate sm:px-8 sm:pb-7 sm:pr-24">
            <RichText text={item.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
