"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "@/components/common/Toast";

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

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ShowToastInput & { id: number }) | null>(null);

  const showToast = useCallback((input: ShowToastInput) => {
    setToast({ ...input, id: Date.now() + Math.floor(Math.random() * 1000) });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type || "success"}
          duration={toast.duration}
          position={toast.position || "top-right"}
          onClose={() => setToast(null)}
        />
      ) : null}
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

