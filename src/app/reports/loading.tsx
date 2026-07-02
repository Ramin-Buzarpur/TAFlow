import { Topbar } from "@/components/ui";
import { SkeletonGrid } from "@/components/skeleton";

export default function ReportsLoading() {
  return <><Topbar/><main className="shell">
    <SkeletonGrid count={4} className="grid grid-4"/>
    <div style={{ height: 20 }}/>
    <SkeletonGrid count={4} className="grid grid-2"/>
  </main></>;
}
