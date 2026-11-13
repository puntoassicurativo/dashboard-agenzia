import type { ReactNode } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

/**
 * On a phone the Andamento page was about 16,500 px long (20 screens, 13/11/2026). Below the mobile breakpoint each
 * secondary block starts closed (title only, opens on tap); on desktop the block is shown as before.
 */
export const ChiusoSuTelefono = ({
  titolo,
  children,
}: {
  titolo: string;
  children: ReactNode;
}) => {
  const isMobile = useIsMobile();
  if (!isMobile) return <>{children}</>;
  return (
    <details className="rounded-lg border bg-card">
      <summary className="cursor-pointer select-none px-4 py-3 text-base font-semibold">
        {titolo}
      </summary>
      <div className="flex flex-col gap-4 px-1 pb-3">{children}</div>
    </details>
  );
};
