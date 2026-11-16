/** Commercial use only for licence names that say so plainly. Everything else stays unknown. */
export function commercialUse(license: string | null | undefined): boolean | null {
  const s = (license ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  if (s === "mit" || s === "apache 2.0" || s === "apache-2.0" || s === "bsd" || s === "bsd-3-clause" || s === "isc") return true;
  if (s === "proprietary" || s === "non-commercial" || s.includes("cc-by-nc") || s.includes("non-commercial") || s.includes("noncommercial")) return false;
  return null;
}

export function commercialLabel(license: string | null | undefined): string {
  const flag = commercialUse(license);
  if (flag === true) return "Commercial use is allowed by this licence name.";
  if (flag === false) return "Commercial use is not allowed by this licence name.";
  return "Commercial use is unknown from this licence name.";
}
