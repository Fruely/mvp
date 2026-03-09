/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#1E40AF",
        accent: "#DC2626",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        surface: "#F9FAFB",
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.06)",
        soft: "0 10px 30px rgba(0,0,0,0.08)",
        floating: "0 20px 50px rgba(0,0,0,0.12)",
      },
    }
  },
  plugins: []
};
