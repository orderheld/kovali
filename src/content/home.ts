/** Copy for the home page. Section content itself comes from services, company and industries. */
export const home = {
  hero: {
    eyebrow: "IT Consulting Schweiz",
    title: "Klarheit in Anforderungen. Sicherheit in der Umsetzung.",
    lead: "KOVALI unterstützt Beratungen, IT-Dienstleister und Unternehmen in der Schweiz mit Business Analysis, Requirements Engineering, Application Management und Test Management, von der ersten Anforderung bis zur abgenommenen Lösung.",
    primary: { label: "Zusammenarbeit anfragen", href: "/kontakt" },
    secondary: { label: "Für Fachleute", href: "/fachleute" },
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
    text: "Branchenkenntnis aus öffentlicher Verwaltung, Logistik und Detailhandel, übertragbar auf weitere regulierte Branchen.",
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
    eyebrow: "Methodik",
    title: "Anerkannte Standards als gemeinsame Sprache",
  },
  /** The two entries of the site: companies that need a role filled, specialists who send a profile. */
  entries: {
    eyebrow: "Zusammenarbeit",
    title: "Zwei Wege zu KOVALI",
    text: "Unternehmen fragen Rollen und Projekte an, Fachleute senden ihr Profil. Beides prüfen wir persönlich.",
    companies: {
      id: "weg-unternehmen",
      eyebrow: "Für Unternehmen",
      title: "Verstärkung für Mandate und Projekte",
      text: "Beratungen, IT-Dienstleister und Unternehmen besetzen mit KOVALI Rollen in Business Analysis, Requirements Engineering, Application Management und Test.",
      points: [
        "Als Subunternehmen im Kundenmandat",
        "Im abgegrenzten Projekt oder Teilmandat",
        "Vor Ort, remote oder hybrid",
        "Auf Deutsch, Französisch und Englisch",
      ],
      primary: { label: "Zusammenarbeit anfragen", href: "/kontakt?anfrage=contracting" },
      secondary: { label: "Mehr für Unternehmen", href: "/unternehmen" },
    },
    specialists: {
      id: "weg-fachleute",
      eyebrow: "Für Fachleute",
      title: "Mitarbeit in IT-Mandaten",
      text: "Sie arbeiten in Business Analysis, Requirements Engineering, Application Management oder im Test? Senden Sie Ihr Profil für kommende Mandate.",
      points: [
        "Lebenslauf als PDF hochladen",
        "Persönliche Prüfung Ihres Profils",
        "Mandate in der ganzen Schweiz",
        "Weitergabe nur mit Ihrer Zustimmung",
      ],
      primary: { label: "Profil senden", href: "/fachleute#profil" },
      secondary: { label: "Mehr für Fachleute", href: "/fachleute" },
    },
  },
  insights: {
    eyebrow: "Insights",
    title: "Wissen aus der Praxis der Business Analysis",
  },
} as const;

export const contactCta = {
  title: "Sie suchen Verstärkung oder planen ein IT-Projekt?",
  text: "Schildern Sie kurz die gesuchte Rolle oder Ihr Vorhaben. Wir prüfen die Anfrage persönlich und melden uns mit einer ersten Einschätzung.",
  primary: { label: "Zusammenarbeit anfragen", href: "/kontakt" },
  secondary: { label: "Leistungen ansehen", href: "/leistungen" },
} as const;
