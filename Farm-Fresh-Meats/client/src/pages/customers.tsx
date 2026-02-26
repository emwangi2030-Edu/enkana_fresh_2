import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, fetchCustomersPaginated, fetchOrders, updateOrder, updateCustomer, deleteCustomer } from "@/lib/supabase-data";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Phone,
  MapPin,
  Users,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  UserPlus,
  Download,
  MessageCircle,
  Tag,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import type { Customer, Order } from "@shared/schema";

const DUPLICATE_DISMISS_KEY = "enkana_dup_dismiss";
const DISMISS_DAYS = 30;

function getDismissedPairKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DUPLICATE_DISMISS_KEY);
    const list: { pairKey: string; dismissedAt: number }[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return new Set(list.filter((x) => x.dismissedAt >= cutoff).map((x) => x.pairKey));
  } catch {
    return new Set();
  }
}

function dismissPair(id1: string, id2: string): void {
  const pairKey = [id1, id2].sort().join(",");
  const raw = localStorage.getItem(DUPLICATE_DISMISS_KEY);
  const list: { pairKey: string; dismissedAt: number }[] = raw ? JSON.parse(raw) : [];
  list.push({ pairKey, dismissedAt: Date.now() });
  localStorage.setItem(DUPLICATE_DISMISS_KEY, JSON.stringify(list));
}

const PAGE_SIZES = [25, 50, 100] as const;
type ViewMode = "cards" | "table";
type SortKey = "totalSpent" | "lastOrderDate" | "name" | "orderCount" | "zone" | "health";
type HealthStatus = "active" | "at_risk" | "lapsed" | "new" | null;

/** Days since last order: active ≤30, at_risk 31–60, lapsed >60 */
const HEALTH_DAYS_ACTIVE = 30;
const HEALTH_DAYS_AT_RISK = 60;

function getHealthStatus(orderCount: number, lastOrderDate: string | null): HealthStatus {
  if (orderCount <= 1) return "new";
  if (!lastOrderDate) return "lapsed";
  const days = (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= HEALTH_DAYS_ACTIVE) return "active";
  if (days <= HEALTH_DAYS_AT_RISK) return "at_risk";
  return "lapsed";
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < HEALTH_DAYS_ACTIVE) return `${days} days ago`;
  if (days < HEALTH_DAYS_AT_RISK) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

type CustomerWithStats = Customer & {
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string | null;
  health: HealthStatus;
};

function enrichCustomers(customers: Customer[], orders: Order[]): CustomerWithStats[] {
  return customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const nonCancelled = custOrders.filter((o) => o.status !== "cancelled");
    const totalSpent = nonCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = custOrders.length;
    const sorted = [...custOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastOrderDate = sorted[0]?.createdAt ?? null;
    const health = getHealthStatus(orderCount, lastOrderDate);
    return { ...c, totalSpent, orderCount, lastOrderDate, health };
  });
}

/** Days since last order for "At Risk" (31–60) and "Lapsed" (60+). */
function daysSinceLastOrder(lastOrderDate: string | null): number | null {
  if (!lastOrderDate) return null;
  return Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
}

/** List filter applied from metric card clicks (repeat only, at risk, lapsed, or top zone). */
type ListFilter = { type: "repeat" } | { type: "health"; health: "at_risk" | "lapsed" } | { type: "zone"; zone: string } | null;

function DuplicatePairRow({
  customerA,
  customerB,
  orders,
  onMerged,
  onDismiss,
}: {
  customerA: Customer;
  customerB: Customer;
  orders: Order[];
  onMerged: () => void;
  onDismiss: () => void;
}) {
  const queryClient = useQueryClient();
  const [merging, setMerging] = useState(false);
  const ordersB = orders.filter((o) => o.customerId === customerB.id);

  const handleMerge = async () => {
    setMerging(true);
    try {
      for (const o of ordersB) {
        await updateOrder(o.id, { customerId: customerA.id });
      }
      const notesA = (customerA.notes || "").trim();
      const notesB = (customerB.notes || "").trim();
      const mergedNotes = [notesA, notesB].filter(Boolean).join("\n\n");
      if (mergedNotes) await updateCustomer(customerA.id, { notes: mergedNotes });
      await deleteCustomer(customerB.id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      dismissPair(customerA.id, customerB.id);
      onMerged();
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-white/80 border border-amber-200">
      <div>
        <p className="text-xs font-medium text-amber-800 mb-1">Record A (keep)</p>
        <p className="font-medium">{customerA.name}</p>
        <p className="text-sm text-muted-foreground">{customerA.phone}</p>
        <p className="text-sm text-muted-foreground">{customerA.deliveryZone || customerA.location || "—"}</p>
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link href={`/customers/${customerA.id}`}>View</Link>
        </Button>
      </div>
      <div>
        <p className="text-xs font-medium text-amber-800 mb-1">Record B (merge into A, then remove)</p>
        <p className="font-medium">{customerB.name}</p>
        <p className="text-sm text-muted-foreground">{customerB.phone}</p>
        <p className="text-sm text-muted-foreground">{customerB.deliveryZone || customerB.location || "—"}</p>
        <Button variant="outline" size="sm" asChild className="mt-2">
          <Link href={`/customers/${customerB.id}`}>View</Link>
        </Button>
      </div>
      <div className="md:col-span-2 flex gap-2">
        <Button size="sm" onClick={handleMerge} disabled={merging}>
          {merging ? "Merging…" : "Merge into A"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Dismiss (hide 30 days)
        </Button>
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortKey>("totalSpent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [listFilter, setListFilter] = useState<ListFilter>(null);
  const [duplicateReviewOpen, setDuplicateReviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const useFilteredList = listFilter !== null;
  const { data: paginatedData, isLoading: paginatedLoading } = useQuery({
    queryKey: ["customers", "paginated", page, pageSize, search],
    queryFn: () => fetchCustomersPaginated({ page, limit: pageSize, search: search || undefined }),
    enabled: !useFilteredList,
  });

  const duplicatePairs = useMemo(() => {
    const dismissed = getDismissedPairKeys();
    const key = (a: string, b: string) => [a, b].sort().join(",");
    const pairs: [Customer, Customer][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < allCustomers.length; i++) {
      for (let j = i + 1; j < allCustomers.length; j++) {
        const a = allCustomers[i];
        const b = allCustomers[j];
        const nameMatch = (a.name || "").trim().toLowerCase() === (b.name || "").trim().toLowerCase();
        const zoneA = (a.deliveryZone || a.location || "").trim().toLowerCase();
        const zoneB = (b.deliveryZone || b.location || "").trim().toLowerCase();
        const zoneMatch = zoneA && zoneB && zoneA === zoneB;
        if (nameMatch && zoneMatch && !dismissed.has(key(a.id, b.id))) {
          pairs.push([a, b]);
          seen.add(a.id);
          seen.add(b.id);
        }
      }
    }
    return pairs;
  }, [allCustomers]);

  const metrics = useMemo(() => {
    const enriched = enrichCustomers(allCustomers, orders);
    const totalCustomers = enriched.length;
    const totalSpend = enriched.reduce((s, c) => s + c.totalSpent, 0);
    const repeatCount = enriched.filter((c) => c.orderCount >= 2).length;
    const atRiskCount = enriched.filter((c) => {
      const d = daysSinceLastOrder(c.lastOrderDate);
      return d !== null && d >= 31 && d <= 60;
    }).length;
    const lapsedCount = enriched.filter((c) => {
      const d = daysSinceLastOrder(c.lastOrderDate);
      return d !== null && d > 60;
    }).length;
    const zoneCounts: Record<string, number> = {};
    orders.filter((o) => o.status !== "cancelled").forEach((o) => {
      const c = allCustomers.find((x) => x.id === o.customerId);
      const zone = c?.deliveryZone || c?.location || "Unknown";
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });
    const topZone = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return {
      totalCustomers,
      repeatPct: totalCustomers ? Math.round((repeatCount / totalCustomers) * 100) : 0,
      avgLifetime: totalCustomers ? totalSpend / totalCustomers : 0,
      atRiskCount,
      lapsedCount,
      topZone,
    };
  }, [allCustomers, orders]);

  const filteredAndSorted = useMemo(() => {
    if (!useFilteredList) return [];
    let list = enrichCustomers(allCustomers, orders);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.deliveryZone || "").toLowerCase().includes(term) ||
          (c.location || "").toLowerCase().includes(term) ||
          (c.notes || "").toLowerCase().includes(term)
      );
    }
    if (listFilter?.type === "repeat") list = list.filter((c) => c.orderCount >= 2);
    if (listFilter?.type === "health") list = list.filter((c) => c.health === listFilter.health);
    if (listFilter?.type === "zone") list = list.filter((c) => (c.deliveryZone || c.location || "") === listFilter.zone);
    const sb = sortBy;
    const orderRank = (h: HealthStatus) => (h === "active" ? 0 : h === "at_risk" ? 1 : h === "lapsed" ? 2 : 3);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sb === "totalSpent") cmp = a.totalSpent - b.totalSpent;
      else if (sb === "orderCount") cmp = a.orderCount - b.orderCount;
      else if (sb === "name") cmp = a.name.localeCompare(b.name);
      else if (sb === "zone") cmp = (a.deliveryZone || a.location || "").localeCompare(b.deliveryZone || b.location || "");
      else if (sb === "health") cmp = orderRank(a.health) - orderRank(b.health);
      else if (sb === "lastOrderDate") {
        const da = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const db = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [useFilteredList, listFilter, allCustomers, orders, search, sortBy, sortDir]);

  const customers = useFilteredList ? filteredAndSorted : paginatedData?.customers ?? [];
  const total = useFilteredList ? filteredAndSorted.length : paginatedData?.total ?? 0;
  let customerStats: CustomerWithStats[] = useFilteredList ? filteredAndSorted : enrichCustomers(customers, orders);

  const orderRank = (h: HealthStatus) => (h === "active" ? 0 : h === "at_risk" ? 1 : h === "lapsed" ? 2 : 3);
  if (!useFilteredList) {
    customerStats = [...customerStats].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "totalSpent") cmp = a.totalSpent - b.totalSpent;
      else if (sortBy === "orderCount") cmp = a.orderCount - b.orderCount;
      else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "zone") cmp = (a.deliveryZone || a.location || "").localeCompare(b.deliveryZone || b.location || "");
      else if (sortBy === "health") cmp = orderRank(a.health) - orderRank(b.health);
      else if (sortBy === "lastOrderDate") {
        const da = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
        const db = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const totalPages = useFilteredList ? Math.max(1, Math.ceil(filteredAndSorted.length / pageSize)) : Math.max(1, Math.ceil(total / pageSize));
  const displayList = useFilteredList ? filteredAndSorted.slice((page - 1) * pageSize, page * pageSize) : customerStats;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const isLoading = !useFilteredList && paginatedLoading;

  const goToPage = useCallback(
    (p: number) => {
      setPage((prev) => Math.max(1, Math.min(totalPages, p)));
    },
    [totalPages]
  );

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const metricCardBase = "overflow-hidden border-0 rounded-xl bg-card shadow-sm transition cursor-pointer h-full hover:ring-2 hover:ring-primary/20";
  const metricCardActive = "ring-2 ring-primary/30";

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      {/* ZONE 1 — Customer metrics dashboard (Orders-style cards) */}
      <section className="mb-4" aria-label="Customer metrics">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Card className={metricCardBase}>
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">Total Customers</div>
                <div className="metric-value">{metrics.totalCustomers}</div>
                <div className="text-[10px] text-muted-foreground">all time</div>
              </div>
            </div>
          </Card>
          <Card
            className={`${metricCardBase} ${listFilter?.type === "repeat" ? metricCardActive : ""}`}
            onClick={() => {
              setListFilter((f) => (f?.type === "repeat" ? null : { type: "repeat" }));
              setPage(1);
            }}
          >
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">Repeat Customer %</div>
                <div className="metric-value">{metrics.repeatPct}%</div>
                <div className="text-[10px] text-muted-foreground">placed 2+ orders</div>
              </div>
            </div>
          </Card>
          <Card
            className={metricCardBase}
            onClick={() => {
              setSortBy("totalSpent");
              setSortDir("desc");
              setListFilter(null);
              setPage(1);
            }}
          >
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">Avg Lifetime Value</div>
                <div className="metric-value">KES {Math.round(metrics.avgLifetime).toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">per customer</div>
              </div>
            </div>
          </Card>
          <Card
            className={`${metricCardBase} ${listFilter?.type === "health" && listFilter.health === "at_risk" ? metricCardActive : ""}`}
            onClick={() => {
              setListFilter((f) => (f?.type === "health" && f.health === "at_risk" ? null : { type: "health", health: "at_risk" }));
              setPage(1);
            }}
          >
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">At Risk</div>
                <div className="metric-value">{metrics.atRiskCount}</div>
                <div className="text-[10px] text-muted-foreground">31–60 days</div>
              </div>
            </div>
          </Card>
          <Card
            className={`${metricCardBase} ${listFilter?.type === "health" && listFilter.health === "lapsed" ? metricCardActive : ""}`}
            onClick={() => {
              setListFilter((f) => (f?.type === "health" && f.health === "lapsed" ? null : { type: "health", health: "lapsed" }));
              setPage(1);
            }}
          >
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">Lapsed</div>
                <div className="metric-value">{metrics.lapsedCount}</div>
                <div className="text-[10px] text-muted-foreground">60+ days</div>
              </div>
            </div>
          </Card>
          <Card
            className={`${metricCardBase} ${listFilter?.type === "zone" && listFilter.zone === metrics.topZone ? metricCardActive : ""}`}
            onClick={() => {
              if (metrics.topZone === "—") return;
              setListFilter((f) => (f?.type === "zone" && f.zone === metrics.topZone ? null : { type: "zone", zone: metrics.topZone }));
              setPage(1);
            }}
          >
              <div className="flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="metric-label">Top Zone</div>
                <div className="metric-value text-lg truncate" title={metrics.topZone}>{metrics.topZone}</div>
                <div className="text-[10px] text-muted-foreground">by orders</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ZONE 2 — List controls + table/cards */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title" data-testid="text-page-title">
            Customers
          </h1>
          <p className="page-subtitle" data-testid="text-customers-subtitle">
            {total === 0
              ? "No customers"
              : total <= pageSize && !search
                ? `${total} customers`
                : `Showing ${from}–${to} of ${total} customers`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex rounded-md border border-border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none h-8 px-2 ${viewMode === "cards" ? "bg-primary/10 text-primary" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none h-8 px-2 ${viewMode === "table" ? "bg-primary/10 text-primary" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search-customers"
              className="pl-10 border-border bg-white shadow-sm"
              placeholder="Search name, phone, zone, notes..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Button asChild className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Link href="/customers/new">
              <UserPlus className="h-4 w-4 mr-2" />
              New Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Duplicate detection banner */}
      {duplicatePairs.length > 0 && (
        <Card className="mb-4 rounded-xl border border-amber-200 bg-amber-50 shadow-sm text-amber-900">
          <div className="p-4">
            <p className="font-medium">
              {duplicatePairs.length} possible duplicate customer{duplicatePairs.length !== 1 ? "s" : ""} detected (same name + delivery zone).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-300 text-amber-900 hover:bg-amber-100"
              onClick={() => setDuplicateReviewOpen((o) => !o)}
            >
              {duplicateReviewOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Review
                </>
              )}
            </Button>
            {duplicateReviewOpen && (
              <div className="mt-4 space-y-4 border-t border-amber-200 pt-4">
                {duplicatePairs.map(([a, b]) => (
                  <DuplicatePairRow
                    key={`${a.id}-${b.id}`}
                    customerA={a}
                    customerB={b}
                    orders={orders}
                    onMerged={() => {
                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                      queryClient.invalidateQueries({ queryKey: ["orders"] });
                      setDuplicateReviewOpen(false);
                    }}
                    onDismiss={() => {
                      dismissPair(a.id, b.id);
                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                      setDuplicateReviewOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading customers...</div>
      ) : total === 0 ? (
        <Card className="py-16 text-center border-0 rounded-xl bg-card shadow-sm">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <div className="mt-4 empty-state-title" data-testid="text-empty">
            {search ? "No matching customers" : "No customers yet"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Customers are saved when you create orders.
          </div>
        </Card>
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const customers = displayList.filter((c) => selectedIds.has(c.id));
                  const headers = ["Name", "Phone", "Delivery Zone", "Pricing", "Orders", "Lifetime Spend", "Last Order", "Health", "Tags"];
                  const rows = customers.map((c) =>
                    [
                      c.name,
                      c.phone,
                      c.deliveryZone || c.location || "",
                      c.lockedPriceMode || "",
                      c.orderCount,
                      c.totalSpent,
                      c.lastOrderDate ? formatRelativeDate(c.lastOrderDate) : "",
                      c.health || "",
                      (c.tags || []).join("; "),
                    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
                  );
                  const csv = [headers.join(","), ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  displayList.forEach((c) => {
                    if (selectedIds.has(c.id) && c.phone) window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}`, "_blank");
                  });
                }}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Tag name"
                  className="h-8 w-32"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).form?.requestSubmit()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={!bulkTagInput.trim() || addingTag}
                  onClick={async () => {
                    const tag = bulkTagInput.trim();
                    if (!tag) return;
                    setAddingTag(true);
                    try {
                      for (const id of selectedIds) {
                        const c = displayList.find((x) => x.id === id);
                        if (c) {
                          const tags = [...(c.tags || []), tag];
                          await updateCustomer(id, { tags });
                        }
                      }
                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                      setBulkTagInput("");
                    } finally {
                      setAddingTag(false);
                    }
                  }}
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Add Tag
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  duplicatePairs.forEach(([a, b]) => {
                    if (selectedIds.has(a.id) || selectedIds.has(b.id)) dismissPair(a.id, b.id);
                  });
                  queryClient.invalidateQueries({ queryKey: ["customers"] });
                  setSelectedIds(new Set());
                }}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark Reviewed
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
            </div>
          )}

          {viewMode === "table" ? (
            <Card className="border-0 rounded-xl bg-card shadow-sm overflow-hidden" data-testid="customers-table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 p-3">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={displayList.length > 0 && displayList.every((c) => selectedIds.has(c.id))}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set(displayList.map((c) => c.id)));
                            else setSelectedIds(new Set());
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th
                        className="text-left p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("name"); setSortDir((d) => (sortBy === "name" ? (d === "asc" ? "desc" : "asc") : "asc")); }}
                      >
                        Name {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-left p-3 font-medium text-foreground">Phone</th>
                      <th
                        className="text-left p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("zone"); setSortDir((d) => (sortBy === "zone" ? (d === "asc" ? "desc" : "asc") : "asc")); }}
                      >
                        Delivery Zone {sortBy === "zone" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-left p-3 font-medium text-foreground">Pricing Tier</th>
                      <th
                        className="text-right p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("orderCount"); setSortDir((d) => (sortBy === "orderCount" ? (d === "asc" ? "desc" : "asc") : "desc")); }}
                      >
                        Orders {sortBy === "orderCount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-right p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("totalSpent"); setSortDir((d) => (sortBy === "totalSpent" ? (d === "asc" ? "desc" : "asc") : "desc")); }}
                      >
                        Lifetime Spend {sortBy === "totalSpent" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-right p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("lastOrderDate"); setSortDir((d) => (sortBy === "lastOrderDate" ? (d === "asc" ? "desc" : "asc") : "desc")); }}
                      >
                        Last Order {sortBy === "lastOrderDate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-left p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("health"); setSortDir((d) => (sortBy === "health" ? (d === "asc" ? "desc" : "asc") : "desc")); }}
                      >
                        Health {sortBy === "health" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-right p-3 font-medium text-foreground w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayList.map((customer) => (
                      <tr
                        key={customer.id}
                        role="button"
                        tabIndex={0}
                        className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition"
                        onClick={() => setLocation(`/customers/${customer.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && setLocation(`/customers/${customer.id}`)}
                      >
                        <td className="w-10 p-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedIds.has(customer.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(customer.id)) next.delete(customer.id);
                                else next.add(customer.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="enkana-icon-box grid h-8 w-8 shrink-0 place-items-center rounded-full text-primary text-xs font-bold">
                              {customer.name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </div>
                            <div>
                              <span className="font-medium text-foreground" data-testid={`text-name-${customer.id}`}>
                                {customer.name}
                              </span>
                              {(customer.tags || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(customer.tags || []).slice(0, 3).map((t) => (
                                    <span key={t} className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                      {t}
                                    </span>
                                  ))}
                                  {(customer.tags || []).length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{(customer.tags || []).length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <a href={`tel:${customer.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                            {customer.phone}
                          </a>
                        </td>
                        <td className="p-3 text-muted-foreground">{customer.deliveryZone || customer.location || "—"}</td>
                        <td className="p-3">
                          {customer.lockedPriceMode ? (
                            <Badge variant="outline" className={customer.lockedPriceMode === "promo" ? "text-amber-600 border-amber-200 bg-amber-50" : "text-muted-foreground border-border"}>
                              {customer.lockedPriceMode === "promo" ? "PROMO" : "STD"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {customer.orderCount}
                        </td>
                        <td className="p-3 text-right font-medium text-primary">
                          KES {customer.totalSpent.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {formatRelativeDate(customer.lastOrderDate)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                              customer.health === "active" ? "bg-green-100 text-green-800" :
                              customer.health === "at_risk" ? "bg-amber-100 text-amber-800" :
                              customer.health === "lapsed" ? "bg-red-100 text-red-800" :
                              customer.health === "new" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                            }`}
                            title={customer.health === "active" ? "Active" : customer.health === "at_risk" ? "At Risk" : customer.health === "lapsed" ? "Lapsed" : "New"}
                          >
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                customer.health === "active" ? "bg-green-500" :
                                customer.health === "at_risk" ? "bg-amber-500" :
                                customer.health === "lapsed" ? "bg-red-500" :
                                customer.health === "new" ? "bg-blue-500" : "bg-muted"
                              }`}
                            />
                            {customer.health === "active" ? "Active" : customer.health === "at_risk" ? "At Risk" : customer.health === "lapsed" ? "Lapsed" : "New"}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="h-7" asChild>
                            <Link href={`/customers/${customer.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayList.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                data-testid={`card-customer-${customer.id}`}
              >
                <Card className="border-0 rounded-xl bg-card shadow-sm p-4 transition cursor-pointer h-full hover:ring-2 hover:ring-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="enkana-icon-box grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary">
                        <span className="text-sm font-bold">{customer.name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?"}</span>
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#f5f0e8] ${
                          customer.health === "active" ? "bg-green-500" :
                          customer.health === "at_risk" ? "bg-amber-500" :
                          customer.health === "lapsed" ? "bg-red-500" :
                          customer.health === "new" ? "bg-blue-500" : "bg-muted"
                        }`}
                        title={customer.health === "active" ? "Active" : customer.health === "at_risk" ? "At Risk" : customer.health === "lapsed" ? "Lapsed" : "New"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate" data-testid={`text-name-${customer.id}`}>
                          {customer.name}
                        </span>
                        {customer.lockedPriceMode && (
                          <Badge variant="outline" className={`text-xs shrink-0 ${customer.lockedPriceMode === "promo" ? "text-amber-600 border-amber-200 bg-amber-50" : "text-muted-foreground border-border"}`}>
                            {customer.lockedPriceMode === "promo" ? "PROMO" : "STD"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                      {(customer.deliveryZone || customer.location) && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground/80 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {customer.deliveryZone || customer.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" />
                      {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                      KES {customer.totalSpent.toLocaleString()}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          )}

          {totalPages > 1 || pageSize !== PAGE_SIZES[0] ? (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per page</span>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {PAGE_SIZES.map((size) => (
                    <Button
                      key={size}
                      variant="ghost"
                      size="sm"
                      className={`rounded-none h-8 px-2 text-sm ${
                        pageSize === size ? "bg-primary/10 text-primary font-medium" : ""
                      }`}
                      onClick={() => onPageSizeChange(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="h-4 w-4 mr-0.5" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  data-testid="pagination-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
