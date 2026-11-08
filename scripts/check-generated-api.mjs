import fs from "node:fs";

const api = JSON.parse(fs.readFileSync("public/api/v0/models.json", "utf8"));
const search = JSON.parse(fs.readFileSync("public/search.json", "utf8"));
const pub = JSON.parse(fs.readFileSync("data/publish.json", "utf8"));

if (api.last_success_at !== pub.last_success_at) {
  console.error("generated API last_success_at does not match data/publish.json");
  process.exit(1);
}
if (!Array.isArray(api.sources) || api.sources.some((s) => !s.as_of || !s.id)) {
  console.error("generated API is missing source as-of dates");
  process.exit(1);
}
if (api.sources.some((s) => /artificial analysis/i.test(`${s.name} ${s.id}`))) {
  console.error("generated API includes Artificial Analysis");
  process.exit(1);
}
if (!api.count || !Array.isArray(search) || search.length < 10) {
  console.error("generated API or search index is empty");
  process.exit(1);
}
console.log(`generated api models=${api.count} search=${search.length} last_success_at=${api.last_success_at}`);
