import type { ServiceSlug } from "./types";

/**
 * Tools we work in, grouped by task (Ferhat Demir, 26.11.2026: "Toolnamen mit den
 * entsprechenden Logos"). Shown on the home page and, filtered by `services`, on the
 * discipline pages.
 *
 * Logos only where the owner's published trademark rules allow it without a licence, taken
 * unmodified from the owner's official source (checked 26.11.2026):
 * - Jira and Confluence: Atlassian trademark guidelines; files from Atlassian's official
 *   @atlaskit/logo package 23.3.3 (logo-cs, CSS variables resolved to their defaults), in
 *   public/tools/. Never the Atlassian company logo (reads as partner status), never a lockup
 *   of our own.
 * - Every other tool by name only: its owner allows logos only with written permission or a
 *   partner licence (SAP, Sparx, Miro, Lucid, draw.io, Idera/Xray, SmartBear, Oracle,
 *   Microsoft and others).
 * Never call any vendor a partner, never imply a certification. The notice below the grid
 * says the names are trademarks of their owners and imply no partnership.
 */

export type ToolLogo = "jira" | "confluence";

export interface Tool {
  name: string;
  /** Owner, shown after the name where the name alone is ambiguous. */
  vendor?: string;
  /** What we use it for, in a few words. */
  use: string;
  logo?: ToolLogo;
}

export interface ToolGroup {
  title: string;
  tools: Tool[];
  /** Discipline pages that list this group. */
  services: ServiceSlug[];
}

/** Official logo files (unmodified) with their intrinsic size. */
export const toolLogos: Record<ToolLogo, { src: string; width: number; height: number }> = {
  jira: { src: "/tools/jira.svg", width: 83, height: 32 },
  confluence: { src: "/tools/confluence.svg", width: 188, height: 32 },
};

export const toolGroups: ToolGroup[] = [
  {
    title: "Anforderungen und Dokumentation",
    services: ["business-analysis", "test-management", "application-management"],
    tools: [
      { name: "Jira", vendor: "Atlassian", use: "Backlog, User Stories, Fehler", logo: "jira" },
      { name: "Confluence", vendor: "Atlassian", use: "Fachkonzepte, Dokumentation", logo: "confluence" },
      { name: "Azure DevOps", vendor: "Microsoft", use: "Backlog und Testpläne" },
      { name: "Miro", use: "Workshops und Story Maps" },
    ],
  },
  {
    title: "Prozesse und Modelle",
    services: ["business-analysis", "application-management"],
    tools: [
      { name: "SAP Signavio", use: "Prozessmodelle in BPMN" },
      { name: "Enterprise Architect", vendor: "Sparx Systems", use: "UML und BPMN" },
      { name: "Camunda Modeler", use: "BPMN und DMN" },
      { name: "draw.io", use: "Diagramme und Skizzen" },
    ],
  },
  {
    title: "Test und Fehler",
    services: ["test-management", "test-engineering"],
    tools: [
      { name: "Xray", use: "Testfälle und Testläufe in Jira" },
      { name: "Zephyr", vendor: "SmartBear", use: "Testfälle und Testläufe in Jira" },
      { name: "TestRail", use: "Testfallverwaltung" },
      { name: "Tricentis Tosca", use: "Testfälle und Automatisierung" },
    ],
  },
  {
    title: "Daten und Schnittstellen",
    services: ["business-analysis", "test-engineering", "application-management"],
    tools: [
      { name: "SQL Developer", vendor: "Oracle", use: "SQL-Abfragen und Datenprüfung" },
      { name: "DBeaver", use: "Datenbanken prüfen" },
      { name: "Postman", use: "REST-Schnittstellen testen" },
      { name: "SoapUI", use: "SOAP- und REST-Schnittstellen" },
    ],
  },
];

/** Methods and notations: plain text, no logos. */
export const methods = ["BPMN 2.0", "UML", "User Stories", "Use Cases", "Scrum", "Kanban", "SAFe"];

export const toolsNotice =
  "Die genannten Produktnamen und Logos sind Marken ihrer jeweiligen Inhaber. Ihre Nennung beschreibt die Werkzeuge, mit denen wir in Projekten arbeiten, und bedeutet keine Partnerschaft.";

export function toolGroupsFor(slug: ServiceSlug): ToolGroup[] {
  return toolGroups.filter((g) => g.services.includes(slug));
}
