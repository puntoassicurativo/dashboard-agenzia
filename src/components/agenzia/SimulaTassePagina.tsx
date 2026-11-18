/** Contabilita' > Simula tasse: container of the three tax simulations (data from the fiscale block, partners only). */
import { ErroreCaricamento } from "./ErroreCaricamento";
import { useBloccoFiscale } from "./Fiscale";
import { Pagina } from "./Lato";
import { SimulaTasse } from "./SimulaTasse";

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

export const SimulaTassePagina = () => {
  const q = useBloccoFiscale();
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const f = q.data;
  return (
    <Pagina
      titolo="Simula tasse"
      sotto="Tre conti affiancati: le tasse sull'utile fatto fino a oggi, quelle a fine anno se si continua così, e una simulazione dove metti tu l'utile e le voci da togliere."
    >
      {f ? (
        <SimulaTasse
          finoAOggi={
            f.al
              ? `Fino a ${MESI[parseInt(f.al.slice(5, 7), 10) - 1]}`
              : "Fino a oggi"
          }
          daGennaio={{
            utile: f.da_gennaio.utile_fiscale,
            ritenute: f.da_gennaio.ritenute,
          }}
          proiezione={
            f.proiezione
              ? {
                  utile: f.proiezione.utile_fiscale,
                  ritenute: f.proiezione.ritenute,
                }
              : null
          }
          previsti={f.costi_previsti?.voci.map((v) => ({
            voce: v.voce,
            resta: v.resta,
          }))}
        />
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm">
          L'utile fiscale non è ancora stato calcolato.
        </div>
      )}
    </Pagina>
  );
};
