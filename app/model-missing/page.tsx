import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Model not found",
  robots: { index: false, follow: true },
};

/** Static target for the model proxy. notFound() runs before any await, so the status stays 404. */
export default function ModelMissing() {
  notFound();
}
