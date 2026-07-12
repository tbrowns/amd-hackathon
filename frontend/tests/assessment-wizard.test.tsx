import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentWizard } from "@/components/assessment/assessment-wizard";
import { LanguageProvider } from "@/components/providers/language-provider";
import { assessment, quality } from "@/tests/fixtures";
import type { Assessment } from "@/lib/types";

const { getAssessmentMock, replaceMock, pushMock } = vi.hoisted(() => ({
  getAssessmentMock: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("@/components/providers/runtime-provider", () => ({
  useRuntime: () => ({ runtime: { execution_mode: "live" }, loading: false }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getAssessment: getAssessmentMock };
});

const retakeAssessment: Assessment = {
  ...assessment,
  status: "retake_required",
  image_quality: { ...quality, status: "retake_required", retake_instructions: ["Move closer to the affected leaf."] },
  initial_assessment: null,
  answers: null,
  final_assessment: null,
  verification: null,
  completed_at: null,
};

describe("AssessmentWizard", () => {
  beforeEach(() => {
    getAssessmentMock.mockReset().mockResolvedValue(retakeAssessment);
    replaceMock.mockReset();
    pushMock.mockReset();
    window.localStorage.clear();
  });

  it("uses the canonical retake_required state and does not expose demos in live mode", async () => {
    render(<LanguageProvider><AssessmentWizard assessmentId={retakeAssessment.id} /></LanguageProvider>);

    expect(await screen.findByText("Retake required")).toBeInTheDocument();
    expect(screen.getByText("Move closer to the affected leaf.")).toBeInTheDocument();
    expect(screen.queryByText("or try a demo")).not.toBeInTheDocument();
  });
});
