import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  ShoppingBag,
  Users,
  CreditCard,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  Menu,
  X,
  FileBarChart,
  Package,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUILD_LABEL = "2026-02-25";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
};

const menuItems: MenuItem[] = [
  {
    label: "Orders",
    href: "/orders",
    icon: <ShoppingBag className="h-4 w-4" />,
    children: [
      { label: "All Orders", href: "/orders" },
      { label: "Requisition Report", href: "/orders/requisition" },
      { label: "Delivery Dispatch", href: "/orders/dispatch" },
      { label: "Customers", href: "/customers" },
    ],
  },
  {
    label: "Margin Tracker",
    href: "/reports/enkana-margin-tracker",
    icon: <FileBarChart className="h-4 w-4" />,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: <Users className="h-4 w-4" />,
    children: [
      { label: "Customer List", href: "/customers" },
      { label: "Review Duplicates", href: "/customers/duplicates" },
    ],
  },
  {
    label: "Payments",
    href: "/payments",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: "Products",
    href: "/products",
    icon: <Package className="h-4 w-4" />,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <FileBarChart className="h-4 w-4" />,
    children: [
      { label: "Monthly Report", href: "/reports" },
      { label: "Margin Tracker", href: "/reports/enkana-margin-tracker" },
    ],
  },
];

function isActive(currentPath: string, href: string): boolean {
  const path = currentPath.replace(/^\/dashboard/, "") || "/";
  if (href === "/orders") {
    return path === "/orders" || path === "/" || path.startsWith("/orders/");
  }
  if (href === "/customers") {
    return path === "/customers" || path.startsWith("/customers/");
  }
  return path.startsWith(href);
}

function isChildActive(currentPath: string, childHref: string): boolean {
  const path = currentPath.replace(/^\/dashboard/, "") || "/";
  if (path === "/" && childHref === "/orders") return true;
  return path === childHref;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ Orders: true, Customers: true, Reports: true });
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
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src="/logo.png"
          alt="Enkana Fresh"
          className="h-9 w-9 rounded-full object-cover shadow-sm"
        />
        <div>
          <div className="font-display text-base tracking-tight text-foreground">Enkana Fresh</div>
          <div className="text-[11px] font-medium text-primary/70">Admin Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" data-testid="nav-sidebar">
        <Link href="/" data-testid="nav-home">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive(location, "/orders") ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
            <Home className="h-4 w-4" />
            Dashboard
          </div>
        </Link>

        <div className="my-3 border-t border-sidebar-border" />

        {menuItems.map((item) => {
          const active = isActive(location, item.href);
          const expanded = expandedMenus[item.label] ?? false;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  )}
                </button>
              ) : (
                <Link href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                </Link>
              )}

              {hasChildren && expanded && (
                <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                  {item.children!.map((child) => {
                    const childActive = isChildActive(location, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        data-testid={`nav-sub-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div
                          className={`rounded-md px-3 py-2 text-sm transition ${childActive ? "bg-sidebar-accent font-semibold text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                        >
                          {child.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block" data-testid="sidebar">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 h-full w-64 bg-sidebar border-r border-sidebar-border shadow-xl">
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
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 lg:hidden">
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
            <span className="font-display text-sm text-foreground">Enkana Fresh</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <footer className="shrink-0 border-t border-border bg-muted/30 px-4 py-1.5 text-center text-xs text-muted-foreground">
          Build {BUILD_LABEL} • Admin at <span className="font-mono">http://127.0.0.1:5001</span>
        </footer>
      </div>
    </div>
  );
}
