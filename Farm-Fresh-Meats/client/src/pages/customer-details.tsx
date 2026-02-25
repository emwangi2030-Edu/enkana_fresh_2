import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrdersByCustomerId, updateCustomer, deleteCustomer } from "@/lib/supabase-data";
import { supabase } from "@/lib/supabase";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Phone, Calendar, Package, User, MapPin, Pencil, Trash2 } from "lucide-react";
import { PRODUCTS, type Order, type OrderItem, type Customer } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function formatDeliveryMonth(m: string | null): string {
  if (!m) return "";
  const [year, month] = m.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 5);
  return `5th ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLocationPin, setEditLocationPin] = useState("");

  const { data: customer, isLoading: customerLoading, isError: customerError } = useQuery<Customer>({
    queryKey: ["customers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw new Error("Customer not found");
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
        result[camelKey] = value;
      }
      return result as Customer;
    },
    enabled: !!id,
  });

  const { data: customerOrders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["customers", id, "orders"],
    queryFn: () => fetchOrdersByCustomerId(id!),
    enabled: !!id,
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      return updateCustomer(id!, {
        name: editName,
        phone: editPhone,
        location: editLocation || null,
        locationPin: editLocationPin || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", id] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteCustomer(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setLocation("/customers");
    },
  });

  function openEdit() {
    if (customer) {
      setEditName(customer.name);
      setEditPhone(customer.phone);
      setEditLocation(customer.location || "");
      setEditLocationPin(customer.locationPin || "");
      setEditOpen(true);
    }
  }

  const hasOrders = customerOrders.length > 0;

  const totalSpent = customerOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const deliveredCount = customerOrders.filter((o) => o.status === "delivered").length;

  return (
    <div className="p-6 max-w-5xl mx-auto enkana-section-green min-h-full">
      <div className="mb-6">
        <Link href="/customers" data-testid="link-back-customers">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground hover:text-foreground hover:bg-primary/5">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>

        {customerError ? (
          <Card className="enkana-card border border-border shadow-sm p-5 text-center ring-soft">
            <div className="text-destructive font-medium" data-testid="text-customer-error">Customer not found</div>
            <Link href="/customers">
              <Button variant="outline" className="mt-3" data-testid="link-back-to-customers">
                Back to Customers
              </Button>
            </Link>
          </Card>
        ) : customerLoading ? (
          <Card className="enkana-card border border-border shadow-sm p-5 ring-soft">
            <div className="text-muted-foreground text-sm">Loading customer info...</div>
          </Card>
        ) : customer ? (
          <Card className="enkana-card border border-border shadow-sm p-5 ring-soft" data-testid="card-customer-info">
            <div className="flex items-start gap-4">
              <div className="enkana-icon-box grid h-12 w-12 place-items-center rounded-full text-primary">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground" data-testid="text-customer-name">
                  {customer.name}
                </h2>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-customer-phone">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </div>
                {customer.location && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-customer-location">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.locationPin ? (
                      <a
                        href={customer.locationPin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {customer.location}
                      </a>
                    ) : (
                      customer.location
                    )}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground" data-testid="text-customer-since">
                  Customer since {new Date(customer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEdit}
                  data-testid="button-edit-customer"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                {hasOrders ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-gray-400 cursor-not-allowed"
                    title="Cannot delete a customer with orders"
                    data-testid="button-delete-customer-disabled"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        data-testid="button-delete-customer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{customer.name}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-red-600 hover:bg-red-700"
                          data-testid="button-confirm-delete"
                        >
                          Delete Customer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            {hasOrders && (
              <div className="mt-2 text-xs text-gray-400 text-right">
                Customers with orders cannot be deleted
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
                <div className="text-xl font-bold text-gray-900" data-testid="text-total-orders">
                  {customerOrders.length}
                </div>
                <div className="text-xs text-gray-500">Total Orders</div>
              </div>
              <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
                <div className="text-xl font-bold text-green-700" data-testid="text-delivered-orders">
                  {deliveredCount}
                </div>
                <div className="text-xs text-gray-500">Delivered</div>
              </div>
              <div className="rounded-lg bg-[#faf8f5] p-3 text-center">
                <div className="text-xl font-bold text-gray-900" data-testid="text-total-spent">
                  KES {totalSpent.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total Spent</div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                data-testid="input-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input
                data-testid="input-edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                data-testid="input-edit-location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="e.g. Kileleshwa, Nairobi"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location Pin (Google Maps link)</label>
              <Input
                data-testid="input-edit-location-pin"
                value={editLocationPin}
                onChange={(e) => setEditLocationPin(e.target.value)}
                placeholder="Paste Google Maps link..."
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90"
              disabled={editMutation.isPending}
              data-testid="button-save-customer"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <h3 className="mb-3 text-sm font-semibold text-gray-700">Order History</h3>

      {ordersLoading ? (
        <div className="py-12 text-center text-gray-400" data-testid="text-loading">
          Loading orders...
        </div>
      ) : customerOrders.length === 0 ? (
        <Card className="border-0 shadow-sm py-12 text-center">
          <Package className="mx-auto h-10 w-10 text-[hsl(var(--primary))]/30" />
          <div className="mt-3 text-sm font-medium text-gray-500" data-testid="text-no-orders">
            No orders for this customer yet
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {customerOrders.map((order) => {
            const orderItems = order.items as OrderItem[];
            return (
              <Card
                key={order.id}
                className="border-0 shadow-sm p-4"
                data-testid={`card-order-${order.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${statusColors[order.status] || ""}`}
                        data-testid={`badge-status-${order.id}`}
                      >
                        {order.status}
                      </Badge>
                      {order.deliveryMonth && (
                        <span className="flex items-center gap-1 text-sm text-gray-500" data-testid={`text-delivery-${order.id}`}>
                          <Calendar className="h-3 w-3" />
                          {formatDeliveryMonth(order.deliveryMonth)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400" data-testid={`text-date-${order.id}`}>
                        Created {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      {orderItems.map((item) => {
                        const defaultProduct = PRODUCTS.find((p) => p.id === item.productId);
                        const isCustomPrice = defaultProduct && item.pricePerUnit !== defaultProduct.pricePerUnit;
                        return (
                          <div
                            key={item.productId}
                            className="flex items-center gap-2 text-sm"
                            data-testid={`text-item-${order.id}-${item.productId}`}
                          >
                            <span className="text-gray-700 font-medium">{item.productName}</span>
                            <span className="text-gray-400">x</span>
                            <span className="text-gray-600">
                              {item.quantity} {item.unit}
                            </span>
                            <span className="text-gray-400">@</span>
                            <span className={`text-gray-600 ${isCustomPrice ? "text-orange-600 font-medium" : ""}`}>
                              KES {item.pricePerUnit.toLocaleString()}/{item.unit}
                            </span>
                            <span className="text-gray-400">=</span>
                            <span className="text-gray-600 font-medium">KES {item.subtotal.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>

                    {order.notes && (
                      <div className="mt-2 text-xs text-gray-400 italic" data-testid={`text-notes-${order.id}`}>
                        {order.notes}
                      </div>
                    )}
                  </div>

                  {order.totalAmount != null && order.totalAmount > 0 && (
                    <span className="rounded-lg bg-[hsl(var(--primary))]/10 px-3 py-1.5 text-sm font-bold text-[hsl(var(--primary))] shrink-0 ml-3" data-testid={`text-total-${order.id}`}>
                      KES {order.totalAmount.toLocaleString()}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
