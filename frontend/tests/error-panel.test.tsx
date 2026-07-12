import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ApiError } from "@/lib/api";

describe("ErrorPanel", () => {
  it("shows the API message and request id and can retry", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    const error = new ApiError("Groq is temporarily busy.", { code: "rate_limited", retryable: true, requestId: "req-42", status: 429 });
    render(<LanguageProvider><ErrorPanel error={error} onRetry={retry} /></LanguageProvider>);

    expect(screen.getByRole("alert")).toHaveTextContent("Groq is temporarily busy.");
    expect(screen.getByText("Request req-42")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
