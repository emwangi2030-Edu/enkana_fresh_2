import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders, fetchCustomers } from "@/lib/supabase-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet, FileText, Calendar, Package,
  DollarSign, TrendingUp, ShoppingBag, CheckCircle2, Loader2
} from "lucide-react";
import { PRODUCTS, type Order, type OrderItem, type Customer } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: "all", label: "All Months" },
  ];
  const now = new Date();
  const startDate = new Date(2025, 11, 1);
  for (let i = -3; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (d < startDate) continue;
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value: val, label });
  }
  return options;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDeliveryMonth(m: string): string {
  const [year, month] = m.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatItemsList(items: OrderItem[]): string {
  return items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(", ");
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const monthOptions = getMonthOptions();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: customersList = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const monthOrders = selectedMonth === "all"
    ? orders
    : orders.filter((o) => o.deliveryMonth === selectedMonth);
  const activeOrders = monthOrders.filter((o) => o.status !== "cancelled");
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const paidOrders = monthOrders.filter((o) => o.paymentStatus === "paid");
  const paidAmount = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingAmount = totalRevenue - paidAmount;

  const productTotals: Record<string, { qty: number; revenue: number }> = {};
  activeOrders.forEach((o) => {
    (o.items as OrderItem[]).forEach((item) => {
      if (!productTotals[item.productId]) {
        productTotals[item.productId] = { qty: 0, revenue: 0 };
      }
      productTotals[item.productId].qty += item.quantity;
      productTotals[item.productId].revenue += item.subtotal;
    });
  });

  function getCustomerLocation(order: Order): string {
    if (!order.customerId) return "";
    const c = customersList.find((c) => c.id === order.customerId);
    return c?.location || "";
  }

  function buildReportRows() {
    return monthOrders.map((o, idx) => {
      const items = o.items as OrderItem[];
      return {
        no: idx + 1,
        customer: o.customerName,
        phone: o.phone,
        location: getCustomerLocation(o),
        items: formatItemsList(items),
        total: o.totalAmount || 0,
        status: o.status,
        payment: o.paymentStatus === "paid" ? "Paid" : o.paymentStatus === "pending" ? "Pending" : "Unpaid",
        mpesaRef: o.mpesaTransactionId || "",
        notes: o.notes || "",
      };
    });
  }

  async function exportExcel() {
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const rows = buildReportRows();
      const wsData = [
        [`Enkana Fresh — Orders Report: ${selectedMonth === "all" ? "All Months" : formatDeliveryMonth(selectedMonth)}`],
        [],
        ["#", "Customer", "Phone", "Location", "Items", "Total (KES)", "Status", "Payment", "M-Pesa Ref", "Notes"],
        ...rows.map((r) => [r.no, r.customer, r.phone, r.location, r.items, r.total, r.status, r.payment, r.mpesaRef, r.notes]),
        [],
        ["", "", "", "", "Total Revenue", totalRevenue, "", "", "", ""],
        ["", "", "", "", "Paid", paidAmount, "", "", "", ""],
        ["", "", "", "", "Pending", pendingAmount, "", "", "", ""],
        [],
        ["Product Summary"],
        ["Product", "Total Qty", "Revenue (KES)"],
        ...PRODUCTS.map((p) => {
          const t = productTotals[p.id];
          return [p.name, t ? `${t.qty} ${p.unit}` : "0", t ? t.revenue : 0];
        }),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 20 }, { wch: 14 }, { wch: 18 },
        { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 16 }, { wch: 25 },
      ];
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      XLSX.writeFile(wb, `Enkana_Fresh_Orders_${selectedMonth}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  async function exportPDF() {
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const rows = buildReportRows();

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Enkana Fresh", 14, 15);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Monthly Orders Report — ${selectedMonth === "all" ? "All Months" : formatDeliveryMonth(selectedMonth)}`, 14, 22);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`, 14, 28);

      doc.setFontSize(9);
      doc.text(`Total Orders: ${monthOrders.length}`, 200, 15);
      doc.text(`Total Revenue: KES ${totalRevenue.toLocaleString()}`, 200, 20);
      doc.text(`Paid: KES ${paidAmount.toLocaleString()}`, 200, 25);
      doc.text(`Pending: KES ${pendingAmount.toLocaleString()}`, 200, 30);

      autoTable(doc, {
        startY: 34,
        head: [["#", "Customer", "Phone", "Location", "Items", "Total (KES)", "Status", "Payment", "M-Pesa Ref"]],
        body: rows.map((r) => [r.no, r.customer, r.phone, r.location, r.items, `KES ${r.total.toLocaleString()}`, r.status, r.payment, r.mpesaRef]),
        theme: "striped",
        headStyles: { fillColor: [46, 78, 56], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 28 },
          2: { cellWidth: 24 },
          3: { cellWidth: 28 },
          4: { cellWidth: 55 },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
          8: { cellWidth: 24 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 8);
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      if (finalY + 40 < doc.internal.pageSize.height) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Product Summary", 14, finalY + 10);

        autoTable(doc, {
          startY: finalY + 14,
          head: [["Product", "Total Qty", "Revenue (KES)"]],
          body: PRODUCTS.map((p) => {
            const t = productTotals[p.id];
            return [p.name, t ? `${t.qty} ${p.unit}` : "0", t ? `KES ${t.revenue.toLocaleString()}` : "KES 0"];
          }),
          theme: "grid",
          headStyles: { fillColor: [46, 78, 56], fontSize: 8, fontStyle: "bold" },
          bodyStyles: { fontSize: 8 },
          tableWidth: 120,
          margin: { left: 14 },
        });
      }

      doc.save(`Enkana_Fresh_Orders_${selectedMonth}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto enkana-section-green min-h-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-tight text-foreground" data-testid="text-report-title">
            Monthly Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-report-subtitle">
            Order summary and export
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]" data-testid="select-report-month">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMonth !== "all" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth("all")}
              className="text-primary border-primary/30"
            >
              Show all orders
            </Button>
          )}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Showing: <span className="font-medium text-foreground">{selectedMonth === "all" ? "All Months" : formatDeliveryMonth(selectedMonth)}</span>
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="report-stat-orders">
          <div className="flex items-center gap-4 p-4">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-accent">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orders</div>
              <div className="text-xl font-bold text-foreground">{monthOrders.length}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="report-stat-revenue">
          <div className="flex items-center gap-4 p-4">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</div>
              <div className="text-xl font-bold text-foreground">KES {totalRevenue.toLocaleString()}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="report-stat-paid">
          <div className="flex items-center gap-4 p-4">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</div>
              <div className="text-xl font-bold text-foreground">KES {paidAmount.toLocaleString()}</div>
            </div>
          </div>
        </Card>
        <Card className="enkana-card enkana-card-hover overflow-hidden border border-border shadow-sm ring-soft" data-testid="report-stat-pending">
          <div className="flex items-center gap-4 p-4">
            <div className="enkana-icon-box grid h-11 w-11 shrink-0 place-items-center rounded-xl text-accent">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</div>
              <div className="text-xl font-bold text-foreground">KES {pendingAmount.toLocaleString()}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex items-center gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={exportExcel}
          disabled={exporting !== null || monthOrders.length === 0}
          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          data-testid="button-export-excel"
        >
          {exporting === "excel" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          Export Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportPDF}
          disabled={exporting !== null || monthOrders.length === 0}
          className="text-red-700 border-red-200 hover:bg-red-50"
          data-testid="button-export-pdf"
        >
          {exporting === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Export PDF
        </Button>
      </div>

      {PRODUCTS.length > 0 && Object.keys(productTotals).length > 0 && (
        <Card className="enkana-card border border-border shadow-sm mb-4 overflow-hidden ring-soft" data-testid="product-summary">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Product Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            {PRODUCTS.map((p) => {
              const t = productTotals[p.id];
              return (
                <div key={p.id} className="p-4 text-center" data-testid={`product-stat-${p.id}`}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.name}</div>
                  <div className="text-lg font-bold text-foreground mt-1">{t ? t.qty : 0} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span></div>
                  <div className="text-xs text-muted-foreground">KES {(t ? t.revenue : 0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {ordersLoading ? (
        <div className="py-20 text-center text-gray-400" data-testid="text-loading">Loading...</div>
      ) : monthOrders.length === 0 ? (
        <Card className="py-16 text-center border-0 shadow-sm">
          <Package className="mx-auto h-12 w-12 text-[hsl(var(--primary))]/30" />
          <div className="mt-4 text-lg font-semibold text-gray-600" data-testid="text-empty">No orders {selectedMonth === "all" ? "found" : `for ${formatDeliveryMonth(selectedMonth)}`}</div>
          <div className="mt-1 text-sm text-gray-400">
            {selectedMonth === "all" ? "Orders appear here once you add them from the Orders page." : "Try selecting \"All Months\" or a different delivery month above."}
          </div>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden" data-testid="report-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthOrders.map((order, idx) => {
                  const items = order.items as OrderItem[];
                  const paymentLabel = order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "pending" ? "Pending" : "Unpaid";
                  const paymentColor = order.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.paymentStatus === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-50 text-gray-500 border-gray-200";
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition" data-testid={`report-row-${order.id}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-400 md:hidden">{order.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{order.phone}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell max-w-[200px] truncate">{formatItemsList(items)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[order.status] || ""}`}>{order.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        KES {(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[11px] capitalize ${paymentColor}`}>
                          {order.paymentStatus === "paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {paymentLabel}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-600">
                    Total ({activeOrders.length} active orders)
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-[hsl(var(--primary))]">
                    KES {totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
