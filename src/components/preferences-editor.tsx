"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import type { PreferenceProfile } from "@/lib/schemas";

type PreferencesEditorProps = {
  profile: PreferenceProfile;
};

export function PreferencesEditor({ profile }: PreferencesEditorProps) {
  const [summary, setSummary] = useState(profile.summary);
  const [structured, setStructured] = useState(profile.structured);
  const [updatedAt, setUpdatedAt] = useState(profile.updated_at ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, structured }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save preferences.");
      }

      setStructured(payload.structured ?? {});
      setUpdatedAt(payload.updated_at ?? null);
      setMessage("Preferences saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save preferences.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <section className="rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit this in plain language. Future tastings will evolve it rather than ignore it.
        </p>
        <textarea
          className="mt-4 min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none ring-ring transition focus:ring-2"
          onChange={(event) => setSummary(event.target.value)}
          placeholder="No preferences learned yet."
          value={summary}
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={save}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            Save
          </button>
          {message ? (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Structured memory</h2>
        {updatedAt ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Updated {new Date(updatedAt).toLocaleString()}
          </p>
        ) : null}
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
          {JSON.stringify(structured, null, 2)}
        </pre>
      </section>
    </div>
  );
}
