/** §4 Requisition Report — aggregates orders by delivery date, animals/product required */
export default function RequisitionReport() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-display tracking-tight text-foreground">Requisition Report</h1>
      <p className="text-sm text-muted-foreground mt-1">Pre-delivery sourcing checklist by delivery date.</p>
      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Delivery date picker and aggregated requisition table (goat/mutton/sheep/beef/chicken) will be implemented here.
      </div>
    </div>
  );
}
