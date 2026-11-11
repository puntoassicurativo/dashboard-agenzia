import { Tendina } from "./Tendina";

/**
 * Andamento page parts that follow the accounting model: the bank bridge ("where did this month's
 * commissions go"), expenses paid from premium account 222 with a proposed category, the uncategorized
 * outflows and the "not yet in these numbers" box. Data: andamento_blocchi type "modello" (agent, modello.py).
 */
export type Ponte = {
  provvigioni: number;
  altre_entrate_257: number;
  broker: number;
  una_tantum_foglio: number;
  uscite_257: number;
  utile_agenzia: number;
  rimasto_257: number;
  tornato_conto_premi: number;
  girato_desio: number;
  rimasto_conto_premi: number;
};
export type Spesa222 = {
  chi: string;
  movimenti: {
    data: string;
    importo: number;
    chiave?: string;
    voce?: string | null;
  }[];
  totale: number;
  proposta: string;
  nota: string;
};
export type InfoModello = {
  dal: string;
  nota: string;
  gruppi: Record<string, string[]>;
  spese_222: Spesa222[];
  cosa_manca: string[];
  voci_tendina?: string[];
  da_classificare?: {
    chiave: string;
    giorno: string;
    importo: number;
    chi: string;
  }[];
  correzioni_applicate?: string[];
  correzioni_non_trovate?: {
    chiave: string;
    voce: string;
    quando: string | null;
  }[];
};

const euro = (v: number | null | undefined, decimali = 2) =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);
const dataIt = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT");

const Riga = ({
  nome,
  valore,
  forte,
  segno,
}: {
  nome: string;
  valore: number;
  forte?: boolean;
  segno?: "+" | "-" | "=";
}) => (
  <li
    className={`flex justify-between gap-3 border-t py-1 tabular-nums ${forte ? "font-semibold" : ""}`}
  >
    <span>
      {segno && (
        <span className="inline-block w-4 text-muted-foreground">{segno}</span>
      )}
      {nome}
    </span>
    <span className="whitespace-nowrap">{euro(valore)}</span>
  </li>
);

export const PonteBanca = ({ p, mese }: { p: Ponte; mese: string }) => (
  <div className="rounded-lg border bg-card p-4 text-sm">
    <h3 className="text-base font-semibold">
      Dove sono finite le provvigioni di {mese}
    </h3>
    <ul className="mt-2">
      <Riga nome="Provvigioni maturate (foglio Saldi)" valore={p.provvigioni} />
      {p.altre_entrate_257 !== 0 && (
        <Riga
          segno="+"
          nome="Altre entrate sul conto gestionale 257"
          valore={p.altre_entrate_257}
        />
      )}
      <Riga segno="-" nome="Provvigioni lasciate ai broker" valore={p.broker} />
      {p.una_tantum_foglio !== 0 && (
        <Riga
          segno="-"
          nome="Uscite una tantum dal conto premi"
          valore={p.una_tantum_foglio}
        />
      )}
      <Riga
        segno="-"
        nome="Uscite dell'agenzia dal conto gestionale 257"
        valore={p.uscite_257}
      />
      <Riga
        segno="="
        nome="Utile dell'agenzia"
        valore={p.utile_agenzia}
        forte
      />
    </ul>
    <div className="mt-3 text-muted-foreground">Di cui:</div>
    <ul>
      <Riga nome="rimasto sul conto gestionale 257" valore={p.rimasto_257} />
      <Riga
        nome="girato al conto gestionale di Banco Desio"
        valore={p.girato_desio}
      />
      <Riga
        nome="rimasto sul conto premi (avanzo del foglio Saldi)"
        valore={p.rimasto_conto_premi}
      />
      {p.tornato_conto_premi !== 0 && (
        <Riga
          nome="tornato dal 257 al conto premi, o scritto diverso nel foglio"
          valore={p.tornato_conto_premi}
        />
      )}
    </ul>
    <p className="mt-2 text-xs text-muted-foreground">
      Le due colonne danno sempre lo stesso totale: è il controllo che non manca
      niente fra il foglio Saldi e la banca.
    </p>
  </div>
);

export const Spese222 = ({
  spese,
  voci,
  applicate,
}: {
  spese: Spesa222[];
  voci: string[];
  applicate: string[];
}) => (
  <details className="rounded-lg border bg-card p-4 text-sm">
    <summary className="cursor-pointer select-none text-base font-semibold">
      Spese pagate dal conto premi 222{" "}
      <span className="font-normal text-muted-foreground">
        ({spese.length} sopra i 300 euro nell'anno)
      </span>
    </summary>
    <p className="mt-2 text-muted-foreground">
      Dal conto premi dovrebbero uscire solo premi e giroconti. Queste uscite
      non sono né premi a Vittoria né giroconti fra i conti dell'agenzia. Per
      ognuna c'è una proposta: entra nei conti solo quando qualcuno la sceglie
      con la tendina e la salva.
    </p>
    <ul className="mt-2">
      {spese.map((s) => (
        <li key={s.chi} className="border-t py-1.5">
          <div className="flex flex-wrap justify-between gap-x-3 tabular-nums">
            <span className="font-medium">{s.chi}</span>
            <span>{euro(s.totale)}</span>
          </div>
          <div className="text-muted-foreground">
            Proposta: {s.proposta}, {s.nota}.
          </div>
          <ul className="mt-1 pl-3">
            {s.movimenti.map((x, i) => (
              <li key={x.chiave ?? i} className="py-1">
                <span className="tabular-nums">
                  {dataIt(x.data)} {euro(x.importo)}
                </span>
                {x.chiave && (
                  <Tendina
                    chiave={x.chiave}
                    voci={voci}
                    applicate={applicate}
                    proposta={s.proposta}
                  />
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </details>
);

/** Outflows of account 257 the agent cannot categorize, each with the category picker. */
export const DaClassificare = ({ info }: { info: InfoModello }) => {
  const lista = info.da_classificare ?? [];
  const perse = info.correzioni_non_trovate ?? [];
  if (lista.length === 0 && perse.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="text-base font-semibold">
        Uscite che l'agente non sa dove mettere{" "}
        <span className="font-normal text-muted-foreground">
          ({lista.length})
        </span>
      </h3>
      <p className="mt-1 text-muted-foreground">
        Scegli la voce giusta e salva: dal prossimo aggiornamento il movimento
        entra in quella voce.
      </p>
      <ul className="mt-2">
        {lista.map((x) => (
          <li key={x.chiave} className="border-t py-1.5">
            <div className="flex flex-wrap justify-between gap-x-3 tabular-nums">
              <span>
                {dataIt(x.giorno)} {x.chi}
              </span>
              <span>{euro(x.importo)}</span>
            </div>
            <Tendina
              chiave={x.chiave}
              voci={info.voci_tendina ?? []}
              applicate={info.correzioni_applicate ?? []}
            />
          </li>
        ))}
      </ul>
      {perse.length > 0 && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950/40">
          Correzioni che non trovano più il loro movimento (l'estratto conto è
          cambiato): {perse.map((x) => x.voce).join(", ")}. Vanno rifatte.
        </div>
      )}
    </div>
  );
};

/** Collapsible list of every outflow of the month, to correct categories the agent already assigned. */
export const CorreggiVoce = ({
  movimenti,
  info,
}: {
  movimenti: {
    chiave: string;
    data: string;
    importo: number;
    chi: string;
    voce: string;
  }[];
  info: InfoModello;
}) => (
  <details className="rounded-lg border bg-card p-4 text-sm">
    <summary className="cursor-pointer select-none text-base font-semibold">
      Correggi una voce{" "}
      <span className="font-normal text-muted-foreground">
        ({movimenti.length} uscite del mese)
      </span>
    </summary>
    <ul className="mt-2">
      {movimenti.map((x) => (
        <li key={x.chiave} className="border-t py-1">
          <details>
            <summary className="flex cursor-pointer flex-wrap justify-between gap-x-3 tabular-nums">
              <span>
                {dataIt(x.data)} {x.chi}{" "}
                <span className="text-muted-foreground">({x.voce})</span>
              </span>
              <span>{euro(x.importo)}</span>
            </summary>
            <Tendina
              chiave={x.chiave}
              voci={info.voci_tendina ?? []}
              applicate={info.correzioni_applicate ?? []}
            />
          </details>
        </li>
      ))}
    </ul>
  </details>
);

export const CosaManca = ({ voci }: { voci: string[] }) => (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
    <h3 className="text-base font-semibold">
      Cosa non c'è ancora in questi numeri
    </h3>
    <ul className="mt-1 list-disc pl-5 space-y-1">
      {voci.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  </div>
);
