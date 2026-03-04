"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Dictionary } from "@/lib/dictionary";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

export default function CoursesTopBar({ dict: _dict }: {dict: Dictionary["dashboard"];}) {
  return (
    <section>
      <span className="sr-only">{_dict.search.title}</span>
      <Card>
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#8a8a8a]">Range</span>
          <Button variant="outline">
            Last 7 days
            <ChevronDown />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/import">
              <Plus />
              New course
            </Link>
          </Button>
        </div>
      </Card>
    </section>);

}