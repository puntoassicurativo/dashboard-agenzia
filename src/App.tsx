import { CRM } from "@/components/atomic-crm/root/CRM";
import { Inizio } from "@/components/agenzia/Indirizzi";
import logo from "@/assets/punto_assicurativo.png";

/**
 * Dashboard di agenzia Punto Assicurativo (agenzia Vittoria 346), costruita su Atomic CRM v1.6.1.
 * La pagina iniziale e' il cruscotto semplice per i soci (src/components/agenzia/CruscottoSemplice.tsx, dettagli in
 * /cruscotto/...), "Da fare" per gli altri (23/11/2026). Dati dall'agente Python agenti\cruscotto_agenzia.
 */
const App = () => (
  <CRM
    title="Agenzia 346"
    dashboard={Inizio}
    lightModeLogo={logo}
    darkModeLogo={logo}
  />
);

export default App;
