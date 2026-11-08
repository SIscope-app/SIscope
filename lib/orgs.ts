// Provider display names and soft avatar colours (lettered monograms, no logos).
const ORGS: Record<string, [string, string]> = {
  google: ["Google", "#8fc9f0"],
  anthropic: ["Anthropic", "#e9b98f"],
  openai: ["OpenAI", "#a8dcc4"],
  meta: ["Meta", "#a9b8f5"],
  xiaomi: ["Xiaomi", "#f5c08a"],
  moonshot: ["Moonshot AI", "#c9b3ef"],
  zai: ["Z.ai", "#9fd8d0"],
  deepseek: ["DeepSeek", "#9fb7ee"],
  alibaba: ["Alibaba (Qwen)", "#f2b0a0"],
  baidu: ["Baidu", "#a9cbef"],
  xai: ["xAI", "#c9ced6"],
  mistral: ["Mistral AI", "#f5cf8a"],
  amazon: ["Amazon", "#f3c58f"],
  nvidia: ["NVIDIA", "#b5dd8f"],
  tencent: ["Tencent", "#9fc4f0"],
  microsoft: ["Microsoft", "#a3d0f0"],
  ibm: ["IBM", "#a8b8e8"],
  cohere: ["Cohere", "#d7b8e8"],
  minimax: ["MiniMax", "#f0a8b8"],
  allenai: ["Ai2", "#f0c8a0"],
  stepfun: ["StepFun", "#b8d8f0"],
  thinky: ["Thinking Machines", "#d0c8f0"],
  meituan: ["Meituan", "#f8d878"],
  "ant-group": ["Ant Group", "#a8d0e8"],
  upstage: ["Upstage", "#c0b0f0"],
  "inception-ai": ["Inception", "#b8e0d0"],
  bytedance: ["ByteDance", "#a8c0f8"],
  reflection: ["Reflection AI", "#d8d0c0"],
  other: ["Other", "#c8ccd2"],
};

export function orgName(org: string): string {
  if (ORGS[org]) return ORGS[org][0];
  if (!org) return "Other";
  return org.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function orgColor(org: string): string {
  if (ORGS[org]) return ORGS[org][1];
  let h = 0;
  for (const ch of org) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 78%)`;
}

export function orgInitial(org: string): string {
  const n = orgName(org);
  return n === "xAI" ? "x" : n[0].toUpperCase();
}
