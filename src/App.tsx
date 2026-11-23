import { CRM } from "@/components/atomic-crm/root/CRM";
import { Inizio } from "@/components/agenzia/Indirizzi";
import logo from "@/assets/punto_assicurativo.png";

/**
 * Agency dashboard of Punto Assicurativo, built on Atomic CRM v1.6.1. The home page is the simple Cruscotto for the
 * partners (src/components/agenzia/CruscottoSemplice.tsx, details under /cruscotto/...), "Da fare" for everyone else.
 * Data comes from the Python agent agenti\cruscotto_agenzia.
 */
const App = () => (
  <CRM
    title="Punto Assicurativo"
    dashboard={Inizio}
    lightModeLogo={logo}
    darkModeLogo={logo}
  />
);

export default App;
