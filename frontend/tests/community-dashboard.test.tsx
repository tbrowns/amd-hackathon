import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityDashboard } from "@/components/dashboard/community-dashboard";
import { LanguageProvider } from "@/components/providers/language-provider";
import { dashboardSummary } from "@/tests/fixtures";

const { getDashboardSummaryMock } = vi.hoisted(() => ({ getDashboardSummaryMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getDashboardSummary: getDashboardSummaryMock };
});

describe("CommunityDashboard", () => {
  beforeEach(() => getDashboardSummaryMock.mockReset().mockResolvedValue(dashboardSummary));

  it("renders reports-by-region, numeric urgency and simulated provenance", async () => {
    render(<LanguageProvider><CommunityDashboard /></LanguageProvider>);

    expect(await screen.findByText("Simulated dashboard data")).toBeInTheDocument();
    const urgentCard = screen.getByText("High-urgency signals").closest("article");
    expect(urgentCard).not.toBeNull();
    expect(within(urgentCard!).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Kiambu")).toBeInTheDocument();
    expect(screen.getByText("Nakuru")).toBeInTheDocument();
    expect(screen.getAllByText(dashboardSummary.disclaimer).length).toBeGreaterThan(0);
  });
});
