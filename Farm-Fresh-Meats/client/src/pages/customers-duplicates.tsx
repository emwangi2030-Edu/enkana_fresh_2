/** §6.2.8 Review Duplicates queue */
export default function CustomersDuplicates() {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="page-title">Review Duplicates</h1>
      <p className="text-sm text-muted-foreground mt-1">Flagged duplicate customer records (phone or name + zone).</p>
      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Duplicate detection and merge flow will be implemented here.
      </div>
    </div>
  );
}
