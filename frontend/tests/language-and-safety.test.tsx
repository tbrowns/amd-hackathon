import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SafetyPage } from "@/components/about/safety-page";
import { AppHeader } from "@/components/layout/app-header";
import { LanguageProvider } from "@/components/providers/language-provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("language and safety surfaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("switches the navigation to Kiswahili and persists the choice", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><AppHeader /></LanguageProvider>);

    await user.click(screen.getByRole("button", { name: "SW" }));

    expect(screen.getAllByText("Kagua zao").length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("shambalens.language.v1")).toBe("sw");
    expect(document.documentElement).toHaveAttribute("lang", "sw");
  });

  it("documents the evidence pipeline, privacy and chemical guardrail", () => {
    render(<LanguageProvider><SafetyPage /></LanguageProvider>);

    expect(screen.getByRole("heading", { name: "How ShambaLens works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Important limits" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Private by default" })).toBeInTheDocument();
    expect(screen.getByText(/Do not apply a pesticide based on this report alone/)).toBeInTheDocument();
  });
});
