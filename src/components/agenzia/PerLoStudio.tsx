import { Commercialista } from "./Commercialista";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

interface Pacchetto {
  mese: string;
  file: string;
  conti: Record<string, { movimenti: number; entrate: number; uscite: number }>;
  fatture: number;
}

const NOMI: Record<string, string> = {
  "222": "Banca di Asti 222, conto premi",
  "257": "Banca di Asti 257, operativo",
  "211900": "Banco Desio 211900, gestionale",
  "212000": "Banco Desio 212000, premi",
};

/** Contabilita' > Per lo studio (phase 10): monthly package for the accountant plus the existing summary. */
export const PerLoStudio = () => {
  const q = useBlocchi<Pacchetto, unknown>("studio");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = Object.keys(q.data.mesi).sort();
  const p = mesi.length ? q.data.mesi[mesi[mesi.length - 1]] : null;
  return (
    <Pagina
      titolo="Per lo studio"
      sotto="Ogni mese lo studio chiede le banche del mese. Il pacchetto lo prepara il giro della mattina sul PC di Lorenzo; lo mandano Lorenzo o Fabio."
    >
      {p ? (
        <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
          <h2 className="text-base font-semibold">
            Pacchetto di {nomeMese(p.mese)}
          </h2>
          <p>
            File: <code>{p.file}</code> (movimenti del mese per conto, in CSV
            che si apre con Excel
            {p.fatture ? `, piu' ${p.fatture} fatture` : ""}).
          </p>
          <table className="w-full tabular-nums">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="font-normal">Conto</th>
                <th className="font-normal text-right">Movimenti</th>
                <th className="font-normal text-right">Entrate</th>
                <th className="font-normal text-right">Uscite</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.conti).map(([c, v]) => (
                <tr key={c} className="border-t">
                  <td>{NOMI[c] ?? c}</td>
                  <td className="text-right">{v.movimenti}</td>
                  <td className="text-right">{euro(v.entrate)}</td>
                  <td className="text-right">{euro(v.uscite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Il pacchetto non e' ancora stato preparato.
        </div>
      )}
      {p && <Commercialista mese={p.mese} />}
    </Pagina>
  );
};
