import { publicCardClass } from "@/components/public/publicStyles";

export function HomepagePhotoCardPreview({
  imageUrl,
  name,
  category,
  emptyLabel,
  currentLabel,
}: {
  imageUrl: string | null;
  name: string;
  category: string;
  emptyLabel: string;
  currentLabel?: string;
}) {
  return (
    <article className={`${publicCardClass} flex w-full max-w-[310px] flex-col overflow-hidden`}>
      {currentLabel ? (
        <p className="border-b border-freuly-border-default px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-freuly-text-muted">
          {currentLabel}
        </p>
      ) : null}
      <div className="relative aspect-[31/20] w-full overflow-hidden bg-freuly-border-subtle">
        {imageUrl ? (
          // Saved derivative is already 31:20; fill the homepage card viewport.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-freuly-text-muted">
            {emptyLabel}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-5">
        <p className="line-clamp-1 text-[20px] font-bold leading-6 text-freuly-text-primary">{name}</p>
        <p className="line-clamp-1 text-sm leading-[17px] text-freuly-text-secondary">{category}</p>
      </div>
    </article>
  );
}
