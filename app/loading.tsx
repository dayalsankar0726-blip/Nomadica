import { PageSkeleton } from "@/components/ui/Skeleton";

// Shown while a route segment's server content streams in. Segments can add their own
// loading.tsx with a layout-matching skeleton.
export default function Loading() {
  return <PageSkeleton />;
}
