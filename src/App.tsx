import { CRM } from "@/components/atomic-crm/root/CRM";
import { Cruscotto } from "@/components/agenzia/Cruscotto";

/**
 * Dashboard di agenzia Punto Assicurativo (agenzia Vittoria 346), costruita su Atomic CRM v1.6.1.
 * La pagina iniziale e' il cruscotto con i cinque numeri (src/components/agenzia/Cruscotto.tsx),
 * alimentato dall'agente Python agenti\cruscotto_agenzia (tabella Supabase `cruscotto`).
 */
const App = () => <CRM title="Agenzia 346" dashboard={Cruscotto} />;

export default App;
