import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionForm } from "@/components/assessment/question-form";
import { LanguageProvider } from "@/components/providers/language-provider";
import { assessment } from "@/tests/fixtures";

const { submitAnswersMock } = vi.hoisted(() => ({ submitAnswersMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  submitAnswers: submitAnswersMock,
}));

describe("QuestionForm", () => {
  beforeEach(() => {
    submitAnswersMock.mockReset().mockResolvedValue(assessment);
    window.localStorage.clear();
  });

  it("validates all questions and submits language-neutral answer values", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<LanguageProvider><QuestionForm assessment={assessment} onComplete={onComplete} /></LanguageProvider>);

    await user.click(screen.getByRole("button", { name: /get verified plan/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please answer each question");

    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.click(screen.getByRole("radio", { name: "Mostly lower leaves" }));
    await user.type(screen.getByRole("textbox", { name: "How many plants are affected?" }), "  Three plants  ");
    await user.click(screen.getByRole("button", { name: /get verified plan/i }));

    await waitFor(() => expect(submitAnswersMock).toHaveBeenCalledWith(assessment.id, [
      { question_id: "target_rings", answer: false },
      { question_id: "distribution", answer: "Mostly lower leaves" },
      { question_id: "plant_count", answer: "Three plants" },
    ]));
    expect(onComplete).toHaveBeenCalledWith(assessment);
  });
});
