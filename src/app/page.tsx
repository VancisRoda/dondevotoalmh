import { SearchExperience } from "@/components/search-experience";
import { ThemeToggle } from "@/components/theme-toggle";

import styles from "./page.module.css";

function SocialIcon({ kind }: { kind: "whatsapp" | "tiktok" | "instagram" }) {
  if (kind === "whatsapp") {
    return (
      <svg aria-hidden="true" className={styles.socialIcon} viewBox="0 0 24 24">
        <path
          d="M20.5 11.8A8.5 8.5 0 0 1 7.9 19.2L3.8 20.3l1.2-4A8.5 8.5 0 1 1 20.5 11.8Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M9.5 8.9c.2-.5.4-.5.7-.5h.6c.2 0 .5 0 .7.5.2.4.8 1.8.9 1.9.1.2.1.4 0 .6-.1.2-.2.4-.3.5l-.4.5c-.2.2-.3.4-.1.7.2.3.7 1.1 1.6 1.8 1.1.9 2 1.2 2.3 1.4.3.1.5.1.7-.1l.9-1c.2-.2.4-.3.7-.2l1.8.9c.3.1.5.3.5.5 0 .2-.1 1.3-.9 1.8-.7.5-1.7.7-2 .7-.3 0-1.6-.2-3.1-1.2-1.9-1.2-3.1-2.8-3.4-3.2-.3-.4-.8-1.1-.8-2.1 0-1 .5-1.5.7-1.7Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "tiktok") {
    return (
      <svg aria-hidden="true" className={styles.socialIcon} viewBox="0 0 24 24">
        <path
          d="M14.4 4v10.1a3.4 3.4 0 1 1-3-3.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
        <path
          d="M14.4 4c.4 1.7 1.7 3.1 3.4 3.6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={styles.socialIcon} viewBox="0 0 24 24">
      <rect
        fill="none"
        height="14"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="14"
        x="5"
        y="5"
      />
      <circle cx="12" cy="12" fill="none" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.3" fill="currentColor" r="1" />
    </svg>
  );
}

const socialLinks = [
  {
    href: "https://www.whatsapp.com/channel/0029VaN3EIhADTOKvZ8jfV1V",
    label: "WhatsApp",
    kind: "whatsapp" as const,
  },
  {
    href: "https://www.tiktok.com/@mhderechount",
    label: "TikTok",
    kind: "tiktok" as const,
  },
  {
    href: "https://www.instagram.com/movimientohumanistaderecho/",
    label: "Instagram",
    kind: "instagram" as const,
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandMark} />
            <span>Movimiento Humanista</span>
          </div>
          <ThemeToggle />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.desktopTitle}>¿Dónde voto al MH?</span>
          <span className={styles.mobileTitle}>¿Dónde voto?</span>
          <p className={styles.heroLead}>Ingresá tu DNI y conocé en qué mesa votás.</p>
        </div>
      </section>

      <section className={styles.lookupSection}>
        <SearchExperience />
      </section>

      <section className={styles.socialSection} id="redes">
        <div className={styles.socialGrid}>
          {socialLinks.map((link) => (
            <a
              className={styles.socialLink}
              href={link.href}
              key={link.href}
              rel="noreferrer"
              target="_blank"
            >
              <SocialIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Sistema creado por{" "}
          <a
            href="https://www.instagram.com/vancis.roda"
            rel="noreferrer"
            target="_blank"
          >
            Vancis Roda - Contacto
          </a>
        </p>
      </footer>
    </main>
  );
}
