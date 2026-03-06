"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WeeklyScheduleCardProps {
  title: ReactNode;
  headerRight?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "default" | "small";
}

export default function WeeklyScheduleCard({
  title,
  headerRight,
  children,
  footer,
  size = "default",
}: WeeklyScheduleCardProps) {
  return (
    <Card size={size}>
      <CardHeader className="px-4 py-2">
        <div className="flex items-start justify-between">
          <CardTitle className="min-w-0">{title}</CardTitle>
          {headerRight ? (
            <div className="flex items-center gap-2">{headerRight}</div>
          ) : null}
        </div>
      </CardHeader>
      {children ? <CardContent className="px-4 py-1.5">{children}</CardContent> : null}
      {footer ? (
        <CardFooter className="border-t border-[#f0f0f0] px-4 py-1.5 text-xs text-[#666]">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
