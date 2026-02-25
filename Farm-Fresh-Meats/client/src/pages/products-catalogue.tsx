import { PRODUCT_CATALOGUE, PRICING_MODE, setPricingMode } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** §2 / §10 Products — catalogue with promo/standard price toggle */
export default function ProductsCatalogue() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display tracking-tight text-foreground">Product Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">Master list and pricing. Toggle applies to new orders.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={PRICING_MODE === "promo" ? "default" : "outline"}
            size="sm"
            onClick={() => setPricingMode("promo")}
          >
            Promo pricing
          </Button>
          <Button
            variant={PRICING_MODE === "standard" ? "default" : "outline"}
            size="sm"
            onClick={() => setPricingMode("standard")}
          >
            Standard pricing
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_CATALOGUE.map((p) => (
          <Card key={p.id} className="p-4 border border-border">
            <div className="font-medium text-foreground">{p.name}</div>
            <div className="text-sm text-muted-foreground mt-1">per {p.unit}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Promo KES {p.promoPrice.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Std KES {p.standardPrice.toLocaleString()}
              </Badge>
            </div>
            {p.costPrice != null && (
              <div className="mt-1 text-xs text-muted-foreground">Cost: KES {p.costPrice.toLocaleString()}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
