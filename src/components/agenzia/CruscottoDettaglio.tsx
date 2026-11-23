/**
 * Detail page of each tile of the main page (Lorenzo 22/11/2026: simple main page, each tile opens another page).
 * /cruscotto/<voce>: the full tile with every number explained, then the lists behind it written out (no need to click)
 * and the charts and tables that used to sit at the bottom of the main page.
 */
import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";

import {
  ComeLeggere,
  type DatiCruscotto,
  GraficoMesi,
  RiquadroAvanzo,
  RiquadroDelta,
  RiquadroIncassi,
  RiquadroUtileFiscale,
  useDatiCruscotto,
} from "./Cruscotto";
import { Testata } from "./CruscottoSemplice";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import {
  ConfrontoMesi,
  meseSolo,
  RiquadroProvvigioniMese,
} from "./MeseCruscotto";
import { RiquadroArea } from "./RiquadriVita";
import { type Elenco, ElencoCompleto } from "./Spiega";
import {
  elencoMovimentiAvanzo,
  elencoPassi,
  elencoSaldiMese,
  spiegaConPrevisti,
  spiegaDeltaYtd,
  spiegaIncassi,
  spiegaProvv,
  elencoMesiFiscale,
} from "./spiegaCruscotto";
import {
  type Area,
  spiegaVitaMese,
  spiegaVitaYtd,
  type VitaInfo,
  type VitaMese,
} from "./spiegaVita";

const TITOLI: Record<string, string> = {
  provvigioni: "Provvigioni",
  incassi: "Incassi",
  avanzo: "Saldo del conto premi",
  "utile-fiscale": "Utile fiscale previsto",
  vita: "Vita",
  protezione: "Protezione",
  delta: "Delta auto e RE",
};

/** A list written out in a card, with its title (the same list the click on the number opens). */
const Lista = ({ elenco, sotto }: { elenco?: Elenco; sotto?: ReactNode }) =>
  elenco ? (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="text-base font-semibold mb-1">{elenco.titolo}</h2>
      {sotto && <p className="text-sm text-muted-foreground mb-2">{sotto}</p>}
      <ElencoCompleto elenco={elenco} />
    </section>
  ) : null;

const Provvigioni = ({ p }: { p: DatiCruscotto }) => {
  const [confronto, setConfronto] = useState<[string, string]>(["", ""]);
  return (
    <>
      <RiquadroProvvigioniMese m={p.m} serie={p.serieProvv} />
      <Lista elenco={spiegaProvv(p.m).elenco} />
      {p.mesiAnno.length > 1 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Confronta due mesi</h2>
          <ConfrontoMesi
            mesi={p.mesiAnno}
            primo={confronto[0] || p.m.mese}
            secondo={
              confronto[1] ||
              p.mesiAnno[Math.max(0, p.mesiAnno.length - 2)].mese
            }
            onPrimo={(x) => setConfronto([x, confronto[1]])}
            onSecondo={(x) => setConfronto([confronto[0], x])}
          />
        </section>
      )}
      {p.data.mensile && <GraficoMesi mesi={p.data.mensile} />}
    </>
  );
};

const Incassi = ({ p }: { p: DatiCruscotto }) => (
  <>
    <RiquadroIncassi p={p} />
    <Lista
      elenco={spiegaIncassi(p.v.incassi, p.annoN, p.data.data_dati).elenco}
    />
    {p.data.mensile && <GraficoMesi mesi={p.data.mensile} />}
  </>
);

const Avanzo = ({ p }: { p: DatiCruscotto }) => (
  <>
    <RiquadroAvanzo p={p} />
    {p.movimentiAvanzo && (
      <Lista elenco={elencoMovimentiAvanzo(p.movimentiAvanzo)} />
    )}
    {p.saldiMese.length > 0 && <Lista elenco={elencoSaldiMese(p.saldiMese)} />}
  </>
);

export const UtileFiscale = ({ p }: { p: DatiCruscotto }) => {
  const f = p.fiscaleSpiega;
  // the page is already behind PerSoci: no data here means the fiscal block did not load (review R064)
  if (!f)
    return (
      <p className="text-muted-foreground">
        L'utile fiscale non si è caricato. Riprova tra poco o ricarica la
        pagina.
      </p>
    );
  return (
    <>
      <RiquadroUtileFiscale p={p} />
      {f.proiezione_passi && (
        <Lista elenco={elencoPassi(f.proiezione_passi, f.dal, f.al)} />
      )}
      <Lista elenco={elencoMesiFiscale(f)} />
      <Lista elenco={spiegaConPrevisti(f)?.elenco} />
      <p className="text-sm">
        Per provare altri numeri:{" "}
        <Link to="/tasse/simula-tasse" className="text-pa-blu underline">
          Simula tasse
        </Link>
        .
      </p>
    </>
  );
};

const VitaArea = ({ p, area }: { p: DatiCruscotto; area: Area }) => {
  const q = useBlocchi<VitaMese, VitaInfo>("vita");
  const info = q.data?.info;
  if (q.isPending) return <p className="text-muted-foreground">Carico...</p>;
  if (q.error) return <ErroreCaricamento cosa="la Vita" errore={q.error} />;
  if (!info)
    return (
      <p className="text-muted-foreground">
        Il giro del mattino non ha ancora scritto i dati della Vita.
      </p>
    );
  const mese = q.data?.mesi[p.m.mese];
  return (
    <>
      <RiquadroArea area={area} info={info} mese={p.m.mese} datiMese={mese} />
      {mese && <Lista elenco={spiegaVitaMese(p.m.mese, mese, area).elenco} />}
      <Lista elenco={spiegaVitaYtd(info, area).elenco} />
    </>
  );
};

const DeltaPagina = ({ p }: { p: DatiCruscotto }) => (
  <>
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      {(
        [
          ["Delta auto", p.v.delta_auto, "delta_auto"],
          ["Delta RE", p.v.delta_re, "delta_re"],
        ] as const
      ).map(([titolo, d, chiave]) => (
        <RiquadroDelta
          key={chiave}
          titolo={titolo}
          d={d}
          m={p.m}
          chiave={chiave}
          mesi={p.mesiAnno}
          datiAl={p.data.data_dati}
          anno={p.annoN}
          letto={p.deltaLetto}
        />
      ))}
    </div>
    {(
      [
        ["Delta auto", p.v.delta_auto, "delta_auto"],
        ["Delta RE", p.v.delta_re, "delta_re"],
      ] as const
    ).map(([titolo, d, chiave]) => (
      <Lista
        key={chiave}
        elenco={
          spiegaDeltaYtd(titolo, d, p.mesiAnno, chiave, p.data.data_dati).elenco
        }
      />
    ))}
    <ComeLeggere />
  </>
);

export const CruscottoDettaglio = () => {
  const { voce = "" } = useParams();
  const { q, dati, scegli, ricerca } = useDatiCruscotto();
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  if (!dati)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );
  const titolo = TITOLI[voce];
  const corpo: Record<string, ReactNode> = {
    provvigioni: <Provvigioni p={dati} />,
    incassi: <Incassi p={dati} />,
    avanzo: <Avanzo p={dati} />,
    "utile-fiscale": <UtileFiscale p={dati} />,
    vita: <VitaArea p={dati} area="vita" />,
    protezione: <VitaArea p={dati} area="prot" />,
    delta: <DeltaPagina p={dati} />,
  };
  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pt-4 pb-28 md:px-0 md:pt-0 md:pb-8">
      <Testata
        p={dati}
        scegli={scegli}
        titolo={titolo ?? "Cruscotto"}
        sinistra={
          <Link
            to={`/${ricerca}`}
            className="self-start text-sm font-medium text-pa-blu no-underline hover:underline"
          >
            ‹ Cruscotto
          </Link>
        }
      />
      {corpo[voce] ?? (
        <p className="text-muted-foreground">
          Pagina non trovata. Torna al Cruscotto.
        </p>
      )}
      {voce !== "utile-fiscale" && voce !== "delta" && (
        <p className="text-xs text-muted-foreground">
          Mese scelto: {meseSolo(dati.m.mese)} {dati.m.mese.slice(0, 4)}.
        </p>
      )}
    </div>
  );
};

/** 23/11/2026: the same taxable-profit detail, inside the Tasse page (no month picker: it covers the year). */
export const UtileFiscaleSolo = () => {
  const { q, dati } = useDatiCruscotto();
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  if (!dati)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );
  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pb-28 md:px-0 md:pb-8">
      <h1 className="text-xl font-semibold">Utile fiscale previsto</h1>
      <UtileFiscale p={dati} />
    </div>
  );
};

export default CruscottoDettaglio;
