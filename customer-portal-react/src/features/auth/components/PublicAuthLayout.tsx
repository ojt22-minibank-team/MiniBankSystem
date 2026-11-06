import type { ReactNode } from "react";
import PublicAuthHeader from "./PublicAuthHeader";
import PublicAuthFooter from "./PublicAuthFooter";

function PublicAuthLayout({ children, portalLabel }: { children: ReactNode; portalLabel?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F3F7FB] text-[#08295C] antialiased">
      <PublicAuthHeader portalLabel={portalLabel} />
      <main className="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,#dce9f9_0%,transparent_65%)] px-3 py-4 sm:px-6">
        {children}
      </main>
      <PublicAuthFooter />
    </div>
  );
}
export default PublicAuthLayout;
