import { Plus } from "lucide-react";
import type { FaqItem } from "@/content/types";
import { RichText } from "./rich-text";

/**
 * Accessible FAQ built on native <details>, works without JavaScript. A plain list with
 * hairlines between the questions; the plus turns into a cross while a question is open.
 * For white and canvas surfaces.
 */
export function Faq({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="border-t border-hairline">
      {items.map((item) => (
        <details key={item.question} className="group border-b border-hairline">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-6 text-left text-graphite transition-colors marker:hidden hover:text-blue focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.1875rem] font-semibold leading-snug tracking-[-0.015em]">{item.question}</h3>
            <Plus
              aria-hidden
              strokeWidth={1.5}
              className="size-6 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45 group-hover:text-blue"
            />
          </summary>
          <p className="-mt-1 max-w-3xl pb-7 pr-10 text-muted">
            <RichText text={item.answer} />
          </p>
        </details>
      ))}
    </div>
  );
}
