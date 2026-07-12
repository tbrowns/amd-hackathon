import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ReportsList } from "@/components/reports/reports-list";
import { assessmentSummary } from "@/tests/fixtures";

const { listAssessmentsMock } = vi.hoisted(() => ({ listAssessmentsMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, listAssessments: listAssessmentsMock };
});

describe("ReportsList", () => {
  beforeEach(() => listAssessmentsMock.mockReset().mockResolvedValue([assessmentSummary]));

  it("renders the backend summary contract without assuming full assessments", async () => {
    render(<LanguageProvider><ReportsList /></LanguageProvider>);

    expect(await screen.findByRole("heading", { name: "Early blight" })).toBeInTheDocument();
    expect(screen.getByText("Monitor closely")).toBeInTheDocument();
    expect(screen.getByText("Kiambu")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Early blight/ })).toHaveAttribute("href", `/report/${assessmentSummary.id}`);
  });
});
