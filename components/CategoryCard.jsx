import Image from "next/image";

export default function CategoryCard({ img = "/assets/hero-placeholder.jpg", title, subtitle }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover">
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={img}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}
