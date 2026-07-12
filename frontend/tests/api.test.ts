import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getDashboardSummary, listAssessments, submitAnswers } from "@/lib/api";
import { assessment, assessmentSummary, dashboardSummary } from "@/tests/fixtures";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  } as unknown as Response;
}

describe("API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
    window.localStorage.setItem("shambalens.owner-token.v1", "browser-owner-token");
  });

  it("reads the direct assessment-list envelope and preserves summary fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [assessmentSummary], total: 1 }));

    await expect(listAssessments()).resolves.toEqual([assessmentSummary]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/api/v1/assessments");
    expect((init.headers as Headers).get("X-Shamba-Token")).toBe("browser-owner-token");
  });

  it("keeps yes/no answers boolean in the revision request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(assessment));

    await submitAnswers(assessment.id, [{ question_id: "target_rings", answer: false }]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      answers: [{ question_id: "target_rings", answer: false }],
    });
  });

  it("uses the canonical dashboard fields without an ownership header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(dashboardSummary));

    await expect(getDashboardSummary()).resolves.toEqual(dashboardSummary);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has("X-Shamba-Token")).toBe(false);
  });

  it("surfaces the standardized error envelope", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: "rate_limited", message: "Try again shortly.", retryable: true, request_id: "req-7" } }, 429));

    const error = await getDashboardSummary().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "rate_limited", retryable: true, requestId: "req-7", status: 429 });
  });
});
