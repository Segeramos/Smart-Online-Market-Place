export default function SkeletonProductCard() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-36 bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-100 animate-pulse rounded" />
        <div className="h-4 bg-gray-100 animate-pulse rounded w-2/3" />
        <div className="h-9 bg-gray-100 animate-pulse rounded-xl mt-3" />
      </div>
    </div>
  );
}
