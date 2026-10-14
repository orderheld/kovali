import type { Metadata, Viewport } from "next";

/**
 * Candidate portal: rendered per request, never indexed (also sent as X-Robots-Tag and
 * no-store, see next.config.ts). Pages read the session and the database on every request,
 * so the segment is allowed to block instead of streaming a static shell.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "KOVALI Kandidatenportal", template: "%s · KOVALI Kandidatenportal" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Lets the bottom navigation sit above the home indicator on phones (safe-area insets).
  viewportFit: "cover",
};

/**
 * Form controls use 16 px on small screens: iOS zooms into any input with a smaller font,
 * which makes forms on phones jumpy. From the sm breakpoint the admin sizes apply again.
 */
const controlSizes =
  "[&_input]:text-base [&_select]:text-base [&_textarea]:text-base sm:[&_input]:text-[0.9375rem] sm:[&_select]:text-[0.9375rem] sm:[&_textarea]:text-[0.9375rem]";

export default function PortalRootLayout({ children }: LayoutProps<"/portal">) {
  return <div className={`flex min-h-full flex-1 flex-col bg-mist text-ink ${controlSizes}`}>{children}</div>;
}
