/**
 * "Carica file" (partners only, simplification plan of 21/11/2026, P4, 23/11/2026): decade files, bank statements,
 * invoices and documents go into a private space of the dashboard; the morning run brings them into the input folders on
 * Lorenzo's PC. Next to it "cosa serve ancora": the files still missing (deadlines of the agent) and what to ask the
 * accountant, each with its upload button.
 */
import { useRef, useState } from "react";
import { useSearchParams } from "react-router";

import {
  type Caricamento,
  MAX_BYTE,
  TIPI_FILE,
  type TipoFile,
  useCaricamenti,
  useCarica,
  useTogli,
} from "./caricamentiDati";
import { useBlocchi, useRighe } from "./datiLati";
import type { DomandaStudio } from "./DomandeStudio";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, mesiInLettere, nomeMese } from "./formato";
import { Pagina } from "./Lato";

interface Scadenza {
  cosa: string;
  scadenza: string;
  stato: string;
  dettaglio: string;
}

export interface Serve {
  chiave: string;
  cosa: string;
  quando: string;
  stato: string;
  tipo: TipoFile;
  sotto: string;
}

const meseDi = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The deadline rows that need a file, with the type and folder of the upload. */
export const daScadenza = (s: Scadenza, chiave: string): Serve | null => {
  const base = {
    chiave,
    cosa: s.cosa,
    quando: s.scadenza,
    stato: s.stato,
  };
  const dec = s.cosa.match(/^File della decade del (\d{2})\/(\d{2})/);
  if (dec) {
    let anno = Number(s.scadenza.slice(0, 4));
    let mese = Number(s.scadenza.slice(5, 7));
    if (Number(dec[2]) !== mese) {
      if (mese === 1) {
        anno -= 1;
        mese = 12;
      } else mese -= 1;
    }
    return {
      ...base,
      tipo: "decade",
      sotto: `${anno}-${String(mese).padStart(2, "0")}-${dec[1]}`,
    };
  }
  const mese = s.cosa.match(/(\d{4}-\d{2})/)?.[1];
  if (/^Estratti conto di .* da scaricare/i.test(s.cosa))
    return {
      ...base,
      tipo: "banca",
      sotto: /desio/i.test(s.cosa) ? "desio" : "asti",
    };
  if (/^Fatture di /i.test(s.cosa) && mese)
    return { ...base, tipo: "fatture", sotto: mese };
  if (/^(Estratti conto broker|Cedolini) di /i.test(s.cosa) && mese)
    return { ...base, tipo: "documenti", sotto: mese };
  return null;
};

const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const MESE = /^\d{4}-(0[1-9]|1[0-2])$/;
const giornoVero = (d: string): boolean =>
  GIORNO.test(d) &&
  !Number.isNaN(new Date(`${d}T12:00:00`).getTime()) &&
  new Date(`${d}T12:00:00`).toISOString().slice(0, 10) === d;

/** Type and folder from a link (bell, Cosa serve ancora): a date that does not fit the type is ignored (review R066). */
export const statoDaIndirizzo = (
  tipoUrl: string | null,
  data: string | null,
  oggi: Date,
): { tipo: TipoFile; sotto: string } => {
  const tipo: TipoFile =
    tipoUrl && (TIPI as string[]).includes(tipoUrl)
      ? (tipoUrl as TipoFile)
      : "decade";
  if (tipo === "decade")
    return { tipo, sotto: data && giornoVero(data) ? data : "" };
  if (tipo === "banca")
    return { tipo, sotto: data === "desio" ? "desio" : "asti" };
  return { tipo, sotto: data && MESE.test(data) ? data : meseDi(oggi) };
};

const Modulo = ({
  tipo,
  setTipo,
  sotto,
  setSotto,
}: {
  tipo: TipoFile;
  setTipo: (t: TipoFile) => void;
  sotto: string;
  setSotto: (s: string) => void;
}) => {
  const carica = useCarica();
  const file = useRef<HTMLInputElement>(null);
  const [esito, setEsito] = useState<string[]>([]);
  const [scelti, setScelti] = useState<string[]>([]);
  const invia = async () => {
    const lista = Array.from(file.current?.files ?? []);
    if (!lista.length) {
      setEsito(["Scegli prima uno o più file."]);
      return;
    }
    const righe: string[] = [];
    for (const f of lista) {
      try {
        await carica.mutateAsync({ tipo, sotto, file: f });
        righe.push(`${f.name}: caricato`);
      } catch (e: unknown) {
        righe.push(e instanceof Error ? e.message : String(e));
      }
    }
    setEsito(righe);
    setScelti([]);
    if (file.current) file.current.value = "";
  };
  return (
    <section
      id="carica"
      className="scroll-mt-20 rounded-lg border bg-card p-3 text-sm sm:p-4"
    >
      <h2 className="text-base font-semibold">Carica</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          Che cosa
          <select
            className="rounded border bg-background px-2 py-1.5"
            value={tipo}
            onChange={(e) => {
              const t = e.target.value as TipoFile;
              setTipo(t);
              setSotto(
                t === "banca"
                  ? "asti"
                  : t === "decade"
                    ? ""
                    : meseDi(new Date()),
              );
            }}
          >
            {(Object.keys(TIPI_FILE) as TipoFile[]).map((t) => (
              <option key={t} value={t}>
                {TIPI_FILE[t].nome}
              </option>
            ))}
          </select>
        </label>
        {tipo === "decade" && (
          <label className="flex flex-col gap-1">
            Data di chiusura della decade
            <input
              type="date"
              className="rounded border bg-background px-2 py-1.5"
              value={sotto}
              onChange={(e) => setSotto(e.target.value)}
            />
          </label>
        )}
        {tipo === "banca" && (
          <label className="flex flex-col gap-1">
            Banca
            <select
              className="rounded border bg-background px-2 py-1.5"
              value={sotto}
              onChange={(e) => setSotto(e.target.value)}
            >
              <option value="asti">Banca di Asti</option>
              <option value="desio">Banco Desio</option>
            </select>
          </label>
        )}
        {(tipo === "fatture" || tipo === "documenti") && (
          <label className="flex flex-col gap-1">
            Mese
            <input
              type="month"
              className="rounded border bg-background px-2 py-1.5"
              value={sotto}
              onChange={(e) => setSotto(e.target.value)}
            />
          </label>
        )}
        <div className="flex flex-col gap-1 sm:col-span-2">
          File (anche piu' di uno, al massimo {MAX_BYTE / 1024 / 1024} MB
          ciascuno)
          {/* the browser's own button speaks the browser's language: a label of ours, in Italian, opens it */}
          <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded border bg-background px-2 py-1.5">
            <span className="rounded border border-pa-blu/40 px-2 py-0.5 font-medium text-pa-blu">
              Scegli i file
            </span>
            <span className="min-w-0 truncate text-muted-foreground">
              {scelti.length ? scelti.join(", ") : "nessun file scelto"}
            </span>
            <input
              ref={file}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) =>
                setScelti(Array.from(e.target.files ?? []).map((f) => f.name))
              }
            />
          </label>
        </div>
      </div>
      <button
        type="button"
        disabled={carica.isPending || !sotto}
        onClick={invia}
        className="mt-3 rounded-md bg-pa-blu px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {carica.isPending ? "Carico..." : "Carica"}
      </button>
      {!sotto && tipo === "decade" && (
        <span className="ml-3 text-muted-foreground">
          scegli la data della decade
        </span>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Il giro del mattino li porta sul PC di Lorenzo, nella cartella giusta.
        Restano privati: li vedono solo i soci.
      </p>
      {esito.length > 0 && (
        <ul className="mt-2 rounded border bg-muted/40 p-2">
          {esito.map((r, i) => (
            <li key={`${i}-${r}`}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

const descrivi = (c: Caricamento): string =>
  c.tipo === "decade"
    ? `decade del ${dataIt(c.sotto)}`
    : c.tipo === "banca"
      ? c.sotto === "desio"
        ? "Banco Desio"
        : "Banca di Asti"
      : `${TIPI_FILE[c.tipo].nome.split(" (")[0].toLowerCase()}, ${nomeMese(c.sotto)}`;

const Caricati = ({
  lista,
  carico,
}: {
  lista: Caricamento[];
  carico: boolean;
}) => {
  const togli = useTogli();
  const attesa = lista.filter((c) => !c.scaricato);
  const fatti = lista.filter((c) => c.scaricato).slice(0, 15);
  return (
    <section className="rounded-lg border bg-card p-3 text-sm sm:p-4">
      <h2 className="text-base font-semibold">
        In attesa del giro del mattino ({attesa.length})
      </h2>
      {carico && <p className="text-muted-foreground">Carico...</p>}
      {togli.error && (
        <p className="text-pa-rosso">
          Non tolto: {(togli.error as Error).message}
        </p>
      )}
      {!carico && attesa.length === 0 && (
        <p className="text-muted-foreground">Nessun file in attesa.</p>
      )}
      <ul>
        {attesa.map((c) => (
          <li
            key={c.nome}
            className="flex flex-wrap items-center justify-between gap-2 border-t py-1.5"
          >
            <span>
              {c.file}{" "}
              <span className="text-muted-foreground">({descrivi(c)})</span>
            </span>
            <button
              type="button"
              className="min-h-9 rounded border px-3 py-1 text-xs"
              disabled={togli.isPending}
              onClick={() => {
                if (
                  window.confirm(`Togliere ${c.file}? Il giro non lo porterà.`)
                )
                  togli.mutate(c.nome);
              }}
            >
              Togli
            </button>
          </li>
        ))}
      </ul>
      <h3 className="mt-3 font-semibold">Già portati nelle cartelle</h3>
      {!carico && fatti.length === 0 && (
        <p className="text-muted-foreground">Ancora nessuno.</p>
      )}
      <ul>
        {fatti.map((c) => (
          <li key={c.nome} className="border-t py-1.5">
            {c.file}{" "}
            <span className="text-muted-foreground">
              ({descrivi(c)}, caricato il {dataIt(c.quando)})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const CosaServe = ({
  scegli,
  caricati,
}: {
  scegli: (t: TipoFile, s: string) => void;
  caricati: Caricamento[];
}) => {
  const sca = useRighe<Scadenza>("SCA");
  const domande = useBlocchi<unknown, { domande: DomandaStudio[] }>(
    "studio_domande",
  );
  // local date, not UTC: between midnight and 1-2 a.m. a deadline of today must not turn red (review R066)
  const d = new Date();
  const oggi = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const serve = (sca.data?.righe ?? [])
    .filter((r) => !r.fatto && !r.dati.stato.startsWith("fatto"))
    .map((r) => daScadenza(r.dati, r.chiave))
    .filter((x): x is Serve => x != null)
    .sort((a, b) => a.quando.localeCompare(b.quando));
  const inAttesa = (s: Serve) =>
    caricati.some(
      (c) => !c.scaricato && c.tipo === s.tipo && c.sotto === s.sotto,
    );
  const aperte = (domande.data?.info?.domande ?? []).filter(
    (d) => d.stato !== "risposta",
  );
  return (
    <section className="rounded-lg border bg-card p-3 text-sm sm:p-4">
      <h2 className="text-base font-semibold">Cosa serve ancora</h2>
      {sca.error && <ErroreCaricamento errore={sca.error} />}
      {serve.length === 0 && !sca.isPending && (
        <p className="text-muted-foreground">Non manca nessun file.</p>
      )}
      <ul>
        {serve.map((s) => (
          <li
            key={s.chiave}
            className="flex flex-wrap items-center justify-between gap-2 border-t py-1.5"
          >
            <span>
              {mesiInLettere(s.cosa)}{" "}
              <span
                className={
                  s.quando < oggi ? "text-pa-rosso" : "text-muted-foreground"
                }
              >
                (entro il {dataIt(s.quando)})
              </span>
            </span>
            {inAttesa(s) ? (
              <span className="text-xs text-muted-foreground">
                caricato, in attesa del giro
              </span>
            ) : (
              <button
                type="button"
                className="min-h-9 rounded-md border border-pa-blu/40 px-3 py-1.5 text-xs font-medium text-pa-blu"
                onClick={() => scegli(s.tipo, s.sotto)}
              >
                Carica
              </button>
            )}
          </li>
        ))}
      </ul>
      <h3 className="mt-3 font-semibold">
        Da chiedere al commercialista ({aperte.length})
      </h3>
      <p className="text-xs text-muted-foreground">
        Le domande nate controllando i conti. La risposta dello studio (mail o
        documento) si carica qui come documento.
      </p>
      <ul>
        {aperte.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-start justify-between gap-2 border-t py-1.5"
          >
            <span className="min-w-0 flex-1">
              <span className="font-medium">{d.tema}</span>: {d.domanda}{" "}
              <span className="text-muted-foreground">
                ({d.stato === "chiesta" ? "chiesta, in attesa" : "da chiedere"},
                nata in {d.pagina})
              </span>
            </span>
            <button
              type="button"
              className="min-h-9 rounded-md border border-pa-blu/40 px-3 py-1.5 text-xs font-medium text-pa-blu"
              onClick={() => scegli("documenti", meseDi(new Date()))}
            >
              Carica la risposta
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const TIPI = Object.keys(TIPI_FILE) as TipoFile[];

/** The address decides the form: a new link (e.g. from the bell while already here) remounts it (review R042). */
export const CaricaFile = () => {
  const [parametri] = useSearchParams();
  const tipoUrl = parametri.get("tipo");
  const data = parametri.get("data");
  return (
    <CaricaFileModulo
      key={`${tipoUrl}|${data}`}
      tipoUrl={tipoUrl}
      data={data}
    />
  );
};

const CaricaFileModulo = ({
  tipoUrl,
  data,
}: {
  tipoUrl: string | null;
  data: string | null;
}) => {
  const [iniziale] = useState(() =>
    statoDaIndirizzo(tipoUrl, data, new Date()),
  );
  const [tipo, setTipo] = useState<TipoFile>(iniziale.tipo);
  const [sotto, setSotto] = useState<string>(iniziale.sotto);
  const caricati = useCaricamenti();
  const scegli = (t: TipoFile, s: string) => {
    setTipo(t);
    setSotto(s);
    document
      .getElementById("carica")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <Pagina
      titolo="Carica file"
      sotto="Decade, estratti conto, fatture e documenti. Restano privati (solo i soci); il giro del mattino li porta sul PC di Lorenzo."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Modulo
            tipo={tipo}
            setTipo={setTipo}
            sotto={sotto}
            setSotto={setSotto}
          />
          {caricati.error ? (
            <ErroreCaricamento errore={caricati.error} />
          ) : (
            <Caricati lista={caricati.data ?? []} carico={caricati.isPending} />
          )}
        </div>
        <CosaServe scegli={scegli} caricati={caricati.data ?? []} />
      </div>
    </Pagina>
  );
};
