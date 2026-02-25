/** §6.2.8 Review Duplicates queue */
export default function CustomersDuplicates() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-display tracking-tight text-foreground">Review Duplicates</h1>
      <p className="text-sm text-muted-foreground mt-1">Flagged duplicate customer records (phone or name + zone).</p>
      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Duplicate detection and merge flow will be implemented here.
      </div>
    </div>
  );
}
