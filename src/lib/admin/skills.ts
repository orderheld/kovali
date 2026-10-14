/**
 * Skill dictionary for suggestions, CV keyword detection and matching. Each entry has a
 * canonical name and aliases (lower case). Matching compares canonical names, so "S4HANA",
 * "S/4 HANA" and "S/4HANA" count as the same skill.
 */

interface SkillEntry {
  name: string;
  aliases?: string[];
  group: SkillGroup;
}

export type SkillGroup =
  | "Methoden"
  | "Analyse & Requirements"
  | "Test"
  | "Projekt & Agile"
  | "SAP"
  | "Entwicklung"
  | "Cloud & Betrieb"
  | "Daten"
  | "Banking & Finance"
  | "Versicherung & Public"
  | "Tools";

const entries: SkillEntry[] = [
  // Analyse & Requirements
  { name: "Business Analysis", aliases: ["business analyse", "businessanalyse", "business analyst"], group: "Analyse & Requirements" },
  { name: "Requirements Engineering", aliases: ["requirements-engineering", "anforderungsmanagement", "requirements management"], group: "Analyse & Requirements" },
  { name: "IREB CPRE", aliases: ["cpre", "ireb", "cpre-fl", "cpre foundation level", "cpre advanced level"], group: "Analyse & Requirements" },
  { name: "IIBA CBAP", aliases: ["cbap", "ccba", "ecba", "iiba"], group: "Analyse & Requirements" },
  { name: "Prozessmodellierung", aliases: ["process modelling", "process modeling", "geschäftsprozessmodellierung"], group: "Analyse & Requirements" },
  { name: "BPMN", aliases: ["bpmn 2.0"], group: "Analyse & Requirements" },
  { name: "UML", aliases: [], group: "Analyse & Requirements" },
  { name: "User Stories", aliases: ["user story"], group: "Analyse & Requirements" },
  { name: "Use Cases", aliases: ["use case"], group: "Analyse & Requirements" },
  { name: "Stakeholder Management", aliases: ["stakeholdermanagement"], group: "Analyse & Requirements" },
  { name: "Workshop-Moderation", aliases: ["workshop moderation", "moderation"], group: "Analyse & Requirements" },
  { name: "Datenmodellierung", aliases: ["data modelling", "data modeling"], group: "Analyse & Requirements" },
  { name: "Schnittstellenanalyse", aliases: ["interface analysis", "schnittstellen"], group: "Analyse & Requirements" },
  { name: "Enterprise Architect", aliases: ["sparx", "sparx enterprise architect"], group: "Tools" },
  { name: "ArchiMate", aliases: [], group: "Analyse & Requirements" },
  { name: "Signavio", aliases: ["sap signavio"], group: "Tools" },
  { name: "ADONIS", aliases: [], group: "Tools" },

  // Test
  { name: "Test Management", aliases: ["testmanagement", "test manager", "testmanager"], group: "Test" },
  { name: "Test Automation", aliases: ["testautomatisierung", "test automatisierung", "automated testing"], group: "Test" },
  { name: "ISTQB", aliases: ["istqb foundation", "istqb ctfl", "ctfl", "istqb advanced", "ctal"], group: "Test" },
  { name: "Testkonzept", aliases: ["teststrategie", "test strategy", "testplan"], group: "Test" },
  { name: "Abnahmetest", aliases: ["uat", "user acceptance test", "acceptance testing"], group: "Test" },
  { name: "Regressionstest", aliases: ["regression testing"], group: "Test" },
  { name: "Lasttest", aliases: ["performance test", "performancetest", "load testing"], group: "Test" },
  { name: "Selenium", aliases: [], group: "Test" },
  { name: "Cypress", aliases: [], group: "Test" },
  { name: "Playwright", aliases: [], group: "Test" },
  { name: "Tricentis Tosca", aliases: ["tosca"], group: "Test" },
  { name: "JMeter", aliases: ["apache jmeter"], group: "Test" },
  { name: "Xray", aliases: ["jira xray"], group: "Test" },
  { name: "HP ALM", aliases: ["alm", "quality center", "micro focus alm", "opentext alm"], group: "Test" },
  { name: "Postman", aliases: [], group: "Test" },
  { name: "SoapUI", aliases: ["soap ui", "readyapi"], group: "Test" },
  { name: "Cucumber", aliases: ["bdd", "gherkin"], group: "Test" },

  // Projekt & Agile
  { name: "Projektleitung", aliases: ["project management", "projektmanagement", "projektleiter"], group: "Projekt & Agile" },
  { name: "HERMES", aliases: ["hermes 5", "hermes 2022"], group: "Projekt & Agile" },
  { name: "PRINCE2", aliases: ["prince 2"], group: "Projekt & Agile" },
  { name: "PMP", aliases: ["pmi"], group: "Projekt & Agile" },
  { name: "IPMA", aliases: [], group: "Projekt & Agile" },
  { name: "Scrum", aliases: ["psm", "csm", "scrum master"], group: "Projekt & Agile" },
  { name: "SAFe", aliases: ["scaled agile", "scaled agile framework"], group: "Projekt & Agile" },
  { name: "Kanban", aliases: [], group: "Projekt & Agile" },
  { name: "Product Ownership", aliases: ["product owner", "pspo", "cspo"], group: "Projekt & Agile" },
  { name: "Change Management", aliases: ["changemanagement"], group: "Projekt & Agile" },
  { name: "ITIL", aliases: ["itil 4", "itil v3"], group: "Methoden" },
  { name: "Application Management", aliases: ["applikationsmanagement", "application owner"], group: "Methoden" },
  { name: "Release Management", aliases: ["releasemanagement"], group: "Methoden" },
  { name: "Incident Management", aliases: [], group: "Methoden" },
  { name: "TOGAF", aliases: [], group: "Methoden" },
  { name: "Jira", aliases: ["atlassian jira"], group: "Tools" },
  { name: "Confluence", aliases: [], group: "Tools" },
  { name: "Azure DevOps", aliases: ["tfs", "vsts"], group: "Tools" },
  { name: "ServiceNow", aliases: ["service now"], group: "Tools" },
  { name: "MS Project", aliases: ["microsoft project"], group: "Tools" },

  // SAP
  { name: "SAP S/4HANA", aliases: ["s/4hana", "s4hana", "s/4 hana", "s4 hana", "sap s4hana"], group: "SAP" },
  { name: "SAP ECC", aliases: ["ecc 6.0", "sap r/3", "r/3"], group: "SAP" },
  { name: "SAP FI", aliases: ["fi", "sap fi-ca", "fi-ca", "sap finance"], group: "SAP" },
  { name: "SAP CO", aliases: ["co", "sap controlling"], group: "SAP" },
  { name: "SAP MM", aliases: ["mm", "sap materials management"], group: "SAP" },
  { name: "SAP SD", aliases: ["sd", "sap sales and distribution"], group: "SAP" },
  { name: "SAP PP", aliases: ["pp"], group: "SAP" },
  { name: "SAP QM", aliases: ["qm"], group: "SAP" },
  { name: "SAP PM", aliases: ["sap eam", "sap plant maintenance"], group: "SAP" },
  { name: "SAP EWM", aliases: ["ewm", "sap wm", "extended warehouse management"], group: "SAP" },
  { name: "SAP TM", aliases: ["sap transportation management"], group: "SAP" },
  { name: "SAP HCM", aliases: ["hcm", "sap hr", "sap hr/hcm"], group: "SAP" },
  { name: "SAP SuccessFactors", aliases: ["successfactors"], group: "SAP" },
  { name: "SAP Ariba", aliases: ["ariba"], group: "SAP" },
  { name: "SAP BTP", aliases: ["btp", "business technology platform", "sap cloud platform", "scp"], group: "SAP" },
  { name: "SAP Fiori", aliases: ["fiori", "sapui5", "ui5"], group: "SAP" },
  { name: "SAP ABAP", aliases: ["abap", "abap oo", "abap on hana"], group: "SAP" },
  { name: "SAP BW", aliases: ["bw/4hana", "sap bw/4hana", "bw4hana"], group: "SAP" },
  { name: "SAP Analytics Cloud", aliases: ["sac"], group: "SAP" },
  { name: "SAP CPI", aliases: ["cpi", "sap integration suite", "cloud integration"], group: "SAP" },
  { name: "SAP PI/PO", aliases: ["sap pi", "sap po", "pi/po", "process orchestration"], group: "SAP" },
  { name: "SAP GRC", aliases: ["grc"], group: "SAP" },
  { name: "SAP IBP", aliases: ["ibp", "integrated business planning"], group: "SAP" },
  { name: "SAP Basis", aliases: ["sap netweaver"], group: "SAP" },
  { name: "SAP Solution Manager", aliases: ["solman", "solution manager"], group: "SAP" },
  { name: "SAP Activate", aliases: [], group: "SAP" },
  { name: "SAP IS-U", aliases: ["is-u", "isu", "sap utilities"], group: "SAP" },
  { name: "SAP FS-CD", aliases: ["fs-cd"], group: "SAP" },
  { name: "SAP Banking", aliases: ["sap fs", "sap for banking"], group: "SAP" },

  // Entwicklung
  { name: "Java", aliases: ["java ee", "jakarta ee", "j2ee"], group: "Entwicklung" },
  { name: "Spring", aliases: ["spring boot"], group: "Entwicklung" },
  { name: "Kotlin", aliases: [], group: "Entwicklung" },
  { name: "C#", aliases: ["c sharp", "csharp"], group: "Entwicklung" },
  { name: ".NET", aliases: ["dotnet", ".net core", "asp.net"], group: "Entwicklung" },
  { name: "JavaScript", aliases: ["js", "ecmascript"], group: "Entwicklung" },
  { name: "TypeScript", aliases: [], group: "Entwicklung" },
  { name: "React", aliases: ["react.js", "reactjs"], group: "Entwicklung" },
  { name: "Angular", aliases: ["angularjs"], group: "Entwicklung" },
  { name: "Vue.js", aliases: ["vue", "vuejs"], group: "Entwicklung" },
  { name: "Node.js", aliases: ["nodejs"], group: "Entwicklung" },
  { name: "Python", aliases: [], group: "Entwicklung" },
  { name: "Go", aliases: ["golang"], group: "Entwicklung" },
  { name: "SQL", aliases: ["t-sql", "tsql"], group: "Daten" },
  { name: "PL/SQL", aliases: ["plsql"], group: "Daten" },
  { name: "REST", aliases: ["rest api", "restful", "openapi", "swagger"], group: "Entwicklung" },
  { name: "SOAP", aliases: ["wsdl"], group: "Entwicklung" },
  { name: "Microservices", aliases: ["micro services"], group: "Entwicklung" },
  { name: "Git", aliases: ["github", "gitlab", "bitbucket"], group: "Tools" },

  // Cloud & Betrieb
  { name: "Microsoft Azure", aliases: ["azure"], group: "Cloud & Betrieb" },
  { name: "AWS", aliases: ["amazon web services"], group: "Cloud & Betrieb" },
  { name: "Google Cloud", aliases: ["gcp", "google cloud platform"], group: "Cloud & Betrieb" },
  { name: "Kubernetes", aliases: ["k8s", "aks", "eks"], group: "Cloud & Betrieb" },
  { name: "OpenShift", aliases: ["red hat openshift"], group: "Cloud & Betrieb" },
  { name: "Docker", aliases: [], group: "Cloud & Betrieb" },
  { name: "Terraform", aliases: [], group: "Cloud & Betrieb" },
  { name: "CI/CD", aliases: ["jenkins", "github actions", "gitlab ci"], group: "Cloud & Betrieb" },
  { name: "Linux", aliases: ["unix", "rhel"], group: "Cloud & Betrieb" },
  { name: "IT-Security", aliases: ["informationssicherheit", "information security", "cyber security", "cybersecurity", "iso 27001"], group: "Cloud & Betrieb" },

  // Daten
  { name: "Power BI", aliases: ["powerbi"], group: "Daten" },
  { name: "Tableau", aliases: [], group: "Daten" },
  { name: "Snowflake", aliases: [], group: "Daten" },
  { name: "Databricks", aliases: [], group: "Daten" },
  { name: "Data Warehouse", aliases: ["dwh", "data warehousing"], group: "Daten" },
  { name: "ETL", aliases: ["informatica", "talend"], group: "Daten" },
  { name: "Oracle", aliases: ["oracle db", "oracle database"], group: "Daten" },
  { name: "MS SQL Server", aliases: ["sql server", "mssql"], group: "Daten" },
  { name: "PostgreSQL", aliases: ["postgres"], group: "Daten" },
  { name: "Excel", aliases: ["ms excel", "vba"], group: "Tools" },

  // Banking & Finance
  { name: "Banking", aliases: ["bankwesen", "retail banking", "private banking", "wealth management"], group: "Banking & Finance" },
  { name: "Avaloq", aliases: [], group: "Banking & Finance" },
  { name: "Finnova", aliases: [], group: "Banking & Finance" },
  { name: "Temenos", aliases: ["t24", "temenos t24", "transact"], group: "Banking & Finance" },
  { name: "Zahlungsverkehr", aliases: ["payments", "payment", "iso 20022", "sepa", "sic", "swift"], group: "Banking & Finance" },
  { name: "Regulatory", aliases: ["finma", "basel iii", "basel iv", "mifid", "fidleg", "regulatorik"], group: "Banking & Finance" },
  { name: "Compliance", aliases: ["aml", "kyc", "geldwäscherei"], group: "Banking & Finance" },
  { name: "Rechnungswesen", aliases: ["accounting", "finanzbuchhaltung", "ifrs", "swiss gaap fer"], group: "Banking & Finance" },

  // Versicherung & Public
  { name: "Versicherung", aliases: ["insurance", "versicherungen"], group: "Versicherung & Public" },
  { name: "Syrius", aliases: ["adcubum", "adcubum syrius"], group: "Versicherung & Public" },
  { name: "Guidewire", aliases: [], group: "Versicherung & Public" },
  { name: "Öffentliche Verwaltung", aliases: ["public sector", "bundesverwaltung"], group: "Versicherung & Public" },
  { name: "WTO-Beschaffung", aliases: ["simap", "öffentliche beschaffung", "böb", "ivöb"], group: "Versicherung & Public" },
  { name: "eGovernment", aliases: ["e-government", "egov"], group: "Versicherung & Public" },
  { name: "Gesundheitswesen", aliases: ["healthcare", "spital", "krankenversicherung"], group: "Versicherung & Public" },
];

const byKey = new Map<string, string>();
for (const e of entries) {
  byKey.set(e.name.toLowerCase(), e.name);
  for (const a of e.aliases ?? []) byKey.set(a.toLowerCase(), e.name);
}

/** All canonical skill names, sorted, for suggestions. */
export const skillSuggestions: string[] = entries.map((e) => e.name).sort((a, b) => a.localeCompare(b, "de"));

export const skillGroups: Record<string, SkillGroup> = Object.fromEntries(entries.map((e) => [e.name, e.group]));

/** Canonical name of a skill, or the trimmed input when it is not in the dictionary. */
export function normalizeSkill(input: string): string {
  const s = input.trim().replace(/\s+/g, " ");
  return byKey.get(s.toLowerCase()) ?? s;
}

export function normalizeSkills(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const n = normalizeSkill(raw);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

/** Short aliases ("fi", "co", "mm", "js", "ts") only count as whole upper-case words in CV text. */
const SHORT_ALIAS = 3;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const detectors: { name: string; re: RegExp }[] = entries.flatMap((e) =>
  [e.name, ...(e.aliases ?? [])].map((term) => {
    const short = term.replace(/[^a-z0-9]/gi, "").length <= SHORT_ALIAS;
    const pattern = `(?<![\\p{L}\\p{N}])${escapeRegExp(short ? term.toUpperCase() : term)}(?![\\p{L}\\p{N}])`;
    return { name: e.name, re: new RegExp(pattern, short ? "u" : "iu") };
  }),
);

/** Skills from the dictionary that appear in a text (e.g. an extracted CV). */
export function detectSkills(text: string): string[] {
  const found = new Set<string>();
  for (const d of detectors) {
    if (!found.has(d.name) && d.re.test(text)) found.add(d.name);
  }
  return [...found].sort((a, b) => a.localeCompare(b, "de"));
}
