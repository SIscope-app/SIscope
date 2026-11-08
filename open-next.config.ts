// OpenNext for Cloudflare Workers. The site is fully prerendered at build time,
// so the read-only static-assets cache is enough (no R2/KV, nothing to pay for).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
