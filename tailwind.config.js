/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        /* Legacy — keep for unmigrated screens */
        primary: "#1E40AF",
        accent: "#DC2626",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        surface: "#F9FAFB",
        freuly: {
          primary: "var(--freuly-primary)",
          "primary-hover": "var(--freuly-primary-hover)",
          "primary-light": "var(--freuly-primary-light)",
          "text-on-primary": "var(--freuly-text-on-primary)",
          page: "var(--freuly-bg-page)",
          surface: "var(--freuly-bg-surface)",
          dashboard: "var(--freuly-bg-dashboard)",
          "text-primary": "var(--freuly-text-primary)",
          "text-secondary": "var(--freuly-text-secondary)",
          "text-muted": "var(--freuly-text-muted)",
          success: "var(--freuly-success)",
          "success-light": "var(--freuly-success-light)",
          "success-border": "var(--freuly-success-border)",
          warning: "var(--freuly-warning)",
          "warning-light": "var(--freuly-warning-light)",
          "warning-border": "var(--freuly-warning-border)",
          error: "var(--freuly-error)",
          "error-light": "var(--freuly-error-light)",
          info: "var(--freuly-info)",
          "info-light": "var(--freuly-info-light)",
          "border-default": "var(--freuly-border-default)",
          "border-subtle": "var(--freuly-border-subtle)",
          divider: "var(--freuly-divider)",
        },
      },
      spacing: {
        "freuly-1": "var(--freuly-space-1)",
        "freuly-2": "var(--freuly-space-2)",
        "freuly-3": "var(--freuly-space-3)",
        "freuly-4": "var(--freuly-space-4)",
        "freuly-5": "var(--freuly-space-5)",
        "freuly-6": "var(--freuly-space-6)",
        "freuly-8": "var(--freuly-space-8)",
        "freuly-10": "var(--freuly-space-10)",
        "freuly-12": "var(--freuly-space-12)",
      },
      borderRadius: {
        /* Legacy */
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "freuly-sm": "var(--freuly-radius-sm)",
        "freuly-button": "var(--freuly-radius-button)",
        "freuly-md": "var(--freuly-radius-md)",
        "freuly-card": "var(--freuly-radius-card)",
        "freuly-lg": "var(--freuly-radius-lg)",
        "freuly-xl": "var(--freuly-radius-xl)",
        "freuly-pill": "var(--freuly-radius-pill)",
      },
      fontSize: {
        "freuly-page-title": [
          "var(--freuly-text-page-title)",
          { lineHeight: "1.25", fontWeight: "700" },
        ],
        "freuly-page-subtitle": [
          "var(--freuly-text-page-subtitle)",
          { lineHeight: "1.4", fontWeight: "400" },
        ],
        "freuly-section-title": [
          "var(--freuly-text-section-title)",
          { lineHeight: "1.3", fontWeight: "700" },
        ],
        "freuly-card-title": [
          "var(--freuly-text-card-title)",
          { lineHeight: "1.35", fontWeight: "600" },
        ],
        "freuly-subtitle": [
          "var(--freuly-text-subtitle)",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        "freuly-body": [
          "var(--freuly-text-body)",
          { lineHeight: "1.5", fontWeight: "400" },
        ],
        "freuly-body-sm": [
          "var(--freuly-text-body-sm)",
          { lineHeight: "1.45", fontWeight: "400" },
        ],
        "freuly-helper": [
          "var(--freuly-text-helper)",
          { lineHeight: "1.4", fontWeight: "400" },
        ],
        "freuly-label": [
          "var(--freuly-text-label)",
          { lineHeight: "1.4", fontWeight: "500" },
        ],
        "freuly-table-header": [
          "var(--freuly-text-table-header)",
          { lineHeight: "1.3", fontWeight: "700" },
        ],
        "freuly-button": [
          "var(--freuly-text-button)",
          { lineHeight: "1.25", fontWeight: "600" },
        ],
        "freuly-badge": [
          "var(--freuly-text-badge)",
          { lineHeight: "1.25", fontWeight: "600" },
        ],
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.06)",
        soft: "0 10px 30px rgba(0,0,0,0.08)",
        floating: "0 20px 50px rgba(0,0,0,0.12)",
        "freuly-focus": "var(--freuly-focus-ring)",
      },
    },
  },
  plugins: [],
};
