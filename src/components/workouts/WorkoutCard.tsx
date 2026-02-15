"use client";

import { Workout } from "@/types";
import { Clock, MapPin, User, ExternalLink, CheckCircle2, XCircle, AlertCircle, Info, Calendar } from "lucide-react";
import { Dictionary } from "@/lib/dictionary";

interface WorkoutCardProps {
  workout: Workout;
  viewMode?: "list" | "grid";
  dict: Dictionary['dashboard']['workouts'];
}

const statusConfig: Record<string, { key: string; className: string; icon: React.ElementType }> = {
  available: { key: "status_available", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  fully_booked: { key: "status_full", className: "bg-red-50 text-red-600 border-red-200", icon: XCircle },
  expired: { key: "status_expired", className: "bg-gray-50 text-gray-500 border-gray-200", icon: Calendar },
  waitlist: { key: "status_waitlist", className: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: AlertCircle },
  cancelled: { key: "status_cancelled", className: "bg-red-50 text-red-500 border-red-200 line-through", icon: XCircle },
  see_text: { key: "status_details", className: "bg-blue-50 text-blue-600 border-blue-200", icon: Info },
};

function StatusBadge({ status, dict }: { status: string | null, dict: Dictionary['dashboard']['workouts'] }) {
  if (!status) return null;
  const config = statusConfig[status] || { key: "", className: "bg-gray-50 text-gray-500 border-gray-200", icon: Info };
  const key = config.key as keyof Dictionary['dashboard']['workouts'];
  const label = key && dict[key] ? String(dict[key]) : status;
  const Icon = config.icon;

  return (
    <>
      {/* Mobile: Clean Icon */}
      <div className="md:hidden flex items-center justify-center w-6 h-6">
        <Icon className={`w-4 h-4 ${config.className.split(' ')[1]}`} title={label} />
      </div>
      
      {/* Desktop: Full Badge */}
      <span className={`hidden md:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.className} whitespace-nowrap`}>
        {label}
      </span>
    </>
  );
}

function PriceDisplay({ workout, dict }: { workout: Workout, dict: Dictionary['dashboard']['workouts'] }) {
  const isFree = workout.priceStudent === 0 || 
                 workout.bookingStatus?.toLowerCase().includes("entgeltfrei") ||
                 (workout.details as Record<string, unknown>)?.isEntgeltfrei === true;

  if (workout.priceStudent == null && !isFree) return null;
  
  return (
    <span
      className="text-[10px] md:text-xs font-bold text-gray-700"
      title={[
        workout.priceStudent != null ? `Student: ${Number(workout.priceStudent).toFixed(2)}` : null,
        workout.priceStaff != null ? `Staff: ${Number(workout.priceStaff).toFixed(2)}` : null,
        workout.priceExternal != null ? `External: ${Number(workout.priceExternal).toFixed(2)}` : null,
        workout.priceExternalReduced != null ? `External (reduced): ${Number(workout.priceExternalReduced).toFixed(2)}` : null,
      ].filter(Boolean).join(" | ")}
    >
      {isFree ? (dict?.price_free || "Free") : `${Number(workout.priceStudent).toFixed(2)}`}
    </span>
  );
}

export default function WorkoutCard({ workout, viewMode = "grid", dict }: WorkoutCardProps) {
  const displayTitle = workout.titleEn || workout.title;
  const displayCategory = workout.categoryEn || workout.category;
  const displayLocation = workout.locationEn || workout.location;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-6 py-2 md:py-3 px-3 md:px-6 hover:bg-gray-50 transition-colors h-full">
        {/* Title + Category */}
        <div className="w-[30%] flex-shrink-0 min-w-0 flex flex-col justify-center">
          <h2 className="text-[13px] md:text-[13px] font-bold text-gray-900 leading-tight truncate">
            {workout.url ? (
              <a href={workout.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors">
                {displayTitle}
              </a>
            ) : displayTitle}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {displayCategory}
            </span>
          </div>
        </div>

        {/* Desktop Schedule (Hidden on mobile) */}
        <div className="hidden md:flex flex-col justify-center gap-0.5 text-[10px] text-gray-500 w-[20%] flex-shrink-0">
          <div className="flex items-center gap-2">
            {workout.dayOfWeek && (
              <span className="font-bold uppercase tracking-wider text-gray-700">{workout.dayOfWeek}</span>
            )}
            {workout.startTime && (
              <span className="flex items-center gap-1 font-mono text-[9px]">
                <Clock className="w-3 h-3" />
                {workout.startTime.slice(0, 5)}
                {workout.endTime && <>–{workout.endTime.slice(0, 5)}</>}
              </span>
            )}
          </div>
          {(workout.startDate || workout.endDate) && (
            <div className="text-[9px] text-gray-400 font-medium">
              {workout.startDate && <span>{workout.startDate}</span>}
              {workout.endDate && <span> – {workout.endDate}</span>}
            </div>
          )}
        </div>

        {/* Location / Instructor */}
        <div className="flex-grow min-w-0 hidden md:flex flex-col justify-center">
           <div className="text-[11px] text-gray-600 truncate max-w-full font-medium">{displayLocation}</div>
           {workout.instructor && (
             <div className="text-[9px] text-gray-400 truncate max-w-full uppercase font-bold tracking-tighter">{workout.instructor}</div>
           )}
        </div>

        {/* Right Side Group for Mobile (Schedule + Status) */}
        <div className="md:hidden flex items-center gap-3 flex-shrink-0 ml-auto">
          <div className="flex flex-col items-end text-right w-[45px]">
             <span className="text-[9px] font-bold text-gray-900 uppercase leading-none truncate w-full">
               {workout.dayOfWeek?.split(',')[0] || '-'}
             </span>
             <span className="text-[8px] text-gray-400 font-mono mt-1 leading-none">
               {workout.startTime?.slice(0, 5) || '--:--'}
             </span>
          </div>
          <div className="w-6 flex justify-center flex-shrink-0">
            <StatusBadge status={workout.bookingStatus} dict={dict} />
          </div>
        </div>

        {/* Desktop Price (Hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0 w-16 justify-center">
          <PriceDisplay workout={workout} dict={dict} />
        </div>

        {/* Desktop Status (Hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0 w-24 justify-center">
          <StatusBadge status={workout.bookingStatus} dict={dict} />
        </div>

        {/* Desktop Links (Hidden on mobile) */}
        <div className="hidden md:flex items-center w-16 flex-shrink-0 justify-end gap-1 pr-2">
          {workout.url && (
            <a
              href={workout.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-blue transition-colors p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {workout.bookingUrl && (
            <a
              href={workout.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:text-blue-700 transition-colors p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  // Grid mode
  const statusLabel = workout.bookingStatus ? (statusConfig[workout.bookingStatus] ? dict[statusConfig[workout.bookingStatus].key as keyof typeof dict] : workout.bookingStatus) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl md:rounded-xl p-4 md:p-6 transition-all relative overflow-hidden group flex flex-col h-full hover:border-gray-300">
      {/* Status badge at top */}
      {workout.bookingStatus && (
        <div className="absolute top-0 right-4 md:right-6">
          <span className={`inline-block px-2 md:px-3 py-1 rounded-b-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
            statusConfig[workout.bookingStatus]?.className || "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
            {statusLabel}
          </span>
        </div>
      )}

      {/* Category tag */}
      <div className="mb-2 md:mb-3">
        <span className="bg-gray-50 text-gray-600 text-[9px] md:text-[10px] font-medium px-2 py-0.5 md:py-1 rounded-full border border-gray-200">
          {displayCategory}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-base md:text-lg font-bold text-gray-900 leading-snug mb-3 pr-16 md:pr-20">
        {workout.url ? (
          <a href={workout.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors">
            {displayTitle}
          </a>
        ) : displayTitle}
      </h2>

      {/* Day + Time + Duration */}
      {(workout.dayOfWeek || workout.startTime || workout.startDate) && (
        <div className="flex flex-col gap-0.5 md:gap-1 mb-3">
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
            {workout.dayOfWeek && (
              <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{workout.dayOfWeek}</span>
            )}
            {workout.startTime && (
              <span className="flex items-center gap-1 font-mono text-[10px] md:text-xs">
                <Clock className="w-3 h-3" />
                {workout.startTime.slice(0, 5)}
                {workout.endTime && <>–{workout.endTime.slice(0, 5)}</>}
              </span>
            )}
          </div>
          {(workout.startDate || workout.endDate) && (
            <div className="text-[9px] md:text-[10px] text-gray-400 font-medium">
              {workout.startDate && <span>{workout.startDate}</span>}
              {workout.endDate && <span> – {workout.endDate}</span>}
            </div>
          )}
        </div>
      )}

      {/* Location */}
      {displayLocation && (
        <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-gray-500 mb-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{displayLocation}</span>
        </div>
      )}

      {/* Instructor */}
      {workout.instructor && (
        <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-gray-400 mb-1">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{workout.instructor}</span>
        </div>
      )}

      {/* Footer: Price + Links */}
      <div className="mt-auto pt-4 md:pt-5 border-t border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 text-[11px] md:text-xs">
          <div className="flex-shrink-0 min-w-0">
            <PriceDisplay workout={workout} dict={dict} />
          </div>
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {workout.url && (
              <a
                href={workout.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wide text-gray-400 hover:text-brand-blue transition-colors whitespace-nowrap"
              >
                {dict?.view_details || "Details"} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {workout.bookingUrl && (
              <a
                href={workout.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wide text-brand-blue hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                {dict?.book_now || "Book"} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
