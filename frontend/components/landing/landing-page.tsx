"use client";

import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  Leaf,
  MessageSquareText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

export function LandingPage() {
  const { language } = useLanguage();
  const sw = language === "sw";

  const stages = [
    {
      icon: Camera,
      number: "01",
      title: sw ? "Picha inayofaa" : "A usable photo",
      body: sw ? "Tunakagua mwanga, uwazi na kama sehemu iliyoathirika inaonekana." : "We check lighting, clarity and whether the affected area is actually visible.",
    },
    {
      icon: Eye,
      number: "02",
      title: sw ? "Ushahidi unaoonekana" : "Visible evidence",
      body: sw ? "AI huandika dalili inazoona bila kudai imejua ugonjwa mara moja." : "The AI records observable symptoms before making any diagnostic claim.",
    },
    {
      icon: CircleHelp,
      number: "03",
      title: sw ? "Maswali muhimu" : "Questions that matter",
      body: sw ? "Maswali machache husaidia kutofautisha visababishi vinavyowezekana." : "A few targeted questions help separate the most plausible causes.",
    },
    {
      icon: ShieldCheck,
      number: "04",
      title: sw ? "Mpango uliokaguliwa" : "A verified plan",
      body: sw ? "Ukaguzi wa pili hupima usalama, ushahidi na kiwango sahihi cha uhakika." : "A second pass checks safety, evidence and whether the confidence is justified.",
    },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-forest/10 bg-[#f8f5e9] botanical-grid">
        <div className="hero-orb -right-24 top-20 h-96 w-96 bg-moss/20" />
        <div className="hero-orb -left-28 bottom-4 h-72 w-72 bg-leaf/10" />
        <div className="leaf-shape right-[8%] top-[15%] hidden h-24 w-14 bg-leaf/10 lg:block" />
        <div className="leaf-shape bottom-[10%] left-[4%] hidden h-16 w-10 rotate-[80deg] bg-moss/20 lg:block" />

        <div className="page-shell grid min-h-[720px] items-center gap-14 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="relative z-10 animate-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-white/80 px-3.5 py-2 text-xs font-bold text-forest shadow-soft backdrop-blur">
              <Sparkles size={15} className="text-moss" aria-hidden="true" />
              {sw ? "Uchunguzi wa mazao unaoanza na ushahidi" : "Evidence-first crop triage"}
            </div>
            <h1 className="mt-7 max-w-3xl text-balance font-display text-[clamp(3.35rem,7vw,6.1rem)] font-bold leading-[.92] tracking-[-.065em] text-ink">
              {sw ? <>Jua <em className="font-normal text-leaf">kinachoathiri</em> zao lako.</> : <>See what your crop is <em className="font-normal text-leaf">telling you.</em></>}
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-ink/68 sm:text-xl">
              {sw
                ? "Pakia picha, jibu maswali machache, kisha upate visababishi vinavyowezekana na hatua salama — bila uhakika wa kupindukia."
                : "Upload a photo, answer a few useful questions, and get plausible causes with a safe next-step plan — without the false certainty."}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="button-primary min-h-14 px-6 text-base">
                <ScanSearch size={20} aria-hidden="true" /> {sw ? "Kagua zao" : "Check a crop"} <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/about" className="button-secondary min-h-14 px-6 text-base">
                {sw ? "Jinsi inavyofanya kazi" : "See how it works"}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink/60">
              {[sw ? "Bila akaunti" : "No account needed", sw ? "Faragha kwanza" : "Privacy first", sw ? "Kiingereza + Kiswahili" : "English + Kiswahili"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5"><Check size={15} className="text-leaf" />{item}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
            <div className="absolute -left-8 top-12 z-20 hidden rounded-2xl border border-white/80 bg-white/90 p-3 shadow-card backdrop-blur sm:block">
              <div className="flex items-center gap-2 text-xs font-bold text-forest"><span className="h-2.5 w-2.5 rounded-full bg-moss" /> {sw ? "Picha inafaa" : "Photo is usable"}</div>
            </div>
            <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-white bg-[#dce9a7] shadow-[0_32px_90px_rgba(25,69,46,.23)]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(circle_at_28%_16%,#f0e8b7_0,transparent_30%),linear-gradient(145deg,#dce9a7,#7fa55b)]">
                <div className="absolute left-[36%] top-[5%] h-[92%] w-3 rotate-[-4deg] rounded-full bg-forest/80" />
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`absolute h-24 w-44 rounded-[100%_0_100%_0] bg-leaf shadow-[inset_10px_4px_20px_rgba(255,255,255,.15)] ${index % 2 ? "rotate-[38deg]" : "-rotate-[28deg]"}`}
                    style={{ top: `${16 + index * 16}%`, left: index % 2 ? "39%" : "10%", transformOrigin: index % 2 ? "left center" : "right center" }}
                  >
                    <span className="absolute left-[38%] top-[30%] h-5 w-5 rounded-full bg-clay/80 ring-4 ring-sun/30" />
                    {index < 3 && <span className="absolute left-[63%] top-[52%] h-3 w-3 rounded-full bg-clay/75" />}
                  </div>
                ))}
                <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/60 bg-white/92 p-5 shadow-card backdrop-blur-md">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[.17em] text-leaf">{sw ? "Inawezekana zaidi" : "Leading possibility"}</p>
                      <p className="mt-1 font-display text-xl font-bold text-ink">{sw ? "Madoa ya mapema" : "Early blight"}</p>
                    </div>
                    <span className="rounded-full bg-[#e8f0d0] px-3 py-1.5 text-xs font-bold text-forest">{sw ? "Wastani" : "Moderate"}</span>
                  </div>
                  <div className="mt-4 confidence-track"><div className="confidence-fill w-[67%]" /></div>
                  <p className="mt-3 text-xs leading-5 text-ink/62">{sw ? "Madoa ya kahawia kwenye majani ya chini yanaunga mkono, lakini pete hazionekani wazi." : "Lower-leaf brown spots support it, but ring patterns are not yet clear."}</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 z-20 max-w-[210px] rounded-2xl bg-forest p-4 text-white shadow-card sm:-right-7">
              <div className="flex items-center gap-2 text-xs font-bold"><MessageSquareText size={16} className="text-[#dce9a7]" /> {sw ? "Swali muhimu" : "Useful question"}</div>
              <p className="mt-2 text-xs leading-5 text-white/75">{sw ? "Je, madoa yalianza kwenye majani ya chini?" : "Did the spots begin on lower leaves?"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space bg-[#fbfaf6]">
        <div className="page-shell">
          <div className="grid items-end gap-6 md:grid-cols-2">
            <div>
              <p className="eyebrow">{sw ? "Njia tofauti" : "A different workflow"}</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-[-.04em] text-ink sm:text-5xl">
                {sw ? "Haianzi na jibu. Inaanza na ushahidi." : "It doesn’t start with an answer. It starts with evidence."}
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-ink/65 md:justify-self-end">
              {sw ? "Picha moja haiwezi kusema kila kitu. ShambaLens hutenganisha kile kinachoonekana, kile kinachowezekana, na kile ambacho bado hakijulikani." : "One photo rarely tells the whole story. ShambaLens separates what is visible, what is plausible, and what still needs to be learned."}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map(({ icon: Icon, number, title, body }, index) => (
              <article key={number} className="group relative overflow-hidden rounded-3xl border border-forest/12 bg-white p-6 transition hover:-translate-y-1 hover:shadow-card">
                <span className="absolute right-4 top-3 font-display text-5xl font-bold text-forest/[.045]">{number}</span>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-oat text-forest group-hover:bg-forest group-hover:text-white"><Icon size={21} /></span>
                <h3 className="mt-6 font-display text-xl font-bold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/62">{body}</p>
                {index < stages.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden rounded-full bg-[#fbfaf6] p-1 text-forest/35 lg:block" size={25} />}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest py-20 text-white">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#dce9a7]">{sw ? "Zaidi ya lebo moja" : "Beyond a single label"}</p>
            <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-[-.04em] sm:text-5xl">{sw ? "Sababu tatu. Ushahidi wa pande zote mbili." : "Three possibilities. Evidence on both sides."}</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/66">{sw ? "Kila uwezekano unaonyesha kinachounga mkono, kinachoupinga, na taarifa inayokosekana." : "Every possibility shows what supports it, what argues against it, and what information is missing."}</p>
            <Link href="/assessment" className="mt-8 inline-flex items-center gap-2 font-bold text-[#e3efad] hover:text-white">{sw ? "Jaribu ukaguzi" : "Try an assessment"}<ArrowRight size={18} /></Link>
          </div>
          <div className="grid gap-3">
            {[
              { rank: "01", name: sw ? "Madoa ya mapema" : "Early blight", category: sw ? "Ugonjwa wa kuvu" : "Fungal disease", width: "67%", tone: "bg-[#dce9a7]" },
              { rank: "02", name: sw ? "Upungufu wa potasiamu" : "Potassium deficiency", category: sw ? "Lishe" : "Nutrition", width: "43%", tone: "bg-[#f2b94b]" },
              { rank: "03", name: sw ? "Msongo wa maji" : "Water stress", category: sw ? "Mazingira" : "Environment", width: "29%", tone: "bg-[#8cb699]" },
            ].map((item) => (
              <article key={item.rank} className="rounded-2xl border border-white/12 bg-white/[.07] p-5 backdrop-blur">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-white/40">{item.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl font-bold">{item.name}</h3><span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">{item.category}</span></div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${item.tone}`} style={{ width: item.width }} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="page-shell">
          <div className="rounded-4xl border border-forest/12 bg-[#f2f0e4] p-7 sm:p-10 lg:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow">{sw ? "Mazao ya kuanzia" : "Built for local staples"}</p>
                <h2 className="mt-4 font-display text-4xl font-bold tracking-[-.04em] text-ink">{sw ? "Nyanya, vitunguu na sukuma wiki." : "Tomatoes, onions and sukuma wiki."}</h2>
                <p className="mt-4 max-w-2xl leading-7 text-ink/62">{sw ? "Msingi wa maarifa una ushahidi wa matatizo ya kuvu, bakteria, virusi, wadudu, lishe na mazingira. Si kamili — na tunasema wazi pale ambapo ushahidi hautoshi." : "The evidence library covers representative fungal, bacterial, viral, pest, nutrient and environmental problems. It is not exhaustive — and we say so when evidence is limited."}</p>
              </div>
              <div className="flex gap-3">
                {[{ icon: "🍅", label: sw ? "Nyanya" : "Tomato" }, { icon: "🧅", label: sw ? "Kitunguu" : "Onion" }, { icon: "🥬", label: sw ? "Sukuma" : "Kale" }].map((crop) => (
                  <div key={crop.label} className="grid h-24 w-24 place-items-center rounded-2xl bg-white text-center shadow-soft"><span><span className="block text-3xl">{crop.icon}</span><span className="mt-1 block text-xs font-bold text-ink">{crop.label}</span></span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-shell">
          <div className="relative overflow-hidden rounded-4xl bg-[#dce9a7] px-7 py-14 text-center sm:px-12">
            <Leaf className="absolute -left-9 -top-12 h-40 w-40 rotate-[-22deg] text-forest/10" />
            <Leaf className="absolute -bottom-16 -right-5 h-44 w-44 rotate-[135deg] text-forest/10" />
            <div className="relative mx-auto max-w-2xl">
              <p className="eyebrow">{sw ? "Anza na picha" : "Start with a photo"}</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-bold tracking-[-.04em] text-ink sm:text-5xl">{sw ? "Zao lako linaonyesha nini?" : "What is your crop showing you?"}</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-ink/65">{sw ? "Inachukua dakika chache. Huhitaji akaunti, na tunakuambia wazi kile ambacho AI haijui." : "It takes a few minutes. No account is required, and we’ll be clear about what the AI does not know."}</p>
              <Link href="/assessment" className="button-primary mt-8 min-h-14 px-7 text-base"><ScanSearch size={20} />{sw ? "Kagua zao" : "Check a crop"}<ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
