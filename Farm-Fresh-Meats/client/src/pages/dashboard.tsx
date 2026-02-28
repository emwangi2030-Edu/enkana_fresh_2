import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchCustomers, fetchPayments, fetchProducts } from "@/lib/supabase-data";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Percent,
  Loader2,
  X,
  Truck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  LabelList,
} from "recharts";
import type { OrderItem } from "@shared/schema";
import type { ProductCatalogueItem } from "@shared/schema";

const ENKANA_FOREST = "#1a3a2a";
const ENKANA_AMBER = "#e9a82a";
const ENKANA_GREEN_MED = "#4a7c5e";
const ENKANA_GREEN_DARK = "#2d6a4f";

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: ENKANA_AMBER,
  confirmed: ENKANA_FOREST,
  processing: ENKANA_GREEN_MED,
  delivered: ENKANA_GREEN_DARK,
  cancelled: "#ccc",
};

const STATUS_ORDER = ["pending", "confirmed", "processing", "delivered", "cancelled"];

function formatDeliveryMonth(m: string): string {
  const [y, mo] = m.split("-");
  const d = new Date(parseInt(y), parseInt(mo) - 1, 5);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function getNextDelivery(orders: { deliveryMonth: string | null; status: string }[]): {
  date: string;
  dateLabel: string;
  month: string;
  count: number;
  daysToGo: number;
} | null {
  const now = new Date();
  const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const active = orders.filter((o) => o.status !== "cancelled" && o.deliveryMonth);
  const futureMonths = [...new Set(active.map((o) => o.deliveryMonth!).filter((m) => m >= currentYYYYMM))].sort();
  const nextMonth = futureMonths[0];
  if (!nextMonth) return null;
  const count = active.filter((o) => o.deliveryMonth === nextMonth).length;
  const [y, mo] = nextMonth.split("-");
  const deliveryDate = new Date(parseInt(y), parseInt(mo) - 1, 5);
  const daysToGo = Math.max(0, Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return {
    month: nextMonth,
    date: `${y}-${mo}-05`,
    dateLabel: formatDeliveryMonth(nextMonth),
    count,
    daysToGo,
  };
}

function isRequisitionPendingForMonth(month: string): boolean {
  try {
    const raw = localStorage.getItem("enkana-margin-tracker-statuses");
    if (!raw) return true;
    const statuses: Record<string, string> = JSON.parse(raw);
    return Object.values(statuses).some((s) => s === "Pending");
  } catch {
    return true;
  }
}

export default function Dashboard() {
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem("enkana-dashboard-banner-dismissed") === "1";
  });
  const [revenueView, setRevenueView] = useState<"6" | "all">("6");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem("enkana-dashboard-banner-dismissed", "1");
  }, []);

  const isLoading = ordersLoading || customersLoading;

  const paidOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && o.paymentStatus === "paid"),
    [orders]
  );
  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelled" && o.paymentStatus !== "paid"),
    [orders]
  );
  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "cancelled"), [orders]);

  const totalRevenue = useMemo(
    () => paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [paidOrders]
  );
  const pendingKes = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [pendingOrders]
  );
  const avgOrderValue = useMemo(
    () => (paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0),
    [totalRevenue, paidOrders.length]
  );

  const nextDelivery = useMemo(() => getNextDelivery(orders), [orders]);
  const requisitionPending = nextDelivery ? isRequisitionPendingForMonth(nextDelivery.month) : false;

  const uniqueCustomerIds = useMemo(
    () => new Set(activeOrders.filter((o) => o.customerId).map((o) => o.customerId!)),
    [activeOrders]
  );
  const customerOrderCounts = useMemo(() => {
    const c: Record<string, number> = {};
    activeOrders.forEach((o) => {
      if (o.customerId) {
        c[o.customerId] = (c[o.customerId] || 0) + 1;
      }
    });
    return c;
  }, [activeOrders]);
  const repeatCustomers = useMemo(
    () => Object.values(customerOrderCounts).filter((n) => n >= 2).length,
    [customerOrderCounts]
  );
  const repeatPct = useMemo(
    () => (uniqueCustomerIds.size ? Math.round((repeatCustomers / uniqueCustomerIds.size) * 100) : 0),
    [repeatCustomers, uniqueCustomerIds.size]
  );

  const lastCompletedDeliveryMargin = useMemo(() => {
    const deliveredByMonth: Record<string, { revenue: number; cost: number }> = {};
    activeOrders.forEach((o) => {
      const m = o.deliveryMonth;
      if (!m || o.status !== "delivered") return;
      if (!deliveredByMonth[m]) deliveredByMonth[m] = { revenue: 0, cost: 0 };
      deliveredByMonth[m].revenue += o.totalAmount || 0;
      (o.items || []).forEach((item: OrderItem) => {
        const p = products.find((x: ProductCatalogueItem) => x.id === item.productId);
        const costPer = p?.costPrice ?? 0;
        deliveredByMonth[m].cost += (item.quantity || 0) * costPer;
      });
    });
    const months = Object.keys(deliveredByMonth).sort().reverse();
    const last = months[0];
    if (!last) return null;
    const { revenue, cost } = deliveredByMonth[last];
    if (revenue <= 0) return null;
    const pct = Math.round(((revenue - cost) / revenue) * 100);
    return { pct, month: last };
  }, [activeOrders, products]);

  const topProducts = useMemo(() => {
    const byProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
    activeOrders.forEach((o) => {
      (o.items || []).forEach((item: OrderItem) => {
        const name = item.productName || item.productId || "Unknown";
        if (!byProduct[name]) byProduct[name] = { name, quantity: 0, revenue: 0 };
        byProduct[name].quantity += item.quantity || 0;
        byProduct[name].revenue += item.subtotal || 0;
      });
    });
    return Object.values(byProduct)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [activeOrders]);

  const orderStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => { counts[s] = 0; });
    orders.forEach((o) => {
      const s = o.status || "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return STATUS_ORDER.map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: counts[key] ?? 0,
      fill: ORDER_STATUS_COLORS[key] ?? "#ccc",
    }));
  }, [orders]);

  const totalOrders = orders.length;
  const revenueByCycle = useMemo(() => {
    const byMonth: Record<string, { revenue: number; cost: number }> = {};
    activeOrders.forEach((o) => {
      const m = o.deliveryMonth;
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { revenue: 0, cost: 0 };
      byMonth[m].revenue += o.totalAmount || 0;
      (o.items || []).forEach((item: OrderItem) => {
        const p = products.find((x: ProductCatalogueItem) => x.id === item.productId);
        byMonth[m].cost += (item.quantity || 0) * (p?.costPrice ?? 0);
      });
    });
    let entries = Object.entries(byMonth)
      .map(([month, { revenue, cost }]) => ({
        month,
        label: formatDeliveryMonth(month),
        revenue,
        marginPct: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    if (revenueView === "6") entries = entries.slice(-6);
    return entries;
  }, [activeOrders, products, revenueView]);

  if (isLoading) {
    return (
      <div className="p-4 max-w-5xl mx-auto min-h-full bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-3">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of orders, customers, and payments</p>
      </div>

      {/* Next Delivery Banner */}
      {!bannerDismissed && nextDelivery && (
        <div
          className="mb-4 rounded-lg border-l-4 py-3 px-3 flex items-start justify-between gap-3"
          style={{
            backgroundColor: "rgba(233, 168, 42, 0.15)",
            borderLeftColor: ENKANA_AMBER,
          }}
        >
          <div>
            <p className="alert-banner-main">
              Next Delivery: {nextDelivery.dateLabel} · {nextDelivery.count} orders confirmed · {nextDelivery.daysToGo} days to go
            </p>
            {requisitionPending && (
              <p className="alert-banner-warning mt-1">
                ⚠ Animals not yet sourced — check Requisition Report
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/orders/requisition" className="alert-banner-main underline">
              View Requisition
            </Link>
            <button
              type="button"
              onClick={dismissBanner}
              className="p-1 rounded hover:bg-black/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" style={{ color: ENKANA_FOREST }} />
            </button>
          </div>
        </div>
      )}

      {/* 6 metric cards — 3 columns, 2 rows */}
      <section className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0" aria-label="Key metrics">
        <Link href="/orders">
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: ENKANA_FOREST }}>
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Total Revenue</div>
                <div className="metric-value break-words" title={`KES ${totalRevenue.toLocaleString()}`}>KES {totalRevenue.toLocaleString()}</div>
                <div className="metric-label truncate">Paid orders</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: ENKANA_AMBER }}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Pending KES</div>
                <div className="metric-value break-words" title={`KES ${pendingKes.toLocaleString()}`}>KES {pendingKes.toLocaleString()}</div>
                <div className="metric-label truncate">{pendingOrders.length} orders unpaid</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={nextDelivery ? "/orders/dispatch" : "/orders"}>
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: ENKANA_FOREST }}>
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Next Delivery</div>
                <div className="metric-value truncate">{nextDelivery ? nextDelivery.count : 0} orders</div>
                <div className="metric-label truncate">{nextDelivery ? nextDelivery.dateLabel : "—"}</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: ENKANA_FOREST }}>
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Avg Order Value</div>
                <div className="metric-value break-words" title={`KES ${avgOrderValue.toLocaleString()}`}>KES {avgOrderValue.toLocaleString()}</div>
                <div className="metric-label truncate">Per order average</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/reports/enkana-margin-tracker">
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                style={{
                  backgroundColor:
                    lastCompletedDeliveryMargin == null
                      ? "hsl(var(--muted-foreground))"
                      : lastCompletedDeliveryMargin.pct >= 40
                        ? ENKANA_GREEN_DARK
                        : lastCompletedDeliveryMargin.pct >= 20
                          ? ENKANA_AMBER
                          : "hsl(var(--destructive))",
                }}
              >
                <Percent className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Gross Margin %</div>
                <div className="metric-value truncate">
                  {lastCompletedDeliveryMargin != null ? `${lastCompletedDeliveryMargin.pct}%` : "—"}
                </div>
                <div className="metric-label truncate">Last delivery cycle</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/customers">
          <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full">
            <div className="flex items-center gap-3 p-3 min-h-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: ENKANA_FOREST }}>
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="metric-card-title truncate">Repeat Customers</div>
                <div className="metric-value truncate">{repeatPct}%</div>
                <div className="metric-label truncate">Of total customers</div>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm p-3">
          <h2 className="section-heading mb-3">Best selling products (by quantity)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No order data yet</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, "Quantity"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="quantity" fill={ENKANA_FOREST} radius={[0, 4, 4, 0]} name="Quantity">
                    <LabelList dataKey="quantity" position="right" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm p-3">
          <h2 className="section-heading mb-3">Orders by status</h2>
          {totalOrders === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders yet</p>
          ) : (
            <div className="h-72 flex items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {orderStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, `${n} (${totalOrders ? Math.round((v / totalOrders) * 100) : 0}%)`]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Legend formatter={(name, entry: { payload?: { value: number } }) => `${name}: ${entry?.payload?.value ?? 0} (${totalOrders ? Math.round(((entry?.payload?.value ?? 0) / totalOrders) * 100) : 0}%)`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-foreground">{totalOrders}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Revenue by Delivery Cycle */}
      <Card className="overflow-hidden border-0 rounded-xl bg-white shadow-sm p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="section-heading">Revenue by Delivery Cycle</h2>
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setRevenueView("6")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${revenueView === "6" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Last 6 cycles
            </button>
            <button
              type="button"
              onClick={() => setRevenueView("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md ${revenueView === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              All time
            </button>
          </div>
        </div>
        {revenueByCycle.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No completed delivery cycles yet. Revenue will appear after your first delivery.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueByCycle} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number, name: string) => (name === "revenue" ? [`KES ${Number(value).toLocaleString()}`, "Revenue"] : [value, "Margin %"])}
                  labelFormatter={(label) => label}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill={ENKANA_FOREST} name="revenue" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke={ENKANA_AMBER} strokeWidth={2} name="Margin %" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <section className="mb-4">
        <h2 className="section-heading mb-2">Quick Actions</h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link
            href="/customers/new"
            className="font-medium transition-colors hover:underline [color:var(--enkana-forest)] hover:[color:var(--enkana-amber)]"
          >
            → Add a customer
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/orders"
            className="font-medium transition-colors hover:underline [color:var(--enkana-forest)] hover:[color:var(--enkana-amber)]"
          >
            → Record a new order
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/reports/enkana-margin-tracker"
            className="font-medium transition-colors hover:underline [color:var(--enkana-forest)] hover:[color:var(--enkana-amber)]"
          >
            → Log animal purchase
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            href="/orders/dispatch"
            className="font-medium transition-colors hover:underline [color:var(--enkana-forest)] hover:[color:var(--enkana-amber)]"
          >
            → Mark orders as delivered
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-muted-foreground cursor-default">→ Send payment reminder (coming soon)</span>
        </div>
      </section>
    </div>
  );
}
