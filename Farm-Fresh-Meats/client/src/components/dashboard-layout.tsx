import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Leaf,
  ShoppingBag,
  Users,
  CreditCard,
  ChevronDown,
  LogOut,
  Home,
  Menu,
  X,
  FileBarChart,
  Package,
  Settings,
  Plus,
  ClipboardList,
  Truck,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUILD_LABEL = "2026-02-25";

// Sidebar uses paths relative to the dashboard nest. Wouter resolves these against the parent
// (/dashboard), so e.g. "/orders" becomes /dashboard/orders.
type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/", icon: <Home className="h-4 w-4 shrink-0" /> },
  {
    label: "Sales & Operations",
    href: "/orders",
    icon: <ShoppingBag className="h-4 w-4 shrink-0" />,
    children: [
      { label: "All Orders", href: "/orders" },
      { label: "Requisition Report", href: "/orders/requisition" },
      { label: "Delivery Dispatch", href: "/orders/dispatch" },
    ],
  },
  { label: "Customers", href: "/customers", icon: <Users className="h-4 w-4 shrink-0" /> },
  { label: "Products & Pricing", href: "/products", icon: <Package className="h-4 w-4 shrink-0" /> },
  { label: "Payments", href: "/payments", icon: <CreditCard className="h-4 w-4 shrink-0" /> },
  {
    label: "Reports",
    href: "/reports",
    icon: <FileBarChart className="h-4 w-4 shrink-0" />,
    children: [
      { label: "Margin Tracker", href: "/reports/enkana-margin-tracker" },
      { label: "Monthly Report", href: "/reports" },
      { label: "Product Mix", href: "/reports/product-mix" },
    ],
  },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4 shrink-0" /> },
];

/** 1px divider between nav groups; 4px margin above/below */
function NavDivider() {
  return <div className="my-1 h-px bg-[#e0d8cc]" role="separator" />;
}

function toInnerPath(fullPath: string): string {
  return fullPath.replace(/^\/dashboard/, "") || "/";
}

function isActive(currentPath: string, href: string): boolean {
  const path = toInnerPath(currentPath);
  if (href === "/") return path === "/" || path === "";
  if (href === "/orders") return path === "/orders" || path.startsWith("/orders/");
  if (href === "/customers") return path === "/customers" || path.startsWith("/customers/");
  if (href === "/products") return path === "/products";
  if (href === "/settings") return path === "/settings" || path.startsWith("/settings/");
  if (href === "/reports") return path === "/reports" || path.startsWith("/reports/");
  return path === href || path.startsWith(href + "/");
}

function isChildActive(currentPath: string, childHref: string): boolean {
  const path = toInnerPath(currentPath);
  return path === childHref;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace("/login");
        return;
      }
      setAuthChecked(true);
    });
  }, []);

  function toggleMenu(label: string) {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-primary/60">
          <Leaf className="h-5 w-5 animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <img
          src="/logo.png"
          alt="Enkana Fresh"
          className="h-8 w-8 rounded-full object-cover shadow-sm"
        />
        <div className="min-w-0">
          <div className="nav-brand truncate">Enkana Fresh</div>
          <div className="nav-brand-subtitle">Admin Dashboard</div>
        </div>
      </div>

      <div className="px-3 my-2 flex justify-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-fit min-w-0 h-auto py-1.5 pr-1 pl-0 gap-2 rounded-full border-0 shadow-none text-[var(--color-text-heading)] hover:bg-[#f5f0e8]/60 hover:text-[var(--color-text-heading)]"
              data-testid="button-create-new"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-heading)]/90 text-white">
                <Plus className="h-2.5 w-2.5" />
              </span>
              <span className="nav-item">Create New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="right"
            sideOffset={8}
            className="min-w-[200px] rounded-xl border border-border bg-white p-1 shadow-lg animate-in fade-in-0 duration-150 data-[side=right]:slide-in-from-left-2"
          >
            <DropdownMenuItem asChild className="rounded-lg border-l-[3px] border-l-transparent py-2.5 px-3 text-[#1a3a2a] data-[highlighted]:bg-[#f5f0e8] data-[highlighted]:border-l-[#e9a82a] data-[highlighted]:outline-none">
              <Link href="/orders" className="flex cursor-pointer items-center gap-2 w-full">
                <ClipboardList className="h-4 w-4 shrink-0" />
                New Order
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg border-l-[3px] border-l-transparent py-2.5 px-3 text-[#1a3a2a] data-[highlighted]:bg-[#f5f0e8] data-[highlighted]:border-l-[#e9a82a] data-[highlighted]:outline-none">
              <Link href="/customers/new" className="flex cursor-pointer items-center gap-2 w-full">
                <Users className="h-4 w-4 shrink-0" />
                New Customer
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg border-l-[3px] border-l-transparent py-2.5 px-3 text-[#1a3a2a] data-[highlighted]:bg-[#f5f0e8] data-[highlighted]:border-l-[#e9a82a] data-[highlighted]:outline-none">
              <Link href="/payments" className="flex cursor-pointer items-center gap-2 w-full">
                <DollarSign className="h-4 w-4 shrink-0" />
                Record Payment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg border-l-[3px] border-l-transparent py-2.5 px-3 text-[#1a3a2a] data-[highlighted]:bg-[#f5f0e8] data-[highlighted]:border-l-[#e9a82a] data-[highlighted]:outline-none">
              <Link href="/orders/dispatch" className="flex cursor-pointer items-center gap-2 w-full">
                <Truck className="h-4 w-4 shrink-0" />
                New Delivery Cycle
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" data-testid="nav-sidebar">
        {/* Group 1 — Main */}
        {(() => {
          const item = menuItems[0];
          const active = isActive(location, item.href);
          return (
            <div key={item.label}>
              <Link href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                <div
                  className={`flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item transition-colors duration-150 ${
                    active ? "bg-[#f5f0e8] text-[#1a3a2a]" : "text-[var(--color-text-muted)] hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            </div>
          );
        })()}
        <NavDivider />

        {/* Group 2 — Operations */}
        {(() => {
          const item = menuItems[1];
          const active = isActive(location, item.href);
          const expanded = expandedMenus[item.label!] ?? false;
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                className={`flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item transition-colors duration-150 ${
                  active ? "bg-[#f5f0e8] text-[#1a3a2a]" : "text-[var(--color-text-muted)] hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                }`}
                data-testid={`nav-${item.label!.toLowerCase()}`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-150 ease-out ${expanded ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`overflow-hidden transition-[max-height] duration-150 ease-out ${expanded ? "max-h-32" : "max-h-0"}`}
              >
                <div className="ml-3 mt-0.5 border-l border-sidebar-border pl-3 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = isChildActive(location, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        data-testid={`nav-sub-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                          <div
                            className={`rounded-full px-3 py-1.5 nav-item-sub transition-colors ${
                              childActive ? "bg-[#f5f0e8] text-[#1a3a2a]" : "hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                            }`}
                          >
                            {child.label}
                          </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
        <NavDivider />

        {/* Group 3 — Master Data & Finance */}
        {[menuItems[2], menuItems[3], menuItems[4]].map((item) => {
          const active = isActive(location, item.href);
          return (
            <div key={item.label}>
              <Link href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                <div
                  className={`flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item transition-colors duration-150 ${
                    active ? "bg-[#f5f0e8] text-[#1a3a2a]" : "text-[var(--color-text-muted)] hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            </div>
          );
        })}
        <NavDivider />

        {/* Group 4 — Insights & Config */}
        {(() => {
          const item = menuItems[5];
          const active = isActive(location, item.href);
          const expanded = expandedMenus[item.label!] ?? false;
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                className={`flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item transition-colors duration-150 ${
                  active ? "bg-[#f5f0e8] text-[#1a3a2a]" : "text-[var(--color-text-muted)] hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                }`}
                data-testid={`nav-${item.label!.toLowerCase()}`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-150 ease-out ${expanded ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`overflow-hidden transition-[max-height] duration-150 ease-out ${expanded ? "max-h-32" : "max-h-0"}`}
              >
                <div className="ml-3 mt-0.5 border-l border-sidebar-border pl-3 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = isChildActive(location, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        data-testid={`nav-sub-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                          <div
                            className={`rounded-full px-3 py-1.5 nav-item-sub transition-colors ${
                              childActive ? "bg-[#f5f0e8] text-[#1a3a2a]" : "hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                            }`}
                          >
                            {child.label}
                          </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
        {(() => {
          const item = menuItems[6];
          const active = isActive(location, item.href);
          return (
            <div key={item.label}>
              <Link href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                <div
                  className={`flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item transition-colors duration-150 ${
                    active ? "bg-[#f5f0e8] text-[#1a3a2a]" : "text-[var(--color-text-muted)] hover:bg-sidebar-accent hover:text-[var(--color-text-heading)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            </div>
          );
        })()}
        <NavDivider />

        {/* Group 5 — Account (Log out in footer) */}
      </nav>

      <div className="border-t border-[#e0d8cc] px-3 py-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 nav-item text-[var(--color-text-muted)] transition-colors hover:bg-destructive/10 hover:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-[240px] shrink-0 border-r border-sidebar-border bg-sidebar lg:block" data-testid="sidebar">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 h-full w-[240px] bg-sidebar border-r border-sidebar-border shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-border bg-card px-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <img src="/logo.png" alt="Enkana Fresh" className="h-7 w-7 rounded-full object-cover shadow-sm" />
            <span className="nav-brand">Enkana Fresh</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <footer className="shrink-0 border-t border-border bg-muted/30 px-3 py-1 text-center footer-build">
          Build {BUILD_LABEL} • Admin at <span className="font-mono">http://127.0.0.1:5001</span>
        </footer>
      </div>
    </div>
  );
}
