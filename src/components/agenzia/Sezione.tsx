import { type ReactNode, useState } from "react";

/**
 * Closed block with a title and ONE summary figure on the same line (Fabio, 16/11/2026: "no endless page, a first
 * screen with the main figures and sections that open"). Closed at every width; the content mounts only when open.
 * Which sections are open is remembered in this browser (localStorage, inside try/catch: the page works without it).
 */
const CHIAVE = "dashboard-agenzia.sezioni-aperte";

const leggiAperte = (): Record<string, boolean> => {
  try {
    const raw = window.localStorage.getItem(CHIAVE);
    const v: unknown = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? (v as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const salvaAperta = (id: string, aperta: boolean) => {
  try {
    const tutte = { ...leggiAperte(), [id]: aperta };
    window.localStorage.setItem(CHIAVE, JSON.stringify(tutte));
  } catch {
    // storage blocked or full: the section still opens, it is just not remembered
  }
};

export const Sezione = ({
  id,
  titolo,
  riassunto,
  children,
}: {
  id: string;
  titolo: string;
  riassunto?: ReactNode;
  children: ReactNode;
}) => {
  const [aperta, setAperta] = useState<boolean>(() => !!leggiAperte()[id]);
  return (
    <details
      open={aperta}
      onToggle={(e) => {
        const ora = e.currentTarget.open;
        if (ora !== aperta) {
          setAperta(ora);
          salvaAperta(id, ora);
        }
      }}
      className="rounded-lg border bg-card"
    >
      <summary className="cursor-pointer select-none px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-base font-semibold">
          <span
            aria-hidden
            className="mr-1.5 inline-block w-3 text-muted-foreground"
          >
            {aperta ? "▾" : "▸"}
          </span>
          {titolo}
        </span>
        {riassunto != null && riassunto !== "" && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {riassunto}
          </span>
        )}
      </summary>
      {aperta && (
        <div className="flex flex-col gap-4 px-3 pb-3">{children}</div>
      )}
    </details>
  );
};
