import { WorkspaceNav } from "@/components/dashboard/workspace-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkspaceNav />
      {children}
    </>
  );
}
