"use client";

import { AlertTriangle, Camera, Database, Eye, FileQuestion, Leaf, LockKeyhole, ShieldCheck, Stethoscope } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useRuntime } from "@/components/providers/runtime-provider";
import { PageIntro } from "@/components/ui/page-intro";

export function SafetyPage() {
  const { language } = useLanguage();
  const { runtime } = useRuntime();
  const sw = language === "sw";
  const steps = [
    {
      icon: Camera,
      title: sw ? "Kagua picha kwanza" : "Check the image first",
      body: sw ? "Ukungu, mwanga mbaya au sehemu iliyoathirika kutokuonekana husababisha ombi la picha nyingine kabla ya utambuzi." : "Blur, poor lighting or a hidden affected area triggers a retake request before diagnostic reasoning.",
    },
    {
      icon: Eye,
      title: sw ? "Tenganisha kinachoonekana" : "Separate what is visible",
      body: sw ? "Mfumo wa kuona hutoa dalili zinazoonekana. Mfumo wa uchambuzi hupokea maandishi hayo; haudai kuwa umeona picha." : "The vision stage extracts observable symptoms. The reasoning model receives that text and does not claim to have seen the images.",
    },
    {
      icon: FileQuestion,
      title: sw ? "Uliza kabla ya kuhitimisha" : "Ask before concluding",
      body: sw ? "Maswali machache hutofautisha sababu zinazoongoza, kisha jibu husasishwa kwa kutumia maelezo ya mkulima." : "A few discriminating questions separate the leading possibilities before the result is revised with farmer context.",
    },
    {
      icon: ShieldCheck,
      title: sw ? "Kagua jibu kwa kujitegemea" : "Verify independently",
      body: sw ? "Ukaguzi wa pili hutafuta kutokubaliana, uhakika uliopitiliza na ushauri wa kemikali usio salama kabla ya kuhifadhi ripoti." : "A separate verification stage checks for contradictions, overconfidence and unsafe chemical advice before the report is stored.",
    },
  ];

  return (
    <div className="min-h-[70vh] bg-[linear-gradient(180deg,#edf1df_0,#fbfaf6_34rem)] py-14 sm:py-20">
      <div className="page-shell">
        <PageIntro
          eyebrow={sw ? "Uwazi na usalama" : "Transparency & safety"}
          title={sw ? "Jinsi ShambaLens inavyofanya kazi" : "How ShambaLens works"}
          description={sw ? "ShambaLens ni zana ya uchunguzi wa awali wa mazao. Inaonyesha ushahidi, kutokuwa na uhakika na wakati wa kutafuta mtaalamu — si utambuzi wa uhakika." : "ShambaLens is an evidence-first crop-triage tool. It exposes evidence, uncertainty and escalation points—it is not a definitive diagnosis."}
        />

        <section className="mt-10 grid gap-4 md:grid-cols-2" aria-labelledby="pipeline-heading">
          <h2 id="pipeline-heading" className="sr-only">{sw ? "Hatua za mfumo" : "System stages"}</h2>
          {steps.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="soft-card p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-oat text-forest"><Icon size={21} /></span>
                <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-leaf">{sw ? "Hatua" : "Stage"} {index + 1}</p><h3 className="mt-2 font-display text-xl font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink/62">{body}</p></div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="card p-6 sm:p-8" aria-labelledby="limits-heading">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-clay/10 text-clay"><AlertTriangle size={21} /></span><h2 id="limits-heading" className="font-display text-2xl font-bold text-ink">{sw ? "Mipaka muhimu" : "Important limits"}</h2></div>
            <ul className="mt-6 grid gap-4 text-sm leading-6 text-ink/68">
              <Limit icon={Leaf}>{sw ? "Dalili nyingi za mazao zinafanana. Picha na majibu hayawezi kuthibitisha kimelea, upungufu au chanzo cha mazingira." : "Many crop problems look alike. Photos and answers cannot confirm a pathogen, deficiency or environmental cause."}</Limit>
              <Limit icon={Stethoscope}>{sw ? "Tafuta afisa wa ugani au mtaalamu ikiwa dalili ni kali, zinaenea haraka, zinaathiri shamba kubwa au jibu lina uhakika mdogo." : "Consult an extension officer or qualified agronomist when symptoms are severe, spreading quickly, widespread or the result remains uncertain."}</Limit>
              <Limit icon={ShieldCheck}>{sw ? "Usitumie dawa kwa kutegemea ripoti hii pekee. Fuata lebo ya bidhaa na mwongozo wa kitaalamu wa eneo lako." : "Do not apply a pesticide based on this report alone. Follow the product label and qualified local guidance."}</Limit>
            </ul>
          </section>

          <section className="rounded-3xl bg-forest p-7 text-white" aria-labelledby="privacy-heading">
            <LockKeyhole className="text-[#dce9a7]" size={25} />
            <h2 id="privacy-heading" className="mt-5 font-display text-2xl font-bold">{sw ? "Faragha kwa chaguo-msingi" : "Private by default"}</h2>
            <p className="mt-3 text-sm leading-6 text-white/68">{sw ? "Hakuna akaunti inayohitajika. Ishara isiyo wazi kwenye kivinjari chako hutenganisha ripoti zako na za wengine. Picha hazionekani kwenye dashibodi ya jamii." : "No account is required. An opaque token stored in your browser separates your reports from everyone else’s. Photos never appear in the community dashboard."}</p>
            <div className="mt-6 flex items-start gap-3 border-t border-white/12 pt-5"><Database className="mt-0.5 shrink-0 text-[#dce9a7]" size={18} /><p className="text-xs leading-5 text-white/58">{sw ? "Ripoti na metadata huhifadhiwa kwenye PostgreSQL; picha zilizorekebishwa huhifadhiwa kwa faragha na hupatikana kwa ishara ya kivinjari chako pekee." : "Reports and metadata are stored in PostgreSQL; normalized images are kept private and fetched only with your browser token."}</p></div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-forest/12 bg-[#f2f0e4] p-6 sm:p-8" aria-labelledby="models-heading">
          <h2 id="models-heading" className="font-display text-2xl font-bold text-ink">{sw ? "Mfumo unaotumika sasa" : "Current system provenance"}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">{runtime?.execution_mode === "demo" ? (sw ? "Hali ya onyesho inatumia matokeo thabiti yaliyoigizwa; miundo ya moja kwa moja haitumiki." : "Demo mode uses deterministic simulated fixtures; live models are not called.") : (sw ? "Katika hali ya moja kwa moja, hatua ya kuona na hatua za uchambuzi hutumia miundo tofauti iliyoonyeshwa hapa." : "In live mode, separate observation and reasoning stages use the configured models shown here.")}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Model label={sw ? "Mtoa huduma" : "Provider"} value={runtime?.ai_provider} />
            <Model label={sw ? "Mfumo wa kuona" : "Vision model"} value={runtime?.vision_model} />
            <Model label={sw ? "Mfumo wa uchambuzi" : "Reasoning model"} value={runtime?.reasoning_model} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function Limit({ icon: Icon, children }: { icon: typeof Leaf; children: React.ReactNode }) {
  return <li className="flex items-start gap-3"><Icon className="mt-0.5 shrink-0 text-leaf" size={18} /><span>{children}</span></li>;
}

function Model({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-xl bg-white p-4"><dt className="text-[10px] font-extrabold uppercase tracking-[.12em] text-ink/40">{label}</dt><dd className="mt-2 break-words font-mono text-xs font-semibold text-forest">{value ?? "—"}</dd></div>;
}
