"use client";

import { useState, useTransition } from "react";

import styles from "./irregularity-report-form.module.css";

export function IrregularityReportForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setMessage("");
    setFullName("");
    setEmail("");
    setPhone("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/irregularities", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            fullName,
            email,
            phone,
          }),
        });

        const payload = (await response.json()) as { message?: string };
        if (!response.ok) {
          setError(payload.message ?? "No pudimos enviar la denuncia.");
          return;
        }

        resetForm();
        setFeedback("Tu denuncia quedó registrada. Gracias por avisarnos.");
      })().catch(() => {
        setError("No pudimos enviar la denuncia.");
      });
    });
  };

  return (
    <section className={styles.shell}>
      <button className={styles.toggle} onClick={() => setOpen((value) => !value)} type="button">
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

            {feedback ? <div className={styles.feedback}>{feedback}</div> : null}
            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.actions}>
              <button className={styles.submit} disabled={isPending} type="submit">
                {isPending ? "Enviando..." : "Enviar denuncia"}
              </button>
              <button
                className={styles.secondary}
                onClick={() => {
                  resetForm();
                  setFeedback("");
                  setError("");
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
