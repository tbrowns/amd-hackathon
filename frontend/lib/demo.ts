import type { Crop, Language } from "@/lib/types";

export interface DemoScenario {
  id: string;
  crop: Crop;
  icon: string;
  name: Record<Language, string>;
  detail: Record<Language, string>;
  growth_stage: string;
  symptom_duration: string;
  watering_conditions: string;
  description: Record<Language, string>;
  colors: [string, string, string];
}

export const demoScenarios: DemoScenario[] = [
  {
    id: "tomato_leaf_spots",
    crop: "tomato",
    icon: "🍅",
    name: { en: "Tomato leaf spots", sw: "Madoa kwenye majani ya nyanya" },
    detail: { en: "Brown spots beginning on lower leaves", sw: "Madoa ya kahawia yalianza kwenye majani ya chini" },
    growth_stage: "fruiting",
    symptom_duration: "4-7 days",
    watering_conditions: "Frequent rain; leaves have stayed wet",
    description: {
      en: "Brown leaf spots appeared first on the lower part of the plant after several wet days.",
      sw: "Madoa ya kahawia yalianza kwenye majani ya chini baada ya siku kadhaa za mvua.",
    },
    colors: ["#2f8355", "#b85e3f", "#f2b94b"],
  },
  {
    id: "onion_leaf_discoloration",
    crop: "onion",
    icon: "🧅",
    name: { en: "Onion discoloration", sw: "Kubadilika rangi kwa kitunguu" },
    detail: { en: "Pale streaks and drying leaf tips", sw: "Mistari hafifu na ncha za majani kukauka" },
    growth_stage: "bulb development",
    symptom_duration: "1-2 weeks",
    watering_conditions: "Soil dries between watering",
    description: {
      en: "Several plants have pale streaks and their leaf tips are drying.",
      sw: "Mimea kadhaa ina mistari hafifu na ncha za majani zinakauka.",
    },
    colors: ["#7e9f40", "#d2ba66", "#8c673e"],
  },
  {
    id: "kale_pest_damage",
    crop: "kale",
    icon: "🥬",
    name: { en: "Kale pest damage", sw: "Uharibifu wa wadudu kwenye sukuma" },
    detail: { en: "Irregular holes on young leaves", sw: "Mashimo yasiyo sawa kwenye majani machanga" },
    growth_stage: "vegetative",
    symptom_duration: "2-3 days",
    watering_conditions: "Normal watering; soil is evenly moist",
    description: {
      en: "Young leaves have fresh irregular holes. A few small caterpillars were seen.",
      sw: "Majani machanga yana mashimo mapya yasiyo sawa. Viwavi wadogo wameonekana.",
    },
    colors: ["#226b43", "#9db448", "#e2d88f"],
  },
];

export async function createDemoImage(scenario: DemoScenario): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) {
    const response = await fetch("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XxY4AAAAAElFTkSuQmCC");
    return new File([await response.blob()], `${scenario.id}.png`, { type: "image/png" });
  }

  const gradient = context.createLinearGradient(0, 0, 960, 720);
  gradient.addColorStop(0, scenario.colors[2]);
  gradient.addColorStop(1, "#f7f1dd");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 960, 720);
  context.strokeStyle = scenario.colors[0];
  context.lineWidth = 18;
  context.beginPath();
  context.moveTo(480, 690);
  context.quadraticCurveTo(460, 410, 490, 100);
  context.stroke();
  for (let index = 0; index < 9; index += 1) {
    const left = index % 2 === 0;
    const y = 590 - index * 56;
    context.save();
    context.translate(480, y);
    context.rotate(left ? -0.7 : 0.7);
    context.fillStyle = scenario.colors[0];
    context.beginPath();
    context.ellipse(left ? -85 : 85, 0, 110, 48, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = scenario.colors[1];
    for (let mark = 0; mark < 3; mark += 1) {
      context.beginPath();
      context.arc((left ? -1 : 1) * (50 + mark * 28), mark * 7 - 10, 9 + mark * 3, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  context.fillStyle = "rgba(255,255,255,.88)";
  context.fillRect(24, 24, 330, 62);
  context.fillStyle = "#173b29";
  context.font = "600 26px sans-serif";
  context.fillText("ShambaLens demo image", 45, 64);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not create demo image"))), "image/png"),
  );
  return new File([blob], `${scenario.id}.png`, { type: "image/png" });
}
