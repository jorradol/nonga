import { useEffect, useState, type MouseEvent } from "react";
import {
  FIXTURE_ROLE_LABELS,
  type FixtureRole,
  isFixtureRole,
  readStoredFixtureRole,
  writeStoredFixtureRole,
} from "./fixtureRoles";
import {
  UI_FIXTURE_BANNER_TEXT,
  UI_FIXTURE_ROLE_BANNER_PREFIX,
  isUiFixtureBuild,
} from "./uiFixtureMode";

const ROUTES: Array<{ label: string; path: string }> = [
  { label: "Home", path: "/home" },
  { label: "Marketplace", path: "/marketplace" },
  { label: "Search", path: "/search" },
  { label: "Car", path: "/cars/fx-car-001" },
  { label: "Chat", path: "/chat" },
  { label: "Sell", path: "/sell" },
  { label: "Profile", path: "/profile" },
  { label: "Dealer", path: "/dealer" },
  { label: "Admin", path: "/admin/dashboard" },
  { label: "Post Gen", path: "/car-post-generator" },
  { label: "Captions", path: "/viral-captions" },
];

/**
 * Fixture-only QA chrome. Must not be imported by Production entry without
 * `isUiFixtureBuild` guard — Production tests assert absence of these markers.
 */
export function FixtureQaChrome() {
  if (!isUiFixtureBuild) return null;

  const [role, setRole] = useState<FixtureRole>(() => readStoredFixtureRole());

  useEffect(() => {
    document.documentElement.setAttribute("data-nonga-ui-fixture", "true");
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    meta.setAttribute("data-nonga-ui-fixture-robots", "true");
    document.head.appendChild(meta);
    return () => {
      document.documentElement.removeAttribute("data-nonga-ui-fixture");
      document.querySelectorAll('[data-nonga-ui-fixture-robots="true"]').forEach((el) => el.remove());
    };
  }, []);

  const onRoleChange = (next: string) => {
    if (!isFixtureRole(next)) return;
    writeStoredFixtureRole(next);
    setRole(next);
    window.location.reload();
  };

  const onFixtureNav = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div
      data-testid="ui-fixture-qa-chrome"
      className="sticky top-0 z-[100] border-b border-amber-700/40 bg-amber-100 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-0.5 font-semibold leading-snug">
          <p data-testid="ui-fixture-banner">{UI_FIXTURE_BANNER_TEXT}</p>
          <p data-testid="ui-fixture-role-banner">
            {UI_FIXTURE_ROLE_BANNER_PREFIX} {FIXTURE_ROLE_LABELS[role]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 font-medium">
            <span>Role</span>
            <select
              data-testid="ui-fixture-role-selector"
              className="rounded border border-amber-800/30 bg-white px-2 py-1 text-amber-950 dark:border-amber-200/20 dark:bg-amber-900 dark:text-amber-50"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
            >
              {(Object.keys(FIXTURE_ROLE_LABELS) as FixtureRole[]).map((key) => (
                <option key={key} value={key}>
                  {FIXTURE_ROLE_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <nav className="flex max-w-full flex-wrap gap-1" aria-label="Fixture page shortcuts">
            {ROUTES.map((route) => (
              <a
                key={route.path}
                href={route.path}
                onClick={onFixtureNav(route.path)}
                className="rounded bg-amber-800/10 px-1.5 py-0.5 font-medium underline-offset-2 hover:underline dark:bg-amber-100/10"
              >
                {route.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
