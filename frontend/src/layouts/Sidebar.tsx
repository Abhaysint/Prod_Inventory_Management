import { FolderTree, LayoutDashboard, Package, SlidersHorizontal, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: FolderTree },
  { to: "/stock-adjustment", label: "Stock Adjustment", icon: SlidersHorizontal },
  { to: "/dispatch", label: "Smart Dispatch", icon: Truck },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Package className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          StockSense
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Inventory Management
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
      <SidebarBrand />
      <SidebarNav />
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">StockSense v1.0</p>
      </div>
    </aside>
  );
}
