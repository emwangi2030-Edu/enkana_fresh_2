import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "@/lib/supabase-data";
import { PRICING_MODE, setPricingMode, getProductPrice } from "@shared/schema";
import type { ProductCatalogueItem, InsertProductCatalogueItem, SourcingType, AnimalType, PricingMode } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package, Loader2 } from "lucide-react";

// Margin bar colors only (semantic)
const MARGIN_GREEN = "#2d7a4f";
const MARGIN_AMBER = "#e9a82a";
const MARGIN_RED = "#d94f4f";

// Subscribe to global PRICING_MODE for re-renders (we update it on confirm)
function usePricingMode(): [PricingMode, (mode: PricingMode) => void] {
  const [mode, setMode] = useState<PricingMode>(PRICING_MODE);
  const updateMode = (newMode: PricingMode) => {
    setPricingMode(newMode);
    setMode(newMode);
  };
  return [mode, updateMode];
}

const SOURCING_OPTIONS: { value: SourcingType; label: string }[] = [
  { value: "slaughter", label: "Own Slaughter" },
  { value: "resale", label: "Resale" },
  { value: "chicken", label: "Own Slaughter" },
];
// Step 1 add product: only two choices; chicken is chosen via animal type in step 2
const ADD_SOURCING_OPTIONS = [
  { value: "slaughter" as const, label: "Own Slaughter", description: "We raise or source and slaughter the animal. Cost set per cycle in Margin Tracker." },
  { value: "resale" as const, label: "Resale", description: "We buy from a butcher or supplier at a fixed cost." },
];

const ANIMAL_OPTIONS: { value: NonNullable<AnimalType>; label: string }[] = [
  { value: "goat", label: "Goat" },
  { value: "sheep", label: "Sheep" },
  { value: "beef", label: "Beef" },
  { value: "chicken_small", label: "Chicken — Small" },
  { value: "chicken_medium", label: "Chicken — Medium" },
  { value: "chicken_large", label: "Chicken — Large" },
];

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function categoryLabel(sourcingType: SourcingType): string {
  if (sourcingType === "resale") return "Resale";
  return "Own Slaughter";
}

function isVariableCost(p: ProductCatalogueItem): boolean {
  return p.costPrice == null;
}

export default function ProductsCatalogue() {
  const queryClient = useQueryClient();
  const [pricingMode, setPricingModeState] = usePricingMode();
  const [switchModalTarget, setSwitchModalTarget] = useState<PricingMode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductCatalogueItem | null>(null);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<InsertProductCatalogueItem>({
    id: "",
    name: "",
    unit: "kg",
    promoPrice: 0,
    standardPrice: 0,
    costPrice: null,
    sourcingType: "resale",
    animalType: null,
    available: true,
  });

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const availableCount = products.filter((p) => p.available !== false).length;
  const totalCount = products.length;

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setAddStep(1);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InsertProductCatalogueItem> }) =>
      updateProduct(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteId(null);
    },
  });

  function resetForm() {
    setForm({
      id: "",
      name: "",
      unit: "kg",
      promoPrice: 0,
      standardPrice: 0,
      costPrice: null,
      sourcingType: "resale",
      animalType: null,
      available: true,
    });
  }

  function openAdd() {
    setEditingProduct(null);
    setAddStep(1);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(p: ProductCatalogueItem) {
    setEditingProduct(p);
    setForm({
      id: p.id,
      name: p.name,
      unit: p.unit,
      promoPrice: p.promoPrice,
      standardPrice: p.standardPrice,
      costPrice: p.costPrice ?? null,
      sourcingType: p.sourcingType,
      animalType: p.animalType ?? null,
      available: p.available !== false,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingProduct) {
      const { id, ...updates } = form;
      updateMutation.mutate({ id: editingProduct.id, updates });
    } else {
      const id = form.id.trim() || slugFromName(form.name) || crypto.randomUUID().slice(0, 8);
      createMutation.mutate({ ...form, id });
    }
  }

  function toggleAvailable(p: ProductCatalogueItem) {
    updateMutation.mutate({
      id: p.id,
      updates: { available: p.available !== false },
    });
  }

  function handlePricingOptionClick(target: PricingMode) {
    if (target === pricingMode) return;
    setSwitchModalTarget(target);
  }

  function confirmPricingSwitch() {
    if (switchModalTarget) {
      setPricingModeState(switchModalTarget);
      setSwitchModalTarget(null);
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Products & Pricing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalCount === 0 ? "0" : availableCount} of {totalCount} products available · All prices in KES
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex rounded-lg p-0.5 border border-border bg-card">
              <button
                type="button"
                onClick={() => handlePricingOptionClick("promo")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  pricingMode === "promo"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                🏷 Promo
              </button>
              <button
                type="button"
                onClick={() => handlePricingOptionClick("standard")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  pricingMode === "standard"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                📋 Standard
              </button>
            </div>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Active pricing — compact bar */}
      <Card className="mb-6 overflow-hidden border border-border rounded-xl bg-card shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">{pricingMode === "promo" ? "🏷️" : "📋"}</span>
            <span className="font-medium text-foreground">
              {pricingMode === "promo" ? "Promo" : "Standard"} pricing active
            </span>
            <span className="text-muted-foreground">
              — {pricingMode === "promo"
                ? "New orders use promo prices"
                : "New orders use standard prices"}
              . Existing orders unchanged.
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Affects all new orders</span>
        </div>
      </Card>

      {/* Switch confirmation modal */}
      <Dialog open={!!switchModalTarget} onOpenChange={(open) => !open && setSwitchModalTarget(null)}>
        <DialogContent className="max-w-[400px] rounded-xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <DialogTitle>
                Switch to {switchModalTarget === "promo" ? "Promo" : "Standard"} Pricing?
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            All new orders will use {switchModalTarget === "promo" ? "promo" : "standard"} prices from this point
            forward. Existing orders are not affected — they keep the price locked at time of order.
          </p>
          <div className="flex flex-col gap-2 mt-6">
            <Button variant="outline" onClick={() => setSwitchModalTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPricingSwitch}>
              Yes, Switch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {error && (
          <Card className="p-3 mb-4 border border-amber-200 bg-amber-50 text-amber-900">
            <p className="text-sm">
              Could not load products. Run the Supabase migration{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">002_products_table.sql</code> to create the products
              table.
            </p>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : products.length === 0 && !error ? (
          <Card className="py-16 text-center border-0 rounded-xl bg-card shadow-sm">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-medium text-foreground">No products yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first product to get started.</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                pricingMode={pricingMode}
                onEdit={() => openEdit(p)}
                onDelete={() => setDeleteId(p.id)}
                onToggleAvailable={() => toggleAvailable(p)}
                deleteDialogOpen={deleteId === p.id}
                onDeleteCancel={() => setDeleteId(null)}
                onDeleteConfirm={() => deleteMutation.mutate(p.id)}
              />
            ))}
          </div>
        )}

        {/* Edit / Add modal ─── Sections D & E */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setAddStep(1); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Georgia, serif" }}>
                {editingProduct ? "Edit Product" : addStep === 1 ? "Add Product — Sourcing" : "Add Product — Details"}
              </DialogTitle>
            </DialogHeader>
            {editingProduct ? (
              <EditProductForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onCancel={() => setDialogOpen(false)}
                isPending={updateMutation.isPending}
              />
            ) : addStep === 1 ? (
              <AddStep1Form
                form={form}
                setForm={setForm}
                onNext={() => setAddStep(2)}
                onCancel={() => setDialogOpen(false)}
              />
            ) : (
              <AddStep2Form
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                onCancel={() => setDialogOpen(false)}
                onBack={() => setAddStep(1)}
                isPending={createMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ProductCard({
  product: p,
  pricingMode,
  onEdit,
  onDelete,
  onToggleAvailable,
  deleteDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  product: ProductCatalogueItem;
  pricingMode: PricingMode;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailable: () => void;
  deleteDialogOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const [hover, setHover] = useState(false);
  const activePrice = getProductPrice(p, pricingMode);
  const isVar = isVariableCost(p);
  const marginPct = !isVar && p.costPrice != null && p.costPrice > 0
    ? Math.round(((activePrice - p.costPrice) / activePrice) * 100)
    : 0;
  const marginColor = marginPct >= 40 ? MARGIN_GREEN : marginPct >= 20 ? MARGIN_AMBER : MARGIN_RED;

  return (
    <>
      <Card
        className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
          p.available === false ? "opacity-60 bg-muted/20" : "bg-card"
        } ${hover ? "border-primary shadow-md -translate-y-0.5" : "border-border shadow-sm"}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="p-4">
          {/* Row 1: name + unit | category badge + availability */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {p.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {p.unit}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={`text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                  p.sourcingType === "resale" ? "bg-muted text-muted-foreground" : "bg-primary/90 text-primary-foreground"
                }`}
              >
                {categoryLabel(p.sourcingType)}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleAvailable(); }}
                className={`text-[11px] font-semibold rounded-full px-2 py-1 border-0 ${
                  p.available === false ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                {p.available === false ? "○ Off Menu" : "● Available"}
              </button>
            </div>
          </div>

          <hr className="my-3 border-t border-border" />

          {/* Row 2: Promo & Standard blocks */}
          <div className="grid grid-cols-2 gap-2">
            {(["promo", "standard"] as const).map((mode) => {
              const isActive = pricingMode === mode;
              const price = mode === "promo" ? p.promoPrice : p.standardPrice;
              return (
                <div
                  key={mode}
                  className={`rounded-lg px-3 py-2 transition-all duration-300 ${
                    isActive ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-transparent"
                  }`}
                >
                  <div className="text-[10px] uppercase font-medium tracking-wide text-muted-foreground">
                    {mode === "promo" ? "PROMO" : "STANDARD"}
                  </div>
                  <div className={`text-sm font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    KES {price.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 3: Cost & margin or variable-cost box */}
          <div className="mt-3">
            {isVar ? (
              <div className="rounded-lg px-2.5 py-2 text-xs bg-muted/30 text-muted-foreground">
                ⚡ Variable cost — set per cycle in{" "}
                <Link href="/reports/enkana-margin-tracker" className="underline font-medium text-foreground hover:text-primary">
                  Margin Tracker
                </Link>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Cost: KES {p.costPrice!.toLocaleString()}</span>
                  <span>KES {activePrice - p.costPrice!} / unit</span>
                </div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Margin</span>
                  <span className="font-semibold text-foreground">{marginPct}%</span>
                </div>
                <div className="h-1 rounded-sm overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-sm transition-[width] duration-400 ease-out"
                    style={{ width: `${Math.min(marginPct, 100)}%`, backgroundColor: marginColor }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Hover: Edit & Delete buttons at bottom-right */}
          <div
            className={`absolute bottom-3 right-3 flex gap-2 transition-opacity duration-200 ${hover ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-card"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 bg-card"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && onDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{p.name}&quot; will be removed from the catalogue. Existing orders are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditProductForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isPending,
}: {
  form: InsertProductCatalogueItem;
  setForm: React.Dispatch<React.SetStateAction<InsertProductCatalogueItem>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const costDisabled = form.sourcingType === "slaughter" || form.sourcingType === "chicken";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Product name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Goat Meat"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label>Unit</Label>
        <Input
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder="per kg, whole bird"
          required
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Promo price (KES)</Label>
          <Input
            type="number"
            min={0}
            value={form.promoPrice || ""}
            onChange={(e) => setForm((f) => ({ ...f, promoPrice: Number(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Standard price (KES)</Label>
          <Input
            type="number"
            min={0}
            value={form.standardPrice || ""}
            onChange={(e) => setForm((f) => ({ ...f, standardPrice: Number(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Cost price (KES)</Label>
        <Input
          type="number"
          min={0}
          value={form.costPrice ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, costPrice: e.target.value === "" ? null : Number(e.target.value) }))
          }
          disabled={costDisabled}
          placeholder={costDisabled ? "Set per cycle in Margin Tracker" : "Optional for resale"}
          className="mt-1"
        />
        {costDisabled && (
          <p className="text-xs text-muted-foreground mt-1">Set per cycle in Margin Tracker</p>
        )}
      </div>
      <div>
        <Label>Sourcing type</Label>
        <select
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.sourcingType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              sourcingType: e.target.value as SourcingType,
              costPrice: (e.target.value === "resale" ? f.costPrice : null) ?? null,
            }))
          }
        >
          <option value="slaughter">Own Slaughter</option>
          <option value="resale">Resale</option>
          <option value="chicken">Own Slaughter (Chicken)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="available"
          checked={form.available !== false}
          onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
          className="rounded border-border"
        />
        <Label htmlFor="available">Available for new orders</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!form.name.trim() || isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddStep1Form({
  form,
  setForm,
  onNext,
  onCancel,
}: {
  form: InsertProductCatalogueItem;
  setForm: React.Dispatch<React.SetStateAction<InsertProductCatalogueItem>>;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose how this product is sourced. This determines whether cost is fixed or variable and whether it appears in
        the Requisition Report.
      </p>
      <div className="flex flex-col gap-2">
        {ADD_SOURCING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                sourcingType: opt.value,
                costPrice: opt.value === "resale" ? f.costPrice : null,
              }))
            }
            className={`p-4 rounded-xl border-2 text-left transition-colors ${
              form.sourcingType === opt.value
                ? "border-primary bg-primary/5"
                : "border-border bg-transparent hover:border-muted-foreground/30"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
            <span className="block text-sm text-muted-foreground mt-0.5">{opt.description}</span>
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onNext}>Next</Button>
      </DialogFooter>
    </div>
  );
}

function AddStep2Form({
  form,
  setForm,
  onSubmit,
  onCancel,
  onBack,
  isPending,
}: {
  form: InsertProductCatalogueItem;
  setForm: React.Dispatch<React.SetStateAction<InsertProductCatalogueItem>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onBack: () => void;
  isPending: boolean;
}) {
  const showAnimalType = form.sourcingType === "slaughter" || form.sourcingType === "chicken";
  const costDisabled = form.sourcingType === "slaughter" || form.sourcingType === "chicken";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Product name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Goat Meat"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label>Unit *</Label>
        <Input
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          placeholder="per kg, whole bird"
          required
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Promo price (KES) *</Label>
          <Input
            type="number"
            min={0}
            value={form.promoPrice || ""}
            onChange={(e) => setForm((f) => ({ ...f, promoPrice: Number(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Standard price (KES) *</Label>
          <Input
            type="number"
            min={0}
            value={form.standardPrice || ""}
            onChange={(e) => setForm((f) => ({ ...f, standardPrice: Number(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Cost price (KES)</Label>
        <Input
          type="number"
          min={0}
          value={form.costPrice ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, costPrice: e.target.value === "" ? null : Number(e.target.value) }))
          }
          disabled={costDisabled}
          required={form.sourcingType === "resale"}
          placeholder={costDisabled ? "Set per cycle in Margin Tracker" : "Required for resale"}
          className="mt-1"
        />
      </div>
      {showAnimalType && (
        <div>
          <Label>Animal type</Label>
          <select
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.animalType ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              const animalType = val === "" ? null : (val as NonNullable<AnimalType>);
              setForm((f) => ({
                ...f,
                animalType,
                sourcingType:
                  form.sourcingType === "resale"
                    ? "resale"
                    : animalType && ["chicken_small", "chicken_medium", "chicken_large"].includes(animalType)
                      ? "chicken"
                      : "slaughter",
              }));
            }}
          >
            {ANIMAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="">Other</option>
          </select>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          disabled={
            !form.name.trim() ||
            (form.sourcingType === "resale" && (form.costPrice == null || form.costPrice < 0)) ||
            isPending
          }
        >
          {isPending ? "Adding…" : "Add Product"}
        </Button>
      </DialogFooter>
    </form>
  );
}
