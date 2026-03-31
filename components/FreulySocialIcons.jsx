import { Instagram, Facebook, Youtube } from "lucide-react";

export default function FreulySocialIcons() {
  return (
    <div className="mt-6 flex items-center gap-6 text-gray-500">
      <a
        href="https://www.instagram.com/bezillyuziy.de?igsh=MTU1cDhtZjdrNm9zcg=="
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <Instagram size={20} />
      </a>
      <a
        href="https://www.tiktok.com/@bezillyuziy.de?_r=1&_t=ZG-959o8XDtFSb"
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
        href="https://www.facebook.com/share/1H8deT9E39/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <Facebook size={20} />
      </a>
      <a
        href="https://t.me/freuly"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-black transition"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </a>
    </div>
  );
}
