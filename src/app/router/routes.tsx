import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { RouterContext, matchPath } from "./context";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { homePathFor, useActor } from "../../features/roles/useRole";
import type { AppRole } from "../../features/roles/useRole";
import { OpportunitiesPage } from "../../features/student/OpportunitiesPage";
import { OpportunityDetailPage } from "../../features/student/OpportunityDetailPage";
import { MyApplicationsPage } from "../../features/student/MyApplicationsPage";
import { StudentProfilePage } from "../../features/student/StudentProfilePage";
import { ApplicationDetailPage } from "../../features/applications/ApplicationDetailPage";
import { EmployerOpportunitiesPage } from "../../features/employer/EmployerOpportunitiesPage";
import { OpportunityFormPage } from "../../features/employer/OpportunityFormPage";
import { ApplicantsPage } from "../../features/employer/ApplicantsPage";
import { StaffDashboardPage } from "../../features/staff/StaffDashboardPage";
import { StaffApplicationsPage } from "../../features/staff/StaffApplicationsPage";
import { FlaggedExplanationsPage } from "../../features/staff/FlaggedExplanationsPage";
import { StaffOpportunitiesPage } from "../../features/staff/StaffOpportunitiesPage";
import { AnalyticsPage } from "../../features/analytics/AnalyticsPage";
import { LoadingScreen } from "../../shared/ui/LoadingScreen";
import { EmptyState } from "../../shared/ui/EmptyState";

type Route = { pattern: string; roles?: AppRole[]; Page: ComponentType };

const routes: Route[] = [
  { pattern: "/profile", Page: ProfilePage },
  { pattern: "/error", Page: ErrorPage },
  { pattern: "/student/opportunities", roles: ["student"], Page: OpportunitiesPage },
  { pattern: "/student/opportunities/:id", roles: ["student"], Page: OpportunityDetailPage },
  { pattern: "/student/applications", roles: ["student"], Page: MyApplicationsPage },
  { pattern: "/student/applications/:id", roles: ["student"], Page: ApplicationDetailPage },
  { pattern: "/student/profile", roles: ["student"], Page: StudentProfilePage },
  { pattern: "/employer/opportunities", roles: ["employer"], Page: EmployerOpportunitiesPage },
  { pattern: "/employer/opportunities/new", roles: ["employer"], Page: OpportunityFormPage },
  { pattern: "/employer/opportunities/:id/edit", roles: ["employer"], Page: OpportunityFormPage },
  { pattern: "/employer/opportunities/:id/applicants", roles: ["employer"], Page: ApplicantsPage },
  { pattern: "/employer/applications/:id", roles: ["employer"], Page: ApplicationDetailPage },
  { pattern: "/staff", roles: ["staff"], Page: StaffDashboardPage },
  { pattern: "/staff/applications", roles: ["staff"], Page: StaffApplicationsPage },
  { pattern: "/staff/applications/:id", roles: ["staff"], Page: ApplicationDetailPage },
  { pattern: "/staff/opportunities", roles: ["staff"], Page: StaffOpportunitiesPage },
  { pattern: "/staff/flagged", roles: ["staff"], Page: FlaggedExplanationsPage },
  { pattern: "/staff/analytics", roles: ["staff"], Page: AnalyticsPage },
  { pattern: "/department/analytics", roles: ["department"], Page: AnalyticsPage }
];

function resolve(path: string): { route: Route; params: Record<string, string> } | undefined {
  for (const route of routes) {
    const params = matchPath(route.pattern, path);
    if (params) return { route, params };
  }
  return undefined;
}

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
    window.scrollTo({ top: 0 });
  }

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} />
      </RedirectIfAuthenticated>
    );
  }

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <RoleAwareOutlet path={path} navigate={navigate} />
    </RequireAuth>
  );
}

function RoleAwareOutlet({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const actor = useActor();
  const resolved = resolve(path);

  useEffect(() => {
    if (!actor.loading && path === "/") navigate(homePathFor(actor.role));
  }, [actor.loading, actor.role, path, navigate]);

  if (actor.loading || path === "/") return <LoadingScreen />;

  let content;
  if (path === "/no-role") {
    content = <EmptyState title="No role assigned yet" description="Ask career services to assign you the student, employer, staff or department role, then sign in again." />;
  } else if (!resolved) {
    return <NotFoundPage onNavigate={navigate} />;
  } else if (resolved.route.roles && (!actor.role || !resolved.route.roles.includes(actor.role))) {
    content = <EmptyState title="Not available for your role" description={`This screen is only for ${resolved.route.roles.join(", ")} users.`} action={<button className="primary-button" onClick={() => navigate(homePathFor(actor.role))}>Go to my home</button>} />;
  } else {
    const Page = resolved.route.Page;
    content = <Page />;
  }

  return (
    <RouterContext.Provider value={{ path, params: resolved?.params ?? {}, navigate }}>
      <AppShell activePath={path} onNavigate={navigate}>{content}</AppShell>
    </RouterContext.Provider>
  );
}
