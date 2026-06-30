"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean(navigator.standalone))
  );
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    setShowIosHint(isIos());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (dismissed || (!promptEvent && !showIosHint)) {
    return null;
  }

  async function install() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-md border border-border bg-card p-3 text-sm shadow-lg sm:bottom-5">
      <div className="flex items-start gap-3">
        <Download aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Install Cellar</p>
          <p className="mt-1 text-muted-foreground">
            {showIosHint
              ? "Use Share, then Add to Home Screen."
              : "Add this app to your home screen for quicker access."}
          </p>
          <div className="mt-3 flex gap-2">
            {promptEvent ? (
              <button
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                onClick={install}
                type="button"
              >
                Install
              </button>
            ) : null}
            <button
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium"
              onClick={() => setDismissed(true)}
              type="button"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
