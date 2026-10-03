"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Registers the service worker (production only: in development it would hide code changes). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* the site works the same without it */
    });
  }, []);
  return null;
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Install the app" button. It only appears when the browser says the site can
 * be installed (Chrome and Edge on Android and desktop), and disappears once it is.
 */
export function InstallButton() {
  const t = useTranslations("store.pwa");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function onInstalled() {
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      data-install-app
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        // the browser allows one prompt per event
        setPrompt(null);
      }}
    >
      {t("install")}
    </Button>
  );
}
