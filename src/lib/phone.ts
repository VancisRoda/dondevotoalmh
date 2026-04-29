export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeOptionalDni(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\D/g, "") ?? "";
  if (!normalized) {
    return null;
  }

  return /^\d{7,8}$/.test(normalized) ? normalized : null;
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

  if (withoutLeadingZero.startsWith("549") && withoutLeadingZero.length === 13) {
    return withoutLeadingZero;
  }

  if (withoutLeadingZero.startsWith("54") && withoutLeadingZero.length === 12) {
    return `549${withoutLeadingZero.slice(2)}`;
  }

  if (withoutLeadingZero.length === 10) {
    return `549${withoutLeadingZero}`;
  }

  if (withoutLeadingZero.length === 11 && withoutLeadingZero.startsWith("9")) {
    return `54${withoutLeadingZero}`;
  }

  if (withoutLeadingZero.length >= 11 && withoutLeadingZero.length <= 15) {
    return withoutLeadingZero;
  }

  return null;
}
