/** Copy the snapshot JSON into public/data so the worker can read it from static assets. */
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const names = ["models.json", "changes.json", "sources.json", "publish.json", "agents.json"];
const dest = join(process.cwd(), "public", "data");
mkdirSync(dest, { recursive: true });
for (const name of names) copyFileSync(join(process.cwd(), "data", name), join(dest, name));
console.log(`published ${names.length} data files to public/data`);
