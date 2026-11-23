import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";
import { RitenutaCompagnia } from "./RitenutaCompagnia";
import { Spiegato } from "./Spiega";
import {
  spiegaCifra,
  spiegaDifferenzaRitenute,
  spiegaRitenutePosta,
} from "./spiegaSchede";

interface MeseRitenute {
  decadi: { decade: string; subagente: string; ritenuta: number }[];
  fatture: {
    data: string;
    da: string;
    imponibile: number | null;
    ritenuta: number;
  }[];
  somma_posta: number;
  studio: { data: string; importo: number; rettifica: boolean } | null;
  differenza: number | null;
}

/** Contabilita' > Ritenute (phase 7): withholding taxes from the mailbox next to the amount the accountant debits. */
export const Ritenute = () => {
  const q = useBlocchi<MeseRitenute, { nota: string }>("ritenute");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = Object.keys(q.data.mesi).sort().reverse();
  return (
    <Pagina titolo="Ritenute d'acconto" sotto={q.data.info?.nota}>
      <RitenutaCompagnia />
      {mesi.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessun dato ancora.
        </div>
      )}
      {mesi.map((mese) => {
        const m = q.data.mesi[mese];
        return (
          <details key={mese} className="rounded-lg border bg-card p-3 text-sm">
            <summary className="cursor-pointer select-none">
              <span className="font-medium">
                Fatture pagate a {nomeMese(mese)}
              </span>
              <span className="block sm:inline sm:ml-2 text-muted-foreground tabular-nums">
                dalla posta{" "}
                <Spiegato
                  spiega={spiegaRitenutePosta(
                    mese,
                    m.decadi,
                    m.fatture,
                    m.somma_posta,
                  )}
                >
                  {euro(m.somma_posta)}
                </Spiegato>
                {m.studio ? (
                  <>
                    , studio{" "}
                    <Spiegato
                      spiega={spiegaCifra(
                        "Addebito dello studio",
                        m.studio.importo,
                        `Ritenute che lo studio addebita il ${dataIt(m.studio.data)}.`,
                        'mail dello studio "Addebito ritenute d\'acconto"',
                      )}
                    >
                      {euro(m.studio.importo)}
                    </Spiegato>{" "}
                    il {dataIt(m.studio.data)}, differenza{" "}
                    <Spiegato
                      spiega={spiegaDifferenzaRitenute(
                        mese,
                        m.studio.importo,
                        m.somma_posta,
                        m.differenza ?? 0,
                      )}
                    >
                      {euro(m.differenza)}
                    </Spiegato>
                  </>
                ) : (
                  ", lo studio non ha ancora mandato l'importo"
                )}
              </span>
            </summary>
            <div className="mt-2 space-y-1">
              {m.decadi.map((d) => (
                <div
                  key={`${d.decade}-${d.subagente}`}
                  className="flex justify-between gap-2"
                >
                  <span>
                    Decade del {dataIt(d.decade)}, {d.subagente}
                  </span>
                  <span className="tabular-nums">{euro(d.ritenuta)}</span>
                </div>
              ))}
              {m.fatture.map((f, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span>
                    Fattura {f.da} del {dataIt(f.data)}
                  </span>
                  <span className="tabular-nums">{euro(f.ritenuta)}</span>
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </Pagina>
  );
};
