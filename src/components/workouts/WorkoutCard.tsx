"use client";

import { useMemo, useState } from "react";
import { Workout } from "@/types";
import { ChevronDown, ChevronUp, Clock, ExternalLink, Info, MapPin } from "lucide-react";
import { Dictionary } from "@/lib/dictionary";

interface WorkoutCardProps {
  workout: Workout;
  viewMode?: "list" | "grid";
  dict: Dictionary["dashboard"]["workouts"];
  rowIndex?: number;
}

const statusStyle: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  fully_booked: "bg-rose-100 text-rose-700",
  expired: "bg-slate-100 text-slate-600",
  waitlist: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  see_text: "bg-sky-100 text-sky-700",
};

function getStatusLabel(status: string | null, dict: Dictionary["dashboard"]["workouts"]) {
  if (!status) return "-";
  const statusMap: Record<string, keyof Dictionary["dashboard"]["workouts"]> = {
    available: "status_available",
    fully_booked: "status_full",
    expired: "status_expired",
    waitlist: "status_waitlist",
    cancelled: "status_cancelled",
    see_text: "status_details",
  };
  const key = statusMap[status];
  return key && dict[key] ? String(dict[key]) : status;
}

interface AggregatedEntry {
  schedule: string | null;
  duration: string | null;
  location: string | null;
  locationEn: string | null;
}

function getScheduleLabel(workout: Workout): string {
  if (workout.startTime) {
    return `${workout.dayOfWeek || "-"} ${workout.startTime.slice(0, 5)}${workout.endTime ? `-${workout.endTime.slice(0, 5)}` : ""}`;
  }
  return workout.dayOfWeek || "-";
}

function getAggregatedEntries(workout: Workout): AggregatedEntry[] {
  const raw = workout.details && typeof workout.details === "object"
    ? (workout.details as Record<string, unknown>).aggregatedEntries
    : undefined;

  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        schedule: typeof entry.schedule === "string" ? entry.schedule : null,
        duration: typeof entry.duration === "string" ? entry.duration : null,
        location: typeof entry.location === "string" ? entry.location : null,
        locationEn: typeof entry.locationEn === "string" ? entry.locationEn : null,
      };
    });
}

export default function WorkoutCard({ workout, viewMode = "grid", dict, rowIndex = 0 }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayTitle = workout.titleEn || workout.title;
  const displayCategory = workout.categoryEn || workout.category;
  const displayLocation = workout.locationEn || workout.location || "-";
  const statusLabel = getStatusLabel(workout.bookingStatus, dict);
  const statusClass = workout.bookingStatus && statusStyle[workout.bookingStatus] ? statusStyle[workout.bookingStatus] : "bg-slate-100 text-slate-600";
  const schedule = getScheduleLabel(workout);
  const aggregatedEntries = useMemo(() => getAggregatedEntries(workout), [workout]);
  const extraEntries = aggregatedEntries.slice(1);
  const hasExpandableVariants = extraEntries.length > 0;
  const duration = typeof workout.details?.duration === "string"
    ? workout.details.duration
    : (workout.startDate && workout.endDate ? `${workout.startDate} - ${workout.endDate}` : "-");
  const price = workout.priceStudent == null ? "-" : Number(workout.priceStudent).toFixed(2);
  const actionHref = workout.bookingUrl || workout.url || null;
  const priceDetails = [
    workout.priceStudent != null ? { label: "Student", value: Number(workout.priceStudent).toFixed(2) } : null,
    workout.priceStaff != null ? { label: "Staff", value: Number(workout.priceStaff).toFixed(2) } : null,
    workout.priceExternal != null ? { label: "External", value: Number(workout.priceExternal).toFixed(2) } : null,
    workout.priceExternalReduced != null ? { label: "External (reduced)", value: Number(workout.priceExternalReduced).toFixed(2) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  if (viewMode === "list") {
    const rowBg = rowIndex % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]";
    return (
      <div className={rowBg}>
        <div className="group flex items-start md:items-center gap-3 md:gap-4 px-3 md:px-4 py-3 hover:bg-[#f2f2f2] transition-colors">
          {workout.url ? (
            <a href={workout.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 block">
              <h2 className="text-[14px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate hover:text-black transition-colors">
                {displayTitle}
              </h2>
              <p className="text-xs text-[#7a7a7a] truncate">{displayCategory}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                <span className="inline-flex rounded bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{schedule}</span>
                <span className="inline-flex rounded bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{price}</span>
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass}`}>{statusLabel}</span>
              </div>
            </a>
          ) : (
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate">{displayTitle}</h2>
              <p className="text-xs text-[#7a7a7a] truncate">{displayCategory}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                <span className="inline-flex rounded bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{schedule}</span>
                <span className="inline-flex rounded bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{price}</span>
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass}`}>{statusLabel}</span>
              </div>
            </div>
          )}

          <div className="w-[15%] hidden md:block">
            <p className="text-sm text-[#484848] truncate">{schedule}</p>
            <p className="text-[11px] text-[#8a8a8a] truncate">{duration}</p>
            {hasExpandableVariants ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#4f4f4f] hover:text-black"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide options" : `Show ${extraEntries.length} more`}
              </button>
            ) : null}
          </div>
          <div className="w-[18%] hidden md:block text-sm text-[#484848] truncate">{displayLocation}</div>
          <div className="w-[10%] hidden md:flex items-center justify-end gap-1 pr-1 text-sm text-[#484848] text-right">
            <span>{price}</span>
            <PriceHelpButton priceDetails={priceDetails} />
          </div>

          <div className="w-[12%] hidden md:block">
            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>{statusLabel}</span>
          </div>

          <div className="flex items-center justify-end pr-0 md:pr-1 self-center">
            {actionHref ? (
              <a
                href={actionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md bg-white border border-[#d6d6d6] text-[#4f4f4f] hover:bg-[#f4f4f4] transition-colors"
                aria-label="Open booking"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md bg-[#ececec] text-[#9a9a9a]">
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
        {expanded && hasExpandableVariants ? (
          <div className="hidden md:block border-t border-[#ececec] bg-[#fafafa]">
            <div className="px-4 py-2">
              <p className="text-[11px] text-[#8a8a8a] mb-2">Additional options</p>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                {extraEntries.map((entry, index) => {
                  const location = entry.locationEn || entry.location || "-";
                  return (
                    <div
                      key={`${entry.schedule || "none"}-${location}-${index}`}
                      className="rounded border border-[#e7e7e7] bg-white px-2 py-1.5 text-[11px] text-[#666]"
                    >
                      <p className="truncate">{entry.schedule || "-"}</p>
                      <p className="truncate text-[#8a8a8a]">{entry.duration || "-"}</p>
                      <p className="truncate text-[#8a8a8a]">{location}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] border border-[#e3e3e3] rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">
            {workout.url ? (
              <a href={workout.url} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">
                {displayTitle}
              </a>
            ) : (
              displayTitle
            )}
          </h2>
          <p className="text-xs text-slate-500 truncate mt-0.5">{displayCategory}</p>
        </div>
        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-white px-2 py-1.5 text-[12px] text-[#555]">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Time</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-[#8a8a8a]" />
            <span className="truncate">{schedule}</span>
          </p>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 text-[12px] text-[#555]">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Duration</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-[#8a8a8a]" />
            <span className="truncate">{duration}</span>
          </p>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 text-[12px] text-[#555]">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Location</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#8a8a8a]" />
            <span className="truncate">{displayLocation}</span>
          </p>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5 text-[12px] text-[#555]">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Price</p>
          <p className="mt-0.5 inline-flex items-center gap-1">
            <span className="text-[13px] font-medium text-[#3b3b3b]">{price}</span>
            <PriceHelpButton priceDetails={priceDetails} />
          </p>
        </div>
      </div>

      <div className="mt-2 space-y-1.5 text-[12px] text-[#555]">
        {hasExpandableVariants ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4f4f4f] hover:text-black"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide options" : `Show ${extraEntries.length} more`}
          </button>
        ) : null}
        {expanded && hasExpandableVariants ? (
          <div className="px-0 py-0 mt-1 space-y-2">
            {extraEntries.map((entry, index) => {
              const location = entry.locationEn || entry.location || "-";
              return (
                <div key={`${entry.schedule || "none"}-${location}-${index}`} className="rounded border border-[#ececec] bg-white px-2 py-1.5">
                  <p className="text-[11px] text-[#666] leading-4 truncate">
                    {entry.schedule || "-"} <span className="text-[#9a9a9a]">•</span> {entry.duration || "-"} <span className="text-[#9a9a9a]">•</span> {location}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {actionHref ? (
        <div className="mt-auto pt-3">
          <a
            href={actionHref}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-3 text-[13px] font-medium leading-none text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
          >
            <span className="inline-flex items-center">Book</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function PriceHelpButton({ priceDetails }: { priceDetails: Array<{ label: string; value: string }> }) {
  if (priceDetails.length === 0) return null;

  return (
    <div className="relative inline-flex group/help">
      <button
        type="button"
        aria-label="Price details"
        className="inline-flex items-center justify-center rounded p-0.5 text-[#9a9a9a] hover:text-[#555] hover:bg-[#f1f1f1] transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      <div className="pointer-events-none absolute right-0 top-6 z-[99] w-56 rounded-md border border-[#dedede] bg-white p-2 shadow-lg text-left opacity-0 translate-y-1 transition-all duration-150 group-hover/help:opacity-100 group-hover/help:translate-y-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a] mb-1">Price details</p>
        <div className="space-y-0.5">
          {priceDetails.map((item) => (
            <p key={item.label} className="flex items-center justify-between gap-3 text-[11px] text-[#555]">
              <span>{item.label}</span>
              <span className="text-right font-medium text-[#444]">{item.value}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
