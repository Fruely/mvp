import Image from "next/image";

export default function ServiceCard({ id, title, description, price, duration, image, dict }) {
  const tSafe = (key, fallback) => {
    if (!dict) return fallback;
    const parts = key.split(".");
    let val = dict;
    for (const p of parts) {
      if (val && typeof val === "object") val = val[p];
      else return fallback;
    }
    return typeof val === "string" ? val : fallback;
  };

  return (
    <div className="card group">
      {/* Image Placeholder */}
      <div className="relative w-full h-48 bg-gradient-to-br from-primary to-blue-600 rounded-lg mb-4 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="text-white text-center">
            <div className="text-4xl mb-2">🧘</div>
            <span className="text-sm">{tSafe("serviceCard.imagePlaceholder", "Service image")}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-primary mb-2">{title || tSafe("serviceCard.titleFallback", "Service")}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {description || tSafe("serviceCard.descriptionFallback", "")}
        </p>
        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <span>⏱️ {duration || '60'} {tSafe("serviceCard.minutes", "min")}</span>
          <span>💰 {price || '0'} €</span>
        </div>
      </div>

      {/* Button */}
      <button className="btn-primary w-full">
        {tSafe("serviceCard.book", "Book")}
      </button>
    </div>
  );
}
