import { Instagram, Facebook, Youtube } from "lucide-react";

export default function FreulySocialIcons() {
  return (
    <div className="mt-6 flex items-center gap-6 text-gray-500">
      <a
        href="https://www.instagram.com/freuly.pro"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <Instagram size={20} />
      </a>
      <a
        href="https://www.tiktok.com/@freuly.pro"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 3v12a3 3 0 1 1-3-3h1V9H6a6 6 0 1 0 6 6V8.5a7.5 7.5 0 0 0 4 1.2V7a4.5 4.5 0 0 1-4.5-4H9z"/>
        </svg>
      </a>
      <a
        href="https://youtube.com/@freuly_pro"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <Youtube size={20} />
      </a>
      <a
        href="https://www.facebook.com/share/1XhLFqiz8G/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <Facebook size={20} />
      </a>
    </div>
  );
}
