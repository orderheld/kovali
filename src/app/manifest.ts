import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.brand} – ${site.tagline}`,
    short_name: site.brand,
    description: site.description,
    lang: site.locale,
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#0b1733",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
      { src: "/brand/kovali-app-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
