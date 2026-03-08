export function getDashboardPageHeaderClassName(extraClassName = ""): string {
  return [
    "z-20",
    "-mx-4",
    "bg-background/95",
    "px-4",
    "pb-5",
    "pt-4",
    "backdrop-blur",
    "supports-[backdrop-filter]:bg-background/80",
    "md:sticky",
    "md:top-0",
    extraClassName,
  ]
    .filter(Boolean)
    .join(" ");
}
