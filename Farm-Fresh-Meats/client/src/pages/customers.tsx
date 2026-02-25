import { useQuery } from "@tanstack/react-query";
import { fetchCustomersPaginated, fetchOrders } from "@/lib/supabase-data";
import { Link } from "wouter";
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
} from "lucide-react";
import { useState, useCallback } from "react";
import type { Customer, Order } from "@shared/schema";

const PAGE_SIZES = [12, 24, 48] as const;

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

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

  const customerStats = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const totalSpent = custOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = custOrders.length;
    return { ...c, totalSpent, orderCount };
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
                ? `${total} saved customers`
                : `Showing ${from}–${to} of ${total} customers`}
          </p>
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
                      {customer.orderCount} orders
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                      KES {customer.totalSpent.toLocaleString()}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

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
