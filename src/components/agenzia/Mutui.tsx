import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro } from "./formato";
import { Pagina } from "./Lato";

export interface SchedaMutuo {
  numero: string;
  nome: string;
  tasso: number;
  taeg: number | null;
  stipula: string;
  importo_stipulato: number;
  debito_residuo: number | null;
  ultima_rata: { rata: number; data: string; importo: number } | null;
  prossima: { rata: number; scadenza: string; importo: number } | null;
  rate_mancanti: number;
  fine: string | null;
  interessi_anno: number;
  oneri_anno: number;
  capitale_anno: number;
}

export interface RataControllata {
  mutuo: string;
  rata: number | null;
  tipo: string;
  data: string;
  importo: number;
  interessi: number;
  capitale: number;
  oneri: number;
  piano: boolean;
  piano_importo?: number;
  diff_importo?: number;
  diff_interessi?: number;
  da_guardare: boolean;
  motivo: string;
}

export interface MutuiInfo {
  estratto_al: string | null;
  anno: number;
  mutui: SchedaMutuo[];
  totale_debito: number;
  rata_mese: number;
  anni: {
    anno: number;
    interessi: number;
    oneri: number;
    capitale: number;
    dall_estratto: number;
    dal_piano: number;
  }[];
  controllo: RataControllata[];
  da_guardare: number;
  non_pagate: { mutuo: string; rata: number; scadenza: string }[];
  soglia: number;
  nota: string;
}

const percento = (v: number) =>
  `${v.toLocaleString("it-IT", { maximumFractionDigits: 3 })}%`;

const nomeRata = (r: RataControllata) =>
  r.tipo === "rata"
    ? `rata ${r.rata}`
    : r.tipo === "anticipo"
      ? "anticipo di capitale"
      : "preammortamento";

/** Contabilita' > Mutui e finanziamenti (plan of 18/11/2026): Banco Desio loans, partners only. */
export const MutuiBlocco = ({ m }: { m: MutuiInfo }) => {
  const prossima = m.mutui
    .map((x) => x.prossima?.scadenza)
    .filter(Boolean)
    .sort()[0];
  const scarti = m.controllo.filter((r) => r.diff_importo);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm space-y-1">
        <p className="text-base">
          Debito totale <b className="tabular-nums">{euro(m.totale_debito)}</b>
        </p>
        <p className="text-muted-foreground">
          Dopo le rate addebitate fino al {dataIt(m.estratto_al)}.
          {prossima &&
            ` Prossime rate il ${dataIt(prossima)}: ${euro(m.rata_mese)} dal conto gestionale 211900.`}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm overflow-x-auto">
        <table className="w-full tabular-nums">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="font-normal">Mutuo</th>
              <th className="font-normal text-right">Tasso</th>
              <th className="font-normal text-right">Debito residuo</th>
              <th className="font-normal text-right">Prossima rata</th>
              <th className="font-normal text-right">Interessi {m.anno}</th>
              <th className="font-normal text-right">Ultima rata</th>
            </tr>
          </thead>
          <tbody>
            {m.mutui.map((x) => (
              <tr key={x.numero} className="border-t align-top">
                <td className="py-1 pr-2">
                  {x.nome}
                  <span className="block text-xs text-muted-foreground">
                    n. {x.numero}, dal {dataIt(x.stipula)}
                  </span>
                </td>
                <td className="text-right">
                  {percento(x.tasso)}
                  {x.taeg != null && (
                    <span className="block text-xs text-muted-foreground">
                      TAEG {percento(x.taeg)}
                    </span>
                  )}
                </td>
                <td className="text-right">{euro(x.debito_residuo)}</td>
                <td className="text-right">
                  {x.prossima ? euro(x.prossima.importo) : "nessuna"}
                  {x.prossima && (
                    <span className="block text-xs text-muted-foreground">
                      il {dataIt(x.prossima.scadenza)}
                    </span>
                  )}
                </td>
                <td className="text-right">{euro(x.interessi_anno)}</td>
                <td className="text-right whitespace-nowrap">
                  {dataIt(x.fine)}
                  <span className="block text-xs text-muted-foreground">
                    ancora {x.rate_mancanti} rate
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm overflow-x-auto">
        <h2 className="text-base font-semibold mb-2">Anno per anno</h2>
        <table className="w-full tabular-nums">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="font-normal">Anno</th>
              <th className="font-normal text-right">Interessi</th>
              <th className="font-normal text-right">Oneri e spese</th>
              <th className="font-normal text-right">Costo</th>
              <th className="font-normal text-right">Capitale restituito</th>
            </tr>
          </thead>
          <tbody>
            {m.anni.map((a) => (
              <tr key={a.anno} className="border-t">
                <td className="py-1">
                  {a.anno}
                  <span className="block text-xs text-muted-foreground">
                    {a.dall_estratto && a.dal_piano
                      ? `${a.dall_estratto} rate dall'estratto, ${a.dal_piano} dal piano`
                      : a.dall_estratto
                        ? "dall'estratto"
                        : "dal piano"}
                  </span>
                </td>
                <td className="text-right">{euro(a.interessi)}</td>
                <td className="text-right">{euro(a.oneri)}</td>
                <td className="text-right font-medium">
                  {euro(a.interessi + a.oneri)}
                </td>
                <td className="text-right">{euro(a.capitale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Il costo (interessi e oneri) abbassa l'utile, il capitale restituito
          no.
        </p>
      </div>

      <details className="rounded-lg border bg-card p-3 text-sm">
        <summary className="cursor-pointer select-none">
          <span className="font-medium">Rate pagate contro il piano</span>
          <span className="block sm:inline sm:ml-2 text-muted-foreground">
            {m.da_guardare
              ? `${m.da_guardare} da guardare`
              : `nessuna da guardare (differenze sotto ${euro(m.soglia)})`}
          </span>
        </summary>
        <div className="mt-2 space-y-1">
          {m.non_pagate.map((r) => (
            <div key={`${r.mutuo}-${r.rata}`} className="text-red-700">
              Mutuo {r.mutuo}, rata {r.rata} del {dataIt(r.scadenza)}: non si
              vede nell'estratto.
            </div>
          ))}
          {m.controllo.map((r) => (
            <div
              key={`${r.mutuo}-${r.data}-${r.tipo}`}
              className={`flex flex-wrap justify-between gap-x-3 ${r.da_guardare ? "text-red-700" : ""}`}
            >
              <span>
                {dataIt(r.data)}, mutuo {r.mutuo}, {nomeRata(r)}
              </span>
              <span className="tabular-nums">
                {euro(r.importo)}
                {r.diff_importo
                  ? `, piano ${euro(r.piano_importo)} (${r.diff_importo > 0 ? "+" : ""}${euro(r.diff_importo)})`
                  : r.piano
                    ? ", come il piano"
                    : ", non nel piano"}
              </span>
            </div>
          ))}
          {scarti.length > 0 && !m.da_guardare && (
            <p className="pt-1 text-muted-foreground">
              Le differenze di pochi centesimi sono negli interessi: la banca ne
              addebita un po' meno del piano.
            </p>
          )}
        </div>
      </details>
    </div>
  );
};

export const Mutui = () => {
  const q = useBlocchi<unknown, MutuiInfo>("mutui");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const m = q.data.info;
  return (
    <Pagina titolo="Mutui e finanziamenti" sotto={m?.nota}>
      {m ? (
        <MutuiBlocco m={m} />
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessun dato ancora: arriva con il giro della mattina.
        </div>
      )}
    </Pagina>
  );
};
