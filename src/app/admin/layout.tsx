import type { Metadata } from "next";

/**
 * Admin area: rendered per request, never indexed (also sent as X-Robots-Tag, see
 * next.config.ts). Pages read the session and the database on every request, so the segment
 * is allowed to block instead of streaming a static shell.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "KOVALI Admin", template: "%s · KOVALI Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-mist">{children}</div>;
}
