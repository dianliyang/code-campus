"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
  position?: "bottom-right" | "top-right";
}

export default function Toast({ message, type = "success", duration = 5500, onClose, position = "bottom-right" }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    info: Info
  };

  const colorMap = {
    success: "bg-green-50/50 border-green-200/50 text-green-700",
    error: "bg-red-50/50 border-red-200/50 text-red-700",
    info: "bg-blue-50/50 border-blue-200/50 text-blue-700"
  };

  const positionClass = position === "top-right" ? "top-4 right-4" : "bottom-4 right-4";

  return (
    <div
      className={`fixed ${positionClass} z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm will-change-transform transition-all duration-200 ease-out ${
        colorMap[type]
      } ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : `opacity-0 scale-[0.98] ${position === "top-right" ? "-translate-y-2" : "translate-y-2"}`
      }`}
    >
      {(() => { const Icon = iconMap[type]; return <Icon className="w-5 h-5" />; })()}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
