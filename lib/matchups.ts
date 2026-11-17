/** The first 50 pairings of the highest-scoring setting of each model family. */
export type Matchup = { key: string; left: string; right: string };

export function popularMatchups(ranked: { slug: string; base: string }[]): Matchup[] {
  const seen = new Set<string>();
  const tops: { slug: string }[] = [];
  for (const m of ranked) {
    if (seen.has(m.base)) continue;
    seen.add(m.base);
    tops.push(m);
    if (tops.length === 11) break;
  }
  const pairs: Matchup[] = [];
  for (let i = 0; i < tops.length; i++) {
    for (let j = i + 1; j < tops.length && pairs.length < 50; j++) {
      pairs.push({ key: `${tops[i].slug}-vs-${tops[j].slug}`, left: tops[i].slug, right: tops[j].slug });
    }
  }
  return pairs;
}

export function matchupByKey(ranked: { slug: string; base: string }[], key: string): Matchup | undefined {
  return popularMatchups(ranked).find((p) => p.key === key);
}
