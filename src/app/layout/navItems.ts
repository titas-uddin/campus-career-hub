import { BarChart3, Briefcase, ClipboardList, Flag, LayoutDashboard, Search, UserRound } from "lucide-react";
import type { AppRole } from "../../features/roles/useRole";

export type NavItem = { href: string; label: string; icon: typeof UserRound };

const BY_ROLE: Record<AppRole, NavItem[]> = {
  student: [
    { href: "/student/opportunities", label: "Opportunities", icon: Search },
    { href: "/student/applications", label: "My applications", icon: ClipboardList },
    { href: "/student/profile", label: "My profile", icon: UserRound }
  ],
  employer: [
    { href: "/employer/opportunities", label: "My postings", icon: Briefcase }
  ],
  staff: [
    { href: "/staff", label: "Follow-ups", icon: LayoutDashboard },
    { href: "/staff/applications", label: "Applications", icon: ClipboardList },
    { href: "/staff/opportunities", label: "Postings", icon: Briefcase },
    { href: "/staff/flagged", label: "Flagged explanations", icon: Flag },
    { href: "/staff/analytics", label: "Placement analytics", icon: BarChart3 }
  ],
  department: [
    { href: "/department/analytics", label: "Placement analytics", icon: BarChart3 }
  ]
};

export function navItemsFor(role?: AppRole): NavItem[] {
  return role ? BY_ROLE[role] : [];
}

export function activeNavItem(items: NavItem[], path: string): NavItem | undefined {
  return [...items].sort((a, b) => b.href.length - a.href.length).find((item) => path === item.href || (item.href !== "/staff" && path.startsWith(`${item.href}/`)) || (item.href === "/staff" && path === "/staff"));
}
