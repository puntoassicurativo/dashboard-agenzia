import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { Skeleton } from "@/components/ui/skeleton";

import { useConfigurationLoader } from "../root/useConfigurationLoader";
import Header from "./Header";
import { MenuLato } from "../../agenzia/MenuLato";

export const Layout = ({ children }: { children: ReactNode }) => {
  useConfigurationLoader();
  return (
    <>
      <Header />
      {/* style 2: dark blue menu on the left, light grey page with white cards */}
      <div className="flex min-h-[calc(100vh-4rem)] bg-background">
        <MenuLato />
        <main className="flex-1 min-w-0 px-6 pt-6 pb-8" id="main-content">
          <ErrorBoundary FallbackComponent={Error}>
            <Suspense
              fallback={<Skeleton className="h-12 w-12 rounded-full" />}
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Notification />
    </>
  );
};
