/**
 * Movements of the premium account on the detail page of its tile (Fabio 24/11/2026): the whole year, each Saldi row
 * split into its entry and its exit, with filters by month, by entries/exits and a text search. The filters live in the
 * URL so a refresh keeps them.
 */
import { useSearchParams } from "react-router";

import { euro, nomeMese, tondo } from "./formato";
import { type Cella, type Elenco, ElencoCompleto, Spiegato } from "./Spiega";
import {
  elencoMovimentiAvanzo,
  filtraMovimenti,
  type FiltroMovimenti,
  mesiMovimenti,
  type MovimentiAvanzo,
  type TipoMovimento,
} from "./spiegaCruscotto";

const TIPI: [TipoMovimento, string][] = [
  ["tutti", "Entrate e uscite"],
  ["entrata", "Solo entrate"],
  ["uscita", "Solo uscite"],
];

const CAMPO = "rounded-md border bg-card px-2 py-1 text-sm";

/** Three columns instead of four, so the list fits a phone: exits as negative amounts in one "Importo" column. */
const treColonne = (e: Elenco): Elenco => {
  const importo = (en: Cella, us: Cella): Cella =>
    typeof en === "number" ? en : typeof us === "number" ? -us : null;
  const t = e.totale;
  return {
    ...e,
    colonne: ["Data e descrizione", "Importo", "Saldo"],
    righe: e.righe.map(([d, en, us, sa]) => [d, importo(en, us), sa]),
    totale: t
      ? [
          `${t[0]}: entrate meno uscite`,
          tondo(Number(t[1] ?? 0) - Number(t[2] ?? 0)),
          t[3],
        ]
      : undefined,
  };
};

export const MovimentiConto = ({ mv }: { mv: MovimentiAvanzo }) => {
  const [parametri, setParametri] = useSearchParams();
  const filtro: FiltroMovimenti = {
    mese: parametri.get("mese_mov") ?? "",
    tipo: (parametri.get("tipo_mov") ?? "tutti") as TipoMovimento,
    testo: parametri.get("cerca_mov") ?? "",
  };
  const cambia = (chiave: string, valore: string, base: string) => {
    const p = new URLSearchParams(parametri);
    if (valore === base) p.delete(chiave);
    else p.set(chiave, valore);
    setParametri(p, { replace: true });
  };
  const elenco = elencoMovimentiAvanzo(mv, filtro);
  const righe = filtraMovimenti(mv, filtro);
  const entrate = tondo(righe.reduce((t, x) => t + x.entrata, 0));
  const uscite = tondo(righe.reduce((t, x) => t + x.uscita, 0));
  const spiegaTotali = {
    titolo: "Entrate e uscite dei movimenti mostrati",
    cosa: "Somma delle righe dell'elenco qui sotto, con i filtri scelti. Ogni riga del foglio Saldi è divisa nella sua entrata e nella sua uscita.",
    calcolo: [
      {
        voce: `Entrate (${righe.filter((x) => x.entrata).length})`,
        valore: entrate,
      },
      {
        voce: `Uscite (${righe.filter((x) => x.uscita).length})`,
        valore: uscite,
        segno: "-" as const,
      },
      {
        voce: "Entrate meno uscite",
        valore: tondo(entrate - uscite),
        segno: "=" as const,
      },
    ],
    fonte: "foglio Saldi (Saldi.xlsx su Drive di fattureagenzia)",
  };
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold mb-2">{elenco.titolo}</h2>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Mese dei movimenti</span>
          <select
            className={CAMPO}
            value={filtro.mese}
            onChange={(e) => cambia("mese_mov", e.target.value, "")}
          >
            <option value="">Tutto l'anno</option>
            {mesiMovimenti(mv).map((m) => (
              <option key={m} value={m}>
                {nomeMese(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Entrate o uscite</span>
          <select
            className={CAMPO}
            value={filtro.tipo}
            onChange={(e) => cambia("tipo_mov", e.target.value, "tutti")}
          >
            {TIPI.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          className={`${CAMPO} w-full sm:w-56`}
          placeholder="Cerca nella descrizione"
          aria-label="Cerca nella descrizione"
          value={filtro.testo}
          onChange={(e) => cambia("cerca_mov", e.target.value, "")}
        />
      </div>
      <p className="mb-2 text-sm tabular-nums">
        Entrate <Spiegato spiega={spiegaTotali}>{euro(entrate)}</Spiegato>,
        uscite <Spiegato spiega={spiegaTotali}>{euro(uscite)}</Spiegato>
      </p>
      <ElencoCompleto elenco={treColonne(elenco)} />
    </section>
  );
};
