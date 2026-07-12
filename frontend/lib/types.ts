export type Language = "en" | "sw";
export type Crop = "tomato" | "onion" | "kale";
export type QualityStatus = "good" | "caution" | "retake_required";
export type Urgency = "low" | "moderate" | "high";
export type AssessmentStatus =
  | "created"
  | "analyzing"
  | "retake_required"
  | "questions_ready"
  | "completed"
  | "failed";

export interface ImageQuality {
  status: QualityStatus;
  plant_visible: boolean;
  crop_relevant: boolean;
  affected_area_visible: boolean;
  clarity_score: number;
  lighting_acceptable: boolean;
  observations: string[];
  retake_instructions: string[];
}

export interface ImageObservation {
  image_quality: ImageQuality;
  crop_guess: string | null;
  observation_summary: string;
  visible_symptoms: string[];
  distribution: string[];
}

export interface Hypothesis {
  name: string;
  category: string;
  confidence: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  missing_information: string[];
  severity: "low" | "moderate" | "high" | "unknown";
}

export interface FollowUpQuestion {
  id: string;
  text: string;
  input_type: "yes_no" | "multiple_choice" | "short_text";
  options: string[];
  explanation: string;
  distinguishes: string[];
}

export interface ActionPlan {
  do_today: string[];
  monitor: string[];
  avoid: string[];
  escalate_when: string[];
}

export interface InitialAssessment {
  observation_summary: string;
  hypotheses: Hypothesis[];
  follow_up_questions: FollowUpQuestion[];
  overall_confidence: number;
  urgency: Urgency;
  uncertainty_message: string;
  requires_expert: boolean;
  image_quality: ImageQuality;
  sources: string[];
  simulated: boolean;
}

export interface FinalAssessment {
  observation_summary: string;
  hypotheses: Hypothesis[];
  most_likely_explanation: string;
  overall_confidence: number;
  urgency: Urgency;
  uncertainty_message: string;
  what_changed: string;
  greatest_effect: string;
  action_plan: ActionPlan;
  warning_signs: string[];
  expert_guidance: string;
  requires_expert: boolean;
  sources: string[];
  limitations_notice: string;
  simulated: boolean;
}

export interface AssessmentImage {
  id: string;
  content_type: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  size_bytes: number;
  url: string;
}

export interface AnswerRecord {
  question_id: string;
  answer: boolean | string;
}

export interface Verification {
  passed: boolean;
  issues: string[];
  corrected_assessment: FinalAssessment | null;
  confidence_adjustment: number;
  chemical_advice_removed: boolean;
}

export interface ProviderMetadata {
  provider?: string;
  vision_model?: string;
  reasoning_model?: string;
  verifier_model?: string;
  reasoner_received_images?: boolean;
  simulated?: boolean;
  [key: string]: unknown;
}

export interface TimingMetadata {
  local_image_checks_ms?: number;
  vision_ms?: number;
  reasoning_ms?: number;
  revision_ms?: number;
  verification_ms?: number;
  [key: string]: number | undefined;
}

export interface Assessment {
  id: string;
  status: AssessmentStatus;
  crop: Crop;
  growth_stage: string;
  region: string | null;
  symptom_duration: string;
  watering_conditions: string;
  description: string | null;
  language: Language;
  images: AssessmentImage[];
  image_quality: ImageQuality | null;
  model_observation: ImageObservation | null;
  initial_assessment: InitialAssessment | null;
  answers: AnswerRecord[] | null;
  final_assessment: FinalAssessment | null;
  verification: Verification | null;
  provider_metadata: ProviderMetadata;
  timing_metadata: TimingMetadata;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  simulated: boolean;
}

export interface AssessmentSummary {
  id: string;
  status: AssessmentStatus;
  crop: Crop;
  region: string | null;
  urgency: Urgency | null;
  leading_hypothesis: string | null;
  created_at: string;
  completed_at: string | null;
  simulated: boolean;
}

export interface AssessmentList {
  items: AssessmentSummary[];
  total: number;
}

export interface RuntimeInfo {
  ai_provider: string;
  execution_mode: "demo" | "live";
  vision_model: string;
  reasoning_model: string;
  verifier_model: string;
  last_stage_latencies_ms: TimingMetadata;
  database: "postgresql" | "sqlite" | "other";
}

export interface DashboardRegion {
  region: string;
  reports: number;
}

export interface DashboardSummary {
  reports_this_week: number;
  most_affected_crop: string | null;
  most_common_category: string | null;
  reports_by_region: DashboardRegion[];
  high_urgency_signals: number;
  disclaimer: string;
  simulated: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    request_id: string;
    details?: unknown;
  };
}

export interface CreateAssessmentInput {
  crop: Crop;
  growth_stage: string;
  region?: string;
  symptom_duration: string;
  watering_conditions: string;
  description?: string;
  language: Language;
  images: File[];
  demo_scenario?: string;
}

export interface SubmitAnswerInput {
  question_id: string;
  answer: boolean | string;
}
