export function Skeleton({ width = "100%", height = 16 }: { width?: number | string; height?: number | string }) {
  return <div className="skeleton" style={{ width, height }}/>;
}

export function SkeletonCard() {
  return <div className="card">
    <Skeleton width="40%" height={14}/>
    <div style={{ height: 10 }}/>
    <Skeleton height={28}/>
  </div>;
}

export function SkeletonGrid({ count = 4, className = "grid grid-4" }: { count?: number; className?: string }) {
  return <div className={className}>{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i}/>)}</div>;
}
