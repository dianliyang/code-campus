"use client";

import Image from "next/image";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <Image
          src="/code-campus-logo.svg"
          alt="CodeCampus"
          width={64}
          height={64}
          className="mx-auto mb-8"
        />

        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
          You&apos;re Offline
        </h1>

        <p className="text-gray-500 mb-8">
          Please check your internet connection and try again.
        </p>

        <Button onClick={() => window.location.reload()} size="lg">
          Try Again
        </Button>
      </div>
    </div>
  );
}
