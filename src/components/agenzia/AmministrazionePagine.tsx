import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useAccessoUtile } from "./Andamento";
import { BrokerSaldi } from "./BrokerSaldi";
import { DaFare } from "./DaFare";
import { type RigaLato, FattoNota, TestoCopia, useRighe } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

const Aggiornato = ({ iso }: { iso?: string }) =>
  iso ? (
    <p className="text-xs text-muted-foreground">
      Aggiornato il {new Date(iso).toLocaleString("it-IT")}
    </p>
  ) : null;

const colore = (stato: string) =>
  /diverso|non arrivato|ritardo|nessuna risposta|da mandare/i.test(stato)
    ? "text-red-700"
    : /versamento in banca|fatto|ricevuta|contabile arrivat|mandate a tutti/i.test(
          stato,
        )
      ? "text-green-700"
      : "text-amber-700";

// ------------------------------------------------------------------ decadi dei subagenti

/** Public part of a decade row (sezione_righe, readable by every logged-in user). */
interface DatiDecade {
  decade: string;
  subagente: string;
  stato: string;
  mail_di_fabio: string | null;
  /** 18/11/2026: the decade mail is prepared by Lorenzo, no longer by Fabio (same value as mail_di_fabio) */
  mail_della_decade?: string | null;
  /** "Bozza pronta in fattureagenzia dal <data>" when the morning run has created the draft */
  bozza?: string | null;
  contabile: { data: string } | null;
}

/** Amounts of a decade row: andamento_blocchi "sub_decadi", readable only by partners (RLS on utile_accesso). */
interface CifreDecade {
  numeri_mail: Record<string, number> | null;
  calcolato: { provv_decade: number; incassi: number; titoli: number } | null;
  differenza: { provv_decade: number; incassi: number | null } | null;
  testo: string;
  /** transfer of the decade on the premium account 222 (16/11/2026, phase 7) */
  versamento?: {
    stato: string;
    data: string | null;
    importo: number | null;
    atteso: number | null;
    differenza?: number | null;
  } | null;
  /** computation from BusinessObjects (piano unico 18/11/2026, P4) */
  bo?: {
    voci: Record<string, number>;
    con_file: boolean;
    finestra: [string, string];
    dati_al: string;
  };
  confronto?: Record<
    string,
    { calcolato: number; mail: number; differenza: number; esito: string }
  >;
}

const NOMI_VOCI: Record<string, string> = {
  provv_decade: "provvigioni decade",
  provv_sdd: "SDD",
  provv_carta: "carta A/R",
  provv_creditech: "CREDITECH",
  provv_pos: "POS direzione",
  provv_management: "management",
  provv_integrazione: "integrazione",
  contributo_direzione: "contributo direzione",
  totale: "totale",
  ritenuta: "ritenuta",
  incassi: "incassi",
  contributo_incassi: "contributo sugli incassi",
  bonifico: "bonifico",
  contanti: "contanti",
  assegni: "assegni",
};

/** Comparison of the BO computation with the mail that was sent: how many items match, which ones do not. */
const Confronto = ({ c }: { c: NonNullable<CifreDecade["confronto"]> }) => {
  const voci = Object.entries(c);
  const diverse = voci.filter(([, v]) => v.esito === "diversa");
  const uguali = voci.length - diverse.length;
  return (
    <div className="text-muted-foreground tabular-nums">
      Calcolo da BO contro la mail: {uguali} voci su {voci.length} uguali
      {diverse.length > 0 && (
        <span className="text-red-700">
          {"; diverse: "}
          {diverse
            .map(([k, v]) => `${NOMI_VOCI[k] ?? k} ${euro(v.differenza)}`)
            .join(", ")}
        </span>
      )}
    </div>
  );
};

const useCifreDecadi = (isSocio: boolean) =>
  useQuery({
    queryKey: ["andamento", "sub_decadi"],
    enabled: isSocio,
    queryFn: async (): Promise<Record<string, CifreDecade>> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "sub_decadi");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: CifreDecade }[];
      return Object.fromEntries(righe.map((x) => [x.mese, x.valori]));
    },
  });

interface SchedaDecadeProps {
  r: RigaLato<DatiDecade>;
  cifre: CifreDecade | undefined;
}

const SchedaDecade = ({ r, cifre }: SchedaDecadeProps) => {
  const d = { ...r.dati, ...cifre };
  return (
    <div
      className={`rounded-lg border bg-card p-3 text-sm flex flex-col gap-2 ${r.fatto ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {d.subagente}, decade del {dataIt(d.decade)}
        </span>
        <span className={colore(d.stato)}>{d.stato}</span>
      </div>
      {d.calcolato && (
        <div className="text-muted-foreground tabular-nums">
          Dai file della decade: {d.calcolato.titoli} titoli, incassi{" "}
          {euro(d.calcolato.incassi)}, provvigione decade{" "}
          {euro(d.calcolato.provv_decade)}
          {d.differenza &&
            (Math.abs(d.differenza.provv_decade) < 0.01
              ? ", uguale alla mail della decade"
              : `, differenza con la mail ${euro(d.differenza.provv_decade)}`)}
        </div>
      )}
      {d.versamento?.importo != null && (
        <div
          className={`tabular-nums ${d.versamento.stato === "diverso" ? "text-red-700" : "text-muted-foreground"}`}
        >
          Versato {euro(d.versamento.importo)}
          {d.versamento.atteso != null &&
            (d.versamento.stato === "diverso"
              ? `, atteso ${euro(d.versamento.atteso)} (bonifico della mail della decade)`
              : ", uguale alla mail della decade")}
          {/* Fabio 18/11/2026: under 1 euro it is right, the difference stays visible in grey */}
          {d.versamento.stato === "versato" && d.versamento.differenza ? (
            <span className="text-muted-foreground">
              {" "}
              (differenza di {euro(d.versamento.differenza)})
            </span>
          ) : null}
        </div>
      )}
      {d.confronto && Object.keys(d.confronto).length > 0 && (
        <Confronto c={d.confronto} />
      )}
      {d.bo && !d.bo.con_file && (
        <div className="text-muted-foreground">
          Mancano i file della decade: contributo sugli incassi e integrazioni
          restano da completare.
        </div>
      )}
      {d.bozza && <div className="font-medium text-pa-verde">{d.bozza}</div>}
      {d.testo && <TestoCopia testo={d.testo} />}
      <FattoNota r={r} />
    </div>
  );
};

/** Inside Da fare: the last two months of decades in view, the older ones behind one more click. */
const DECADI_IN_VISTA = 6;

const BloccoDecade = ({
  dec,
  aperto,
  righe,
  cifre,
}: {
  dec: string;
  aperto: boolean;
  righe: RigaLato<DatiDecade>[];
  cifre: Record<string, CifreDecade> | undefined;
}) => (
  <details open={aperto} className="flex flex-col gap-2">
    <summary className="cursor-pointer select-none text-base font-semibold py-1">
      Decade del {dataIt(dec)}
    </summary>
    <div className="flex flex-col gap-2 mt-2">
      {righe
        .filter((r) => r.dati.decade === dec)
        .map((r) => (
          <SchedaDecade key={r.chiave} r={r} cifre={cifre?.[r.chiave]} />
        ))}
    </div>
  </details>
);

export const DecadiSubagenti = ({
  dentro = false,
  senzaCifre = false,
}: {
  dentro?: boolean;
  /** 23/11/2026, Da fare: only the state of each decade, no amounts even for the partners (they have them in Fatture). */
  senzaCifre?: boolean;
}) => {
  const q = useRighe<DatiDecade>("SUB");
  const accesso = useAccessoUtile();
  const cifre = useCifreDecadi(accesso.data === true && !senzaCifre);
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const decadi = [...new Set(q.data.righe.map((r) => r.dati.decade))]
    .sort()
    .reverse();
  return (
    <Pagina
      titolo="Decadi dei subagenti"
      sotto={senzaCifre ? undefined : q.data.info?.riepilogo.nota}
      dentro={dentro}
    >
      {decadi.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessuna decade ancora.
        </div>
      )}
      {(dentro ? decadi.slice(0, DECADI_IN_VISTA) : decadi).map((dec, i) => (
        <BloccoDecade
          key={dec}
          dec={dec}
          aperto={i === 0}
          righe={q.data.righe}
          cifre={senzaCifre ? undefined : cifre.data}
        />
      ))}
      {dentro && decadi.length > DECADI_IN_VISTA && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer select-none py-1 text-base font-semibold text-muted-foreground">
            Decadi piu' vecchie ({decadi.length - DECADI_IN_VISTA})
          </summary>
          {decadi.slice(DECADI_IN_VISTA).map((dec) => (
            <BloccoDecade
              key={dec}
              dec={dec}
              aperto={false}
              righe={q.data.righe}
              cifre={senzaCifre ? undefined : cifre.data}
            />
          ))}
        </details>
      )}
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};

// ------------------------------------------------------------------ estratti conto broker

interface DatiBroker {
  mese: string;
  broker: string;
  stato: string;
  estratto_mandato: string | null;
  fattura: string | null;
  contabile: string | null;
}

export const EstrattiBroker = () => {
  const q = useRighe<DatiBroker>("BRK");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = [...new Set(q.data.righe.map((r) => r.dati.mese))]
    .sort()
    .reverse();
  return (
    <Pagina titolo="Estratti conto broker" sotto={q.data.info?.riepilogo.nota}>
      <BrokerSaldi />
      {mesi.map((mese) => (
        <div key={mese} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{nomeMese(mese)}</h2>
          {q.data.righe
            .filter((r) => r.dati.mese === mese)
            .map((r) => (
              <div
                key={r.chiave}
                className={`rounded-lg border bg-card p-3 text-sm flex flex-col gap-1 ${r.fatto ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{r.dati.broker}</span>
                  <span className={colore(r.dati.stato)}>{r.dati.stato}</span>
                </div>
                <div className="text-muted-foreground">
                  Estratto{" "}
                  {r.dati.estratto_mandato
                    ? `mandato il ${dataIt(r.dati.estratto_mandato)}`
                    : "non mandato"}
                  {r.dati.fattura && `, fattura del ${dataIt(r.dati.fattura)}`}
                  {r.dati.contabile &&
                    `, contabile del ${dataIt(r.dati.contabile)}`}
                </div>
                <FattoNota r={r} />
              </div>
            ))}
        </div>
      ))}
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};

// ------------------------------------------------------------------ scadenze

interface DatiScadenza {
  scadenza: string;
  cosa: string;
  stato: string;
  dettaglio: string;
}

export const Scadenze = ({ dentro = false }: { dentro?: boolean }) => {
  const q = useRighe<DatiScadenza>("SCA");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const righe = [...q.data.righe].sort((a, b) =>
    a.dati.scadenza.localeCompare(b.dati.scadenza),
  );
  const aperte = righe.filter((r) => !r.fatto && !/fatto/.test(r.dati.stato));
  const chiuse = righe.filter((r) => r.fatto || /fatto/.test(r.dati.stato));
  // 16/11/2026: open deadlines older than a week go in a closed block, the week's ones stay in view
  const unaSettimanaFa = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const recenti = aperte.filter((r) => r.dati.scadenza >= unaSettimanaFa);
  const vecchie = aperte.filter((r) => r.dati.scadenza < unaSettimanaFa);
  const Riga = ({ r }: { r: RigaLato<DatiScadenza> }) => (
    <div className="rounded-lg border bg-card p-3 text-sm flex flex-col gap-1">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">
          {dataIt(r.dati.scadenza)} {r.dati.cosa}
        </span>
        <span className={colore(r.fatto ? "fatto" : r.dati.stato)}>
          {r.fatto ? "fatto" : r.dati.stato}
        </span>
      </div>
      <div className="text-muted-foreground">{r.dati.dettaglio}</div>
      <FattoNota r={r} />
    </div>
  );
  return (
    <Pagina
      titolo="Scadenze"
      sotto={q.data.info?.riepilogo.nota}
      dentro={dentro}
    >
      {!dentro && (
        <DaFare scadenze={righe.filter((r) => !r.fatto).map((r) => r.dati)} />
      )}
      <h2 className="text-base font-semibold">Da fare ({recenti.length})</h2>
      {recenti.map((r) => (
        <Riga key={r.chiave} r={r} />
      ))}
      {vecchie.length > 0 && (
        <details>
          <summary className="cursor-pointer select-none text-base font-semibold">
            Più vecchie ancora aperte ({vecchie.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {vecchie.map((r) => (
              <Riga key={r.chiave} r={r} />
            ))}
          </div>
        </details>
      )}
      <details>
        <summary className="cursor-pointer select-none text-base font-semibold">
          Fatte ({chiuse.length})
        </summary>
        <div className="flex flex-col gap-2 mt-2">
          {chiuse.map((r) => (
            <Riga key={r.chiave} r={r} />
          ))}
        </div>
      </details>
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};
