"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ConfirmOptions = {
  title: string;
  description: string;
  impact?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DashboardFeedbackValue = {
  toast: (type: ToastType, message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const DashboardFeedbackContext = createContext<DashboardFeedbackValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: "border-emerald-300/25 bg-emerald-400/12 text-emerald-50",
  error: "border-red-300/25 bg-red-400/12 text-red-50",
  warning: "border-amber-300/25 bg-amber-400/12 text-amber-50",
  info: "border-cyan-300/25 bg-cyan-400/12 text-cyan-50"
};

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

export function DashboardFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const confirmResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setToasts((current) => [{ id, type, message }, ...current].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmOptions(options);
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const finishConfirm = useCallback((confirmed: boolean) => {
    confirmResolver.current?.(confirmed);
    confirmResolver.current = null;
    setConfirmOptions(null);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <DashboardFeedbackContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[80] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => {
          const Icon = toastIcons[item.type];
          return (
            <div
              className={`animate-notification-in flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-nebula backdrop-blur-2xl ${toastStyles[item.type]}`}
              key={item.id}
              role="status"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm leading-5">{item.message}</p>
              <button className="ml-auto rounded-full p-1 text-current/70 transition hover:bg-white/10 hover:text-white" onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {confirmOptions ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0d13]/95 p-5 shadow-nebula">
            <div className="flex items-start gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${confirmOptions.destructive ? "border-red-300/25 bg-red-400/10 text-red-100" : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{confirmOptions.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{confirmOptions.description}</p>
                {confirmOptions.impact ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-slate-300">{confirmOptions.impact}</p> : null}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <AppButton onClick={() => finishConfirm(false)} type="button" variant="ghost">
                {confirmOptions.cancelLabel ?? "Cancel"}
              </AppButton>
              <AppButton onClick={() => finishConfirm(true)} type="button" variant={confirmOptions.destructive ? "danger" : "primary"}>
                {confirmOptions.confirmLabel ?? "Confirm"}
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardFeedbackContext.Provider>
  );
}

export function useDashboardFeedback() {
  const value = useContext(DashboardFeedbackContext);

  if (!value) {
    throw new Error("useDashboardFeedback must be used inside DashboardFeedbackProvider");
  }

  return value;
}
