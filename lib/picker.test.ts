import assert from "node:assert/strict";
import test from "node:test";
import { fixtureModel, fixturePrice } from "./fixture-model";
import { recommend } from "./picker";

test("the picker stays inside the budget and the open-weight rule", () => {
  const models = [
    fixtureModel({ slug: "closed", base: "Closed", si: 90, open: false, price: fixturePrice(2) }),
    fixtureModel({ slug: "open-cheap", base: "Open", si: 80, open: true, price: fixturePrice(0.4) }),
    fixtureModel({ slug: "open-pricey", base: "Open Pricey", si: 88, open: true, price: fixturePrice(5) }),
  ];
  const open = recommend(models, { task: "overall", maxPrice: 1, openOnly: true });
  assert.equal(open.primary?.slug, "open-cheap");
  const chosen = models.find((m) => m.slug === open.primary!.slug)!;
  assert.equal(chosen.open, true);
  assert.ok(chosen.price && chosen.price.blended_per_m <= 1);
  assert.ok(open.alternatives.length <= 2);
  assert.doesNotMatch([open.primary!.reason, ...open.alternatives.map((a) => a.reason)].join(" "), /\$\d+\.\d{3}/);
  const none = recommend(models, { task: "overall", maxPrice: 0.0000001, openOnly: true });
  assert.equal(none.primary, null);
  assert.match(none.empty ?? "", /No model/);
});
