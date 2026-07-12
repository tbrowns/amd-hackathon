"use client";

import { ArrowRight, HelpCircle, LoaderCircle, MessageSquareText } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { InitialSummary } from "@/components/assessment/initial-summary";
import { submitAnswers } from "@/lib/api";
import type { Assessment, SubmitAnswerInput } from "@/lib/types";

export function QuestionForm({ assessment, onComplete }: { assessment: Assessment; onComplete: (assessment: Assessment) => void }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const questions = assessment.initial_assessment?.follow_up_questions ?? [];
  const [answers, setAnswers] = useState<Record<string, boolean | string>>({});
  const [error, setError] = useState<unknown>(null);
  const [validationError, setValidationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitAnswersNow = async () => {
    const missing = questions.some((question) => {
      const answer = answers[question.id]!;
      return answer === undefined || (typeof answer === "string" && !answer.trim());
    });
    if (missing) { setValidationError(true); return; }
    setValidationError(false);
    setError(null);
    setSubmitting(true);
    const payload: SubmitAnswerInput[] = questions.map((question) => {
      const answer = answers[question.id];
      return {
        question_id: question.id,
        answer: typeof answer === "string" ? answer.trim() : answer,
      };
    });
    try {
      onComplete(await submitAnswers(assessment.id, payload));
    } catch (reason) {
      setError(reason);
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void submitAnswersNow();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
      <aside className="card p-5 sm:p-6 lg:sticky lg:top-28"><InitialSummary assessment={assessment} /></aside>
      <form onSubmit={submit} className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f0d0] text-forest"><MessageSquareText size={23} /></span>
          <div><p className="eyebrow">{sw ? "Hatua ya 3" : "Step 3"}</p><h1 className="mt-2 font-display text-3xl font-bold tracking-[-.03em] text-ink">{sw ? "Maswali machache muhimu" : "A few questions that matter"}</h1><p className="mt-2 text-sm leading-6 text-ink/60">{sw ? "Majibu yako yatasaidia kutofautisha visababishi vinavyoongoza. Chagua unachojua; hatutadai uhakika zaidi ya ushahidi." : "Your answers help separate the leading possibilities. Choose what you know; we won’t claim more certainty than the evidence supports."}</p></div>
        </div>

        <div className="mt-8 grid gap-6">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-2xl border border-forest/12 bg-white p-5">
              <legend className="sr-only">{question.text}</legend>
              <div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">{index + 1}</span><div><p className="font-display text-lg font-bold leading-6 text-ink">{question.text}</p>{question.explanation && <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink/52"><HelpCircle className="mt-0.5 shrink-0" size={14} />{question.explanation}</p>}</div></div>
              <div className="mt-4">
                {question.input_type === "yes_no" && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: true, label: sw ? "Ndiyo" : "Yes" },
                      { value: false, label: sw ? "Hapana" : "No" },
                      { value: "unknown", label: sw ? "Sina uhakika" : "Not sure" },
                    ].map((option) => (
                      <label key={String(option.value)} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition ${answers[question.id] === option.value ? "border-leaf bg-[#eff6e7] text-forest ring-2 ring-leaf/10" : "border-forest/12 hover:border-leaf/40"}`}><input type="radio" name={question.id} value={String(option.value)} className="sr-only" checked={answers[question.id] === option.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))} />{option.label}</label>
                    ))}
                  </div>
                )}
                {question.input_type === "multiple_choice" && (
                  <div className="grid gap-2">
                    {question.options.map((option) => (
                      <label key={option} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition ${answers[question.id] === option ? "border-leaf bg-[#eff6e7] text-forest ring-2 ring-leaf/10" : "border-forest/12 hover:border-leaf/40"}`}><input type="radio" name={question.id} value={option} className="sr-only" checked={answers[question.id] === option} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />{option}</label>
                    ))}
                  </div>
                )}
                {question.input_type === "short_text" && <textarea className="field" rows={3} maxLength={300} value={String(typeof answers[question.id] === "string" ? answers[question.id] : "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={sw ? "Andika jibu fupi…" : "Write a short answer…"} aria-label={question.text} />}
              </div>
            </fieldset>
          ))}
        </div>

        {validationError && <p className="mt-5 text-sm font-semibold text-clay" role="alert">{sw ? "Tafadhali jibu kila swali, hata kama huna uhakika." : "Please answer each question, even if you are not sure."}</p>}
        {error != null && <div className="mt-5"><ErrorPanel error={error} onRetry={() => void submitAnswersNow()} compact /></div>}
        <div className="mt-7 border-t border-forest/10 pt-6">
          <button type="submit" disabled={submitting} className="button-primary w-full min-h-14 text-base sm:w-auto">
            {submitting ? <><LoaderCircle className="animate-spin" size={19} />{sw ? "Inakagua na kurekebisha…" : "Verifying and revising…"}</> : <>{sw ? "Pata mpango uliokaguliwa" : "Get verified plan"}<ArrowRight size={18} /></>}
          </button>
          {submitting && <p className="mt-3 text-xs leading-5 text-ink/52" role="status">{sw ? "Tunachanganya ushahidi wa picha uliothibitishwa, maelezo yako na ushahidi wa marejeo, kisha ukaguzi wa pili wa usalama." : "Combining validated image observations, your context and retrieved evidence, then running a separate safety check."}</p>}
        </div>
      </form>
    </div>
  );
}
