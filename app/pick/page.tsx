import type { Metadata } from "next";
import { Picker } from "@/components/Picker";
import { allModels } from "@/lib/data";
import { og } from "@/lib/site";
import { LIVE_TASKS } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Which model do you need?",
  description: "Pick a job, a budget, and whether the weights must be open. SIscope returns one model and two alternatives from the current snapshot.",
  alternates: { canonical: "/pick" },
  openGraph: og("/pick"),
};

export default function Page() {
  const models = allModels()
    .filter((m) => m.si != null || LIVE_TASKS.some((t) => t.get(m) != null))
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      base: m.base,
      variant: m.variant,
      open: m.open,
      si: m.si,
      price: m.price?.blended_per_m ?? null,
      tasks: Object.fromEntries(LIVE_TASKS.map((t) => [t.slug, t.get(m)])),
    }));
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Picker</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Which model do you need?</h1>
        <p className="lede">Choose a job, a budget cap, and open weights if you need them. The answer is computed in your browser from this snapshot. Nothing is sent anywhere.</p>
      </div>
      <Picker models={models} />
    </div>
  );
}
