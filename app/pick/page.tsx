import { Suspense } from "react";
import type { Metadata } from "next";
import { Picker } from "@/components/Picker";
import { allModels, ensureData } from "@/lib/data";
import { headlineEligible } from "@/lib/score";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pick a model",
  description: "One recommendation for the job, plus a cheaper option, an open-weight option, and the runner-up. The choice stays in the link.",
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
        <div className="eyebrow">Pick</div>
        <h1 className="h1" style={{ marginTop: 8 }}>Pick a model for the job</h1>
        <p className="lede">Choose the job and how much cost matters. One recommendation from this snapshot, with the reason. Nothing is sent anywhere.</p>
      </div>
      <Suspense fallback={<p className="note">Loading the picker.</p>}>
        <Picker models={models} />
      </Suspense>
    </div>
  );
}
