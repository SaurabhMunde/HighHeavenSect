"use client";

type Props = {
  iso: string;
  fallback?: string;
};

/**
 * Always render datetime in the viewer's local timezone.
 */
export function LocalDateTime({ iso, fallback = "—" }: Props) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>{fallback}</>;
  return <>{date.toLocaleString()}</>;
}
