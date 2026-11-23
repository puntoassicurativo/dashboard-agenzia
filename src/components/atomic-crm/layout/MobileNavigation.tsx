import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  Home,
  ListChecks,
  MoreHorizontal,
  Percent,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useAccessoUtile } from "../../agenzia/accesso";
import { VOCI_MENU } from "../../agenzia/MenuLato";

const ICONE: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  "/": Home,
  "/fatture": FileText,
  "/utile-costi": TrendingUp,
  "/tasse": Percent,
  "/carica-file": Upload,
  "/da-fare": ListChecks,
};
/** Short labels: seven buttons share the width of a phone. */
const BREVE: Record<string, string> = {
  "/utile-costi": "Utile",
  "/carica-file": "Carica",
};
import { useTranslate } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";

export const MobileNavigation = () => {
  const location = useLocation();
  const translate = useTranslate();
  const accesso = useAccessoUtile();
  // a failed read keeps the partners' entries: the pages show the error themselves (review R014)
  const vedeUtile = accesso.data === true || accesso.isError;

  // 23/11/2026: the same entries as the side menu (MenuLato.tsx), partners' ones only for the partners
  const voci = VOCI_MENU.filter((v) => !v.soloSoci || vedeUtile);

  // Check if the app is running as a PWA (standalone mode)
  const isPwa = window.matchMedia("(display-mode: standalone)").matches;
  // Check if it's iOS on the web
  const isWebiOS = /iPad|iPod|iPhone/.test(window.navigator.userAgent);

  return (
    <nav
      aria-label={translate("crm.navigation.label")}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border h-14"
      style={{
        // iOS bug: even though viewport is set correctly, the bottom safe area inset is not accounted for
        // So we manually add some padding to avoid the navigation being too close to the home bar
        paddingBottom: isPwa && isWebiOS ? 15 : undefined,
        // We use box-sizing: border-box, so the height contains the padding.
        // To actually increase the padding, we need to increase the height as well
        // review R105: the original "calc(var(--spacing)) * 6" was not valid CSS (ignored, h-14 applied)
        height: isPwa && isWebiOS ? "calc(3.5rem + 15px)" : undefined,
      }}
    >
      <div className="flex justify-center px-1">
        {voci.map((v) => (
          <NavigationButton
            key={v.to}
            href={v.to}
            Icon={ICONE[v.to] ?? Home}
            label={BREVE[v.to] ?? v.titolo}
            isActive={v.attiva(location.pathname)}
          />
        ))}
        <SettingsButton />
      </div>
    </nav>
  );
};

const NavigationButton = ({
  href,
  Icon,
  label,
  isActive,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "flex-col gap-1 h-auto py-2 px-0.5 rounded-md flex-1 min-w-0 max-w-16",
      isActive ? "text-pa-blu font-semibold" : "text-muted-foreground",
    )}
  >
    <Link to={href}>
      <Icon className="size-6" />
      <span className="text-[0.7rem] leading-tight font-medium">{label}</span>
    </Link>
  </Button>
);

// non piu' nella barra (dashboard di agenzia), lasciato esportato per non toccare il resto
const SettingsButton = () => {
  const location = useLocation();
  const isActive = !!matchPath("/settings", location.pathname);

  return (
    <NavigationButton
      href="/settings"
      Icon={MoreHorizontal}
      label="Altro"
      isActive={isActive}
    />
  );
};
