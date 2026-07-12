"use client";

import { ImageOff, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getProtectedImage } from "@/lib/api";
import type { AssessmentImage } from "@/lib/types";

export function ProtectedImage({ assessmentId, image, alt, priority = false }: { assessmentId: string; image: AssessmentImage; alt: string; priority?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    getProtectedImage(assessmentId, image.id)
      .then((url) => { objectUrl = url; if (active) setSrc(url); })
      .catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assessmentId, image.id]);

  if (failed) return <div className="grid h-full min-h-44 place-items-center bg-oat text-center text-xs font-semibold text-ink/45"><span><ImageOff className="mx-auto mb-2" size={24} />Private image unavailable</span></div>;
  if (!src) return <div className="grid h-full min-h-44 place-items-center bg-oat"><LoaderCircle className="animate-spin text-leaf" size={24} /></div>;
  return <Image src={src} alt={alt} fill unoptimized priority={priority} className="object-cover" />;
}
