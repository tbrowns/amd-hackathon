import type { Metadata } from "next";
import { AssessmentWizard } from "@/components/assessment/assessment-wizard";

export const metadata: Metadata = { title: "Check a crop" };

export default function NewAssessmentPage() {
  return <AssessmentWizard />;
}
