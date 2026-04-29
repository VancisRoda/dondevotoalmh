"use client";

import { useState, useTransition } from "react";

import styles from "./admin-login.module.css";

export function AdminLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          setError(payload.message ?? "No pudimos iniciar sesión.");
          return;
        }

        window.location.reload();
      })().catch(() => {
        setError("No pudimos iniciar sesión.");
      });
    });
  };

  return (
    <section className={styles.shell}>
      <div className={styles.copy}>
        <span className={styles.kicker}>Panel administrador</span>
        <h1 className={styles.title}>Ingresá con tu acceso</h1>
        <p className={styles.description}>
          Acceso restringido a estadísticas y denuncias del sistema.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="admin-username">Usuario</label>
          <input
            autoComplete="username"
            id="admin-username"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="admin-password">Contraseña</label>
          <input
            autoComplete="current-password"
            id="admin-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <button className={styles.submit} disabled={isPending} type="submit">
          {isPending ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </section>
  );
}
