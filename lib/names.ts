// Display names: a curated alias map first, then rules, then title-casing for raw slugs.
// Slugs and URLs never change; only what people read does.

/** Exact base-name overrides (raw source name → display name). */
const ALIAS: Record<string, string> = {
  "amazon-nova-experimental-chat": "Amazon Nova Experimental Chat",
  "nvila-internal-15b-v1": "NVILA Internal 15B v1",
  "Granite-4.0-H-Small": "Granite 4.0 H-Small",
  "Ling-flash-2.0": "Ling Flash 2.0",
  "Ring-flash-2.0": "Ring Flash 2.0",
  "Step-3": "Step 3",
  "Step-3.5-Flash": "Step 3.5 Flash",
  "Inkling-Small": "Inkling Small",
  "GLM-5.3-Flash": "GLM-5.3 Flash",
  "MiniMax-M3.1-Flash": "MiniMax-M3.1 Flash",
  "Qwen3.8-Flash-Next": "Qwen3.8 Flash Next",
};

/** Tokens with fixed casing when title-casing a raw slug. */
const TOKENS: Record<string, string> = {
  gpt: "GPT", glm: "GLM", mimo: "MiMo", minimax: "MiniMax", deepseek: "DeepSeek", qwen: "Qwen",
  oss: "oss", xai: "xAI", nvidia: "NVIDIA", llama: "Llama", ai: "AI", vl: "VL", pro: "Pro",
};
const EFFORT: Record<string, string> = { low: "Low", medium: "Medium", high: "High", xhigh: "xHigh", max: "Max", minimal: "Minimal" };

function fmtStamp(s: string): string {
  const y = s.slice(0, 4), m = Number(s.slice(4, 6)), d = Number(s.slice(6, 8));
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
}

function titleWord(w: string): string {
  const lw = w.toLowerCase();
  if (TOKENS[lw]) return TOKENS[lw];
  if (/^\d+(\.\d+)?[bkm]$/i.test(w)) return w.toUpperCase(); // 15b → 15B
  if (/^[a-z]\d/i.test(w)) return w[0].toUpperCase() + w.slice(1); // k3 → K3, v2.6 → V2.6
  return w[0].toUpperCase() + w.slice(1);
}

/** True for raw all-lowercase slug-like names such as "claude-opus-5.5-high". */
const isSlugLike = (s: string) => /^[a-z0-9][a-z0-9.\-_]*$/.test(s) && /[-_]/.test(s) && !/^(gpt-oss|o\d)/.test(s);

export type Pretty = { base: string; variant: string | null };

/** Clean a base name and its variant. Dates glued to the base (e.g. -20260910) move into the variant. */
export function prettyParts(base: string, variant: string | null): Pretty {
  const extra: string[] = [];
  let b = base.trim();
  const stamp = /-(20\d{6})$/.exec(b);
  if (stamp) {
    b = b.slice(0, stamp.index);
    extra.push(fmtStamp(stamp[1]));
  }
  if (ALIAS[b]) b = ALIAS[b];
  else if (/^NVIDIA-Nemotron-/.test(b)) b = b.replace(/^NVIDIA-/, "").replace(/-/g, " ");
  else if (/^Qwen[\d.]+(-[A-Za-z0-9.]+){2,}$/.test(b)) b = b.replace(/-/g, " ");
  else if (/^DeepSeek-V[\d.]+(-[A-Za-z]+)+$/.test(b)) b = b.replace(/-/g, " ");
  else if (isSlugLike(b)) {
    const words = b.split(/[-_]+/);
    const eff = words.length > 1 ? EFFORT[words[words.length - 1].toLowerCase()] : undefined;
    if (eff) {
      words.pop();
      extra.unshift(eff);
    }
    b = words.map(titleWord).join(" ");
  }
  // Variants: expand raw date stamps inside, e.g. "High, 20260813".
  const v = [variant, ...extra]
    .filter(Boolean)
    .join(", ")
    .replace(/\b(20\d{6})\b/g, (s) => fmtStamp(s));
  return { base: b, variant: v || null };
}

/**
 * Name used in JSON-LD. No trailing period, and a provider word is not repeated
 * ("Command Command R+." is "Command R+").
 */
export function schemaName(name: string): string {
  let s = name.trim().replace(/\.+$/u, "").replace(/\s+/g, " ");
  const parts = s.split(" ");
  for (let n = Math.floor(parts.length / 2); n >= 1; n--) {
    const lead = parts.slice(0, n).join(" ");
    const again = parts.slice(n, n * 2).join(" ");
    if (lead.toLowerCase() === again.toLowerCase()) {
      s = parts.slice(n).join(" ");
      break;
    }
  }
  return s;
}

/** Clean a full display name of the form "Base (Variant)". */
export function prettyName(name: string): string {
  const m = /^(.*?)\s*\(([^)]+)\)$/.exec(name);
  const p = m ? prettyParts(m[1], m[2]) : prettyParts(name, null);
  return p.variant ? `${p.base} (${p.variant})` : p.base;
}
