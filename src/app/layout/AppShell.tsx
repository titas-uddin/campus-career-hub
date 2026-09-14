import { GraduationCap, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { activeNavItem, navItemsFor } from "./navItems";
import { UserMenu } from "./UserMenu";
import { useActor } from "../../features/roles/useRole";

const COLLAPSED_KEY = "blocks-app:sidebar-collapsed";
const MOBILE_QUERY = "(max-width: 880px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function AppShell({ activePath, children, onNavigate }: { activePath: string; children: ReactNode; onNavigate: (path: string) => void }) {
  const isMobile = useIsMobile();
  const actor = useActor();
  const [collapsedPref, setCollapsedPref] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const collapsed = collapsedPref || isMobile;
  const navItems = navItemsFor(actor.role);
  const activeItem = activeNavItem(navItems, activePath);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsedPref));
  }, [collapsedPref]);

  return (
    <div className="shell">
      <aside className={collapsed ? "collapsed" : ""}>
        <div className="sidebar-header">
          {collapsed ? null : (
            <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
              <span className="brand-mark"><GraduationCap size={16} /></span>
              <span>CampusCareer</span>
            </a>
          )}
          <button className="icon-button sidebar-collapse-toggle" onClick={() => setCollapsedPref((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <PanelLeft size={16} />
          </button>
        </div>
        <nav>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              data-tooltip={item.label}
              className={activeItem?.href === item.href ? "active" : ""}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              <item.icon size={18} />
              {collapsed ? null : <span>{item.label}</span>}
            </a>
          ))}
        </nav>
        {collapsed || !actor.role ? null : <div className="sidebar-footer">Signed in as <strong>{actor.role}</strong></div>}
      </aside>
      <div className="content">
        <header className="topbar">
          {activeItem ? (
            <div className="breadcrumb">
              <activeItem.icon size={16} />
              <span>{activeItem.label}</span>
            </div>
          ) : null}
          <div className="topbar-spacer" />
          <UserMenu onNavigate={onNavigate} />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
