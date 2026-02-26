import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, createCustomer } from "@/lib/supabase-data";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function CustomerNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocationVal] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicateBanner, setDuplicateBanner] = useState<{ phone: string; existingId: string } | null>(null);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setLocation(`/customers/${data.id}`);
    },
    onError: () => setDuplicateBanner(null),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim().replace(/\s/g, "");
    const existing = allCustomers.find((c) => (c.phone || "").replace(/\s/g, "") === trimmedPhone);
    if (existing) {
      setDuplicateBanner({ phone: trimmedPhone, existingId: existing.id });
      return;
    }
    setDuplicateBanner(null);
    createMutation.mutate({
      name: name.trim(),
      phone: trimmedPhone || name.trim(),
      location: location.trim() || null,
      deliveryZone: deliveryZone.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto enkana-section-green min-h-full">
      <Link href="/customers">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </Link>
      <h1 className="page-title mb-2">New Customer</h1>
      <p className="text-sm text-muted-foreground mb-4">Add a customer record. Phone must be unique.</p>

      {duplicateBanner && (
        <Card className="mb-4 p-3 border-amber-200 bg-amber-50 text-amber-900">
          <p className="font-medium">A customer with this phone already exists.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${duplicateBanner.existingId}`}>View Record</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDuplicateBanner(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      <Card className="enkana-card border border-border p-4 ring-soft">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="location">Location / Address</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocationVal(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="deliveryZone">Delivery Zone</Label>
            <Input
              id="deliveryZone"
              value={deliveryZone}
              onChange={(e) => setDeliveryZone(e.target.value)}
              placeholder="e.g. Westlands"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Admin notes"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createMutation.isPending || !name.trim() || !phone.trim()}>
              {createMutation.isPending ? "Saving…" : "Save Customer"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/customers">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
