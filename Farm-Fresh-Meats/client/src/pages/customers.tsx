import { useQuery } from "@tanstack/react-query";
import { fetchCustomersPaginated, fetchOrders } from "@/lib/supabase-data";
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
} from "lucide-react";
import { useState, useCallback } from "react";
import type { Customer, Order } from "@shared/schema";

const PAGE_SIZES = [25, 50, 100] as const;
type ViewMode = "cards" | "table";
type SortKey = "totalSpent" | "lastOrderDate" | "name" | "orderCount";
type HealthStatus = "active" | "at_risk" | "lapsed" | "new" | null;

function getHealthStatus(orderCount: number, lastOrderDate: string | null): HealthStatus {
  if (orderCount <= 1) return "new";
  if (!lastOrderDate) return "lapsed";
  const days = (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return "active";
  if (days <= 60) return "at_risk";
  return "lapsed";
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortBy, setSortBy] = useState<SortKey>("totalSpent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", "paginated", page, pageSize, search],
    queryFn: () => fetchCustomersPaginated({ page, limit: pageSize, search: search || undefined }),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;

  let customerStats = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const nonCancelled = custOrders.filter((o) => o.status !== "cancelled");
    const totalSpent = nonCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = custOrders.length;
    const sorted = [...custOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastOrderDate = sorted[0]?.createdAt ?? null;
    const health = getHealthStatus(orderCount, lastOrderDate);
    return { ...c, totalSpent, orderCount, lastOrderDate, health };
  });

  customerStats = [...customerStats].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "totalSpent") cmp = a.totalSpent - b.totalSpent;
    else if (sortBy === "orderCount") cmp = a.orderCount - b.orderCount;
    else if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "lastOrderDate") {
      const da = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
      const db = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
      cmp = da - db;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const goToPage = useCallback((p: number) => {
    setPage((prev) => Math.max(1, Math.min(totalPages, p)));
  }, [totalPages]);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto enkana-section-green min-h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-tight text-foreground" data-testid="text-page-title">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
              className="pl-10 border-border bg-card shadow-sm"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading customers...</div>
      ) : customerStats.length === 0 ? (
        <Card className="enkana-card border border-border shadow-sm py-16 text-center ring-soft">
          <Users className="mx-auto h-12 w-12 text-primary/30" />
          <div className="mt-4 text-lg font-semibold text-foreground" data-testid="text-empty">
            {search ? "No matching customers" : "No customers yet"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Customers are saved when you create orders.
          </div>
        </Card>
      ) : (
        <>
          {viewMode === "table" ? (
            <Card className="enkana-card border border-border overflow-hidden ring-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-foreground w-8" title="Health">●</th>
                      <th
                        className="text-left p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("name"); setSortDir((d) => (sortBy === "name" ? (d === "asc" ? "desc" : "asc") : "asc")); }}
                      >
                        Customer {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-left p-3 font-medium text-foreground">Phone</th>
                      <th className="text-left p-3 font-medium text-foreground">Zone</th>
                      <th className="text-left p-3 font-medium text-foreground">Pricing</th>
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
                        Lifetime (KES) {sortBy === "totalSpent" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-right p-3 font-medium text-foreground cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSortBy("lastOrderDate"); setSortDir((d) => (sortBy === "lastOrderDate" ? (d === "asc" ? "desc" : "asc") : "desc")); }}
                      >
                        Last order {sortBy === "lastOrderDate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerStats.map((customer) => (
                      <tr
                        key={customer.id}
                        role="button"
                        tabIndex={0}
                        className="border-b border-border last:border-0 enkana-card-hover cursor-pointer hover:bg-muted/30"
                        onClick={() => setLocation(`/customers/${customer.id}`)}
                        onKeyDown={(e) => e.key === "Enter" && setLocation(`/customers/${customer.id}`)}
                      >
                        <td className="p-3" title={customer.health === "active" ? "Active" : customer.health === "at_risk" ? "At Risk" : customer.health === "lapsed" ? "Lapsed" : "New"}>
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              customer.health === "active" ? "bg-green-500" :
                              customer.health === "at_risk" ? "bg-amber-500" :
                              customer.health === "lapsed" ? "bg-red-500" :
                              customer.health === "new" ? "bg-blue-500" : "bg-muted"
                            }`}
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-foreground" data-testid={`text-name-${customer.id}`}>
                            {customer.name}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{customer.phone}</td>
                        <td className="p-3 text-muted-foreground">{customer.deliveryZone || customer.location || "—"}</td>
                        <td className="p-3">
                          {customer.lockedPriceMode ? (
                            <Badge variant="outline" className={customer.lockedPriceMode === "promo" ? "text-amber-600 border-amber-200" : "text-foreground"}>
                              {customer.lockedPriceMode === "promo" ? "Promo" : "Standard"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                        </td>
                        <td className="p-3 text-right font-medium text-primary">
                          KES {customer.totalSpent.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {customer.lastOrderDate
                            ? new Date(customer.lastOrderDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customerStats.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                data-testid={`card-customer-${customer.id}`}
              >
                <Card className="enkana-card enkana-card-hover border border-border shadow-sm p-4 transition cursor-pointer h-full ring-soft">
                  <div className="flex items-start gap-3">
                    <div className="enkana-icon-box grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary">
                      <span className="text-sm font-bold">{customer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground truncate" data-testid={`text-name-${customer.id}`}>
                        {customer.name}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                      {customer.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground/80 mt-0.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {customer.location}
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
