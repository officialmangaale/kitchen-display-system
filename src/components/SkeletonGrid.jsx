export default function SkeletonGrid() {
  return (
    <div className="kds-grid" aria-busy="true" aria-label="Loading orders">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-line--header" />
          <div className="skeleton-line skeleton-line--sub" />
          <div className="skeleton-line skeleton-line--item" />
          <div className="skeleton-line skeleton-line--item skeleton-line--short" />
          <div className="skeleton-line skeleton-line--item" />
          <div className="skeleton-line skeleton-line--btn" />
        </div>
      ))}
    </div>
  );
}
