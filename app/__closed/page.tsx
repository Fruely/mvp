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
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Freuly is coming soon</h1>
      <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
        We&apos;re actively building Freuly and preparing for launch. The full
        experience is currently available only to preview users.
      </p>
      <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
        If you&apos;re part of the preview, please use your special preview link
        to access the live interface.
      </p>
      <p style={{ lineHeight: 1.6, margin: 0 }}>
        For updates, follow our upcoming announcements or reach out to the team
        directly.
      </p>
    </main>
  );
}
