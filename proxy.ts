import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import slugs from "./data/slugs.json";

const KNOWN = new Set(slugs);

/** Old collision slugs. The plus models now live at command-r-plus, so the numbered leftovers move. */
const MOVED: Record<string, string> = {
  "command-r-2": "command-r",
  "command-r-08-2024-2": "command-r-08-2024",
};

/**
 * Unknown model URLs never reach the page shell. With Cache Components the shell
 * streams as 200 before notFound() can change the status, so the rejection happens here.
 */
export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/models\/([^/]+)$/);
  if (!match) return NextResponse.next();
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return miss(request);
  }
  const next = MOVED[slug];
  if (next) {
    const url = request.nextUrl.clone();
    url.pathname = `/models/${next}`;
    return NextResponse.redirect(url, 308);
  }
  if (KNOWN.has(slug)) return NextResponse.next();
  return miss(request);
}

function miss(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/model-missing";
  return NextResponse.rewrite(url, {
    status: 404,
    headers: { "x-robots-tag": "noindex" },
  });
}

export const config = {
  matcher: "/models/:slug",
};
