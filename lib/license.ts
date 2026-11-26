/**
 * Three weight states, plus Unknown when the licence name does not say.
 * A closed model is not "non-commercial": use is per the provider's terms.
 */

const OSI = new Set(["mit", "apache 2.0", "apache-2.0"]);

const LICENSE_URL: Record<string, string> = {
  mit: "https://opensource.org/license/mit",
  "apache 2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "cc-by-nc-4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "cc-by-nc-sa-4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "llama 2 community": "https://ai.meta.com/llama/license/",
  "llama 3 community": "https://www.llama.com/llama3/license/",
  "llama 3.1": "https://www.llama.com/llama3_1/license/",
  "llama 3.1 community": "https://www.llama.com/llama3_1/license/",
  gemma: "https://ai.google.dev/gemma/terms",
  "gemma license": "https://ai.google.dev/gemma/terms",
};

const ORG_TERMS: Record<string, string> = {
  openai: "https://openai.com/policies/terms-of-use",
  anthropic: "https://www.anthropic.com/legal/commercial-terms",
  google: "https://ai.google.dev/gemini-api/terms",
  xai: "https://x.ai/legal/terms-of-service",
  amazon: "https://aws.amazon.com/service-terms/",
  mistral: "https://mistral.ai/terms",
};

function norm(license: string | null | undefined): string {
  return (license ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type WeightClass = "closed" | "open-weight" | "open-source" | "unknown";

/** Closed-weight, open-weight (restricted), open-source (OSI), or Unknown. */
export function weightClass(open: boolean, license: string | null | undefined): WeightClass {
  if (!open) return "closed";
  const s = norm(license);
  if (!s || s === "-" || s === "other") return "unknown";
  if (OSI.has(s)) return "open-source";
  return "open-weight";
}

export function weightClassLabel(state: WeightClass): string {
  if (state === "closed") return "Closed-weight";
  if (state === "open-weight") return "Open-weight";
  if (state === "open-source") return "Open-source";
  return "Unknown";
}

/** True only for an OSI permissive name. False only for an explicit non-commercial name. Proprietary is unknown, not forbidden. */
export function commercialUse(license: string | null | undefined): boolean | null {
  const s = norm(license);
  if (!s) return null;
  if (OSI.has(s) || s === "bsd" || s === "bsd-3-clause" || s === "isc") return true;
  if (s.includes("cc-by-nc") || s.includes("non-commercial") || s.includes("noncommercial") || s === "non-commercial") return false;
  return null;
}

export function licenseHref(license: string | null | undefined): string | null {
  return LICENSE_URL[norm(license)] ?? null;
}

export function providerTermsHref(org: string | null | undefined): string | null {
  return ORG_TERMS[(org ?? "").trim().toLowerCase()] ?? null;
}

export function commercialLine(open: boolean, license: string | null | undefined, org?: string | null): { text: string; href: string | null } {
  if (!open) return { text: "Commercial use per provider terms", href: providerTermsHref(org) };
  const flag = commercialUse(license);
  const href = licenseHref(license);
  if (flag === true) return { text: "Commercial use is allowed by this licence", href };
  if (flag === false) return { text: "Commercial use is not allowed by this licence", href };
  return { text: "Unknown", href };
}

export function commercialLabel(license: string | null | undefined, open = false): string {
  return commercialLine(open, license).text + ".";
}
