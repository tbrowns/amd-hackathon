"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Droplets, FlaskConical, LoaderCircle, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ImageUploader } from "@/components/assessment/image-uploader";
import { ProgressSteps, type WizardStage } from "@/components/assessment/progress-steps";
import { QuestionForm } from "@/components/assessment/question-form";
import { RetakePanel } from "@/components/assessment/initial-summary";
import { useLanguage } from "@/components/providers/language-provider";
import { useRuntime } from "@/components/providers/runtime-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { analyzeAssessment, createAssessment, getAssessment } from "@/lib/api";
import { createDemoImage, type DemoScenario } from "@/lib/demo";
import type { Assessment, Crop, Language } from "@/lib/types";

const formSchema = z.object({
  crop: z.enum(["tomato", "onion", "kale"]),
  growth_stage: z.string().min(1, "Choose the plant growth stage."),
  region: z.string().max(120),
  symptom_duration: z.string().min(1, "Choose how long symptoms have been present."),
  watering_conditions: z.string().min(1, "Choose recent watering conditions."),
  description: z.string().max(1_000),
  language: z.enum(["en", "sw"]),
});

type FormValues = z.infer<typeof formSchema>;
type Phase = "photo" | "context" | "analyzing" | "analysis_failed" | "retake" | "questions";

const cropOptions: Array<{ value: Crop; icon: string; en: string; sw: string }> = [
  { value: "tomato", icon: "🍅", en: "Tomato", sw: "Nyanya" },
  { value: "onion", icon: "🧅", en: "Onion", sw: "Kitunguu" },
  { value: "kale", icon: "🥬", en: "Kale / sukuma wiki", sw: "Sukuma wiki" },
];

const growthStages = [
  { value: "seedling", en: "Seedling", sw: "Mche" },
  { value: "vegetative", en: "Vegetative growth", sw: "Ukuaji wa majani" },
  { value: "flowering", en: "Flowering", sw: "Maua" },
  { value: "fruiting", en: "Fruiting", sw: "Matunda" },
  { value: "bulb development", en: "Bulb development", sw: "Ukuaji wa kitunguu" },
  { value: "near harvest", en: "Near harvest", sw: "Karibu kuvuna" },
];

const durationOptions = [
  { value: "1-2 days", en: "1–2 days", sw: "Siku 1–2" },
  { value: "2-3 days", en: "2–3 days", sw: "Siku 2–3" },
  { value: "4-7 days", en: "4–7 days", sw: "Siku 4–7" },
  { value: "1-2 weeks", en: "1–2 weeks", sw: "Wiki 1–2" },
  { value: "more than 2 weeks", en: "More than 2 weeks", sw: "Zaidi ya wiki 2" },
  { value: "not sure", en: "Not sure", sw: "Sina uhakika" },
];

const wateringOptions = [
  { value: "Soil has been dry", en: "Soil has been dry", sw: "Udongo umekuwa mkavu" },
  { value: "Normal watering; soil is evenly moist", en: "Normal — evenly moist", sw: "Kawaida — unyevu wa kutosha" },
  { value: "Frequent rain; leaves have stayed wet", en: "Frequent rain / wet leaves", sw: "Mvua nyingi / majani yenye unyevu" },
  { value: "Soil is waterlogged", en: "Soil is waterlogged", sw: "Udongo umejaa maji" },
  { value: "Watering has been irregular", en: "Watering has been irregular", sw: "Umwagiliaji haukuwa wa kawaida" },
  { value: "Not sure", en: "Not sure", sw: "Sina uhakika" },
];

const kenyaCounties = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu",
  "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
  "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
  "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

function stageForPhase(phase: Phase): WizardStage {
  if (phase === "photo" || phase === "retake") return "photo";
  if (phase === "context" || phase === "analyzing" || phase === "analysis_failed") return "context";
  return "questions";
}

export function AssessmentWizard({ assessmentId }: { assessmentId?: string }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { runtime } = useRuntime();
  const sw = language === "sw";
  const [phase, setPhase] = useState<Phase>(assessmentId ? "analyzing" : "photo");
  const [files, setFiles] = useState<File[]>([]);
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { crop: "tomato", growth_stage: "", region: "", symptom_duration: "", watering_conditions: "", description: "", language },
  });
  const selectedCrop = useWatch({ control: form.control, name: "crop" });
  const selectedLanguage = useWatch({ control: form.control, name: "language" });

  const loadingMessages = useMemo(() => sw
    ? ["Inahifadhi picha kwa usalama…", "Inakagua ubora na sehemu inayoonekana…", "Inatenganisha dalili zinazoonekana…", "Inatafuta ushahidi unaohusiana…", "Inatengeneza maswali muhimu…"]
    : ["Securing your crop photos…", "Checking image quality and visibility…", "Separating visible observations…", "Retrieving relevant crop evidence…", "Selecting useful follow-up questions…"], [sw]);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const interval = window.setInterval(() => setLoadingMessage((value) => Math.min(value + 1, loadingMessages.length - 1)), 2200);
    return () => window.clearInterval(interval);
  }, [loadingMessages.length, phase]);

  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
    getAssessment(assessmentId)
      .then((value) => {
        if (!active) return;
        setAssessment(value);
        if (value.status === "completed" || value.final_assessment) {
          router.replace(`/report/${value.id}`);
        } else if (value.image_quality?.status === "retake_required") {
          setPhase("retake");
        } else if (value.initial_assessment) {
          setPhase("questions");
        } else {
          return analyzeAssessment(value.id).then(handleAnalyzed).catch((reason) => {
            if (!active) return;
            setError(reason);
            setPhase("analysis_failed");
          });
        }
      })
      .catch((reason) => active && setError(reason));
    return () => { active = false; };
    // handleAnalyzed is intentionally stable for this route lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, router]);

  useEffect(() => {
    if (!scenario) return;
    form.setValue("crop", scenario.crop, { shouldValidate: true });
    form.setValue("growth_stage", scenario.growth_stage, { shouldValidate: true });
    form.setValue("symptom_duration", scenario.symptom_duration, { shouldValidate: true });
    form.setValue("watering_conditions", scenario.watering_conditions, { shouldValidate: true });
    form.setValue("description", scenario.description[language]);
    form.setValue("language", language);
  }, [form, language, scenario]);

  function handleAnalyzed(value: Assessment) {
    setAssessment(value);
    if (value.image_quality?.status === "retake_required") {
      setPhase("retake");
      return;
    }
    if (value.final_assessment || value.status === "completed") {
      router.replace(`/report/${value.id}`);
      return;
    }
    setPhase("questions");
    if (!assessmentId) router.replace(`/assessment/${value.id}`);
  }

  async function retryAnalysis(id: string) {
    setError(null);
    setPhase("analyzing");
    setLoadingMessage(0);
    try {
      handleAnalyzed(await analyzeAssessment(id));
    } catch (reason) {
      setError(reason);
      setPhase("analysis_failed");
    }
  }

  const moveToContext = () => {
    if (files.length === 0 && !scenario) { setPhotoError(true); return; }
    setPhotoError(false);
    setPhase("context");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitContext = form.handleSubmit(async (values) => {
    setError(null);
    setPhase("analyzing");
    setLoadingMessage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const images = files.length > 0 ? files : scenario ? [await createDemoImage(scenario)] : [];
      const created = await createAssessment(
        {
          ...values,
          language: values.language as Language,
          images,
          demo_scenario: scenario?.id,
          region: values.region || undefined,
          description: values.description || undefined,
        },
        runtime?.image_storage ?? "local",
      );
      setAssessment(created);
      try {
        handleAnalyzed(await analyzeAssessment(created.id));
      } catch (reason) {
        setError(reason);
        setPhase("analysis_failed");
      }
    } catch (reason) {
      setError(reason);
      setPhase("context");
    }
  });

  const reset = () => {
    setFiles([]);
    setScenario(null);
    setAssessment(null);
    setError(null);
    setPhotoError(false);
    form.reset({ crop: "tomato", growth_stage: "", region: "", symptom_duration: "", watering_conditions: "", description: "", language });
    setPhase("photo");
    if (assessmentId) router.push("/assessment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error && assessmentId && !assessment) {
    return <div className="page-shell py-16"><ErrorPanel error={error} onRetry={() => window.location.reload()} /></div>;
  }

  return (
    <div className="min-h-[70vh] bg-[linear-gradient(180deg,#f3f1e6_0,#fbfaf6_28rem)] py-10 sm:py-14">
      <div className="page-shell">
        <div className="mx-auto max-w-4xl">
          <ProgressSteps current={stageForPhase(phase)} />
          <div className="mt-9">
            {phase === "photo" && (
              <section className="card p-5 sm:p-8">
                <div className="mb-7">
                  <p className="eyebrow">{sw ? "Hatua ya 1" : "Step 1"}</p>
                  <h1 className="mt-3 font-display text-3xl font-bold tracking-[-.035em] text-ink sm:text-4xl">{sw ? "Tuonyeshe kinachoendelea" : "Show us what’s happening"}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{sw ? "Picha nzuri hutusaidia kutenganisha dalili halisi na makisio. Hatuwezi kuendelea ikiwa sehemu iliyoathirika haionekani." : "A useful photo helps separate real symptoms from guesses. We’ll stop early if the affected area cannot be assessed safely."}</p>
                </div>
                <ImageUploader files={files} onChange={setFiles} scenario={scenario} onScenario={setScenario} allowDemo={runtime?.execution_mode === "demo"} />
                {photoError && <p className="mt-5 text-sm font-semibold text-clay" role="alert">{sw ? "Ongeza angalau picha moja au chagua onyesho." : "Add at least one photo or choose a demo scenario."}</p>}
                <div className="mt-7 flex justify-end border-t border-forest/10 pt-6"><button type="button" onClick={moveToContext} className="button-primary w-full sm:w-auto">{sw ? "Endelea na maelezo" : "Continue to context"}<ArrowRight size={18} /></button></div>
              </section>
            )}

            {phase === "context" && (
              <form onSubmit={submitContext} className="card p-5 sm:p-8" noValidate>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="eyebrow">{sw ? "Hatua ya 2" : "Step 2"}</p><h1 className="mt-3 font-display text-3xl font-bold tracking-[-.035em] text-ink sm:text-4xl">{sw ? "Ongeza maelezo ya shamba" : "Add a little farm context"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{sw ? "Hii husaidia AI kulinganisha picha na hali halisi ya mmea." : "This helps the AI interpret the image against the plant’s real conditions."}</p></div>
                  {scenario && <span className="hidden items-center gap-1.5 rounded-full bg-[#fff3cd] px-3 py-2 text-[11px] font-bold text-[#6b5319] sm:inline-flex"><FlaskConical size={14} />Demo</span>}
                </div>

                <div className="mt-8">
                  <label className="field-label">{sw ? "Zao gani limeathirika?" : "Which crop is affected?"}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {cropOptions.map((crop) => {
                      const selected = selectedCrop === crop.value;
                      return <label key={crop.value} className={`cursor-pointer rounded-2xl border p-3 text-center transition sm:p-4 ${selected ? "border-leaf bg-[#eff6e7] ring-2 ring-leaf/10" : "border-forest/12 bg-white hover:border-leaf/35"}`}><input type="radio" value={crop.value} className="sr-only" {...form.register("crop")} /><span className="block text-2xl sm:text-3xl">{crop.icon}</span><span className="mt-2 block text-xs font-bold text-ink sm:text-sm">{sw ? crop.sw : crop.en}</span></label>;
                    })}
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div><label htmlFor="growth_stage" className="field-label">{sw ? "Hatua ya ukuaji" : "Growth stage"}</label><select id="growth_stage" className="field" aria-invalid={!!form.formState.errors.growth_stage} {...form.register("growth_stage")}><option value="">{sw ? "Chagua hatua" : "Select a stage"}</option>{growthStages.map((option) => <option key={option.value} value={option.value}>{sw ? option.sw : option.en}</option>)}</select>{form.formState.errors.growth_stage && <p className="field-error">{sw ? "Chagua hatua ya ukuaji." : form.formState.errors.growth_stage.message}</p>}</div>
                  <div><label htmlFor="symptom_duration" className="field-label">{sw ? "Dalili zilianza lini?" : "How long have symptoms been present?"}</label><select id="symptom_duration" className="field" aria-invalid={!!form.formState.errors.symptom_duration} {...form.register("symptom_duration")}><option value="">{sw ? "Chagua muda" : "Choose a duration"}</option>{durationOptions.map((option) => <option key={option.value} value={option.value}>{sw ? option.sw : option.en}</option>)}</select>{form.formState.errors.symptom_duration && <p className="field-error">{sw ? "Chagua muda wa dalili." : form.formState.errors.symptom_duration.message}</p>}</div>
                  <div><label htmlFor="watering_conditions" className="field-label"><Droplets size={15} className="mr-1 inline text-leaf" />{sw ? "Maji au mvua ya karibuni" : "Recent watering or rain"}</label><select id="watering_conditions" className="field" aria-invalid={!!form.formState.errors.watering_conditions} {...form.register("watering_conditions")}><option value="">{sw ? "Chagua hali" : "Choose conditions"}</option>{wateringOptions.map((option) => <option key={option.value} value={option.value}>{sw ? option.sw : option.en}</option>)}</select>{form.formState.errors.watering_conditions && <p className="field-error">{sw ? "Chagua hali ya maji." : form.formState.errors.watering_conditions.message}</p>}</div>
                  <div><label htmlFor="region" className="field-label"><MapPin size={15} className="mr-1 inline text-leaf" />{sw ? "Kaunti (si lazima)" : "County (optional)"}</label><select id="region" className="field" {...form.register("region")}><option value="">{sw ? "Chagua kaunti au usiseme" : "Select a county or leave blank"}</option>{kenyaCounties.map((county) => <option key={county} value={county}>{county}</option>)}<option value="Other / prefer not to say">{sw ? "Nyingine / sitaki kusema" : "Other / prefer not to say"}</option></select><p className="field-hint">{sw ? "Tunatumia kaunti pekee kwa muhtasari mpana; hatuombi anwani kamili." : "We use county-level data only for coarse summaries; no exact address is requested."}</p></div>
                </div>

                <div className="mt-5"><label htmlFor="description" className="field-label">{sw ? "Umeona nini kingine? (si lazima)" : "What else have you noticed? (optional)"}</label><textarea id="description" className="field" placeholder={sw ? "Mahali dalili zilipoanza, mimea mingine, wadudu ulioona…" : "Where symptoms began, nearby affected plants, pests you noticed…"} {...form.register("description")} /></div>

                <fieldset className="mt-5"><legend className="field-label">{sw ? "Lugha ya ripoti" : "Report language"}</legend><div className="grid grid-cols-2 gap-2">{([{"value":"en","label":"English"},{"value":"sw","label":"Kiswahili"}] as const).map((option) => <label key={option.value} className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-bold ${selectedLanguage === option.value ? "border-leaf bg-[#eff6e7] text-forest" : "border-forest/12"}`}><input type="radio" value={option.value} className="sr-only" {...form.register("language", { onChange: (event) => setLanguage(event.target.value as Language) })} />{option.label}</label>)}</div></fieldset>

                {error != null && <div className="mt-6"><ErrorPanel error={error} compact /></div>}
                <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-forest/10 pt-6 sm:flex-row"><button type="button" onClick={() => setPhase("photo")} className="button-quiet"><ArrowLeft size={18} />{sw ? "Rudi kwenye picha" : "Back to photos"}</button><button type="submit" className="button-primary min-h-14"><Sparkles size={19} />{sw ? "Changanua kwa ushahidi" : "Analyze with evidence"}<ArrowRight size={18} /></button></div>
              </form>
            )}

            {phase === "analyzing" && (
              <section className="card overflow-hidden p-7 text-center sm:p-12" aria-live="polite">
                <div className="relative mx-auto grid h-24 w-24 place-items-center"><span className="absolute inset-0 animate-pulse rounded-full bg-[#e8f0d0]" /><span className="absolute inset-3 rounded-full bg-white shadow-soft" /><LoaderCircle className="relative animate-spin text-leaf" size={38} /></div>
                <p className="eyebrow mt-7">{sw ? "Inachanganua" : "Evidence pipeline running"}</p>
                <h1 className="mt-3 font-display text-3xl font-bold text-ink">{loadingMessages[loadingMessage]}</h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink/56">{sw ? "Tunaepuka jibu la haraka la lebo moja. Hatua hii inaweza kuchukua muda kidogo." : "We’re avoiding a rushed single-label answer. This can take a little while."}</p>
                <div className="mx-auto mt-8 max-w-md"><div className="h-1.5 overflow-hidden rounded-full bg-forest/10"><div className="h-full rounded-full bg-gradient-to-r from-moss to-leaf transition-all duration-700" style={{ width: `${20 + loadingMessage * 18}%` }} /></div><div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-wider text-ink/35"><span>{sw ? "Ubora" : "Quality"}</span><span>{sw ? "Ushahidi" : "Evidence"}</span><span>{sw ? "Maswali" : "Questions"}</span></div></div>
                <div className="mx-auto mt-8 flex max-w-md items-start gap-2 rounded-xl bg-oat p-4 text-left text-xs leading-5 text-ink/55"><ShieldCheck className="mt-0.5 shrink-0 text-leaf" size={17} />{sw ? "Picha isiyofaa itasimamishwa kabla ya uchunguzi kamili." : "An unusable image will be stopped before a full diagnostic request."}</div>
              </section>
            )}

            {phase === "analysis_failed" && assessment && (
              <section className="card p-6 sm:p-9">
                <p className="eyebrow">{sw ? "Picha na maelezo yamehifadhiwa" : "Photos and context are saved"}</p>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-[-.03em] text-ink">{sw ? "Uchambuzi haukukamilika." : "The analysis did not finish."}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/60">{sw ? "Jaribu uchambuzi tena bila kupakia picha au kuunda ukaguzi mwingine." : "Retry the analysis without uploading your photos again or creating a duplicate assessment."}</p>
                {error != null && <div className="mt-6"><ErrorPanel error={error} onRetry={() => void retryAnalysis(assessment.id)} /></div>}
              </section>
            )}

            {phase === "retake" && assessment?.image_quality && <RetakePanel quality={assessment.image_quality} onRetake={reset} />}
            {phase === "questions" && assessment && <QuestionForm assessment={assessment} onComplete={(value) => router.push(`/report/${value.id}`)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
