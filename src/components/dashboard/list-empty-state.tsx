interface ListEmptyStateProps {
  hint?: string;
  title?: string;
}

export function ListEmptyState({ hint, title }: ListEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-charcoal/40">
      <p className="font-accent text-sm uppercase tracking-wider">{title ?? "No results found"}</p>
      <p className="mt-2 max-w-sm text-center text-sm text-charcoal/50">
        {hint ?? "Try adjusting your filters or search terms."}
      </p>
    </div>
  );
}
