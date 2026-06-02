"use client";

import liff from "@line/liff";

export type LiffLineAccount = {
  idToken: string;
  displayName: string;
  pictureUrl?: string;
  userId?: string;
};

let liffInitPromise: Promise<void> | null = null;

function getLiffId(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (!liffId) {
    throw new Error("Missing NEXT_PUBLIC_LIFF_ID.");
  }

  return liffId;
}

function openLiffApp(): void {
  window.location.assign(`https://liff.line.me/${getLiffId()}`);
}

async function ensureLiffReady(): Promise<void> {
  if (!liffInitPromise) {
    liffInitPromise = liff.init({
      liffId: getLiffId(),
      withLoginOnExternalBrowser: true,
    });
  }

  await liffInitPromise;
}

function getLoginRedirectUri(): string | undefined {
  const configuredRedirectUri = process.env.NEXT_PUBLIC_LIFF_REDIRECT_URI;

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  if (window.location.protocol === "https:") {
    return window.location.href;
  }

  return undefined;
}

export async function getLiffLineAccount(): Promise<LiffLineAccount | null> {
  await ensureLiffReady();

  if (!liff.isLoggedIn()) {
    const redirectUri = getLoginRedirectUri();

    if (redirectUri) {
      liff.login({ redirectUri });
    } else {
      openLiffApp();
    }

    window.setTimeout(() => {
      if (!liff.isLoggedIn()) {
        openLiffApp();
      }
    }, 300);

    return null;
  }

  return getCurrentLiffLineAccount();
}

export async function getCurrentLiffLineAccount(): Promise<LiffLineAccount | null> {
  await ensureLiffReady();

  if (!liff.isLoggedIn()) {
    return null;
  }

  const idToken = liff.getIDToken();

  if (!idToken) {
    throw new Error("LINE did not return an ID token.");
  }

  const profile = await liff.getProfile();

  return {
    idToken,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    userId: profile.userId,
  };
}
