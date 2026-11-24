import type { StaticImageData } from "next/image";
import arbeitsweise from "@/assets/scenes/arbeitsweise.webp";
import bannerInsights from "@/assets/scenes/banner-insights.webp";
import bannerKontakt from "@/assets/scenes/banner-kontakt.webp";
import bannerLeistungen from "@/assets/scenes/banner-leistungen.webp";
import bannerRechtliches from "@/assets/scenes/banner-rechtliches.webp";
import bannerUnternehmen from "@/assets/scenes/banner-unternehmen.webp";
import cta from "@/assets/scenes/cta.webp";
import hero from "@/assets/scenes/hero.webp";
import insight1 from "@/assets/scenes/insight-1.webp";
import insight2 from "@/assets/scenes/insight-2.webp";
import insight3 from "@/assets/scenes/insight-3.webp";
import intro from "@/assets/scenes/intro.webp";
import team from "@/assets/scenes/team.webp";

/**
 * The site's imagery: dark 3D renders of glass and light in the logo blues (glass panes with a
 * light beam for the hero, page headers, closing panel and tiles; light strands for the article
 * covers). Rendered with three.js from the scenes in brand/tools/scenes-3d/ (no photos, no
 * third-party assets). They are decorative: always rendered with an empty alt text.
 *
 * Wide images (hero, banners, cta) keep the subject on the right and the left side dark, for
 * white text on top. Portrait images (intro, team, arbeitsweise) fill rounded tiles.
 */
export const scenes = {
  hero,
  intro,
  cta,
  team,
  arbeitsweise,
  banner: {
    leistungen: bannerLeistungen,
    unternehmen: bannerUnternehmen,
    insights: bannerInsights,
    kontakt: bannerKontakt,
    rechtliches: bannerRechtliches,
  },
} satisfies Record<string, StaticImageData | Record<string, StaticImageData>>;

export type BannerScene = keyof typeof scenes.banner;

/** Cover image per article slug; new articles without their own cover take one of these in turn. */
const articleCovers: Record<string, StaticImageData> = {
  "was-macht-ein-business-analyst": insight1,
  "business-analysis-vs-requirements-engineering": insight2,
  "externer-business-analyst": insight3,
};
const fallbackCovers = [insight1, insight2, insight3];

export function articleCover(slug: string): StaticImageData {
  if (articleCovers[slug]) return articleCovers[slug];
  const sum = [...slug].reduce((n, c) => n + c.charCodeAt(0), 0);
  return fallbackCovers[sum % fallbackCovers.length];
}
