import "server-only";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

/**
 * redirect() for Server Actions that changed data. A plain redirect lets the client router
 * keep the admin layout it already shows, so the navigation badges (open mandates, portal
 * items, overdue retention) would stay stale until the next full page load. refresh() marks
 * the action as revalidating, and the router then also takes the layout from the freshly
 * rendered target in the same response.
 */
export function redirectAfterChange(path: string): never {
  refresh();
  redirect(path);
}
