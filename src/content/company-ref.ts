import { certifications, founder } from "./company";
import { services } from "./services";

/** Aggregated company facts for structured data. */
export const company = {
  founder,
  certifications,
  knowsAbout: [
    ...services.map((s) => s.name),
    "Stakeholder Management",
    "BPMN",
    "UML",
    "Agile Requirements Engineering",
  ],
};
