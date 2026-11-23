/**
 * "Tasse" (partners only, simplification plan of 21/11/2026, P4): from the taxable profit to the taxes of Fabio, Claudio
 * and the IRAP of the SNC, minus what is already paid, = still to pay; how much the year's taxes weigh per month and how
 * much to put aside (ESTIMATE). Data: andamento_blocchi type "tasse" (tasse_da_parte.py) and "fiscale" (fiscale.py): no
 * tax maths here, only the agent's figures laid out with their explanation.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { type Fiscale, useBloccoFiscale } from "./Fiscale";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";
import { Riquadro } from "./Riquadro";
import {
  type Cella,
  type RigaCalcolo,
  type Spiegazione,
  Spiegato,
} from "./Spiega";

interface RigheTasse {
  utile_fiscale: number;
  fabio: number;
  claudio: number;
  irap: number;
  totale: number;
  ritenute: number;
  inps_pagati: number;
  resta: number;
}

export interface BloccoTasse {
  anno: string;
  al: string | null;
  calcolato_il: string;
  fino_a_oggi?: RigheTasse;
  dicembre?: RigheTasse;
  pesano_al_mese: number | null;
  mesi_al_saldo: number;
  saldo_entro: string;
  da_parte_al_mese: number | null;
  stima: boolean;
  inps_versati: { data: string; importo: number }[];
  rate_imposte: { data: string; importo: number }[];
  rate_imposte_totale: number;
  nota_stima: string;
  nota_inps: string;
}

interface RitenutePassi {
  mesi_con_ritenuta: number;
  compagnia_da_gennaio: number;
  compagnia_anno: number | null;
  arag: number;
  mesi_arag: number;
  arag_anno: number;
  totale: number | null;
}

type FiscaleTasse = Fiscale & {
  ritenute_passi?: RitenutePassi | null;
  ritenuta_arag?: number;
  per_mese: Record<string, { ritenuta?: number | null }>;
};

export const useBloccoTasse = () =>
  useQuery({
    queryKey: ["andamento", "tasse"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("valori")
        .eq("tipo", "tasse")
        .order("mese", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.valori ?? null) as BloccoTasse | null;
    },
  });

const FONTE =
  "utile fiscale del giro (estratti conto, foglio Saldi, partite BO); aliquote in Simula tasse; ritenute dai report BO; INPS dall'estratto Banco Desio";

const tondo = (v: number): number => Math.round(v * 100) / 100;
const pct = (v: number) =>
  `${(v * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

type Colonna = "fino_a_oggi" | "dicembre";

/** The explanation of one cell of the table (same figures as the agent, never recomputed differently). */
const spiegaCella = (
  riga: keyof RigheTasse,
  col: Colonna,
  t: RigheTasse,
  f: FiscaleTasse,
  b: BloccoTasse,
  periodo: string,
): Spiegazione => {
  const c = col === "fino_a_oggi" ? f.da_gennaio : f.proiezione;
  const titolo = `${periodo}`;
  if (riga === "utile_fiscale")
    return {
      titolo: `Utile fiscale, ${titolo}`,
      cosa: "Ricavi meno costi deducibili. Il dettaglio mese per mese e i passaggi della proiezione sono nella scheda Utile fiscale.",
      calcolo: c
        ? [
            { voce: "Ricavi", valore: c.ricavi },
            { voce: "Costi deducibili", valore: c.deducibili, segno: "-" },
            { voce: "Utile fiscale", valore: t.utile_fiscale, segno: "=" },
          ]
        : [{ voce: "Utile fiscale", valore: t.utile_fiscale, segno: "=" }],
      fonte: FONTE,
    };
  if (riga === "fabio" || riga === "claudio") {
    const chi = riga === "fabio" ? "Fabio" : "Claudio";
    const centesimo = c ? tondo(t[riga] - c.tasse_socio) : 0;
    return {
      titolo: `Tasse di ${chi}, ${titolo}`,
      cosa: `Meta' dell'utile fiscale a testa: contributi INPS, IRPEF e addizionali di ${chi}. Nessun altro reddito dei soci: se ne hanno altri, l'IRPEF sale.`,
      calcolo: c
        ? [
            { voce: "Meta' dell'utile fiscale", valore: c.quota_socio },
            { voce: "INPS commercianti", valore: c.inps_socio },
            { voce: "IRPEF", valore: c.irpef_socio, segno: "+" },
            { voce: "Addizionali", valore: c.addizionali_socio, segno: "+" },
            ...(centesimo
              ? [
                  {
                    voce: "centesimo dell'arrotondamento",
                    valore: centesimo,
                    segno: "+" as const,
                  },
                ]
              : []),
            { voce: `Tasse di ${chi}`, valore: t[riga], segno: "=" },
          ]
        : [],
      fonte: FONTE,
    };
  }
  if (riga === "irap")
    return {
      titolo: `IRAP della SNC, ${titolo}`,
      cosa: "Imposta regionale della societa', sull'utile fiscale.",
      calcolo: [
        { voce: "Utile fiscale", valore: t.utile_fiscale },
        { voce: "aliquota", valore: "3,9%", segno: "x" },
        { voce: "IRAP", valore: t.irap, segno: "=" },
      ],
      fonte: FONTE,
    };
  if (riga === "totale")
    return {
      titolo: `Tasse dell'anno, ${titolo}`,
      cosa: "Tutte le tasse generate dall'utile: i due soci e la societa'.",
      calcolo: [
        { voce: "Tasse di Fabio", valore: t.fabio },
        { voce: "Tasse di Claudio", valore: t.claudio, segno: "+" },
        { voce: "IRAP della SNC", valore: t.irap, segno: "+" },
        { voce: "Totale", valore: t.totale, segno: "=" },
      ],
      fonte: FONTE,
    };
  if (riga === "ritenute") {
    const mesi = Object.keys(f.per_mese).sort();
    const p = f.ritenute_passi;
    const calcolo: RigaCalcolo[] =
      col === "fino_a_oggi" || !p
        ? [
            {
              voce: `Ritenuta della compagnia (codice 5601), ${mesi.length} mesi`,
              valore: p?.compagnia_da_gennaio ?? t.ritenute,
            },
            ...(p?.arag
              ? [
                  {
                    voce: "Ritenuta di ARAG",
                    valore: p.arag,
                    segno: "+" as const,
                  },
                ]
              : []),
            { voce: "Ritenute", valore: t.ritenute, segno: "=" },
          ]
        : [
            {
              voce: `Compagnia: ${euro(p.compagnia_da_gennaio)} in ${p.mesi_con_ritenuta} mesi, per 12`,
              valore: p.compagnia_anno ?? 0,
            },
            ...(p.arag
              ? [
                  {
                    voce: `ARAG: ${euro(p.arag)} in ${p.mesi_arag} mesi, per 12`,
                    valore: p.arag_anno,
                    segno: "+" as const,
                  },
                ]
              : []),
            ...(Math.abs(
              tondo(t.ritenute - (p.compagnia_anno ?? 0) - p.arag_anno),
            ) >= 0.01
              ? [
                  {
                    voce: "arrotondamento",
                    valore: tondo(
                      t.ritenute - (p.compagnia_anno ?? 0) - p.arag_anno,
                    ),
                    segno: "+" as const,
                  },
                ]
              : []),
            { voce: "Ritenute previste", valore: t.ritenute, segno: "=" },
          ];
    return {
      titolo: `Ritenute gia' trattenute, ${titolo}`,
      cosa: "Imposte gia' versate per conto dei soci: la compagnia e ARAG le trattengono sulle provvigioni. Si tolgono dalle tasse.",
      calcolo,
      fonte: "Prospetto Ritenute dei report BO; ARAG dalla sua comunicazione",
      elenco: {
        titolo: "Ritenuta della compagnia mese per mese",
        colonne: ["Mese", "Ritenuta"],
        righe: [
          ...mesi.map((m): Cella[] => [
            nomeMese(m),
            f.per_mese[m].ritenuta ?? "non ancora nota",
          ]),
          ...(p?.arag ? [["ARAG", p.arag] as Cella[]] : []),
        ],
        totale: [
          "Da gennaio",
          tondo((p?.compagnia_da_gennaio ?? 0) + (p?.arag ?? 0)),
        ],
      },
    };
  }
  if (riga === "inps_pagati")
    return {
      titolo: "Contributi INPS fissi gia' pagati",
      cosa: b.nota_inps,
      calcolo: [
        ...b.inps_versati.map(
          (x, i): RigaCalcolo => ({
            voce: `Rata del ${dataIt(x.data)}`,
            valore: x.importo,
            segno: i ? "+" : undefined,
          }),
        ),
        { voce: "Totale", valore: t.inps_pagati, segno: "=" },
      ],
      fonte: "estratto conto Banco Desio 211900, bonifici allo studio",
      elenco: {
        titolo: "Rate INPS pagate allo studio",
        colonne: ["Data", "Importo"],
        righe: b.inps_versati.map((x): Cella[] => [dataIt(x.data), x.importo]),
        totale: ["Totale", t.inps_pagati],
      },
    };
  return {
    titolo: `Resta da pagare, ${titolo}`,
    cosa: `STIMA. ${b.nota_stima}`,
    calcolo: [
      { voce: "Tasse dell'anno", valore: t.totale },
      { voce: "Ritenute gia' trattenute", valore: t.ritenute, segno: "-" },
      { voce: "INPS fissi gia' pagati", valore: t.inps_pagati, segno: "-" },
      { voce: "Resta da pagare", valore: t.resta, segno: "=" },
    ],
    fonte: FONTE,
  };
};

const RIGHE: [keyof RigheTasse, string, boolean?][] = [
  ["utile_fiscale", "Utile fiscale", true],
  ["fabio", "Tasse di Fabio"],
  ["claudio", "Tasse di Claudio"],
  ["irap", "IRAP della SNC"],
  ["totale", "= Tasse dell'anno", true],
  ["ritenute", "meno ritenute gia' trattenute"],
  ["inps_pagati", "meno contributi INPS fissi gia' pagati"],
  ["resta", "= Resta da pagare (stima)", true],
];

const Tabella = ({ b, f }: { b: BloccoTasse; f: FiscaleTasse }) => {
  const colonne: [Colonna, string][] = [
    [
      "fino_a_oggi",
      f.dal && f.al
        ? `Da ${nomeMese(f.dal)} a ${nomeMese(f.al)}`
        : "Fino a oggi",
    ],
    ["dicembre", `A dicembre ${b.anno} (previsto)`],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border bg-card p-3 sm:p-4">
      <h2 className="mb-2 text-base font-semibold">
        Dall'utile fiscale a quanto resta da pagare
      </h2>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 font-normal" />
            {colonne.map(([k, t]) => (
              <th key={k} className="py-1 pl-2 text-right font-normal">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RIGHE.map(([riga, nome, forte]) => (
            <tr
              key={riga}
              className={`border-t ${forte ? "font-semibold" : ""} ${riga === "resta" ? "bg-muted/60" : ""}`}
            >
              <td className="py-1.5 pr-2">{nome}</td>
              {colonne.map(([col, periodo]) => {
                const t = b[col];
                return (
                  <td key={col} className="py-1.5 pl-2 text-right">
                    {t ? (
                      <Spiegato
                        spiega={spiegaCella(riga, col, t, f, b, periodo)}
                      >
                        {euro(t[riga])}
                      </Spiegato>
                    ) : (
                      "n.d."
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">
        L'utile fiscale si apre nella scheda{" "}
        <Link to="/tasse/utile-fiscale" className="text-pa-blu">
          Utile fiscale
        </Link>
        ; le aliquote si provano in{" "}
        <Link to="/tasse/simula-tasse" className="text-pa-blu">
          Simula tasse
        </Link>
        .
      </p>
    </div>
  );
};

export const TasseAnno = () => {
  const tasse = useBloccoTasse();
  const fiscale = useBloccoFiscale();
  if (tasse.isPending || fiscale.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (tasse.error) return <ErroreCaricamento errore={tasse.error} />;
  if (fiscale.error) return <ErroreCaricamento errore={fiscale.error} />;
  const b = tasse.data;
  const f = fiscale.data as FiscaleTasse | null;
  if (!b || !f || !b.dicembre)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato: il giro del mattino non ha ancora calcolato le tasse.
      </div>
    );
  const dic = b.dicembre;
  const saldo = `${nomeMese(b.saldo_entro.slice(0, 7))}`;
  return (
    <Pagina
      titolo={`Tasse ${b.anno}`}
      sotto="Stime dai conti dell'agenzia: la cifra vera la fa lo studio con la dichiarazione. Passa sopra (o tocca) un numero per il calcolo."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Riquadro
          titolo="Le tasse dell'anno pesano al mese"
          valore={euro(b.pesano_al_mese, 0)}
          spiega={{
            titolo: "Quanto pesano le tasse ogni mese",
            cosa: "Tutte le tasse previste per l'anno, divise per 12 mesi.",
            calcolo: [
              { voce: "Tasse previste dell'anno", valore: dic.totale },
              { voce: "mesi", valore: "12", segno: ":" },
              {
                voce: "Al mese",
                valore: b.pesano_al_mese ?? 0,
                segno: "=",
              },
            ],
            fonte: FONTE,
          }}
        >
          <span className="text-muted-foreground">
            tasse previste {euro(dic.totale, 0)} diviso 12
          </span>
        </Riquadro>
        <Riquadro
          titolo={`Da mettere da parte ogni mese fino a ${saldo}`}
          valore={euro(b.da_parte_al_mese, 0)}
          spiega={{
            titolo: "Quanto mettere da parte (STIMA)",
            cosa: `Quello che resta da pagare, diviso i mesi che mancano al saldo di fine giugno ${Number(b.anno) + 1}. ${b.nota_stima}`,
            calcolo: [
              { voce: "Resta da pagare (previsto)", valore: dic.resta },
              {
                voce: `mesi fino a ${saldo}`,
                valore: String(b.mesi_al_saldo),
                segno: ":",
              },
              {
                voce: "Al mese",
                valore: b.da_parte_al_mese ?? 0,
                segno: "=",
              },
            ],
            fonte: FONTE,
          }}
        >
          <span className="self-start rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            STIMA
          </span>
          <span className="text-muted-foreground">
            resta {euro(dic.resta, 0)} in {b.mesi_al_saldo} mesi
          </span>
        </Riquadro>
      </div>
      <Tabella b={b} f={f} />
      <section className="rounded-lg border bg-card p-3 text-sm sm:p-4">
        <h2 className="text-base font-semibold">
          Perche' e' una stima: le rate gia' pagate allo studio
        </h2>
        <p className="mt-1 text-muted-foreground">{b.nota_stima}</p>
        <ul className="mt-2">
          {b.rate_imposte.map((r) => (
            <li
              key={r.data}
              className="flex justify-between border-t py-1 tabular-nums"
            >
              <span>Rata imposte del {dataIt(r.data)}</span>
              <span>{euro(r.importo)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t py-1 font-semibold tabular-nums">
            <span>Totale rate</span>
            <Spiegato
              spiega={{
                titolo: "Rate imposte pagate allo studio",
                cosa: "Saldo dell'anno prima e primo acconto insieme: dall'estratto non si separano. Domanda allo studio nella scheda Per lo studio.",
                calcolo: [
                  ...b.rate_imposte.map(
                    (r, i): RigaCalcolo => ({
                      voce: dataIt(r.data),
                      valore: r.importo,
                      segno: i ? "+" : undefined,
                    }),
                  ),
                  { voce: "Totale", valore: b.rate_imposte_totale, segno: "=" },
                ],
                fonte: "estratto conto Banco Desio 211900",
              }}
            >
              {euro(b.rate_imposte_totale)}
            </Spiegato>
          </li>
        </ul>
        <p className="mt-2">
          Le risposte dello studio cambiano la stima:{" "}
          <Link to="/tasse/studio" className="text-pa-blu">
            domande per lo studio
          </Link>
          .
        </p>
      </section>
      <p className="text-xs text-muted-foreground">
        Calcolato il {dataIt(b.calcolato_il)} sui mesi completi fino a{" "}
        {b.al ? nomeMese(b.al) : "n.d."}. IRAP {pct(0.039)} dell'utile fiscale.
      </p>
    </Pagina>
  );
};
