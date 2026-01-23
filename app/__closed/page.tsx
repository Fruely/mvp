export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevClosedPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "64px auto",
        padding: "0 16px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Freuly is temporarily unavailable</h1>
      <p style={{ lineHeight: 1.6, margin: 0 }}>This site is currently in a restricted development mode.</p>
    </main>
  );
}

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DevClosedPage() {
  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Freuly is temporarily unavailable</h1>
      <p style={{ lineHeight: 1.6, margin: 0 }}>
        This site is currently in a restricted development mode.
      </p>
    </main>
  );
}

