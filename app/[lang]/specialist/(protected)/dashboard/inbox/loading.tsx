export default function InboxLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10" role="status">
      <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
      <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}