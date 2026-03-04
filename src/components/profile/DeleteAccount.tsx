"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { Card } from "@/components/ui/card";export default function DeleteAccount({ dict }: {dict?: any;}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to delete account:", e);
    } finally {
      setLoading(false);
    }
  };

  if (isConfirming) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-sm font-bold uppercase tracking-wider">{dict?.delete_confirm_title || "Dangerous Action"}</p>
        </div>
        <p className="text-sm text-red-500">
          {dict?.delete_confirm_desc || "This will permanently delete your profile and all course progress. This cannot be undone."}
        </p>
        <div className="flex gap-4">
                <Button variant="outline"
          onClick={handleDelete}
          disabled={loading}>

            
                  {loading ? "..." : dict?.delete_confirm_btn || "Confirm Deletion"}
                </Button>
                <Button variant="outline"
          onClick={() => setIsConfirming(false)}>

            
                  {dict?.delete_cancel_btn || "Cancel"}
                </Button>
        </div>
      </Card>);

  }

  return (
    <Button variant="outline"
    onClick={() => setIsConfirming(true)}>

      
      <UserX />
      {dict?.delete_btn || "Purge Profile"}
    </Button>);

}