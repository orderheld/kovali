import type { StaticImageData } from "next/image";
import portraitImage from "@/assets/ferhat-demir.webp";
import avatarImage from "@/assets/ferhat-demir-avatar.webp";
import { site } from "@/config/site";

/**
 * Ferhat Demir's personal certificates: named in the sentence about him on the company page
 * and listed in the Person JSON-LD (src/lib/seo.ts). Never shown as the team's certificates.
 */
export const certifications = [
  {
    id: "ireb-cpre-fl",
    short: "IREB\u00a0CPRE",
    credential: "Certified Professional for Requirements Engineering, Foundation Level",
  },
  {
    id: "istqb-ctfl",
    short: "ISTQB\u00a0CTFL",
    credential: "Certified Tester, Foundation Level",
  },
] as const;

/**
 * Ferhat Demir, Geschäftsführer. Every experience figure on the site is his personal
 * experience and is attributed to him by name, never to the company. Deliberately no CV
 * details: no former employers, projects, periods, job titles or language levels
 * (Ferhat Demir, 13.10.2026).
 */
export const founder: {
  name: string;
  role: string;
  /** Cutout with transparent background (src/assets/ferhat-demir.webp), shown on a navy tile. */
  portrait: StaticImageData;
  /** Square head crop of the same cutout, for round avatars. */
  avatar: StaticImageData;
  /**
   * His experience in running text, shown on the company page after "Ferhat Demir arbeitet".
   * Hard-coded so prerendered pages need no `new Date()`: in IT since 2016-08, in Business
   * Analysis and Requirements Engineering since 2020-03.
   */
  experienceLine: string;
} = {
  name: "Ferhat Demir",
  role: site.contact.title,
  portrait: portraitImage,
  avatar: avatarImage,
  experienceLine: "seit über 10\u00a0Jahren in der IT, seit über 5\u00a0Jahren in Business Analysis und Requirements Engineering",
};
