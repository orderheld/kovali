import { userStory, type UserStorySample } from "@/content/work-samples";
import { cn } from "@/lib/utils";
import { ArtifactFrame } from "./artifact-frame";

const KEYWORDS = /^(\s*)(Szenario:|Angenommen|Wenn|Und|Dann|Aber)(.*)$/;

/** Example user story with Gherkin acceptance criteria (frame "US-112 · User Story"). */
export function StoryCard({
  story = userStory,
  animate = true,
  overlap = false,
  className,
}: {
  story?: UserStorySample;
  /** Gherkin lines fade in one after another (kv-line, from 0.45 s, 0.06 s apart). */
  animate?: boolean;
  /** Extra bottom padding on lg, so an overlapping TestRunCard never covers text (home hero). */
  overlap?: boolean;
  className?: string;
}) {
  return (
    <ArtifactFrame id={story.id} kind="User Story" caption={`User Story «${story.title}» mit Akzeptanzkriterien`} className={className}>
      <div className={cn("px-5 pb-5 pt-[1.125rem]", overlap && "lg:pb-14")}>
        <p className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">{story.title}</p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate">
          Als <strong className="font-semibold text-ink">{story.role}</strong> möchte ich {story.want},{" "}
          <strong className="font-semibold text-ink">damit</strong> {story.benefit}.
        </p>
        <p className="mt-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-slate">Akzeptanzkriterien</p>
        <pre
          lang="de"
          className="mt-2 whitespace-pre-wrap rounded-lg bg-night px-3.5 py-3.5 font-mono text-[0.72rem] sm:px-4 sm:text-[0.78rem] leading-[1.75] text-white/85 shadow-[inset_0_0_0_1px_rgb(143_201_255/0.12)]"
        >
          {story.criteria.map((line, i) => {
            const m = KEYWORDS.exec(line);
            return (
              <span
                key={`${i}-${line}`}
                className={cn("block pl-[4ch] -indent-[4ch]", animate && "kv-line")}
                style={animate ? ({ "--kv-delay": `${(0.45 + i * 0.06).toFixed(2)}s` } as React.CSSProperties) : undefined}
              >
                {m ? (
                  <>
                    {m[1]}
                    <span className="font-medium text-electric">{m[2]}</span>
                    {m[3]}
                  </>
                ) : (
                  line
                )}
              </span>
            );
          })}
        </pre>
        <p className="mt-3.5 text-xs text-slate">
          Verknüpft mit{" "}
          {story.links.map((id, i) => (
            <span key={id}>
              {i > 0 ? " · " : null}
              <span className="font-mono text-blue">{id}</span>
            </span>
          ))}
        </p>
      </div>
    </ArtifactFrame>
  );
}
