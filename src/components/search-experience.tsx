"use client";

import { useState, useTransition } from "react";

import { downloadLookupPdf } from "@/lib/pdf";
import type { LookupErrorResponse, LookupResponse } from "@/lib/types";

import styles from "./search-experience.module.css";

function participationCopy(participation: LookupResponse["participation"]): string {
  switch (participation) {
    case "centro_y_consejo":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Centro de Estudiantes y Consejo Directivo de la Facultad. ¡Te esperamos!";
    case "solo_centro":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Centro de Estudiantes de la Facultad. ¡Te esperamos!";
    case "solo_consejo":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Consejo Directivo de la Facultad. ¡Te esperamos!";
    default:
      return "Ese DNI no figura en el padrón definitivo.";
  }
}

function normalizeDniInput(rawDni: string): string {
  return rawDni.replace(/[^\d.\-\s]/g, "");
}

function VoteCard({
  title,
  orden,
}: {
  title: string;
  orden: string;
}) {
  return (
    <article className={styles.voteCard}>
      <header className={styles.voteCardHeader}>
        <h4>{title}</h4>
      </header>
      <div className={styles.singleMetric}>
        <span className={styles.metricLabel}>Número de orden</span>
        <strong className={styles.metricValue}>{orden}</strong>
      </div>
    </article>
  );
}

export function SearchExperience() {
  const [dni, setDni] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDownload = Boolean(result && result.participation !== "no_encontrado");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/lookup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ dni }),
          });

          const payload = (await response.json()) as
            | LookupResponse
            | LookupErrorResponse;

          if (!response.ok) {
            setResult(null);
            setError(
              "error" in payload ? payload.error : "No pudimos procesar la consulta.",
            );
            return;
          }

          setResult(payload as LookupResponse);
        } catch {
          setResult(null);
          setError("No pudimos consultar ahora. Intenta nuevamente.");
        }
      })();
    });
  };

  return (
    <section className={styles.wrap} id="consulta">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formCopy}>
          <span className={styles.kicker}>Ingresá tu DNI</span>
          <h2 className={styles.title}>Buscá tu mesa en segundos</h2>
        </div>
        <div className={styles.formControls}>
          <div className={styles.inputShell}>
            <input
              autoComplete="off"
              id="dni"
              inputMode="numeric"
              name="dni"
              onChange={(event) => setDni(normalizeDniInput(event.target.value))}
              placeholder=""
              value={dni}
            />
          </div>
          <button className={styles.submit} disabled={isPending} type="submit">
            {isPending ? "Buscando..." : "Consultar"}
          </button>
        </div>
      </form>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.results}>
        {result ? (
          <article className={styles.statusCard}>
            <span className={styles.statusEyebrow}>{`DNI ${result.dni}`}</span>
            <h3>{participationCopy(result.participation)}</h3>
          </article>
        ) : null}

        {result && result.participation !== "no_encontrado" ? (
          <>
            <article className={styles.personCard}>
              <div className={styles.voteMetaRow}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Mesa</span>
                  <strong className={styles.metricValue}>
                    {result.centro?.mesa ?? result.consejo?.mesa}
                  </strong>
                </div>
                <div className={styles.personText}>
                  <span className={styles.voteName}>
                    {result.centro?.nombre ?? result.consejo?.nombre}
                  </span>
                  <span className={styles.voteYear}>
                    Ingreso {result.centro?.anioIngreso ?? result.consejo?.anioIngreso}
                  </span>
                </div>
              </div>
            </article>

            <div className={styles.voteGrid}>
              {result.centro ? (
                <VoteCard orden={result.centro.orden} title="Centro de Estudiantes" />
              ) : null}
              {result.consejo ? (
                <VoteCard orden={result.consejo.orden} title="Consejo Directivo" />
              ) : null}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.downloadButton}
                disabled={!canDownload}
                onClick={() => result && downloadLookupPdf(result)}
                type="button"
              >
                Descargar PDF
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
