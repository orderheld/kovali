import { site, vatClause } from "@/config/site";
import { cn, formatChf, formatNumber } from "@/lib/utils";

/**
 * The published hourly range as a large serif statement with a track and the two ends
 * explained. Numbers come from `site.offer` (one-line change in src/config/site.ts). The
 * track is decorative; the same information is in the text and in the factor table.
 */
export function RateRange({
  id,
  lowLabel = "Mehrere Monate, hohes Pensum, eingespieltes Team",
  highLabel = "Kurzer Einsatz, steuernde Rolle, viele Schnittstellen",
  note,
  className,
}: {
  /** Id on the statement, usable as the section's aria-labelledby. */
  id?: string;
  lowLabel?: string;
  highLabel?: string;
  /** Optional small print below the track (on /preise the B2B note sits in its own column). */
  note?: React.ReactNode;
  className?: string;
}) {
  const { min, max } = site.offer.hourly.value;
  const hours = site.offer.hoursPerDay;
  return (
    <div className={className}>
      <p id={id} className="font-display text-numeral font-light lining-nums tabular-nums text-navy">
        <span aria-hidden>
          <span className="mr-[0.15em] text-[0.45em] font-normal tracking-normal">CHF</span>
          {formatNumber(min)}–{formatNumber(max)}
        </span>
        <span className="sr-only">
          {formatChf(min)} bis {formatNumber(max)}
        </span>
      </p>
      <p className="mt-4 text-lead text-slate">pro Stunde, {vatClause()}</p>

      <div aria-hidden className="mt-10">
        <div className="relative h-1.5 rounded-full bg-paper-line">
          <div className="absolute inset-0 rounded-full bg-navy" />
          <span className="absolute -top-[5px] left-0 size-4 rounded-full border-[3px] border-navy bg-white" />
          <span className="absolute -top-[5px] right-0 size-4 rounded-full border-[3px] border-navy bg-white" />
        </div>
        {/* Each end label stays under its own dot, also on small screens. */}
        <div className="mt-5 flex flex-row justify-between gap-6 text-sm leading-snug text-slate sm:gap-8">
          <p className="max-w-[10rem] sm:max-w-[17rem]">
            <span className="block font-medium tabular-nums text-ink">{formatChf(min)}</span>
            {lowLabel}
          </p>
          <p className="max-w-[10rem] text-right sm:max-w-[17rem]">
            <span className="block font-medium tabular-nums text-ink">{formatChf(max)}</span>
            {highLabel}
          </p>
        </div>
      </div>

      {hours.confirmed ? (
        <p className="mt-10 max-w-2xl leading-relaxed text-slate">
          Auf Wunsch als Tagessatz: {hours.value} Stunden zum vereinbarten Stundensatz, also{" "}
          <span className="tabular-nums">
            {formatChf(min * hours.value)} bis {formatNumber(max * hours.value)}
          </span>{" "}
          pro Tag.
        </p>
      ) : null}
      {note ? <p className={cn("max-w-2xl text-sm text-slate", hours.confirmed ? "mt-4" : "mt-10")}>{note}</p> : null}
    </div>
  );
}
