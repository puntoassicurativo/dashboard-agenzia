import { Error } from "@/components/admin/error";
import { Notification } from "@/components/admin/notification";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useConfigurationLoader } from "../root/useConfigurationLoader";
import { MobileNavigation } from "./MobileNavigation";
import { PullToRefresh } from "./PullToRefresh";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { Link } from "react-router";

export const MobileLayout = ({ children }: { children: ReactNode }) => {
  useConfigurationLoader();
  const { lightModeLogo, title } = useConfigurationContext();
  return (
    <>
      <PullToRefresh />
      {/* style 2 on the phone: white header with the logo, light grey page */}
      <header className="h-14 bg-white border-b border-border flex items-center px-4">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline text-pa-blu"
        >
          <img
            className="h-9 w-auto"
            src={lightModeLogo}
            alt="Punto Assicurativo"
          />
          <span className="text-lg font-semibold">{title}</span>
        </Link>
      </header>
      <div className="fixed inset-0 -z-10 bg-background" aria-hidden />
      <ErrorBoundary FallbackComponent={Error}>
        <Suspense fallback={<Skeleton className="h-12 w-12 rounded-full" />}>
          {children}
        </Suspense>
      </ErrorBoundary>
      <MobileNavigation />
      <Notification mobileOffset={{ bottom: "72px" }} />
    </>
  );
};
