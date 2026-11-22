import { CRM } from "@/components/atomic-crm/root/CRM";
import { Cruscotto } from "@/components/agenzia/CruscottoSemplice";
import logo from "@/assets/punto_assicurativo.png";

/**
 * Dashboard di agenzia Punto Assicurativo (agenzia Vittoria 346), costruita su Atomic CRM v1.6.1.
 * La pagina iniziale e' il cruscotto semplice (src/components/agenzia/CruscottoSemplice.tsx, dettagli in /cruscotto/...),
 * alimentato dall'agente Python agenti\cruscotto_agenzia (tabella Supabase `cruscotto`).
 */
const App = () => (
  <CRM
    title="Agenzia 346"
    dashboard={Cruscotto}
    lightModeLogo={logo}
    darkModeLogo={logo}
  />
);

export default App;
