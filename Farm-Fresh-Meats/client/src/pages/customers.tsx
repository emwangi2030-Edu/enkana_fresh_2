import { useQuery } from "@tanstack/react-query";
import { fetchCustomers, fetchOrders } from "@/lib/supabase-data";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, MapPin, Users, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Customer, Order } from "@shared/schema";

export default function Customers() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const customerStats = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const totalSpent = custOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = custOrders.length;
    const lastOrder = custOrders[0];
    return { ...c, totalSpent, orderCount, lastOrder };
  });

  const filtered = customerStats.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.location || "").toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto enkana-section-green min-h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-tight text-foreground" data-testid="text-page-title">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} saved customers</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search-customers"
            className="pl-10 border-border bg-card shadow-sm"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading customers...</div>
      ) : filtered.length === 0 ? (
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => (
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
      )}
    </div>
  );
}
