/** Copy for the home page. Section content itself comes from services, company and industries. */
export const home = {
  hero: {
    eyebrow: "IT Consulting Schweiz",
    title: "Klarheit in Anforderungen. Sicherheit in der Umsetzung.",
    lead: "KOVALI unterstützt Unternehmen und öffentliche Organisationen in der Schweiz mit Business Analysis, Requirements Engineering, Application Management und Test Management, von der ersten Anforderung bis zur abgenommenen Lösung.",
    primary: { label: "Projekt anfragen", href: "/kontakt" },
    secondary: { label: "Leistungen entdecken", href: "/leistungen" },
  },
  services: {
    eyebrow: "Leistungen",
    title: "Fünf Leistungen entlang der Strecke von der Anforderung bis zur Abnahme",
    text: "Jede Leistung ist einzeln buchbar. Zusammen decken sie den ganzen Weg ab: verstehen, spezifizieren, betreuen und prüfen.",
  },
  approach: {
    eyebrow: "Vorgehen",
    title: "Konzeption, Value Analysis, Lösungsintegration",
    text: "Drei Schritte führen von einer Anforderung zu einer Lösung mit nachvollziehbarem Nutzen. Ihre Anfangssilben bilden den Namen KOVALI.",
  },
  industries: {
    eyebrow: "Branchen",
    title: "Erfahrung aus anspruchsvollen IT-Umgebungen",
    text: "Erfahrung aus Vorhaben mit vielen Schnittstellen und Anspruchsgruppen, übertragbar auf weitere regulierte Branchen.",
  },
  competencies: {
    eyebrow: "Kompetenzen",
    title: "Methoden und Werkzeuge, mit denen KOVALI arbeitet",
  },
  reasons: {
    eyebrow: "Warum KOVALI",
    title: "Ein Partner, der Business und IT verbindet",
  },
  certifications: {
    eyebrow: "Zertifizierungen",
    title: "Anerkannte Standards als gemeinsame Sprache",
  },
  partner: {
    eyebrow: "Für IT-Dienstleister",
    title: "Verstärkung für Ihre Kundenmandate",
    text: "Für IT-Dienstleister, Beratungsunternehmen und Contracting-Partner übernimmt KOVALI spezialisierte Rollen in Business Analysis, Requirements Engineering und Test, als Subunternehmen oder im klar abgegrenzten Teilmandat.",
    cta: { label: "Zusammenarbeit für Partner", href: "/partner" },
  },
  insights: {
    eyebrow: "Insights",
    title: "Wissen aus der Praxis der Business Analysis",
  },
} as const;

export const contactCta = {
  title: "Sie planen ein IT-Projekt oder suchen Verstärkung?",
  text: "Schildern Sie kurz Ausgangslage, Ziel und Zeitrahmen. Sie erhalten eine persönliche Rückmeldung von Ferhat Demir.",
  primary: { label: "Projekt anfragen", href: "/kontakt" },
  secondary: { label: "Leistungen ansehen", href: "/leistungen" },
} as const;
