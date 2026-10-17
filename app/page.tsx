import { Suspense } from "react";
import { Dashboard, DashboardSkeleton } from "@/components/dashboard/Dashboard";

export default function DashboardPage({ searchParams }: { searchParams: Promise<{ student?: string | string[] }> }) {
  const studentId = searchParams.then((p) => (typeof p.student === "string" ? p.student : undefined));
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard studentId={studentId} />
    </Suspense>
  );
}
