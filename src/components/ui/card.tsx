import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ 
  className, 
  size = "default",
  ...props 
}: React.ComponentProps<"div"> & { size?: "default" | "small" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm",
        size === "default" ? "gap-6 py-6" : "gap-2 py-2",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ 
  className, 
  ...props 
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "group-data-[size=default]/card:px-6 group-data-[size=small]/card:px-3",
        "[.border-b]:group-data-[size=default]/card:pb-6 [.border-b]:group-data-[size=small]/card:pb-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "group-data-[size=default]/card:px-6 group-data-[size=small]/card:px-3", 
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center group-data-[size=default]/card:px-6 group-data-[size=small]/card:px-3",
        "[.border-t]:group-data-[size=default]/card:pt-6 [.border-t]:group-data-[size=small]/card:pt-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
