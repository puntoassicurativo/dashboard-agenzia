/**
 * "Utile e costi" (partners only, simplification plan of 21/11/2026, P4), in place of Contabilita' > Andamento mese.
 * On top the profit in blocks: entrato -> uscito (with percentages) -> utile -> dove e' finito, and the line to the taxable
 * profit. Every block opens into its children down to the single payments; the items with invoices behind open the Fatture
 * page already filtered. Below, closed, the calculations of the old Andamento page.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { cn } from "@/lib/utils";
import AndamentoPage from "./Andamento";
import type { InfoModello } from "./ContoAgenzia";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { useBloccoFiscale } from "./Fiscale";
import { dataIt, euro } from "./formato";
import { Pagina } from "./Lato";
import { Sezione } from "./Sezione";
import { ElencoCompleto, type Spiegazione, Spiegato } from "./Spiega";
import type { FiscaleCruscotto } from "./spiegaCruscotto";
import { Tendina } from "./Tendina";
import {
  type AlberoUtile,
  elencoNodo,
  figliSomma,
  type InAttesa,
  type Livello,
  linkFatture,
  type Nodo,
  nomePeriodo,
  perc,
  spiegaNodo,
  spiegaPerc,
  spiegaUtile,
  spiegaVersoFisco,
  attesaCassetto,
  notaParziale,
  spiegaNonDeducibili,
  useAlberoUtile,
  usePeriodiUtile,
  utileFiscale,
} from "./utileBlocchi";
import { useBlocchi } from "./datiLati";

const TITOLI: Record<Livello, string> = {
  entrato: "Entrato",
  uscito: "Uscito",
  dove_finito: "Dove è finito l'utile",
};

/** One card of the block diagram: title, big number with its explanation, one line below. */
const Blocco = ({
  titolo,
  valore,
  spiega,
  sotto,
  verso,
  verde,
}: {
  titolo: string;
  valore: number;
  spiega: Spiegazione;
  sotto?: string;
  verso?: string;
  verde?: boolean;
}) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-l-4 border-l-pa-blu bg-card p-3.5 shadow-sm min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div
      className={cn(
        "text-xl sm:text-2xl font-bold tabular-nums tracking-tight",
        verde === true && "text-pa-verde",
        verde === false && "text-pa-rosso",
      )}
    >
      <Spiegato spiega={spiega}>{euro(valore, 0)}</Spiegato>
    </div>
    {sotto && <div className="text-xs text-muted-foreground">{sotto}</div>}
    {verso && (
      // 23/11/2026: a button, not <a href="#...">: the dashboard routes on the hash, so "#blocco-uscito" opened
      // a page that does not exist ("pagina non trovata"). Scroll to the panel instead.
      <button
        type="button"
        onClick={() =>
          document
            .getElementById(verso)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="mt-auto self-start text-sm font-medium text-pa-blu hover:underline"
      >
        Apri le voci ›
      </button>
    )}
  </div>
);

const Freccia = () => (
  <div
    aria-hidden
    className="-my-1 flex items-center justify-center text-lg leading-none text-pa-blu/60 lg:my-0 lg:px-1 lg:text-2xl"
  >
    <span className="lg:hidden">↓</span>
    <span className="hidden lg:inline">→</span>
  </div>
);

/** A node of the tree: name, share, amount; it opens into its children, a leaf into its payments. */
const Ramo = ({
  n,
  padre,
  livello,
  periodo,
  totaleUscito,
  profondita,
  conCassetto,
}: {
  n: Nodo;
  padre?: Nodo;
  livello: Livello;
  periodo: string;
  totaleUscito: number;
  profondita: number;
  conCassetto: boolean;
}) => {
  const [aperto, setAperto] = useState(false);
  const figli = n.figli ?? [];
  const elenco = figli.length ? undefined : elencoNodo(n, periodo);
  const apribile = figli.length > 0 || !!elenco;
  const fatture = linkFatture(n, padre, conCassetto);
  const inAttesaCassetto = attesaCassetto(n, conCassetto);
  return (
    <li className={cn("border-t", n.solo_dettaglio && "text-muted-foreground")}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
        <button
          type="button"
          disabled={!apribile}
          aria-expanded={apribile ? aperto : undefined}
          onClick={() => setAperto(!aperto)}
          className={cn(
            "min-h-10 min-w-0 basis-full text-left sm:min-h-0 sm:basis-0 sm:flex-1",
            apribile ? "cursor-pointer hover:text-pa-blu" : "cursor-default",
            profondita === 0 && "font-semibold",
          )}
        >
          <span
            aria-hidden
            className="mr-1.5 inline-block w-3 text-muted-foreground"
          >
            {apribile ? (aperto ? "▾" : "▸") : ""}
          </span>
          {n.nome}
        </button>
        {fatture && (
          <Link
            to={fatture}
            className="ml-auto text-xs font-medium text-pa-blu no-underline hover:underline sm:ml-0"
          >
            Fatture ›
          </Link>
        )}
        {inAttesaCassetto && (
          <span className="ml-auto text-xs text-muted-foreground sm:ml-0">
            fatture col cassetto fiscale
          </span>
        )}
        {livello === "uscito" && n.perc != null && (
          <span
            className={cn(
              "w-14 text-right text-sm tabular-nums text-muted-foreground sm:ml-0",
              !fatture && "ml-auto",
            )}
          >
            <Spiegato spiega={spiegaPerc(n, totaleUscito)}>
              {perc(n.perc)}
            </Spiegato>
          </span>
        )}
        <span
          className={cn(
            "w-28 text-right tabular-nums",
            !fatture && !(livello === "uscito" && n.perc != null) && "ml-auto",
            "sm:ml-0",
          )}
        >
          <Spiegato spiega={spiegaNodo(n, livello, periodo)}>
            {euro(n.importo)}
          </Spiegato>
        </span>
      </div>
      {aperto && figli.length > 0 && (
        <ul className="pl-3 sm:pl-5">
          {figli.map((f) => (
            <Ramo
              key={f.nome}
              n={f}
              padre={n}
              livello={livello}
              periodo={periodo}
              totaleUscito={totaleUscito}
              profondita={profondita + 1}
              conCassetto={conCassetto}
            />
          ))}
        </ul>
      )}
      {aperto && elenco && (
        <div className="pb-3 pl-3 sm:pl-5">
          <ElencoCompleto elenco={elenco} />
        </div>
      )}
    </li>
  );
};

const Pannello = ({
  a,
  livello,
  periodo,
  conCassetto,
}: {
  a: AlberoUtile;
  livello: Livello;
  periodo: string;
  conCassetto: boolean;
}) => {
  const n = a[livello];
  return (
    <section
      id={`blocco-${livello}`}
      className="scroll-mt-20 rounded-lg border bg-card px-3 pb-2 pt-3 sm:px-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{TITOLI[livello]}</h2>
        <span className="font-semibold tabular-nums">
          <Spiegato spiega={spiegaNodo(n, livello, periodo)}>
            {euro(n.importo)}
          </Spiegato>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Tocca una voce per aprirla, fino ai singoli pagamenti.
      </p>
      <ul className="mt-1 text-sm">
        {(n.figli ?? []).map((f) => (
          <Ramo
            key={f.nome}
            n={f}
            padre={n}
            livello={livello}
            periodo={periodo}
            totaleUscito={a.uscito.importo}
            profondita={0}
            conCassetto={conCassetto}
          />
        ))}
      </ul>
    </section>
  );
};

/** Info of the model: the movements of the premium account with their dropdown (key of the movement). */
const useInfoModello = () =>
  useQuery({
    queryKey: ["andamento", "modello", "info"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("valori")
        .eq("tipo", "modello")
        .eq("mese", "info")
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.valori ?? null) as InfoModello | null;
    },
  });

/** The three payments from the premium account with a cost proposal: shown "in attesa", confirmed only in the dropdown. */
const InAttesa222 = ({
  righe,
  totali,
}: {
  righe: InAttesa[];
  totali?: { cambia_utile: number; cambia_dove: number };
}) => {
  const info = useInfoModello();
  const totale = righe.reduce((s, r) => s + r.importo, 0);
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40 sm:p-4">
      <h2 className="text-base font-semibold">
        In attesa di conferma: non sono nei conti
      </h2>
      <p className="mt-1 text-muted-foreground">
        Pagamenti partiti dal conto premi con una proposta di voce. Entrano nei
        conti solo quando qualcuno sceglie la voce nella tendina e la salva; il
        giro del mattino dopo li mette nell'utile.
      </p>
      <ul className="mt-2">
        {righe.map((r) => {
          const spesa = info.data?.spese_222.find((s) => s.chi === r.chi);
          const movimenti = (spesa?.movimenti ?? []).filter(
            (m) => r.date.includes(m.data) && !m.voce,
          );
          return (
            <li key={`${r.chi}-${r.date.join()}`} className="border-t py-2">
              <div className="flex flex-wrap justify-between gap-x-3">
                <span className="font-medium">
                  {r.chi}, {r.date.map((d) => dataIt(d)).join(", ")}
                </span>
                <span className="tabular-nums">
                  <Spiegato
                    spiega={{
                      titolo: `${r.chi}, in attesa`,
                      cosa: `${r.nota ?? "uscita dal conto premi"}. Proposta: ${r.proposta ?? "nessuna"}.`,
                      calcolo: [
                        { voce: "Uscita dal conto premi", valore: r.importo },
                      ],
                      fonte: "estratto conto del conto premi (Asti 222)",
                    }}
                  >
                    {euro(r.importo)}
                  </Spiegato>
                </span>
              </div>
              <div className="text-muted-foreground">
                Proposta: {r.proposta ?? "nessuna"}
              </div>
              {info.data &&
                movimenti.map(
                  (m) =>
                    m.chiave && (
                      <Tendina
                        key={m.chiave}
                        chiave={m.chiave}
                        voci={info.data?.voci_tendina ?? []}
                        applicate={info.data?.correzioni_applicate ?? []}
                        proposta={spesa?.proposta ?? ""}
                      />
                    ),
                )}
            </li>
          );
        })}
      </ul>
      <div className="mt-1 flex justify-between border-t pt-2 font-semibold tabular-nums">
        <span>Totale in attesa</span>
        <Spiegato
          spiega={{
            titolo: "Totale in attesa di conferma",
            cosa: "Somma dei pagamenti dal conto premi non ancora confermati: oggi non sono nell'utile.",
            calcolo: [
              ...righe.map((r, i) => ({
                voce: r.chi,
                valore: r.importo,
                segno: i ? ("+" as const) : undefined,
              })),
              { voce: "Totale", valore: totale, segno: "=" as const },
            ],
            fonte: "estratto conto del conto premi (Asti 222)",
          }}
        >
          {euro(totale)}
        </Spiegato>
      </div>
      {totali && (
        <div className="mt-1 text-muted-foreground tabular-nums">
          Se confermati: {euro(totali.cambia_utile)} cambierebbero l'utile,{" "}
          {euro(totali.cambia_dove)} solo dove è finito (prelievi dei soci).
        </div>
      )}
    </section>
  );
};

export const UtileBlocchi = () => {
  const [parametri, setParametri] = useSearchParams();
  const periodi = usePeriodiUtile();
  const scelto = parametri.get("periodo") ?? periodi.data?.[0];
  const albero = useAlberoUtile(scelto);
  const fiscale = useBloccoFiscale();
  const cassetto = useBlocchi<unknown, { n_fatture?: number }>("fatture");
  const conCassetto = (cassetto.data?.info?.n_fatture ?? 0) > 0;

  if (periodi.isPending || (albero.isPending && !!scelto))
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (periodi.error) return <ErroreCaricamento errore={periodi.error} />;
  if (albero.error) return <ErroreCaricamento errore={albero.error} />;
  if (scelto && !(periodi.data ?? []).includes(scelto))
    return (
      <div className="p-4 text-muted-foreground">
        Periodo non trovato.{" "}
        <Link to="/utile-costi" className="text-pa-blu underline">
          Apri l'ultimo periodo
        </Link>
      </div>
    );
  const a = albero.data;
  if (!scelto || !a)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato: il giro del mattino non ha ancora scritto l'utile a
        blocchi.
      </div>
    );

  const daGennaio = /^\d{4}$/.test(scelto);
  const periodo = nomePeriodo(scelto, a.mesi);
  // ARAG commissions belong to no month: only the "da gennaio" line adds them (same as the Tasse page)
  const f = fiscale.data as unknown as FiscaleCruscotto | null | undefined;
  // the fiscal block is of the current year: in January the "da gennaio" of the year before gets no ARAG of the new year
  const stessoAnno = !!f && (f.al ?? "").slice(0, 4) === scelto;
  const arag =
    daGennaio && stessoAnno ? (f?.proiezione_passi?.ricavi.arag ?? 0) : 0;
  const fiscaleNonPronto = daGennaio && (fiscale.isPending || !!fiscale.error);
  const parziale = notaParziale(scelto, a, new Date());
  const primi = figliSomma(a.uscito).slice(0, 3);

  return (
    <Pagina
      titolo="Utile e costi"
      sotto="Entrato, uscito, utile e dove è finito. Passa sopra (o tocca) un numero per il calcolo, clic per l'elenco completo."
    >
      <label className="flex items-center gap-2 text-sm">
        Periodo
        <select
          className="rounded border bg-background px-2 py-1"
          value={scelto}
          onChange={(e) => setParametri({ periodo: e.target.value })}
        >
          {(periodi.data ?? []).map((p) => (
            <option key={p} value={p}>
              {/^\d{4}$/.test(p)
                ? `Da gennaio ${p} (mesi completi)`
                : nomePeriodo(p)}
            </option>
          ))}
        </select>
      </label>
      {parziale && (
        <p className="text-sm text-muted-foreground -mt-2">{parziale}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-2">
        <Blocco
          titolo="Entrato"
          valore={a.entrato.importo}
          spiega={spiegaNodo(a.entrato, "entrato", periodo)}
          sotto={periodo}
          verso="blocco-entrato"
        />
        <Freccia />
        <Blocco
          titolo="Uscito"
          valore={a.uscito.importo}
          spiega={spiegaNodo(a.uscito, "uscito", periodo)}
          sotto={`le voci più grandi: ${primi.map((f) => f.nome.split(" (")[0]).join(", ")}`}
          verso="blocco-uscito"
        />
        <Freccia />
        <Blocco
          titolo="Utile"
          valore={a.utile}
          spiega={spiegaUtile(a, periodo)}
          sotto="entrato meno uscito, IVA compresa"
          verde={a.utile >= 0}
        />
        <Freccia />
        <Blocco
          titolo="Dove è finito"
          valore={a.dove_finito.importo}
          spiega={spiegaNodo(a.dove_finito, "dove_finito", periodo)}
          sotto="prelievi dei soci, mutui, resta sui conti"
          verso="blocco-dove_finito"
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border bg-card px-3 py-2.5 text-sm tabular-nums">
        <span className="text-muted-foreground">Verso le tasse:</span>
        <span>
          utile{" "}
          <Spiegato spiega={spiegaUtile(a, periodo)}>{euro(a.utile)}</Spiegato>
        </span>
        <span>
          +{" "}
          <Spiegato spiega={spiegaNonDeducibili(a, periodo)}>
            {euro(a.al_fisco.importo)}
          </Spiegato>{" "}
          costi non deducibili
        </span>
        {arag !== 0 && (
          <span>
            +{" "}
            <Spiegato
              spiega={{
                titolo: "Provvigioni ARAG",
                cosa: "Provvigioni di ARAG: arrivano una volta e non stanno in nessun mese, per questo si aggiungono solo nel totale da gennaio (come nella pagina Tasse).",
                calcolo: [
                  { voce: "Provvigioni ARAG", valore: arag, segno: "=" },
                ],
                fonte:
                  "comunicazione di ARAG, partite inserite a mano nel giro",
              }}
            >
              {euro(arag)}
            </Spiegato>{" "}
            ARAG
          </span>
        )}
        {fiscaleNonPronto ? (
          <span className="text-muted-foreground">
            {fiscale.error
              ? "= utile fiscale non disponibile: il blocco fiscale non si è caricato"
              : "= utile fiscale: carico..."}
          </span>
        ) : (
          <span className="font-semibold">
            ={" "}
            <Spiegato spiega={spiegaVersoFisco(a, periodo, arag)}>
              {euro(utileFiscale(a, arag))}
            </Spiegato>{" "}
            utile fiscale
          </span>
        )}
        <Link
          to="/tasse/utile-fiscale"
          className="font-medium text-pa-blu no-underline hover:underline"
        >
          Tasse ›
        </Link>
      </div>

      {!a.controllo.chiude && (
        <p className="rounded border border-pa-rosso bg-pa-rosso-chiaro px-3 py-2 text-sm">
          Attenzione: i blocchi non tornano al centesimo (
          {a.controllo.errori.slice(0, 2).join("; ")}).
        </p>
      )}

      {a.in_attesa_222 && a.in_attesa_222.length > 0 && (
        <InAttesa222 righe={a.in_attesa_222} totali={a.in_attesa_totali} />
      )}

      {(["entrato", "uscito", "dove_finito"] as const).map((l) => (
        <Pannello
          key={l}
          a={a}
          livello={l}
          periodo={periodo}
          conCassetto={conCassetto}
        />
      ))}

      <Sezione
        id="utile-costi.calcoli"
        titolo="I calcoli di oggi"
        riassunto="mese virtuoso, ponte dalla banca, voci, commercialista, estratti"
      >
        <AndamentoPage dentro />
      </Sezione>
    </Pagina>
  );
};

export default UtileBlocchi;
