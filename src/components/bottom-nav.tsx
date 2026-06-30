"use client";

import { Heart, Home, PlusCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Cellar", icon: Home },
  { href: "/add", label: "Add", icon: PlusCircle },
  { href: "/recommend", label: "Recommend", icon: Sparkles },
  { href: "/preferences", label: "Prefs", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2 shadow-lg backdrop-blur"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition",
                active && "bg-primary/10 text-primary",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
