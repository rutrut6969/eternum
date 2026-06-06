import { BrandFooter } from "@/components/layout/brand-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getHeaderContext } from "@/lib/auth/header-context";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { account, notificationCount, showDmTools } = await getHeaderContext();

  return (
    <>
      <SiteHeader
        account={account ? { name: account.name, username: account.username, image: account.image, isFounder: account.isFounder } : null}
        notificationCount={notificationCount}
        showDmTools={showDmTools}
        variant="public"
      />
      <div className="flex-1">{children}</div>
      <BrandFooter />
    </>
  );
}
