export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeWhatsappPhone(rawPhone: string | null | undefined): string | null {
  const digitsOnly = rawPhone?.replace(/\D/g, "") ?? "";

  if (!digitsOnly) {
    return null;
  }

  const withoutInternationalPrefix = digitsOnly.startsWith("00")
    ? digitsOnly.slice(2)
    : digitsOnly;

  const withoutLeadingZero = withoutInternationalPrefix.startsWith("0")
    ? withoutInternationalPrefix.slice(1)
    : withoutInternationalPrefix;

  if (withoutLeadingZero.length < 11 || withoutLeadingZero.length > 15) {
    return null;
  }

  return withoutLeadingZero;
}
