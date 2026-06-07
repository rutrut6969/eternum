import { BrandFooter } from "@/components/layout/brand-footer";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { SiteHeader } from "@/components/layout/site-header";
import { WorkspaceNav } from "@/components/dashboard/workspace-nav";
import { getHeaderContext } from "@/lib/auth/header-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { account, notificationCount, showDmTools } = await getHeaderContext();

  return (
    <>
      <SiteHeader
        account={account ? { name: account.name, username: account.username, image: account.image, isFounder: account.isFounder } : null}
        notificationCount={notificationCount}
        showDmTools={showDmTools}
        variant="app"
      />
      <WorkspaceNav />
      <div className="flex-1">{children}</div>
      <AssistantLauncher />
      <BrandFooter />
    </>
  );
}
