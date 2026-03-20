import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="de">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="description" content="Freuly — find a specialist who speaks your language" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
