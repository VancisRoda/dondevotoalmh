import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import {
  getAdminPassword,
  getAdminSessionSecret,
  getAdminUsername,
} from "@/lib/env";

const SESSION_COOKIE_NAME = "mh_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

interface SessionPayload {
  username: string;
  expiresAt: number;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionToken(username: string): string {
  const payload = JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  } satisfies SessionPayload);
  const encodedPayload = encodeBase64Url(payload);
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = signPayload(payloadPart);
  const actualBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as SessionPayload;
    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    if (payload.username !== getAdminUsername()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isAdminCredentialsValid(
  username: string,
  password: string,
): boolean {
  return username === getAdminUsername() && password === getAdminPassword();
}

export async function createAdminSession(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(username), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(parseSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value));
}
