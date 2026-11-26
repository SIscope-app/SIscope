import { Suspense } from "react";
import type { Metadata } from "next";
import { Picker } from "@/components/Picker";
import { allModels, ensureData } from "@/lib/data";
import { headlineEligible } from "@/lib/score";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Which model do you need?",
  description: "Pick a job, a budget, and whether the weights must be open. SIscope returns one model and two alternatives from the current snapshot.",
  alternates: { canonical: "/pick" },
  openGraph: og("/pick"),
};

export default async function Page() {
  await ensureData();
  const models = allModels()
    .filter((m) => headlineEligible(m.comp) && m.si != null)
    .map((m) => ({
      slug: m.slug,
      name: m.name,
      open: m.open,
      si: m.si,
      price: m.price?.blended_per_m ?? null,
      priceIn: m.price?.input_per_m ?? null,
      priceOut: m.price?.output_per_m ?? null,
      writing: m.arena.text_categories?.cats.creative_writing?.rating ?? null,
      cats: m.cats,
    }));
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">Picker</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Which model do you need?</h1>
        <p className="lede">Choose a job, a budget cap, and open weights if you need them. The answer is computed in your browser from this snapshot. Nothing is sent anywhere.</p>
      </div>
      <Suspense fallback={<p className="note">Loading the picker.</p>}>
        <Picker models={models} />
      </Suspense>
    </div>
  );
}
