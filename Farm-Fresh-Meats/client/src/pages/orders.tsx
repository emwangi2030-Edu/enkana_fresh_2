import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrders, fetchCustomers, createCustomer, createOrder, updateOrder, deleteOrder,
  fetchOrdersByCustomerId, requestMpesaPayment
} from "@/lib/supabase-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import {
  Plus, Pencil, Trash2, Phone, Package, Search, Calendar,
  UserPlus, UserCheck, MapPin, DollarSign, Users, TrendingUp,
  ShoppingBag, CreditCard, Loader2, CheckCircle2, ChevronDown, ChevronRight,
  RefreshCw, Percent, CalendarClock, Banknote
} from "lucide-react";
import { PRODUCTS, type Order, type InsertOrder, type OrderItem, type Customer } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const paymentColors: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-gray-50 text-gray-500 border-gray-200",
};

function getNextDeliveryMonth(): string {
  const now = new Date();
  const day = now.getDate();
  if (day <= 5) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function formatDeliveryMonth(m: string | null): string {
  if (!m) return "";
  const [year, month] = m.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 5);
  return `5th ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function summarizeItems(items: OrderItem[]): string {
  if (items.length === 0) return "No items";
  if (items.length === 1) return `${items[0].productName} (${items[0].quantity} ${items[0].unit})`;
  const first = items[0];
  return `${first.productName} +${items.length - 1} more`;
}

type ProductSelection = Record<string, { selected: boolean; qty: number; price: number }>;

function emptyItemSelection(): ProductSelection {
  const sel: ProductSelection = {};
  PRODUCTS.forEach((p) => {
    sel[p.id] = { selected: false, qty: 1, price: p.pricePerUnit };
  });
  return sel;
}

function itemsToSelection(items: OrderItem[]): ProductSelection {
  const sel = emptyItemSelection();
  items.forEach((item) => {
    if (sel[item.productId]) {
      sel[item.productId] = { selected: true, qty: item.quantity, price: item.pricePerUnit };
    }
  });
  return sel;
}

function selectionToItems(sel: ProductSelection): OrderItem[] {
  const items: OrderItem[] = [];
  PRODUCTS.forEach((p) => {
    const s = sel[p.id];
    if (s?.selected && s.qty > 0) {
      items.push({
        productId: p.id,
        productName: p.name,
        quantity: s.qty,
        unit: p.unit,
        pricePerUnit: s.price,
        subtotal: s.qty * s.price,
      });
    }
  });
  return items;
}

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<"new" | "returning">("new");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [customerLocationPin, setCustomerLocationPin] = useState("");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");
  const [deliveryMonth, setDeliveryMonth] = useState(getNextDeliveryMonth());
  const [productSelection, setProductSelection] = useState(emptyItemSelection());

  const { data: orders = [], isLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const { data: customersList = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertOrder & { _saveCustomer?: boolean; _customerLocation?: string; _customerLocationPin?: string }) => {
      const { _saveCustomer, _customerLocation, _customerLocationPin, ...orderData } = data;
      let customerId = orderData.customerId;
      if (_saveCustomer && customerType === "new") {
        try {
          const customer = await createCustomer({
            name: orderData.customerName,
            phone: orderData.phone,
            location: _customerLocation || null,
            locationPin: _customerLocationPin || null,
          });
          customerId = customer.id;
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        } catch {}
      }
      return createOrder({ ...orderData, customerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertOrder> }) => {
      return updateOrder(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const [stkPushingOrderId, setStkPushingOrderId] = useState<string | null>(null);
  const [stkMessage, setStkMessage] = useState<{ orderId: string; message: string; type: "success" | "error" } | null>(null);

  const stkPushMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setStkPushingOrderId(orderId);
      return requestMpesaPayment(orderId);
    },
    onSuccess: (data, orderId) => {
      setStkMessage({ orderId, message: data.customerMessage || "Payment prompt sent to customer's phone", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setTimeout(() => setStkMessage(null), 8000);
    },
    onError: (error: Error, orderId) => {
      setStkMessage({ orderId, message: error.message, type: "error" });
      setTimeout(() => setStkMessage(null), 8000);
    },
    onSettled: () => {
      setStkPushingOrderId(null);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return updateOrder(orderId, {
        paymentStatus: "paid",
        paidAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  function resetForm() {
    setCustomerType("new");
    setSelectedCustomerId("");
    setCustomerName("");
    setPhone("");
    setCustomerLocation("");
    setCustomerLocationPin("");
    setStatus("pending");
    setNotes("");
    setDeliveryMonth(getNextDeliveryMonth());
    setProductSelection(emptyItemSelection());
    setEditingOrder(null);
  }

  function openEdit(order: Order) {
    setEditingOrder(order);
    setCustomerType(order.customerId ? "returning" : "new");
    setSelectedCustomerId(order.customerId || "");
    setCustomerName(order.customerName);
    setPhone(order.phone);
    setStatus(order.status);
    setNotes(order.notes || "");
    setDeliveryMonth(order.deliveryMonth || getNextDeliveryMonth());
    setProductSelection(itemsToSelection(order.items as OrderItem[]));
    setDialogOpen(true);
  }

  async function handleSelectReturningCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    const customer = customersList.find((c) => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setPhone(customer.phone);
      setCustomerLocation(customer.location || "");
      setCustomerLocationPin(customer.locationPin || "");
    }
    try {
      const custOrders = await fetchOrdersByCustomerId(customerId);
      if (custOrders.length > 0) {
        const lastOrder = custOrders[0];
        const lastItems = lastOrder.items as OrderItem[];
        setProductSelection(itemsToSelection(lastItems));
        setNotes(lastOrder.notes || "");
      }
    } catch {}
  }

  const selectedItems = selectionToItems(productSelection);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    const data: InsertOrder & { _saveCustomer?: boolean; _customerLocation?: string; _customerLocationPin?: string } = {
      customerName,
      phone,
      items: selectedItems,
      totalAmount,
      status,
      notes: notes || null,
      deliveryMonth,
      customerId: selectedCustomerId || null,
      _saveCustomer: customerType === "new",
      _customerLocation: customerLocation,
      _customerLocationPin: customerLocationPin,
    };
    if (editingOrder) {
      const { _saveCustomer, _customerLocation, _customerLocationPin, ...orderData } = data;
      updateMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleProduct(productId: string) {
    setProductSelection((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], selected: !prev[productId].selected },
    }));
  }

  function updateQty(productId: string, qty: number) {
    setProductSelection((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], qty: Math.max(0.5, qty) },
    }));
  }

  function updatePrice(productId: string, price: number) {
    setProductSelection((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], price: Math.max(0, price) },
    }));
  }

  const filtered = orders.filter((o) => {
    const itemNames = (o.items as OrderItem[]).map((i) => i.productName.toLowerCase()).join(" ");
    const matchesSearch =
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      itemNames.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    processing: orders.filter((o) => o.status === "processing").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  // Section 7 Dashboard Metrics (enkana-cursor-instructions.md)
  const paidOrders = orders.filter((o) => o.status !== "cancelled" && o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status !== "cancelled" && o.paymentStatus !== "paid");
  const pendingKes = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const nextDeliveryMonth = (() => {
    const months = [...new Set(orders.map((o) => o.deliveryMonth).filter(Boolean))].filter((m) => m && m >= `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`).sort();
    return months[0] || null;
  })();
  const nextDeliveryOrders = nextDeliveryMonth ? orders.filter((o) => o.deliveryMonth === nextDeliveryMonth && o.status !== "cancelled") : [];
  const nextDeliveryCount = nextDeliveryOrders.length;
  const nextDeliveryDate = nextDeliveryMonth ? (() => { const [y, m] = nextDeliveryMonth.split("-"); return `5th ${new Date(parseInt(y), parseInt(m) - 1, 5).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`; })() : "—";
  const orderCount = orders.filter((o) => o.status !== "cancelled").length;
  const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
  const uniqueCustomers = new Set(orders.filter((o) => o.customerId).map((o) => o.customerId)).size;
  const customerOrderCounts = orders.filter((o) => o.customerId).reduce((acc, o) => { acc[o.customerId!] = (acc[o.customerId!] || 0) + 1; return acc; }, {} as Record<string, number>);
  const repeatCustomers = Object.values(customerOrderCounts).filter((c) => c >= 2).length;
  const repeatCustomersPct = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground" data-testid="text-orders-title">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-orders-subtitle">
            Monthly subscription orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { queryClient.invalidateQueries({ queryKey: ["orders"] }); refetchOrders(); }}
            disabled={isLoading}
            className="shrink-0"
            title="Sync latest orders from database"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" data-testid="button-new-order">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingOrder ? "Edit Order" : "New Monthly Order"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {!editingOrder && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Customer Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setCustomerType("new"); setSelectedCustomerId(""); setCustomerName(""); setPhone(""); setCustomerLocation(""); setCustomerLocationPin(""); setProductSelection(emptyItemSelection()); setNotes(""); }}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition ${customerType === "new" ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]" : "bg-white hover:bg-gray-50 text-gray-600"}`}
                      data-testid="button-new-customer"
                    >
                      <UserPlus className="h-4 w-4" />
                      New Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomerType("returning"); setCustomerName(""); setPhone(""); setCustomerLocation(""); setCustomerLocationPin(""); setProductSelection(emptyItemSelection()); setNotes(""); }}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition ${customerType === "returning" ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]" : "bg-white hover:bg-gray-50 text-gray-600"}`}
                      data-testid="button-returning-customer"
                    >
                      <UserCheck className="h-4 w-4" />
                      Returning Customer
                    </button>
                  </div>
                </div>
              )}

              {customerType === "returning" && !editingOrder && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Select Customer</label>
                  {customersList.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-400">No saved customers yet. Create a new customer first.</div>
                  ) : (
                    <Select value={selectedCustomerId} onValueChange={handleSelectReturningCustomer}>
                      <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Choose a customer..." /></SelectTrigger>
                      <SelectContent>
                        {customersList.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedCustomerId && (
                    <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                      Last order products and prices have been pre-filled. You can adjust anything below.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input data-testid="input-customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Jane Wanjiku" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input data-testid="input-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712345678" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input data-testid="input-location" value={customerLocation} onChange={(e) => setCustomerLocation(e.target.value)} placeholder="e.g. Kileleshwa, Nairobi" />
                </div>
                <div>
                  <label className="text-sm font-medium">Location Pin (Google Maps link)</label>
                  <Input data-testid="input-location-pin" value={customerLocationPin} onChange={(e) => setCustomerLocationPin(e.target.value)} placeholder="Paste Google Maps link..." />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Products *</label>
                <div className="space-y-2">
                  {PRODUCTS.map((product) => {
                    const sel = productSelection[product.id];
                    return (
                      <div key={product.id} className={`flex items-center gap-3 rounded-lg border p-3 transition ${sel?.selected ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "bg-white hover:bg-gray-50"}`} data-testid={`product-row-${product.id}`}>
                        <Checkbox checked={sel?.selected || false} onCheckedChange={() => toggleProduct(product.id)} data-testid={`checkbox-${product.id}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-gray-500">Default: KES {product.pricePerUnit.toLocaleString()} per {product.unit}</div>
                        </div>
                        {sel?.selected && (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500">Qty:</div>
                              <Input type="number" min={0.5} step={0.5} value={sel.qty} onChange={(e) => updateQty(product.id, parseFloat(e.target.value) || 0.5)} className="w-20 text-center h-8" data-testid={`qty-${product.id}`} />
                              <span className="text-xs text-gray-500">{product.unit}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500">Price:</div>
                              <Input type="number" min={0} step={10} value={sel.price} onChange={(e) => updatePrice(product.id, parseFloat(e.target.value) || 0)} className="w-20 text-center h-8" data-testid={`price-${product.id}`} />
                              <span className="text-sm font-semibold text-right" data-testid={`subtotal-${product.id}`}>= KES {(sel.qty * sel.price).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-100 px-4 py-2">
                    <span className="text-sm font-medium text-gray-600">Total</span>
                    <span className="text-lg font-bold" data-testid="text-order-total">KES {totalAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Delivery Month</label>
                  <Input data-testid="input-delivery-month" type="month" value={deliveryMonth} onChange={(e) => setDeliveryMonth(e.target.value)} />
                  <div className="mt-1 text-xs text-gray-400">Delivered by 5th of the month</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea data-testid="input-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions (cuts, portions, etc.)..." rows={2} />
              </div>

              <Button type="submit" className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90" disabled={createMutation.isPending || updateMutation.isPending || selectedItems.length === 0} data-testid="button-submit-order">
                {editingOrder ? "Update Order" : "Add Order"}
                {totalAmount > 0 && ` — KES ${totalAmount.toLocaleString()}`}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <section className="mb-6" aria-label="Revenue tracker">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Revenue tracker</h2>
        <p className="text-xs text-muted-foreground mb-3">Per docs/enkana-cursor-instructions.md §7 — each card links to the relevant screen.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Link href="/dashboard/orders">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-total-revenue">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</div>
                  <div className="text-xl font-bold text-foreground">KES {totalRevenue.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Paid orders only</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/payments">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-pending-kes">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending KES</div>
                  <div className="text-xl font-bold text-foreground">KES {pendingKes.toLocaleString()}</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/orders">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-next-delivery">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Delivery</div>
                  <div className="text-lg font-bold text-foreground">{nextDeliveryCount} orders</div>
                  <div className="text-[10px] text-muted-foreground">{nextDeliveryDate}</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/orders">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-avg-order-value">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Order Value</div>
                  <div className="text-xl font-bold text-foreground">KES {avgOrderValue.toLocaleString()}</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/reports/enkana-margin-tracker">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-gross-margin">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Margin %</div>
                  <div className="text-xl font-bold text-foreground">See Margin Tracker</div>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/customers">
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm hover:ring-2 hover:ring-primary/20 transition cursor-pointer h-full" data-testid="stat-repeat-customers">
              <div className="flex items-center gap-4 p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repeat Customers %</div>
                  <div className="text-xl font-bold text-foreground">{repeatCustomersPct}%</div>
                  <div className="text-[10px] text-muted-foreground">{repeatCustomers} of {uniqueCustomers}</div>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input data-testid="input-search" className="pl-10 border-gray-200 bg-white shadow-sm" placeholder="Search by name, phone, or product..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "pending", "confirmed", "processing", "delivered", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusFilter === s ? (s === "all" ? "bg-[hsl(var(--primary))] text-white shadow-sm" : statusColors[s] ? `${statusColors[s]} shadow-sm` : "bg-[hsl(var(--primary))] text-white shadow-sm") : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"}`}
              data-testid={`filter-${s}`}
            >
              <span className="capitalize">{s}</span>
              <span className="ml-1 opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground" data-testid="text-loading">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center border-0 rounded-xl bg-card shadow-sm">
          <Package className="mx-auto h-12 w-12 text-primary/30" />
          <div className="mt-4 text-lg font-semibold text-foreground" data-testid="text-empty">No orders yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Add your first monthly order using the "New Order" button above.</div>
        </Card>
      ) : (
        <Card className="border-0 rounded-xl bg-card shadow-sm overflow-hidden" data-testid="orders-table">
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_90px_110px_40px] gap-3 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>CUSTOMER</div>
            <div>ITEMS</div>
            <div>DELIVERY</div>
            <div>STATUS</div>
            <div className="text-right">AMOUNT</div>
            <div></div>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map((order) => {
              const orderItems = order.items as OrderItem[];
              const isExpanded = expandedOrderId === order.id;
              const orderCustomer = order.customerId ? customersList.find((c) => c.id === order.customerId) : null;
              const paymentKey = order.paymentStatus === "paid" ? "paid" : order.paymentStatus === "pending" ? "pending" : "unpaid";

              return (
                <div key={order.id} data-testid={`card-order-${order.id}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className={`w-full text-left px-4 py-3 transition hover:bg-gray-50/80 ${isExpanded ? "bg-gray-50/50" : ""}`}
                    data-testid={`row-order-${order.id}`}
                  >
                    <div className="sm:grid sm:grid-cols-[1fr_120px_100px_90px_110px_40px] sm:gap-3 sm:items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-gray-900 truncate" data-testid={`text-customer-${order.id}`}>
                          {order.customerName}
                        </span>
                        {order.customerId && (
                          <span className="hidden lg:inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            Saved
                          </span>
                        )}
                      </div>

                      <div className="hidden sm:block text-xs text-gray-500 truncate" data-testid={`text-items-summary-${order.id}`}>
                        {summarizeItems(orderItems)}
                      </div>

                      <div className="hidden sm:block text-xs text-gray-500" data-testid={`text-delivery-${order.id}`}>
                        {order.deliveryMonth ? formatDeliveryMonth(order.deliveryMonth) : "—"}
                      </div>

                      <div className="mt-1 sm:mt-0">
                        <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[order.status] || ""}`} data-testid={`badge-status-${order.id}`}>
                          {order.status}
                        </Badge>
                      </div>

                      <div className="hidden sm:flex items-center justify-end gap-2">
                        <span className="text-sm font-bold text-gray-900" data-testid={`text-total-${order.id}`}>
                          {order.totalAmount ? `KES ${order.totalAmount.toLocaleString()}` : "—"}
                        </span>
                        {paymentKey === "paid" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      </div>

                      <div className="hidden sm:flex justify-end">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>

                      <div className="flex sm:hidden items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{order.deliveryMonth ? formatDeliveryMonth(order.deliveryMonth) : ""}</span>
                        <span className="ml-auto text-sm font-bold text-gray-900">{order.totalAmount ? `KES ${order.totalAmount.toLocaleString()}` : ""}</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100" data-testid={`detail-order-${order.id}`}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Customer</div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.customerId ? (
                                <Link href={`/customers/${order.customerId}`} className="text-[hsl(var(--primary))] hover:underline" data-testid={`link-customer-${order.id}`}>
                                  {order.customerName}
                                </Link>
                              ) : order.customerName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {order.phone}
                            </div>
                            {orderCustomer?.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {orderCustomer.locationPin ? (
                                  <a href={orderCustomer.locationPin} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">
                                    {orderCustomer.location}
                                  </a>
                                ) : orderCustomer.location}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Order Details</div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[order.status] || ""}`}>{order.status}</Badge>
                              <Badge variant="outline" className={`text-[11px] capitalize ${paymentColors[paymentKey]}`}>
                                {paymentKey === "paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {paymentKey === "pending" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {paymentKey === "paid" ? "Paid" : paymentKey === "pending" ? "Payment Pending" : "Unpaid"}
                              </Badge>
                            </div>
                            {order.deliveryMonth && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                Delivery: {formatDeliveryMonth(order.deliveryMonth)}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              Created {new Date(order.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            {order.mpesaTransactionId && (
                              <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                M-Pesa Ref: {order.mpesaTransactionId}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Items</div>
                            <div className="space-y-1.5">
                              {orderItems.map((item) => {
                                const defaultProduct = PRODUCTS.find((p) => p.id === item.productId);
                                const isCustomPrice = defaultProduct && item.pricePerUnit !== defaultProduct.pricePerUnit;
                                return (
                                  <div key={item.productId} className="flex items-center justify-between text-sm" data-testid={`text-item-${order.id}-${item.productId}`}>
                                    <div>
                                      <span className="font-medium text-gray-700">{item.productName}</span>
                                      <span className="text-gray-400 ml-1">
                                        {item.quantity} {item.unit} @ <span className={isCustomPrice ? "text-orange-600 font-medium" : ""}>KES {item.pricePerUnit.toLocaleString()}</span>
                                      </span>
                                    </div>
                                    <span className="font-semibold text-gray-900 ml-3">KES {item.subtotal.toLocaleString()}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                              <span className="text-sm font-semibold text-gray-600">Total</span>
                              <span className="text-base font-bold text-[hsl(var(--primary))]">KES {(order.totalAmount || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {order.notes && (
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</div>
                              <div className="text-sm text-gray-600 italic" data-testid={`text-notes-${order.id}`}>{order.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {stkMessage && stkMessage.orderId === order.id && (
                        <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${stkMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`} data-testid={`stk-message-${order.id}`}>
                          {stkMessage.message}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                        {order.paymentStatus !== "paid" && order.totalAmount && order.totalAmount > 0 && order.status !== "cancelled" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={(e) => { e.stopPropagation(); stkPushMutation.mutate(order.id); }}
                              disabled={stkPushingOrderId === order.id}
                              data-testid={`button-request-payment-${order.id}`}
                            >
                              {stkPushingOrderId === order.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                              {stkPushingOrderId === order.id ? "Sending..." : "Request Payment"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(order.id); }}
                              disabled={markPaidMutation.isPending}
                              title="Mark as paid (cash, bank transfer, etc.)"
                              data-testid={`button-mark-paid-${order.id}`}
                            >
                              {markPaidMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Banknote className="h-3.5 w-3.5 mr-1" />}
                              Mark as Paid
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(order); }} data-testid={`button-edit-${order.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" data-testid={`button-delete-${order.id}`}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove the order for {order.customerName}. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(order.id)} className="bg-red-600 hover:bg-red-700" data-testid={`button-confirm-delete-${order.id}`}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <span className="ml-auto text-xs text-gray-400">{formatShortDate(order.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
