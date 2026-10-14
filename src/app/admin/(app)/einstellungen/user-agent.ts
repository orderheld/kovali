/**
 * Short description of a browser identification ("Chrome auf macOS") for the session list.
 * Deliberately rough: it only has to let Ferhat recognise his own devices.
 */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unbekanntes Gerät";
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS\//.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "macOS"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null;
  if (browser && os) return `${browser} auf ${os}`;
  return browser ?? os ?? "Unbekanntes Gerät";
}
