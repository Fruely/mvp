export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ reason?: string }> };

export default async function SpecialistClaimInvalidPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const isStatus = reason === "status";

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
      <h1>{isStatus ? "Профиль ещё не одобрен" : "Ссылка недействительна"}</h1>
      <p>
        {isStatus
          ? "Ваш профиль на модерации или ещё не активирован. Дождитесь одобрения или напишите в поддержку."
          : "Ссылка недействительна или устарела. Ссылка из письма действует ограниченное время и только для одного входа — если вы открыли её не сразу или во второй раз, запросите новую у администратора."}
      </p>
      <p>
        Написать в поддержку:{" "}
        <a href="mailto:freuly.de@gmail.com">freuly.de@gmail.com</a>.
      </p>
    </div>
  );
}
