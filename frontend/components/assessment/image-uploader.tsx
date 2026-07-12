"use client";

import { AlertCircle, Camera, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import type { DemoScenario } from "@/lib/demo";
import { demoScenarios } from "@/lib/demo";

const MAX_FILES = 3;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  files,
  onChange,
  scenario,
  onScenario,
  allowDemo,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  scenario: DemoScenario | null;
  onScenario: (scenario: DemoScenario | null) => void;
  allowDemo: boolean;
}) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: File[]) => {
      setError(null);
      const invalid = incoming.find((file) => !ACCEPTED.includes(file.type));
      if (invalid) {
        setError(sw ? "Tumia picha ya JPG, PNG au WebP pekee." : "Use a JPG, PNG or WebP image.");
        return;
      }
      const oversized = incoming.find((file) => file.size > MAX_BYTES);
      if (oversized) {
        setError(sw ? "Kila picha lazima iwe chini ya MB 8." : "Each image must be smaller than 8 MB.");
        return;
      }
      const combined = [...files, ...incoming].slice(0, MAX_FILES);
      if (files.length + incoming.length > MAX_FILES) {
        setError(sw ? "Unaweza kuongeza picha tatu pekee." : "You can add up to three images.");
      }
      onScenario(null);
      onChange(combined);
    },
    [files, onChange, onScenario, sw],
  );

  return (
    <div>
      <div
        className={`relative rounded-3xl border-2 border-dashed p-6 text-center transition sm:p-10 ${dragging ? "border-leaf bg-[#eff6e7]" : "border-forest/20 bg-white hover:border-leaf/60"}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          capture="environment"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.currentTarget.value = "";
          }}
          aria-label={sw ? "Chagua picha za zao" : "Choose crop photos"}
        />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f0d0] text-forest"><UploadCloud size={27} /></span>
        <h2 className="mt-4 font-display text-2xl font-bold text-ink">{sw ? "Ongeza picha za zao" : "Add crop photos"}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/58">{sw ? "Piga au chagua hadi picha 3. Jumuisha sehemu iliyoathirika na mmea mzima ikiwezekana." : "Take or choose up to 3 photos. Include the affected area and a whole-plant view when possible."}</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="button-secondary mt-5">
          <Camera size={18} /> {sw ? "Piga au chagua picha" : "Take or choose photos"}
        </button>
        <p className="mt-3 text-[11px] font-semibold text-ink/42">JPG, PNG or WebP · {sw ? "MB 8 kila picha" : "8 MB per image"}</p>
      </div>

      {error && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-clay" role="alert"><AlertCircle size={16} />{error}</p>}

      {files.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={sw ? "Picha zilizochaguliwa" : "Selected photos"}>
          {files.map((file, index) => (
            <FilePreview
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              index={index}
              sw={sw}
              onRemove={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
            />
          ))}
          {files.length < MAX_FILES && (
            <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-forest/20 text-sm font-bold text-forest hover:bg-oat">
              <span><ImagePlus className="mx-auto mb-2" size={22} />{sw ? "Ongeza nyingine" : "Add another"}</span>
            </button>
          )}
        </div>
      )}

      {allowDemo && <>
      <div className="my-7 flex items-center gap-4"><span className="h-px flex-1 bg-forest/10" /><span className="text-xs font-bold uppercase tracking-[.16em] text-ink/35">{sw ? "au jaribu onyesho" : "or try a demo"}</span><span className="h-px flex-1 bg-forest/10" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {demoScenarios.map((item) => {
          const selected = scenario?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { onChange([]); onScenario(selected ? null : item); setError(null); }}
              aria-pressed={selected}
              className={`relative rounded-2xl border p-4 text-left transition ${selected ? "border-leaf bg-[#eff6e7] shadow-soft ring-2 ring-leaf/10" : "border-forest/12 bg-white hover:border-leaf/40"}`}
            >
              {selected && <span className="absolute right-3 top-3 rounded-full bg-forest px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white">{sw ? "Imechaguliwa" : "Selected"}</span>}
              <span className="text-3xl" aria-hidden="true">{item.icon}</span>
              <span className="mt-3 block text-sm font-bold text-ink">{item.name[language]}</span>
              <span className="mt-1 block text-xs leading-5 text-ink/55">{item.detail[language]}</span>
            </button>
          );
        })}
      </div>
      {scenario && <p className="mt-3 rounded-xl bg-[#fff3cd] px-4 py-3 text-xs font-semibold leading-5 text-[#6b5319]">{sw ? "Onyesho hutumia matokeo ya kuigiza yaliyowekewa alama; halitumii salio la AI." : "Demo scenarios use clearly marked simulated results and do not spend AI credits."}</p>}
      </>}
    </div>
  );
}

function FilePreview({
  file,
  index,
  sw,
  onRemove,
}: {
  file: File;
  index: number;
  sw: boolean;
  onRemove: () => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-forest/10 bg-oat">
      <Image
        src={url}
        alt={`${sw ? "Picha ya zao" : "Crop photo"} ${index + 1}`}
        fill
        unoptimized
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/75 to-transparent px-3 pb-3 pt-8 text-white">
        <span className="max-w-[70%] truncate text-xs font-semibold">{file.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-clay shadow-sm hover:bg-white"
          aria-label={`${sw ? "Ondoa picha" : "Remove photo"} ${index + 1}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
