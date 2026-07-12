"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getRuntime } from "@/lib/api";
import type { RuntimeInfo } from "@/lib/types";

interface RuntimeContextValue {
  runtime: RuntimeInfo | null;
  loading: boolean;
}

const RuntimeContext = createContext<RuntimeContextValue>({ runtime: null, loading: true });

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getRuntime()
      .then((value) => active && setRuntime(value))
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ runtime, loading }), [runtime, loading]);
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime() {
  return useContext(RuntimeContext);
}
