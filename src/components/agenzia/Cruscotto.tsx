/**
 * Pagina principale della dashboard di agenzia (Punto Assicurativo, agenzia Vittoria 346).
 * Legge l'ultima riga della tabella `cruscotto`, scritta ogni mattina dall'agente
 * agenti\cruscotto_agenzia sul PC di Lorenzo. Cinque numeri e un grafico dei 12 mesi.
 */
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

type Delta = {
  np: number;
  ann: number;
  delta: number;
  np_pezzi: number;
  ann_pezzi: number;
  delta_pezzi: number;
};
type DeltaLinea = { mese: Delta; mese_ap: Delta; ytd: Delta; ytd_ap: Delta };
type Valori = {
  provvigioni: {
    mese: string;
    valore: number;
    ap: number;
    cresc: number | null;
    ultimo_mese_chiuso: { mese: string; totale: number } | null;
  };
  avanzo: {
    valore: number;
    data: string | null;
    descrizione: string;
    prec_valore: number | null;
    prec_data: string | null;
  };
  incassi: {
    auto: number;
    re: number;
    totale: number;
    auto_ap: number;
    re_ap: number;
    totale_ap: number;
    cresc_auto: number | null;
    cresc_re: number | null;
    cresc_totale: number | null;
  };
  delta_auto: DeltaLinea;
  delta_re: DeltaLinea;
};
type Mese = {
  mese: string;
  incassi_auto: number;
  incassi_re: number;
  provvigioni: number;
  parziale: boolean;
};
type Riga = {
  data_dati: string;
  aggiornato_il: string;
  valori: Valori;
  mensile: Mese[];
  avvisi: string[] | null;
};

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const MESI_BREVI = MESI.map((m) => m.slice(0, 3));

// useGrouping "always": in italiano il browser non mette il punto sotto i 10.000 (2604 invece di 2.604)
const euro = (v: number | null | undefined, decimali = 0) =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);
const polizze = (n: number) =>
  `${n >= 0 ? "+" : ""}${n} ${Math.abs(n) === 1 ? "polizza" : "polizze"}`;
const euroSegno = (v: number) => (v > 0 ? "+" : "") + euro(v);
const dataIt = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";
const nomeMese = (aaaa_mm: string) =>
  MESI[parseInt(aaaa_mm.slice(5, 7), 10) - 1];

const useCruscotto = () =>
  useQuery({
    queryKey: ["cruscotto", "ultimo"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("cruscotto")
        .select("*")
        .order("data_dati", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as Riga | null;
    },
  });

/** Variazione con freccia e parola, mai solo colore. */
const Variazione = ({ pct, testo }: { pct: number | null; testo: string }) => {
  if (pct == null)
    return <span className="text-muted-foreground">{testo}: n.d.</span>;
  const su = pct >= 0;
  return (
    <span
      className={
        su
          ? "text-green-700 dark:text-green-400"
          : "text-red-700 dark:text-red-400"
      }
    >
      {su ? "▲" : "▼"} {su ? "+" : ""}
      {pct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}% {testo}
    </span>
  );
};

const Riquadro = ({
  titolo,
  valore,
  children,
}: {
  titolo: string;
  valore: string;
  children?: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div className="text-3xl font-semibold tabular-nums tracking-tight">
      {valore}
    </div>
    <div className="text-sm flex flex-col gap-0.5 tabular-nums">{children}</div>
  </div>
);

const RiquadroDelta = ({
  titolo,
  d,
  mese,
}: {
  titolo: string;
  d: DeltaLinea;
  mese: string;
}) => (
  <Riquadro titolo={titolo} valore={euroSegno(d.ytd.delta)}>
    <span className="text-muted-foreground">
      da inizio anno, {polizze(d.ytd.delta_pezzi)} ({d.ytd.np_pezzi} nuove,{" "}
      {d.ytd.ann_pezzi} perse)
    </span>
    <span className="text-muted-foreground">
      anno scorso {euroSegno(d.ytd_ap.delta)}, {polizze(d.ytd_ap.delta_pezzi)}
    </span>
    <span>
      {nomeMese(mese)} {euroSegno(d.mese.delta)}, {polizze(d.mese.delta_pezzi)}
    </span>
  </Riquadro>
);

const GraficoMesi = ({ mesi }: { mesi: Mese[] }) => {
  const [tabella, setTabella] = useState(false);
  const scuro = document.documentElement.classList.contains("dark");
  const colori = scuro ? ["#3987e5", "#d95926"] : ["#2a78d6", "#eb6834"];
  const dati = mesi.map((m) => ({
    mese:
      MESI_BREVI[parseInt(m.mese.slice(5, 7), 10) - 1] +
      (m.parziale ? "*" : ""),
    Auto: Math.round(m.incassi_auto),
    RE: Math.round(m.incassi_re),
  }));
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="text-base font-semibold">
          Incassi per mese, ultimi 12 mesi
        </h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: colori[0] }}
            />{" "}
            Auto
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: colori[1] }}
            />{" "}
            RE
          </span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveBar
          data={dati}
          keys={["Auto", "RE"]}
          indexBy="mese"
          colors={colori}
          margin={{ top: 8, right: 4, bottom: 24, left: 44 }}
          padding={0.35}
          innerPadding={2}
          borderRadius={2}
          enableLabel={false}
          enableGridY
          axisLeft={{
            tickSize: 0,
            tickPadding: 6,
            tickValues: 4,
            format: (v: number) => `${Math.round(v / 1000)}k`,
          }}
          axisBottom={{ tickSize: 0, tickPadding: 6 }}
          theme={{
            text: { fill: "var(--muted-foreground)", fontSize: 11 },
            grid: { line: { stroke: "var(--border)", strokeWidth: 1 } },
          }}
          tooltip={({ id, value, indexValue }) => (
            <div className="rounded border bg-popover px-2 py-1 text-sm text-popover-foreground shadow">
              {indexValue} {id}: <strong>{euro(value as number)}</strong>
            </div>
          )}
          role="img"
          ariaLabel="Incassi auto e RE per mese, ultimi 12 mesi"
        />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          * mese in corso, fino a ieri. Fonte titoli incassati (NA013).
        </span>
        <button className="underline" onClick={() => setTabella(!tabella)}>
          {tabella ? "Nascondi tabella" : "Mostra tabella"}
        </button>
      </div>
      {tabella && (
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="font-normal">Mese</th>
              <th className="font-normal text-right">Auto</th>
              <th className="font-normal text-right">RE</th>
              <th className="font-normal text-right">Provvigioni</th>
            </tr>
          </thead>
          <tbody>
            {mesi.map((m) => (
              <tr key={m.mese} className="border-t">
                <td>
                  {nomeMese(m.mese)} {m.mese.slice(0, 4)}
                  {m.parziale ? "*" : ""}
                </td>
                <td className="text-right">{euro(m.incassi_auto)}</td>
                <td className="text-right">{euro(m.incassi_re)}</td>
                <td className="text-right">{euro(m.provvigioni)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export const Cruscotto = () => {
  const { data, isPending, error } = useCruscotto();
  if (isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (error)
    return (
      <div className="p-4 text-red-700">
        Errore nel caricare i dati: {String(error.message ?? error)}
      </div>
    );
  if (!data)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );

  const v = data.valori;
  const p = v.provvigioni;
  const inc = v.incassi;
  const anno = data.data_dati.slice(0, 4);
  const aggiornato = new Date(data.aggiornato_il).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full px-4 pt-2 pb-28 md:px-0 md:pt-0 md:pb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h1 className="text-xl font-semibold">Agenzia 346 Imperia Sanremo</h1>
        <div className="text-sm text-muted-foreground">
          Dati a {dataIt(data.data_dati)}, aggiornati il {aggiornato}
        </div>
      </div>

      {data.avvisi && data.avvisi.length > 0 && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          ⚠ {data.avvisi.join(" · ")}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Riquadro
          titolo={`Provvigioni di ${nomeMese(p.mese)}`}
          valore={euro(p.valore)}
        >
          <Variazione
            pct={p.cresc}
            testo={`su ${nomeMese(p.mese)} ${parseInt(anno) - 1} (${euro(p.ap)})`}
          />
          {p.ultimo_mese_chiuso && (
            <span className="text-muted-foreground">
              {nomeMese(p.ultimo_mese_chiuso.mese)} chiuso{" "}
              {euro(p.ultimo_mese_chiuso.totale)}
            </span>
          )}
        </Riquadro>

        <Riquadro titolo="Avanzo" valore={euro(v.avanzo.valore)}>
          <span className="text-muted-foreground">
            ultimo movimento {dataIt(v.avanzo.data)}, {v.avanzo.descrizione}
          </span>
          {v.avanzo.prec_valore != null && (
            <span className="text-muted-foreground">
              il {dataIt(v.avanzo.prec_data)} era {euro(v.avanzo.prec_valore)}
            </span>
          )}
        </Riquadro>

        <Riquadro
          titolo={`Incassi da inizio ${anno}`}
          valore={euro(inc.totale)}
        >
          <Variazione pct={inc.cresc_totale} testo="sull'anno scorso" />
          <span>
            Auto {euro(inc.auto)} <Variazione pct={inc.cresc_auto} testo="" />
          </span>
          <span>
            RE {euro(inc.re)} <Variazione pct={inc.cresc_re} testo="" />
          </span>
        </Riquadro>

        <RiquadroDelta titolo="Delta auto" d={v.delta_auto} mese={p.mese} />
        <RiquadroDelta titolo="Delta RE" d={v.delta_re} mese={p.mese} />

        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground flex flex-col gap-1">
          <div className="text-foreground font-medium">Come leggere</div>
          <span>
            Delta = nuova produzione meno annullamenti, in premio imponibile.
          </span>
          <span>
            Auto e RE come nella mail di Vittoria: gli infortuni del conducente
            stanno nel RE.
          </span>
          <span>Confronti sullo stesso periodo dell'anno scorso.</span>
        </div>
      </div>

      {data.mensile && <GraficoMesi mesi={data.mensile} />}
    </div>
  );
};

export default Cruscotto;
