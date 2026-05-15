/**
 * CommandPalette — Cmd+K (Ctrl+K on Windows) global launcher.
 *
 * Day-1 actions for workspace operators:
 *   - Jump to dashboard / interviews / pool / settings
 *   - Create new interview
 *   - Switch domain (Accounting / Taxation / Management Consulting)
 *   - Open data + privacy
 *   - Sign out
 *
 * Recent actions persist via localStorage[fh_cmdk_recent] (MRU, max 5).
 *
 * Recruiters live in keyboards. Linear ships this; we should too.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const RECENT_STORAGE_KEY = "fh_cmdk_recent";
const MAX_RECENT = 5;

interface PaletteAction {
  id: string;
  label: string;
  shortcut?: string;
  group: "navigation" | "create" | "settings" | "domain" | "session";
  perform: () => void;
}

function readRecent(): string[] {
  try {
    const v = window.localStorage.getItem(RECENT_STORAGE_KEY);
    return v ? (JSON.parse(v) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string): void {
  try {
    const cur = readRecent().filter((x) => x !== id);
    cur.unshift(id);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const { setCurrentWorkspace } = useWorkspace();

  // Cmd+K / Ctrl+K binding
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = useCallback(
    (action: PaletteAction) => {
      pushRecent(action.id);
      setOpen(false);
      // Defer to allow dialog close animation
      requestAnimationFrame(() => action.perform());
    },
    [],
  );

  // Only mount palette when authenticated. Anonymous routes don't need it.
  if (!isAuthenticated) return null;

  const actions: PaletteAction[] = [
    // Navigation
    { id: "nav.dashboard", label: "Go to dashboard", group: "navigation", perform: () => navigate("/dashboard") },
    { id: "nav.screening", label: "Go to screening interviews", group: "navigation", perform: () => navigate("/interviews/screening") },
    { id: "nav.fitment", label: "Go to fitment interviews", group: "navigation", perform: () => navigate("/interviews/fitment") },
    { id: "nav.lists", label: "Go to talent pools", group: "navigation", perform: () => navigate("/lists") },
    { id: "nav.settings", label: "Go to settings", group: "navigation", perform: () => navigate("/settings") },
    { id: "nav.data", label: "Open data & privacy", group: "navigation", perform: () => navigate("/account/data") },

    // Create
    { id: "create.interview.screening", label: "Create screening interview", shortcut: "C", group: "create", perform: () => navigate("/interviews/create?type=screening") },
    { id: "create.interview.fitment", label: "Create fitment interview", group: "create", perform: () => navigate("/interviews/create?type=fitment") },

    // Session
    { id: "session.signout", label: "Sign out", group: "session", perform: () => { logout(); navigate("/"); } },
  ];

  // Surface recent actions at top
  const recentIds = readRecent();
  const recent = recentIds
    .map((id) => actions.find((a) => a.id === id))
    .filter((a): a is PaletteAction => Boolean(a));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No commands match.</CommandEmpty>

        {recent.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recent.map((a) => (
                <CommandItem key={a.id} onSelect={() => run(a)}>
                  {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigate">
          {actions.filter((a) => a.group === "navigation").map((a) => (
            <CommandItem key={a.id} onSelect={() => run(a)}>
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Create">
          {actions.filter((a) => a.group === "create").map((a) => (
            <CommandItem key={a.id} onSelect={() => run(a)}>
              {a.label}
              {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Session">
          {actions.filter((a) => a.group === "session").map((a) => (
            <CommandItem key={a.id} onSelect={() => run(a)}>
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
