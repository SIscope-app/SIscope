import type { Metadata } from "next";
import Link from "next/link";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to read AI benchmarks",
  description: "What an Arena Elo, a percentile, coverage, open weights, a context window, a token, a blended price, and an agent score actually mean.",
  alternates: { canonical: "/benchmarks" },
  openGraph: og("/benchmarks"),
};

const GLOSSARY: { term: string; body: string }[] = [
  {
    term: "Arena Elo",
    body: "A rating built from blind, pairwise votes. People see two answers and pick the one they prefer. The rating goes up when a model wins those comparisons and down when it loses. A higher number is better. It is not a percentage, and a small gap can sit inside the uncertainty range, which means the two models are not cleanly separated.",
  },
  {
    term: "Percentile",
    body: "Where a result sits in a comparison group. A percentile of 90 means about 90 percent of that group scored lower. It is not the raw accuracy and not the Elo. Two boards can only be compared this way when they use the same group. A percentile on a board full of old models is not the same fact as a percentile on a board of current frontier models.",
  },
  {
    term: "Coverage",
    body: "How much of a combined score has a real measurement behind it. A missing test is absent. It is not a zero, and filling it with the model's own strongest number makes the model look better than the evidence. A score with thin coverage can still be shown, but it should say what was not measured.",
  },
  {
    term: "Open weights",
    body: "The lab published the model weights so you can download and run them. That is separate from the licence. Open weights can still restrict commercial use, and a closed model can still be cheap to call through an API.",
  },
  {
    term: "Context window",
    body: "The maximum amount of text, in tokens, that one request can hold. It is not memory between chats, and it is not a promise that the model uses the whole window well. Long inputs can cost more and can be answered worse than short ones.",
  },
  {
    term: "Tokens",
    body: "The pieces a model reads and writes, and the unit APIs bill. In English, a token is often shorter than a word, but the split depends on the language and the tokenizer. Input tokens and output tokens are priced separately. Reasoning steps are often billed as output.",
  },
  {
    term: "Blended price",
    body: "One number made from the input price and the output price by assuming a fixed mix, commonly three input tokens for each output token. It is a comparison aid. A workload that writes more than it reads will cost more than the blend.",
  },
  {
    term: "Agentic",
    body: "The model has to take several steps, use tools, and decide what to do next. A strong chat rating does not measure that. Agent boards score finished sessions. They are smaller and harder than a general chat board, so a middling agent result can still be a strong model.",
  },
];

export default function Page() {
  return (
    <div className="wrap">
      <div className="page-head">
        <div className="eyebrow">A reading guide</div>
        <h1 className="h1" style={{ marginTop: 8 }}>How to read AI benchmarks</h1>
        <p className="lede">The numbers mean different things. This page does not name a model and does not depend on this week&apos;s leader.</p>
      </div>
      <section className="section prose" style={{ marginTop: 8 }}>
        <h2>Start with the question the test asked</h2>
        <p>A chat board asks people which answer they prefer. A coding board asks whether the program works. A written exam asks whether the final answer is right. An agent board asks whether a multi-step job got finished. Leading one of those does not mean leading the others.</p>
        <p>Prefer the raw result and its date when you can check them. A rank without the size of the board is incomplete: fifth of ten is not fifth of four hundred. A score without a date can be from a different model snapshot than the one on sale today.</p>
        <p>When a table leaves a cell blank, read the blank as &quot;not measured.&quot; Do not treat it as a failure, and do not average it in as a zero. A model that skipped a hard test should not rank above a model that took the test and did worse than its other scores.</p>
        <p>Prices are list prices for tokens, not a bill. Check input and output separately. A blended figure hides a workload that is mostly output. Unknown is not free.</p>
        <p>The current SIscope recipe, including which tests are in the score, is on the <Link href="/methodology">methodology page</Link>. This guide stays the same when that recipe changes.</p>
        <h2>Glossary</h2>
        <dl className="glossary">
          {GLOSSARY.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
