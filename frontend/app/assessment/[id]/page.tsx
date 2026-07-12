import type { Metadata } from "next";
import { AssessmentWizard } from "@/components/assessment/assessment-wizard";

export const metadata: Metadata = { title: "Continue assessment" };

export default async function ContinueAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentWizard assessmentId={id} />;
}
