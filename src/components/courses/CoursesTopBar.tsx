"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Dictionary } from "@/lib/dictionary";

export default function CoursesTopBar({ dict: _dict }: { dict: Dictionary["dashboard"] }) {
  return (
    <section>
      <span className="sr-only">{_dict.search.title}</span>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#e4e4e4] bg-[#fbfbfb] px-2.5 py-2 text-[14px]">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#8a8a8a]">Range</span>
          <button className="inline-flex items-center gap-1 rounded-md border border-[#d8d8d8] bg-white px-2.5 py-1 text-[14px] font-medium text-[#4e4e4e] hover:bg-[#f7f7f7] transition-colors">
            Last 7 days
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 py-1.5 text-[14px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New course
          </Link>
        </div>
      </div>
    </section>
  );
}
