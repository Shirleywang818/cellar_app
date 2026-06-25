import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { PreferencesEditor } from "@/components/preferences-editor";
import { env } from "@/lib/env";
import { getPreferenceProfile } from "@/lib/preferences";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const profile = await getPreferenceProfile(env.OWNER_USER_ID);

  return (
    <main className="shell">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to cellar
      </Link>

      <header className="mb-6 border-b border-border pb-5">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Heart aria-hidden="true" className="size-4" />
          Preferences
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">
          Taste memory
        </h1>
      </header>

      <PreferencesEditor profile={profile} />
    </main>
  );
}
