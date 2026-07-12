import type { Metadata } from "next";
import { SafetyPage } from "@/components/about/safety-page";

export const metadata: Metadata = { title: "How it works & safety" };

export default function AboutPage() {
  return <SafetyPage />;
}
