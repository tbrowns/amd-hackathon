import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ReportView } from "@/components/report/report-view";
import { assessment } from "@/tests/fixtures";

const { getAssessmentMock, replaceMock } = vi.hoisted(() => ({
  getAssessmentMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getAssessment: getAssessmentMock };
});

vi.mock("@/components/report/protected-image", () => ({
  ProtectedImage: ({ image, alt }: { image: { id: string }; alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-image-id={image.id} />,
}));

describe("ReportView", () => {
  beforeEach(() => {
    getAssessmentMock.mockReset().mockResolvedValue(assessment);
    replaceMock.mockReset();
    window.localStorage.clear();
  });

  it("renders canonical final, verification and source fields", async () => {
    render(<LanguageProvider><ReportView assessmentId={assessment.id} /></LanguageProvider>);

    expect(await screen.findByRole("heading", { name: "Early blight is the leading explanation" })).toBeInTheDocument();
    expect(screen.getByText(assessment.final_assessment!.what_changed)).toBeInTheDocument();
    expect(screen.getByText(assessment.final_assessment!.greatest_effect)).toBeInTheDocument();
    expect(screen.getByText(assessment.final_assessment!.expert_guidance)).toBeInTheDocument();
    expect(screen.getByText(assessment.final_assessment!.sources[0])).toBeInTheDocument();
    expect(screen.getByText("Independent verification passed")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Initial assessment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A safe, practical plan" })).toBeInTheDocument();
    expect(screen.getByText("Do today")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("keeps simulated provenance in print and copied exports", async () => {
    const user = userEvent.setup();
    const printMock = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const copyMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copyMock } });
    render(<LanguageProvider><ReportView assessmentId={assessment.id} /></LanguageProvider>);

    await screen.findByRole("heading", { name: "Early blight is the leading explanation" });
    const demoBanner = screen.getByText("Simulated demo — not live AI analysis");
    expect(demoBanner.closest("div")).not.toHaveClass("print-hidden");
    await user.click(screen.getByRole("button", { name: /print \/ save pdf/i }));
    await user.click(screen.getByRole("button", { name: /copy summary/i }));

    await waitFor(() => expect(printMock).toHaveBeenCalledOnce());
    expect(copyMock).toHaveBeenCalledWith(expect.stringMatching(/^SIMULATED DEMO REPORT\./));
  });

  it("lets the farmer switch between every uploaded photo", async () => {
    const user = userEvent.setup();
    getAssessmentMock.mockResolvedValueOnce({
      ...assessment,
      images: [
        { id: "image-1", content_type: "image/jpeg", width: 1200, height: 900, size_bytes: 120_000, url: "/first" },
        { id: "image-2", content_type: "image/jpeg", width: 1200, height: 900, size_bytes: 130_000, url: "/second" },
      ],
    });
    render(<LanguageProvider><ReportView assessmentId={assessment.id} /></LanguageProvider>);

    expect(await screen.findByRole("img", { name: "tomato assessment photo 1" })).toHaveAttribute("data-image-id", "image-1");
    await user.click(screen.getByRole("button", { name: "View crop photo 2" }));
    expect(screen.getByRole("img", { name: "tomato assessment photo 2" })).toHaveAttribute("data-image-id", "image-2");
  });
});
