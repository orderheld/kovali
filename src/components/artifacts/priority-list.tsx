import { priorities, type PrioritySample } from "@/content/work-samples";
import { ArtifactFrame } from "./artifact-frame";
import { PriorityChip } from "./status-chip";

/** Example backlog ranked by value and effort, with Muss / Soll / Kann. */
export function PriorityList({ list = priorities, className }: { list?: PrioritySample; className?: string }) {
  return (
    <ArtifactFrame id={list.id} caption={list.caption} className={className}>
      <ul>
        {list.items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-t border-line px-4 py-2.5 first:border-t-0"
          >
            <span className="pt-px font-mono text-xs leading-5 text-blue">{item.id}</span>
            <span className="min-w-0">
              <span className="block text-[0.84rem] leading-5 text-ink">{item.title}</span>
              <span className="mt-0.5 block text-xs text-slate">
                Nutzen {item.value} · Aufwand {item.effort}
              </span>
            </span>
            <span>
              <span className="sr-only">Priorität: </span>
              <PriorityChip priority={item.priority} />
            </span>
          </li>
        ))}
      </ul>
    </ArtifactFrame>
  );
}
