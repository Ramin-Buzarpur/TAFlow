import { Topbar } from "@/components/ui";
import { SkeletonGrid } from "@/components/skeleton";

export default function AdminLoading() {
  return <><Topbar/><main className="shell">
    <SkeletonGrid count={6} className="grid grid-2"/>
  </main></>;
}
