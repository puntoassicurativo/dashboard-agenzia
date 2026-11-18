/**
 * Small chart of the last months inside a card (style 2). Plain SVG, no library: a line with a light area below.
 * Only real series: a card without a series has no chart (never invented data).
 */
export const Spark = ({
  valori,
  etichetta,
}: {
  valori: number[];
  etichetta: string;
}) => {
  if (valori.length < 2) return null;
  const w = 300;
  const h = 48;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const campo = max - min || 1;
  const punti = valori.map((v, i) => [
    (i / (valori.length - 1)) * w,
    h - 4 - ((v - min) / campo) * (h - 8),
  ]);
  const linea = punti
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-3 h-12 w-full"
      role="img"
      aria-label={etichetta}
    >
      <polygon
        points={`0,${h} ${linea} ${w},${h}`}
        className="fill-pa-blu-chiaro"
      />
      <polyline
        points={linea}
        fill="none"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="stroke-pa-blu/60"
      />
    </svg>
  );
};
