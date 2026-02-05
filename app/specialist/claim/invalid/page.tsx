export const dynamic = "force-dynamic";

export default function SpecialistClaimInvalidPage() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 560,
        margin: "2rem auto",
        padding: "0 1rem",
        lineHeight: 1.5,
      }}
    >
      <h1>Ссылка недействительна</h1>
      <p>Ссылка недействительна или устарела.</p>
      <p>
        Вы можете запросить новую ссылку, написав на{" "}
        <a href="mailto:info@freuly.de">info@freuly.de</a>.
      </p>
    </div>
  );
}
