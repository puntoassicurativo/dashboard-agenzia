import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  FileText,
  Home,
  ListChecks,
  MoreHorizontal,
  Percent,
  Plus,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useAccessoUtile } from "../../agenzia/Andamento";
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
import { Link, matchPath, useLocation, useMatch } from "react-router";
import { ContactCreateSheet } from "../contacts/ContactCreateSheet";
import { useState } from "react";
import { NoteCreateSheet } from "../notes/NoteCreateSheet";
import { TaskCreateSheet } from "../tasks/TaskCreateSheet";

export const MobileNavigation = () => {
  const location = useLocation();
  const translate = useTranslate();
  const { data: vedeUtile } = useAccessoUtile();

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
        height:
          "calc(var(--spacing)) * 6" + (isPwa && isWebiOS ? " + 15px" : ""),
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
      <span className="text-[0.6rem] font-medium">{label}</span>
    </Link>
  </Button>
);

// non piu' nella barra (dashboard di agenzia), lasciato esportato per non toccare il resto
export const CreateButton = () => {
  const translate = useTranslate();
  const contact_id = useMatch("/contacts/:id/*")?.params.id;
  const [contactCreateOpen, setContactCreateOpen] = useState(false);
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);

  return (
    <>
      <ContactCreateSheet
        open={contactCreateOpen}
        onOpenChange={setContactCreateOpen}
      />
      <NoteCreateSheet
        open={noteCreateOpen}
        onOpenChange={setNoteCreateOpen}
        contact_id={contact_id}
      />
      <TaskCreateSheet
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        contact_id={contact_id}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="h-16 w-16 rounded-full -mt-3"
            aria-label={translate("ra.action.create")}
          >
            <Plus className="size-10" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setContactCreateOpen(true);
            }}
          >
            {translate("resources.contacts.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setNoteCreateOpen(true);
            }}
          >
            {translate("resources.notes.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setTaskCreateOpen(true);
            }}
          >
            {translate("resources.tasks.forcedCaseName")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

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
