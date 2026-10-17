import { Suspense } from "react";
import { Dashboard, DashboardSkeleton } from "@/components/dashboard/Dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
