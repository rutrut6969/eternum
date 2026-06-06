import { WorkspaceNav } from "@/components/dashboard/workspace-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkspaceNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
