import { getOwnerToken } from "@/lib/token";
import { deleteUploadedImages, uploadAssessmentImages } from "@/lib/firebase-storage";
import type {
  Assessment,
  AssessmentList,
  AssessmentSummary,
  CreateAssessmentInput,
  DashboardSummary,
  RuntimeInfo,
  SubmitAnswerInput,
} from "@/lib/types";

const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const API_ROOT = RAW_BASE.endsWith("/api/v1") ? RAW_BASE : `${RAW_BASE}/api/v1`;
const DEFAULT_TIMEOUT_MS = 90_000;

export class ApiError extends Error {
  code: string;
  retryable: boolean;
  requestId?: string;
  status: number;

  constructor(message: string, options?: { code?: string; retryable?: boolean; requestId?: string; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code ?? "request_failed";
    this.retryable = options?.retryable ?? false;
    this.requestId = options?.requestId;
    this.status = options?.status ?? 0;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options?: { timeoutMs?: number; anonymous?: boolean; firebaseToken?: string },
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  if (!options?.anonymous) headers.set("X-Shamba-Token", getOwnerToken());
  if (options?.firebaseToken) headers.set("Authorization", `Bearer ${options.firebaseToken}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_ROOT}${path}`, { ...init, headers, signal: controller.signal });
    if (!response.ok) {
      const fallback = `Request failed with status ${response.status}.`;
      const payload = (await response.json().catch(() => null)) as
        | { error?: { code?: string; message?: string; retryable?: boolean; request_id?: string }; detail?: string }
        | null;
      throw new ApiError(payload?.error?.message ?? payload?.detail ?? fallback, {
        code: payload?.error?.code,
        retryable: payload?.error?.retryable ?? (response.status >= 500 || response.status === 429),
        requestId: payload?.error?.request_id ?? response.headers.get("x-request-id") ?? undefined,
        status: response.status,
      });
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.", {
        code: "request_timeout",
        retryable: true,
        status: 504,
      });
    }
    throw new ApiError("We could not reach ShambaLens. Check your connection and try again.", {
      code: "network_error",
      retryable: true,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function createAssessment(
  input: CreateAssessmentInput,
  imageStorage: RuntimeInfo["image_storage"] = "local",
): Promise<Assessment> {
  if (imageStorage === "firebase") {
    const upload = await uploadAssessmentImages(input.images);
    try {
      return await request<Assessment>(
        "/assessments/from-storage",
        {
          method: "POST",
          body: JSON.stringify({
            crop: input.crop,
            growth_stage: input.growth_stage,
            symptom_duration: input.symptom_duration,
            watering_conditions: input.watering_conditions,
            language: input.language,
            region: input.region?.trim() || undefined,
            description: input.description?.trim() || undefined,
            demo_scenario: input.demo_scenario,
            images: upload.images,
          }),
        },
        { firebaseToken: upload.idToken, timeoutMs: 120_000 },
      );
    } catch (error) {
      await deleteUploadedImages(upload.images);
      throw error;
    }
  }
  const form = new FormData();
  form.set("crop", input.crop);
  form.set("growth_stage", input.growth_stage);
  form.set("symptom_duration", input.symptom_duration);
  form.set("watering_conditions", input.watering_conditions);
  form.set("language", input.language);
  if (input.region?.trim()) form.set("region", input.region.trim());
  if (input.description?.trim()) form.set("description", input.description.trim());
  if (input.demo_scenario) form.set("demo_scenario", input.demo_scenario);
  input.images.forEach((image) => form.append("images", image, image.name));
  return request<Assessment>("/assessments", { method: "POST", body: form });
}

export function analyzeAssessment(id: string): Promise<Assessment> {
  return request<Assessment>(`/assessments/${encodeURIComponent(id)}/analyze`, { method: "POST" }, { timeoutMs: 120_000 });
}

export function submitAnswers(id: string, answers: SubmitAnswerInput[]): Promise<Assessment> {
  return request<Assessment>(
    `/assessments/${encodeURIComponent(id)}/answers`,
    { method: "POST", body: JSON.stringify({ answers }) },
    { timeoutMs: 120_000 },
  );
}

export function getAssessment(id: string): Promise<Assessment> {
  return request<Assessment>(`/assessments/${encodeURIComponent(id)}`);
}

export async function listAssessments(): Promise<AssessmentSummary[]> {
  const response = await request<AssessmentList>("/assessments");
  return response.items;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return request<DashboardSummary>("/dashboard/summary", {}, { anonymous: true, timeoutMs: 20_000 });
}

export function getRuntime(): Promise<RuntimeInfo> {
  return request<RuntimeInfo>("/system/runtime", {}, { anonymous: true, timeoutMs: 15_000 });
}

export async function getProtectedImage(assessmentId: string, imageId: string): Promise<string> {
  const response = await fetch(
    `${API_ROOT}/assessments/${encodeURIComponent(assessmentId)}/images/${encodeURIComponent(imageId)}`,
    { headers: { "X-Shamba-Token": getOwnerToken() } },
  );
  if (!response.ok) throw new ApiError("This private image could not be loaded.", { status: response.status });
  return URL.createObjectURL(await response.blob());
}
