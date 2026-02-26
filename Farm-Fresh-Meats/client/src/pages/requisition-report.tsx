import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/lib/supabase-data";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Package, Loader2 } from "lucide-react";
import type { Order, OrderItem } from "@shared/schema";

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

export default function RequisitionReport() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth);
  const monthOptions = getMonthOptions();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const monthOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status !== "cancelled" && o.deliveryMonth === selectedMonth
      ),
    [orders, selectedMonth]
  );

  const requisitionByProduct = useMemo(() => {
    const byProduct: Record<string, { productName: string; quantity: number; unit: string }> = {};
    monthOrders.forEach((o) => {
      (o.items || []).forEach((item: OrderItem) => {
        const name = item.productName || item.productId || "Unknown";
        const key = item.productId || name;
        if (!byProduct[key]) {
          byProduct[key] = {
            productName: name,
            quantity: 0,
            unit: item.unit || "kg",
          };
        }
        byProduct[key].quantity += item.quantity || 0;
      });
    });
    return Object.entries(byProduct)
      .map(([, v]) => v)
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [monthOrders]);

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">
            Requisition Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-delivery sourcing checklist by delivery date
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading orders…
        </div>
      ) : (
        <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm">
          {requisitionByProduct.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No orders for this delivery month, or no items in selected orders.</p>
              <p className="text-sm mt-1">Choose another month or add orders from All Orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-foreground">Product</th>
                    <th className="text-right p-3 font-medium text-foreground">Total quantity</th>
                    <th className="text-left p-3 font-medium text-foreground">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitionByProduct.map((row) => (
                    <tr key={row.productName} className="border-b border-border/50">
                      <td className="p-3 font-medium">{row.productName}</td>
                      <td className="p-3 text-right tabular-nums">{row.quantity}</td>
                      <td className="p-3 text-muted-foreground">{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
