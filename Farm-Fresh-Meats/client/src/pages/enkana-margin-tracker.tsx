import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchProducts } from "@/lib/supabase-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calculator,
  Beef,
  ShoppingBag,
} from "lucide-react";
import { PRODUCTS, type Order, type OrderItem } from "@shared/schema";
import type { ProductCatalogueItem } from "@shared/schema";

const GOAT_MUTTON_YIELD_KG = 11;
const GOAT_MUTTON_COST_PER_ANIMAL_MIN = 6750;
const GOAT_MUTTON_COST_PER_ANIMAL_MAX = 7500;
const BEEF_COST_PER_KG = 650;
const COST_PER_KG_WARN_THRESHOLD = 580;

type RequisitionStatus = "Pending" | "Sourced" | "Slaughtered" | "Delivered";

type AnimalPurchase = {
  id: string;
  productId: string;
  productName: string;
  costKes: number;
  yieldKg: number;
  deliveryMonth: string;
};

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value: val, label });
  }
  return options;
}

function formatDeliveryMonth(m: string): string {
  const [year, month] = m.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 5);
  return `5th ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
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

export default function EnkanaMarginTracker() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  const [animalPurchases, setAnimalPurchases] = useState<AnimalPurchase[]>(() => {
    try {
      const raw = localStorage.getItem("enkana-margin-tracker-actuals");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [requisitionStatuses, setRequisitionStatuses] = useState<Record<string, RequisitionStatus>>(() => {
    try {
      const raw = localStorage.getItem("enkana-margin-tracker-statuses");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });

  const { data: dbProducts } = useQuery<ProductCatalogueItem[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const marginProducts = useMemo(
    () => ((dbProducts ?? []).length > 0 ? dbProducts! : [...PRODUCTS]),
    [dbProducts]
  );

  const monthOrders = useMemo(
    () => orders.filter((o) => o.deliveryMonth === selectedMonth && o.status !== "cancelled"),
    [orders, selectedMonth]
  );

  const requisitionRows = useMemo(() => {
    const byProduct: Record<string, { qty: number; revenue: number }> = {};
    monthOrders.forEach((o) => {
      (o.items as OrderItem[]).forEach((item) => {
        if (!byProduct[item.productId]) byProduct[item.productId] = { qty: 0, revenue: 0 };
        byProduct[item.productId].qty += item.quantity;
        byProduct[item.productId].revenue += item.subtotal;
      });
    });

    const rows: { productId: string; productName: string; unit: string; ordersQty: number; required: string; estCostMin: number; estCostMax: number }[] = [];
    marginProducts.forEach((p) => {
      const data = byProduct[p.id];
      const qty = data?.qty ?? 0;
      const rev = data?.revenue ?? 0;
      let required = `${qty} ${p.unit}`;
      let estMin = 0, estMax = 0;
      if (p.id === "goat" || p.id === "mutton") {
        const animals = qty > 0 ? Math.ceil(qty / GOAT_MUTTON_YIELD_KG) : 0;
        required = `${qty} kg → ${animals} animals`;
        estMin = animals * GOAT_MUTTON_COST_PER_ANIMAL_MIN;
        estMax = animals * GOAT_MUTTON_COST_PER_ANIMAL_MAX;
      } else if (p.id === "beef") {
        estMin = qty * BEEF_COST_PER_KG;
        estMax = estMin;
      } else if (p.id === "chicken") {
        estMin = qty * 500;
        estMax = qty * 1300;
      }
      rows.push({
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        ordersQty: qty,
        required,
        estCostMin: estMin,
        estCostMax: estMax,
      });
    });
    return rows;
  }, [monthOrders, marginProducts]);

  const monthActuals = useMemo(
    () => animalPurchases.filter((a) => a.deliveryMonth === selectedMonth),
    [animalPurchases, selectedMonth]
  );

  const costPerKgByProduct = useMemo(() => {
    const sums: Record<string, { cost: number; yield: number }> = {};
    monthActuals.forEach((a) => {
      if (!sums[a.productId]) sums[a.productId] = { cost: 0, yield: 0 };
      sums[a.productId].cost += a.costKes;
      sums[a.productId].yield += a.yieldKg;
    });
    const result: Record<string, number> = {};
    Object.entries(sums).forEach(([id, { cost, yield: y }]) => {
      result[id] = y > 0 ? cost / y : 0;
    });
    return result;
  }, [monthActuals]);

  const totalRequisitionCost = useMemo(
    () => requisitionRows.reduce((s, r) => s + (r.estCostMin + r.estCostMax) / 2, 0),
    [requisitionRows]
  );

  const summaryByProduct = useMemo(() => {
    const byProduct: Record<string, { revenue: number; cost: number; qty: number }> = {};
    monthOrders.forEach((o) => {
      (o.items as OrderItem[]).forEach((item) => {
        if (!byProduct[item.productId]) byProduct[item.productId] = { revenue: 0, cost: 0, qty: 0 };
        byProduct[item.productId].revenue += item.subtotal;
        byProduct[item.productId].qty += item.quantity;
      });
    });

    const costPerKg = costPerKgByProduct;
    return marginProducts.map((p) => {
      const d = byProduct[p.id] ?? { revenue: 0, cost: 0, qty: 0 };
      let cost = 0;
      if (p.id === "beef") cost = d.qty * BEEF_COST_PER_KG;
      else if (p.id === "goat" || p.id === "mutton") cost = d.qty * (costPerKg[p.id] ?? 0);
      else if (p.id === "chicken") cost = d.qty * 800;
      return {
        productId: p.id,
        productName: p.name,
        revenue: d.revenue,
        cost,
        margin: d.revenue - cost,
        marginPct: d.revenue > 0 ? ((d.revenue - cost) / d.revenue) * 100 : 0,
      };
    });
  }, [monthOrders, costPerKgByProduct, marginProducts]);

  const setStatus = (productId: string, status: RequisitionStatus) => {
    const next = { ...requisitionStatuses, [productId]: status };
    setRequisitionStatuses(next);
    localStorage.setItem("enkana-margin-tracker-statuses", JSON.stringify(next));
  };

  const addAnimalPurchase = (productId: string, costKes: number, yieldKg: number) => {
    const p = marginProducts.find((x) => x.id === productId);
    if (!p) return;
    const entry: AnimalPurchase = {
      id: crypto.randomUUID(),
      productId,
      productName: p.name,
      costKes,
      yieldKg,
      deliveryMonth: selectedMonth,
    };
    const next = [...animalPurchases, entry];
    setAnimalPurchases(next);
    localStorage.setItem("enkana-margin-tracker-actuals", JSON.stringify(next));
  };

  const monthOptions = getMonthOptions();

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            Margin Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-delivery P&L: requisition, actuals, and margin summary
          </p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]" data-testid="select-delivery-month">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Delivery month" />
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

      <Tabs defaultValue="requisition" className="w-full">
        <TabsList className="mb-3 grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="requisition" data-testid="tab-requisition">
            Requisition
          </TabsTrigger>
          <TabsTrigger value="actuals" data-testid="tab-actuals">
            Actuals
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requisition">
          <Card className="border-0 rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground grid grid-cols-5 gap-3">
              <div>Product</div>
              <div>Orders</div>
              <div>Required</div>
              <div>Est. cost (KES)</div>
              <div>Status</div>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
            ) : (
              <div className="divide-y divide-border">
                {requisitionRows.map((row) => {
                  const status = requisitionStatuses[row.productId] ?? "Pending";
                  const isGreen = status === "Sourced" || status === "Slaughtered" || status === "Delivered";
                  return (
                    <div
                      key={row.productId}
                      className={`grid grid-cols-5 gap-2 px-3 py-2 items-center text-sm ${isGreen ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                    >
                      <div className="font-medium text-foreground">{row.productName}</div>
                      <div className="text-muted-foreground">{row.ordersQty} {row.unit}</div>
                      <div className="text-muted-foreground">{row.required}</div>
                      <div className="text-muted-foreground">
                        {row.estCostMin > 0 ? `${row.estCostMin.toLocaleString()} – ${row.estCostMax.toLocaleString()}` : "—"}
                      </div>
                      <div>
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(row.productId, v as RequisitionStatus)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Sourced">Sourced</SelectItem>
                            <SelectItem value="Slaughtered">Slaughtered</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-3 py-2 border-t border-border bg-muted/30 text-sm font-semibold text-foreground">
              Total estimated sourcing: KES {totalRequisitionCost.toLocaleString()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="actuals">
          <Card className="border-0 rounded-xl bg-card shadow-sm p-3 mb-3">
            <h3 className="text-sm font-semibold text-foreground mb-3">Log animal purchase (slaughter actuals)</h3>
            <ActualsForm
              selectedMonth={selectedMonth}
              onAdd={addAnimalPurchase}
              costPerKgWarnThreshold={COST_PER_KG_WARN_THRESHOLD}
            />
          </Card>
          <Card className="border-0 rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actuals for {formatDeliveryMonth(selectedMonth)}
            </div>
            <div className="divide-y divide-border">
              {monthActuals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No animal purchases logged for this month.</div>
              ) : (
                monthActuals.map((a) => {
                  const costPerKg = a.yieldKg > 0 ? a.costKes / a.yieldKg : 0;
                  const warn = costPerKg > COST_PER_KG_WARN_THRESHOLD;
                  return (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-foreground">{a.productName}</span>
                        <span className="text-muted-foreground ml-2">
                          KES {a.costKes.toLocaleString()} → {a.yieldKg} kg
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">KES {costPerKg.toFixed(0)}/kg</span>
                        {warn && (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs" title="Cost per kg exceeds KES 580">
                            <AlertTriangle className="h-4 w-4" />
                            High cost
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="border-0 rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground grid grid-cols-5 gap-3">
              <div>Product</div>
              <div className="text-right">Revenue</div>
              <div className="text-right">Cost</div>
              <div className="text-right">Margin</div>
              <div className="text-right">Margin %</div>
            </div>
            <div className="divide-y divide-border">
              {summaryByProduct.map((row) => {
                const pct = row.marginPct;
                const color = pct >= 40 ? "text-green-600" : pct >= 20 ? "text-amber-600" : "text-red-600";
                return (
                  <div key={row.productId} className="grid grid-cols-5 gap-2 px-3 py-2 items-center text-sm">
                    <div className="font-medium text-foreground">{row.productName}</div>
                    <div className="text-right text-muted-foreground">KES {row.revenue.toLocaleString()}</div>
                    <div className="text-right text-muted-foreground">KES {row.cost.toLocaleString()}</div>
                    <div className="text-right text-foreground">KES {row.margin.toLocaleString()}</div>
                    <div className={`text-right font-semibold ${color}`}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-border bg-muted/30 flex justify-between text-sm font-semibold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">
                Revenue KES {summaryByProduct.reduce((s, r) => s + r.revenue, 0).toLocaleString()} — 
                Margin KES {summaryByProduct.reduce((s, r) => s + r.margin, 0).toLocaleString()}
              </span>
            </div>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            Margin %: green ≥40%, amber ≥20%, red &lt;20%. Enter actuals in the Actuals tab to see real cost per kg for goat/mutton.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActualsForm({
  selectedMonth,
  onAdd,
  costPerKgWarnThreshold,
}: {
  selectedMonth: string;
  onAdd: (productId: string, costKes: number, yieldKg: number) => void;
  costPerKgWarnThreshold: number;
}) {
  const [productId, setProductId] = useState("");
  const [costKes, setCostKes] = useState("");
  const [yieldKg, setYieldKg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(costKes);
    const y = parseFloat(yieldKg);
    if (!productId || isNaN(cost) || isNaN(y) || cost <= 0 || y <= 0) return;
    onAdd(productId, cost, y);
    setCostKes("");
    setYieldKg("");
  };

  const costPerKg = costKes && yieldKg ? parseFloat(costKes) / parseFloat(yieldKg) : 0;
  const warn = costPerKg > costPerKgWarnThreshold && costPerKg > 0;

  const slaughterProducts = marginProducts.filter((p) => p.id === "goat" || p.id === "mutton");

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Product</label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            {slaughterProducts.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Cost (KES)</label>
        <Input
          type="number"
          min={0}
          step={100}
          value={costKes}
          onChange={(e) => setCostKes(e.target.value)}
          placeholder="e.g. 6750"
          className="w-28 h-9"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Yield (kg)</label>
        <Input
          type="number"
          min={0.1}
          step={0.5}
          value={yieldKg}
          onChange={(e) => setYieldKg(e.target.value)}
          placeholder="e.g. 13"
          className="w-24 h-9"
        />
      </div>
      {costPerKg > 0 && (
        <div className="text-xs text-muted-foreground">
          Cost/kg: KES {costPerKg.toFixed(0)}
          {warn && (
            <span className="text-amber-600 ml-1">(above {costPerKgWarnThreshold})</span>
          )}
        </div>
      )}
      <Button type="submit" size="sm" disabled={!productId || !costKes || !yieldKg}>
        Add
      </Button>
    </form>
  );
}
