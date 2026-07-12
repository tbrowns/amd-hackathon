import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = { title: "Evidence-first crop triage" };

export default function HomePage() {
  return <LandingPage />;
}
