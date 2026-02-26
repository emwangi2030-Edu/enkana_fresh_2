import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrders, fetchCustomers, updateOrder } from "@/lib/supabase-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Package, Loader2, Phone } from "lucide-react";
import type { Order, OrderItem } from "@shared/schema";
import type { Customer } from "@shared/schema";

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value: val, label });
  }
  return options;
}

/** From the 10th of the month, default to next delivery month (e.g. March); before 10th, current month. */
function getDefaultMonth(): string {
  const now = new Date();
  if (now.getDate() >= 10) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDeliveryMonth(m: string): string {
  const [year, month] = m.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 5);
  return `5th ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

function formatItemsSummary(items: OrderItem[]): string {
  if (!items?.length) return "—";
  return items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join("; ");
}

const ZONE_UNSET = "(No zone)";

/** Dispatch status: three options. "not_delivered" maps to backend "confirmed" so order stays in list. */
const DISPATCH_STATUS_OPTIONS = [
  { value: "delivered", label: "Delivered" },
  { value: "not_delivered", label: "Not delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function orderToDispatchStatus(status: string): string {
  if (status === "delivered") return "delivered";
  if (status === "cancelled") return "cancelled";
  return "not_delivered"; // pending, confirmed, processing → Not delivered
}

function dispatchStatusToOrderStatus(value: string): string {
  if (value === "delivered") return "delivered";
  if (value === "cancelled") return "cancelled";
  return "confirmed"; // not_delivered → confirmed (stays in dispatch, not delivered)
}

export default function DeliveryDispatch() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth);
  const monthOptions = getMonthOptions();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrder(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const monthOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status !== "cancelled" && o.deliveryMonth === selectedMonth
      ),
    [orders, selectedMonth]
  );

  const ordersByZone = useMemo(() => {
    const zoneMap: Record<string, Order[]> = {};
    monthOrders.forEach((o) => {
      const zone =
        (o.customerId &&
          (customers.find((c: Customer) => c.id === o.customerId) as Customer)?.deliveryZone) ||
        null;
      const key = zone?.trim() || ZONE_UNSET;
      if (!zoneMap[key]) zoneMap[key] = [];
      zoneMap[key].push(o);
    });
    const zones = Object.keys(zoneMap).sort((a, b) => {
      if (a === ZONE_UNSET) return 1;
      if (b === ZONE_UNSET) return -1;
      return a.localeCompare(b);
    });
    return zones.map((zone) => ({ zone, orders: zoneMap[zone] }));
  }, [monthOrders, customers]);

  function getCustomerLocation(order: Order): string {
    if (!order.customerId) return "";
    const c = customers.find((c: Customer) => c.id === order.customerId);
    return (c as Customer)?.location || "";
  }

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Delivery Dispatch</h1>
          <p className="page-subtitle">
            Group orders by zone for the selected delivery date
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Delivery: <span className="font-medium text-foreground">{formatDeliveryMonth(selectedMonth)}</span>
        {monthOrders.length > 0 && (
          <span className="ml-2">— {monthOrders.length} order{monthOrders.length !== 1 ? "s" : ""}</span>
        )}
      </p>

      {ordersLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading orders…
        </div>
      ) : ordersByZone.length === 0 ? (
        <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-8 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No orders for this delivery month.</p>
          <p className="text-sm mt-1">Choose another month or add orders from All Orders.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersByZone.map(({ zone, orders: zoneOrders }) => (
            <Card
              key={zone}
              className="overflow-hidden border-0 rounded-xl bg-card shadow-sm"
            >
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{zone}</span>
                <Badge variant="secondary" className="ml-2">
                  {zoneOrders.length} order{zoneOrders.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="divide-y divide-border/50">
                {zoneOrders.map((order) => (
                  <div
                    key={order.id}
                    className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {order.customerName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {order.phone}
                        </span>
                        {getCustomerLocation(order) && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {getCustomerLocation(order)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {formatItemsSummary(order.items as OrderItem[])}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Select
                        value={orderToDispatchStatus(order.status)}
                        onValueChange={(value) =>
                          updateMutation.mutate({
                            id: order.id,
                            status: dispatchStatusToOrderStatus(value),
                          })
                        }
                        disabled={updateMutation.isPending && updateMutation.variables?.id === order.id}
                      >
                        <SelectTrigger className="w-[160px] h-9">
                          <SelectValue />
                          {updateMutation.isPending && updateMutation.variables?.id === order.id && (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {DISPATCH_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
