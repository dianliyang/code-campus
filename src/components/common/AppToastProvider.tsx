"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { toast } from "sonner";

type AppToastType = "success" | "error" | "info";

type ShowToastInput = {
  message: string;
  type?: AppToastType;
  duration?: number;
  position?: "bottom-right" | "top-right";
};

type AppToastContextValue = {
  showToast: (input: ShowToastInput) => void;
};

const AppToastContext = createContext<AppToastContextValue | null >(null);

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((input: ShowToastInput) => {
    const position = input.position || "bottom-right";
    const duration = input.duration;
    if (input.type === "error") {
      toast.error(input.message, { position, duration });
      return;
    }
    if (input.type === "info") {
      toast.info(input.message, { position, duration });
      return;
    }
    if (input.type === "success") {
      toast.success(input.message, { position, duration });
      return;
    }
    toast(input.message, { position, duration });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);
  if (!context) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }
  return context;
}
