import { User } from "lucide-react";
import { useTranslate, useUserMenu } from "ra-core";
import { Link } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { Campanella } from "../../agenzia/Campanella";
import { useConfigurationContext } from "../root/ConfigurationContext";

/**
 * Agency header. Review R044 (23/11/2026): the user menu keeps only Profile (password) and Log out; the Atomic CRM
 * pages (users, settings, JSON import, changelog) are not part of the agency dashboard.
 */
const Header = () => {
  const { lightModeLogo, title } = useConfigurationContext();
  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-border">
      <div className="h-full px-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline text-pa-blu"
        >
          <img
            className="h-11 w-auto"
            src={lightModeLogo}
            alt="Punto Assicurativo"
          />
          <h1 className="text-xl font-semibold">{title}</h1>
        </Link>
        <div className="flex items-center gap-1">
          <Campanella />
          <RefreshButton />
          <UserMenu>
            <ProfileMenu />
          </UserMenu>
        </div>
      </div>
    </header>
  );
};

const ProfileMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/profile" className="flex items-center gap-2">
        <User />
        {translate("crm.profile.title")}
      </Link>
    </DropdownMenuItem>
  );
};
export default Header;
