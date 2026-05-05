"use client";

import { useMemo, useRef, useState } from "react";

import { downloadIrregularityReceiptPdf } from "@/lib/pdf";
import type { IrregularityReportCreateResponse, IrregularityReportReceipt } from "@/lib/types";

import styles from "./irregularity-report-form.module.css";

export function IrregularityReportForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [dni, setDni] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<IrregularityReportReceipt | null>(null);
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID());
  const submissionLockRef = useRef(false);
  const sendingMessage = useMemo(
    () => "Enviando denuncia, no cierres el navegador hasta obtener comprobante de denuncia.",
    [],
  );

  const resetForm = () => {
    setMessage("");
    setDni("");
    setFullName("");
    setEmail("");
    setPhone("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLockRef.current || isSubmitting) {
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    setError("");
    setFeedback("");
    setReceipt(null);

    void (async () => {
      try {
        const response = await fetch("/api/irregularities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            dni,
            fullName,
            email,
            phone,
            submissionToken,
          }),
        });

        const payload = (await response.json()) as
          | IrregularityReportCreateResponse
          | { message?: string };
        if (!response.ok) {
          const errorPayload = payload as { message?: string };
          setError(errorPayload.message ?? "No pudimos enviar la denuncia.");
          setIsSubmitting(false);
          submissionLockRef.current = false;
          return;
        }

        const createdReport = (payload as IrregularityReportCreateResponse).report;
        resetForm();
        setReceipt(createdReport);
        setFeedback(
          `Tu denuncia quedó registrada con el número ${createdReport.publicCode}. Gracias por avisarnos.`,
        );
        setSubmissionToken(crypto.randomUUID());
      } catch {
        setError("No pudimos enviar la denuncia.");
      } finally {
        setIsSubmitting(false);
        submissionLockRef.current = false;
      }
    })();
  };

  return (
    <section className={styles.shell}>
      <button
        className={styles.toggle}
        disabled={isSubmitting}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Ocultar denuncia" : "Denunciar irregularidades"}
      </button>

      {open ? (
        <div className={styles.card}>
          <div className={styles.copy}>
            <span className={styles.kicker}>Canal anónimo</span>
            <h2 className={styles.title}>Contanos qué pasó</h2>
            <p className={styles.lead}>
              Si detectaste una irregularidad durante la votación, podés dejar tu mensaje acá. Nombre, mail y teléfono son opcionales.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="report-message">Mensaje</label>
              <textarea
                id="report-message"
                onChange={(event) => setMessage(event.target.value)}
                required
                value={message}
              />
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label htmlFor="report-dni">DNI (opcional)</label>
                <input
                  id="report-dni"
                  inputMode="numeric"
                  onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))}
                  value={dni}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="report-name">Nombre completo (opcional)</label>
                <input
                  id="report-name"
                  onChange={(event) => setFullName(event.target.value)}
                  value={fullName}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="report-email">Mail (opcional)</label>
                <input
                  id="report-email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="report-phone">Teléfono (opcional)</label>
                <input
                  id="report-phone"
                  onChange={(event) => setPhone(event.target.value)}
                  value={phone}
                />
              </div>
            </div>

            {isSubmitting ? <div className={styles.feedback}>{sendingMessage}</div> : null}
            {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
            {receipt ? (
              <div className={styles.receiptCard}>
                <div className={styles.receiptCode}>Denuncia N° {receipt.publicCode}</div>
                <button
                  className={styles.submit}
                  onClick={() => downloadIrregularityReceiptPdf(receipt)}
                  type="button"
                >
                  Descargar comprobante
                </button>
              </div>
            ) : null}
            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.actions}>
              <button className={styles.submit} disabled={isSubmitting} type="submit">
                {isSubmitting ? "Enviando..." : "Enviar denuncia"}
              </button>
              <button
                className={styles.secondary}
                disabled={isSubmitting}
                onClick={() => {
                  resetForm();
                  setFeedback("");
                  setError("");
                  setReceipt(null);
                  setSubmissionToken(crypto.randomUUID());
                }}
                type="button"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
