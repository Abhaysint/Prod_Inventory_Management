import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

const SECTION_TITLES: { match: (pathname: string) => boolean; title: string }[] = [
  { match: (p) => p === "/", title: "Dashboard" },
  { match: (p) => p.startsWith("/products"), title: "Products" },
  { match: (p) => p.startsWith("/categories"), title: "Categories" },
  { match: (p) => p.startsWith("/stock-adjustment"), title: "Stock Adjustment" },
  { match: (p) => p.startsWith("/dispatch"), title: "Smart Order Dispatch" },
  { match: (p) => p.startsWith("/transactions"), title: "Transactions" },
];

function sectionTitle(pathname: string): string {
  return SECTION_TITLES.find((section) => section.match(pathname))?.title ?? "StockSense";
}

interface HeaderProps {
  onMenuOpen: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground md:text-base">
          {sectionTitle(location.pathname)}
        </p>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Live API
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
