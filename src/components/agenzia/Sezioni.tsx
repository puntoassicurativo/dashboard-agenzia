/**
 * Sezioni a lato della dashboard di agenzia (capitolo 4 del piano).
 * Righe in `sezione_righe` (fatto e nota modificabili), riepiloghi in `sezione_info`,
 * scritti dall'agente agenti\cruscotto_agenzia (sezioni.py).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { DecadeH } from "./DecadeH";

type Meta = {
  titolo: string;
  breve: string;
  descrizione: string;
  frequenza: string;
  titoloRiga?: string;
  inArrivo?: string;
};

export const SEZIONI: Record<string, Meta> = {
  A: {
    titolo: "Polizze vincolate non pagate",
    breve: "Titoli non pagati su polizze con vincolo a banca o finanziaria",
    descrizione:
      "Passata la mora la copertura cade e la banca vincolataria puo' contestarlo all'agenzia. Fonte NA701, telefono da NA010.",
    frequenza: "ogni lunedi'",
    titoloRiga: "Cliente",
  },
  B: {
    titolo: "Ex clienti da riprendere",
    breve: "Passati a un'altra compagnia, polizza nuova in scadenza",
    descrizione:
      "Clienti che hanno lasciato l'agenzia con lo stesso codice fiscale e hanno la polizza nuova in scadenza nei prossimi 30 giorni. Solo chi ha dato il consenso marketing. Fonte FC001 e NA082.",
    frequenza: "ogni lunedi'",
    titoloRiga: "Cliente",
  },
  C: {
    titolo: "Auto sospese",
    breve: "Ordinate per mesi di sospensione, da chiamare prima della riattivazione",
    descrizione:
      "NA009 non riporta la data di fine sospensione: le auto sono ordinate per mesi di sospensione. Le condizioni auto (art. 2.8) dicono al massimo 10 mesi per annualita', poi la copertura si riattiva da sola. Fonte NA009, telefono da NA009 o NA010.",
    frequenza: "ogni lunedi'",
    titoloRiga: "Cliente",
  },
  D: {
    titolo: "Recupero franchigie",
    breve: "Pratiche di recupero in carico all'agenzia o a Intrum",
    descrizione:
      "Franchigie anticipate dalla compagnia che l'agenzia o la societa' di recupero devono ancora incassare. Fonte SI021.",
    frequenza: "ogni mese, dal 5",
    titoloRiga: "Contraente",
  },
  E: {
    titolo: "Quietanzamento evoluto",
    breve: "Proposte di Vittoria sui rinnovi del mese e del mese dopo",
    descrizione:
      "Garanzie in piu' al rinnovo gia' preparate dalla compagnia, da proporre prima della scadenza. Fonte NA124.",
    frequenza: "ogni mese, dal 5",
    titoloRiga: "Cliente",
  },
  F: {
    titolo: "Sinistri su premi",
    breve: "S/P per ramo, punto vendita e produttore",
    descrizione:
      "Sinistri plafonati su premi di competenza da inizio anno, con l'anno prima. Fonte SP001, gli stessi numeri della mail di Maccagno.",
    frequenza: "ogni mese, dal 5",
  },
  G: {
    titolo: "Controlli documentali",
    breve: "Firme su carta, libretti, dati ANIA, forzature",
    descrizione:
      "Contratti degli ultimi 30 giorni a cui manca qualcosa sui documenti, con dati ANIA cambiati o mancanti, o con forzature di premio. Fonti AS003, AS002, AU001.",
    frequenza: "ogni lunedi'",
    titoloRiga: "Cliente",
  },
  H: {
    titolo: "Controllo decade",
    breve: "Provvigioni della decade ricalcolate al centesimo",
    descrizione:
      "File della decade scaricati da Newage, ricalcolati e confrontati col riepilogo, titolo per titolo con BO (NA013, NA016) e con l'aliquota attesa.",
    frequenza: "a ogni decade nuova",
    titoloRiga: "Contraente",
  },
};

type Info = { sezione: string; aggiornato_il: string; riepilogo: any };
type Riga = {
  sezione: string;
  chiave: string;
  gruppo: string | null;
  ordine: number | null;
  dati: Record<string, any>;
  attiva: boolean;
  prima_vista: string;
  fatto: boolean;
  nota: string | null;
  modificato_da: string | null;
  modificato_il: string | null;
};

const sb = () => getSupabaseClient();
const dataOra = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
const numero = (v: any) =>
  typeof v === "number"
    ? v.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: "always" } as unknown as Intl.NumberFormatOptions)
    : String(v ?? "");
const CAMPI_SOLDI = /premio|recuperare|recuperato|aumento|rca|provvigione|scarto/i;
const valore = (k: string, v: any) =>
  typeof v === "number" && CAMPI_SOLDI.test(k) ? `${numero(v)} €` : numero(v);

const useInfo = () =>
  useQuery({
    queryKey: ["sezione_info"],
    queryFn: async () => {
      const { data, error } = await sb().from("sezione_info").select("*");
      if (error) throw error;
      return Object.fromEntries((data as Info[]).map((i) => [i.sezione, i])) as Record<string, Info>;
    },
  });

/** Pagina elenco delle sezioni. */
export const SezioniPage = () => {
  const { data: info } = useInfo();
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full px-4 pt-2 pb-28 md:px-0 md:pt-0 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold">Sezioni</h1>
        <p className="text-sm text-muted-foreground">
          Liste aggiornate in automatico da BusinessObjects. Per ora le vedete solo tu, Fabio e Claudio: quali
          tenere e a chi mandarle lo decide Fabio.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(SEZIONI).map(([k, m]) => {
          const i = info?.[k];
          const tot = i?.riepilogo?.totale;
          const contenuto = (
            <div
              className={`rounded-lg border bg-card p-4 h-full flex flex-col gap-1 ${m.inArrivo ? "opacity-60" : "hover:border-foreground/40"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground">Sezione {k}</span>
                {tot != null && !m.inArrivo && (
                  <span className="text-sm tabular-nums">{k === "F" ? "" : `${tot} righe`}</span>
                )}
              </div>
              <div className="font-semibold">{m.titolo}</div>
              <div className="text-sm text-muted-foreground">{m.breve}</div>
              <div className="text-xs text-muted-foreground mt-auto pt-2">
                {m.inArrivo ?? (i ? `Aggiornata il ${dataOra(i.aggiornato_il)}, ${m.frequenza}` : `Non ancora aggiornata, ${m.frequenza}`)}
              </div>
            </div>
          );
          return m.inArrivo ? (
            <div key={k}>{contenuto}</div>
          ) : (
            <Link key={k} to={`/sezioni/${k}`} className="no-underline text-foreground">
              {contenuto}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/** Tabelle S/P della sezione F. */
const TabelleSP = ({ r }: { r: any }) => {
  const nomi: Record<string, string> = {
    linea: "Per linea",
    ramo: "Per ramo tecnico",
    punto_vendita: "Per punto vendita",
    produttore: "Per produttore",
  };
  const per = (p: string) => (p ? `${p.slice(4, 6)}/${p.slice(0, 4)}` : "");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Da inizio anno a {per(r.periodo)}, confronto con {per(r.periodo_ap)}. {r.nota}
      </p>
      {Object.entries(nomi).map(([k, t]) => (
        <div key={k} className="rounded-lg border bg-card p-4 overflow-x-auto">
          <h2 className="font-semibold mb-2">{t}</h2>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="font-normal py-1">Nome</th>
                <th className="font-normal text-right">Premi</th>
                <th className="font-normal text-right">Sinistri</th>
                <th className="font-normal text-right">N.</th>
                <th className="font-normal text-right">S/P</th>
                <th className="font-normal text-right">Anno prima</th>
              </tr>
            </thead>
            <tbody>
              {(r.tabelle?.[k] ?? []).map((x: any) => (
                <tr key={x.nome} className={`border-t ${x.nome === "TOTALE" ? "font-semibold" : ""}`}>
                  <td className="py-1 pr-2">{x.nome}</td>
                  <td className="text-right">{numero(Math.round(x.premi))} €</td>
                  <td className="text-right">{numero(Math.round(x.sinistri))} €</td>
                  <td className="text-right">{x.n_sinistri}</td>
                  <td className={`text-right ${x.sp != null && x.sp > 65 ? "text-red-700 dark:text-red-400" : ""}`}>
                    {x.sp != null ? `${numero(x.sp)}%` : "n.d."}
                    {x.sp != null && x.sp > 65 ? " ⚠" : ""}
                  </td>
                  <td className="text-right text-muted-foreground">{x.sp_ap != null ? `${numero(x.sp_ap)}%` : "n.d."}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">⚠ = S/P sopra il 65%.</p>
    </div>
  );
};

const Scheda = ({ r, campoTitolo }: { r: Riga; campoTitolo: string }) => {
  const qc = useQueryClient();
  const [nota, setNota] = useState(r.nota ?? "");
  const salva = useMutation({
    mutationFn: async (campi: { fatto?: boolean; nota?: string }) => {
      const { error } = await sb().from("sezione_righe").update(campi).eq("sezione", r.sezione).eq("chiave", r.chiave);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sezione_righe", r.sezione] }),
  });
  const { telefono, whatsapp, _campi, ...resto } = r.dati;
  const titolo = resto[campoTitolo] ?? r.chiave;
  // l'ordine dei campi lo da' l'agente in _campi (jsonb non lo conserva)
  const ordine: string[] = Array.isArray(_campi) ? _campi : Object.keys(resto);
  const campi = ordine
    .filter((k) => k in resto)
    .map((k) => [k, resto[k]] as [string, any])
    .filter(([k, v]) => k !== campoTitolo && v !== "" && v != null);
  return (
    <div className={`rounded-lg border bg-card p-4 flex flex-col gap-2 ${r.fatto ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{titolo}</div>
          <div className="text-xs text-muted-foreground">
            {r.gruppo}
            {!r.attiva && " · non piu' in BO"}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer">
          <input
            type="checkbox"
            className="size-5"
            checked={r.fatto}
            onChange={(e) => salva.mutate({ fatto: e.target.checked })}
          />
          Fatto
        </label>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {campi.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular-nums break-words min-w-0">{valore(k, v)}</dd>
          </div>
        ))}
      </dl>
      {(telefono || whatsapp) && (
        <div className="flex flex-wrap gap-2">
          {telefono && (
            <a className="rounded-md border px-3 py-1.5 text-sm no-underline text-foreground" href={`tel:+${telefono}`}>
              Chiama +{telefono}
            </a>
          )}
          {whatsapp && (
            <a
              className="rounded-md bg-green-700 text-white px-3 py-1.5 text-sm no-underline"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Apri WhatsApp
            </a>
          )}
        </div>
      )}
      <textarea
        className="w-full rounded-md border bg-background p-2 text-sm"
        rows={1}
        placeholder="Nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (r.nota ?? "") && salva.mutate({ nota })}
      />
      {r.modificato_da && (
        <div className="text-xs text-muted-foreground">
          Ultima modifica {r.modificato_da}, {dataOra(r.modificato_il)}
        </div>
      )}
      {salva.isError && <div className="text-xs text-red-700">Non salvato: {String((salva.error as any)?.message)}</div>}
    </div>
  );
};

/** Pagina di una sezione. */
export const SezionePage = () => {
  const { lettera = "" } = useParams();
  const s = lettera.toUpperCase();
  const meta = SEZIONI[s];
  const { data: info, isPending: infoInCarico } = useInfo();
  const [filtro, setFiltro] = useState<"da_fare" | "fatti" | "tutti" | "spente">("da_fare");
  const [gruppo, setGruppo] = useState<string>("");
  const [cerca, setCerca] = useState("");
  const { data: righe, isPending, error } = useQuery({
    queryKey: ["sezione_righe", s],
    enabled: !!meta && s !== "F" && !meta.inArrivo,
    queryFn: async () => {
      const { data, error } = await sb()
        .from("sezione_righe")
        .select("*")
        .eq("sezione", s)
        .order("ordine", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as Riga[];
    },
  });
  const gruppi = useMemo(() => {
    const c: Record<string, number> = {};
    (righe ?? []).filter((r) => r.attiva && !r.fatto).forEach((r) => (c[r.gruppo ?? ""] = (c[r.gruppo ?? ""] ?? 0) + 1));
    return c;
  }, [righe]);
  const visibili = (righe ?? []).filter((r) => {
    if (filtro === "da_fare" && (!r.attiva || r.fatto)) return false;
    if (filtro === "fatti" && !r.fatto) return false;
    if (filtro === "spente" && r.attiva) return false;
    if (gruppo && r.gruppo !== gruppo) return false;
    if (cerca && !JSON.stringify(r.dati).toLowerCase().includes(cerca.toLowerCase())) return false;
    return true;
  });

  if (!meta) return <div className="p-4">Sezione non trovata.</div>;
  const i = info?.[s];
  const riepilogo = i?.riepilogo ?? {};
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full px-4 pt-2 pb-28 md:px-0 md:pt-0 md:pb-8">
      <div>
        <Link to="/sezioni" className="text-sm text-muted-foreground">
          ← Sezioni
        </Link>
        <h1 className="text-xl font-semibold">
          {s}. {meta.titolo}
        </h1>
        <p className="text-sm text-muted-foreground">{meta.descrizione}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {i ? `Aggiornata il ${dataOra(i.aggiornato_il)}` : infoInCarico ? "..." : "Non ancora aggiornata"}, {meta.frequenza}.
        </p>
      </div>

      {meta.inArrivo && <div className="rounded-lg border bg-card p-4 text-sm">{meta.inArrivo}.</div>}
      {s === "F" &&
        (i ? (
          <TabelleSP r={riepilogo} />
        ) : (
          <div className="text-sm text-muted-foreground">{infoInCarico ? "Carico..." : "Nessun dato ancora."}</div>
        ))}

      {s !== "F" && !meta.inArrivo && (
        <>
          {s === "H" ? <DecadeH r={riepilogo} /> : <Riepilogo s={s} r={riepilogo} />}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["da_fare", "Da fare"],
                ["fatti", "Fatti"],
                ["tutti", "Tutti"],
                ["spente", "Non piu' in BO"],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                className={`rounded-full border px-3 py-1 text-sm ${filtro === k ? "bg-foreground text-background" : ""}`}
              >
                {t}
              </button>
            ))}
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={gruppo}
              onChange={(e) => setGruppo(e.target.value)}
            >
              <option value="">Tutti i gruppi</option>
              {Object.entries(gruppi).map(([g, n]) => (
                <option key={g} value={g}>
                  {g} ({n})
                </option>
              ))}
            </select>
            <input
              className="rounded-md border bg-background px-2 py-1 text-sm flex-1 min-w-40"
              placeholder="Cerca nome, polizza, targa"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
            />
          </div>
          {isPending && <div className="text-sm text-muted-foreground">Carico...</div>}
          {error && <ErroreCaricamento cosa="la sezione" errore={error} />}
          {!isPending && visibili.length === 0 && (
            <div className="text-sm text-muted-foreground">Niente da mostrare con questi filtri.</div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibili.map((r) => (
              <Scheda key={r.chiave} r={r} campoTitolo={meta.titoloRiga ?? "Cliente"} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Riepilogo = ({ s, r }: { s: string; r: any }) => {
  const voci: [string, any][] = [];
  if (s === "A") voci.push(["Titoli", r.totale], ["Premio", r.premio != null ? `${numero(r.premio)} €` : null]);
  if (s === "B")
    (Array.isArray(r.conteggi) ? r.conteggi : Object.entries(r.conteggi ?? {})).forEach(([k, v]: [string, any]) =>
      voci.push([k, v]),
    );
  if (s === "C") Object.entries(r.per_gruppo ?? {}).forEach(([k, v]) => voci.push([k, v]));
  if (s === "D") voci.push(["Pratiche aperte", r.totale], ["Da recuperare", r.da_recuperare != null ? `${numero(r.da_recuperare)} €` : null]);
  if (s === "E")
    voci.push(...(Object.entries(r.per_stato ?? {}) as [string, any][]), [
      "Aumento in attesa",
      r.aumento_in_attesa != null ? `${numero(r.aumento_in_attesa)} €` : null,
    ]);
  if (s === "G") {
    Object.entries(r.per_tipo ?? {}).forEach(([k, v]) => voci.push([k, v]));
  }
  const vis = voci.filter(([, v]) => v != null);
  if (!vis.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {vis.map(([k, v]) => (
        <div key={k} className="rounded-md border bg-card px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">{k}</span> <span className="font-semibold tabular-nums">{v}</span>
        </div>
      ))}
      {s === "G" && r.dal && (
        <div className="text-xs text-muted-foreground self-center">
          dal {r.dal} al {r.al}
        </div>
      )}
    </div>
  );
};
