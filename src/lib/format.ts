const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatDateLabel(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatDateTimeLabel(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function participationLabel(value: string): string {
  switch (value) {
    case "centro_y_consejo":
      return "Centro y Consejo";
    case "solo_centro":
      return "Solo Centro";
    case "solo_consejo":
      return "Solo Consejo";
    default:
      return value;
  }
}

export function reportStatusLabel(value: string): string {
  switch (value) {
    case "new":
      return "Nueva";
    case "in_progress":
      return "En seguimiento";
    case "closed":
      return "Cerrada";
    default:
      return value;
  }
}
