# Datenschutzerklärung YouMe

Fassung für die mobilen Apps YouMe auf Android und iOS.  
26. Oktober 2026.

Maßgeblich ist ausschließlich die deutsche Fassung.

Diese Erklärung beschreibt die Verarbeitung personenbezogener Daten in den mobilen Apps YouMe. Die Datenschutzerklärung der Website Freuly unter https://freuly.de/de/datenschutzerklaerung bleibt daneben in Kraft und wird durch diesen Text nicht geändert. Website, Cookies, Reichweitenmessung, soziale Netzwerke, Telegram und das Partnerprogramm sind dort geregelt.

## § 1 Verantwortlicher

Verantwortlicher für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:

Natalia Sheshenia, Gewerbe Sheshenia-Freuly, Hofolper Straße 46, 57399 Kirchhundem, Deutschland.

E-Mail: freuly.de@gmail.com  
Telefon: +49 160 92686432

## § 2 Gegenstand

YouMe verbindet eine Anfrage mit einem Angebot. Ein Chat entsteht erst nach einer bestätigten Verbindung. Auf iOS wird der Zugang über Apple StoreKit bezahlt. Die Android-App startet keinen Kauf über Google Play.

Es gibt keinen öffentlichen Katalog von Profilen. E-Mail-Adresse und Telefonnummer werden der anderen Person nicht angezeigt. Name, Kurzvorstellung und Foto sind für die andere Person erst in einem Chat sichtbar, zu dem sie Zugang hat.

Die App fragt Gesundheitsdaten und andere besondere Kategorien personenbezogener Daten nach Art. 9 DSGVO nicht als eigene Felder ab. Freitext und Spracheingaben können solche Angaben dennoch enthalten. Der Vertrag mit Vercel untersagt es, besondere Kategorien personenbezogener Daten in die an Vercel übermittelten Kundendaten aufzunehmen. Nehmen Sie solche Angaben nicht in Texte oder Sprachaufnahmen auf.

## § 3 Konto

Beim Speichern eines Entwurfs legt die App eine anonyme Sitzung an. Für ein dauerhaftes Konto geben Sie eine E-Mail-Adresse an und bestätigen einen Einmalcode.

Gespeichert werden können die interne Nutzerkennung, die bestätigte E-Mail-Adresse, der Anzeigename aus Vor- und Nachname mit zusammen höchstens 80 Zeichen, eine optionale Kurzvorstellung mit höchstens 500 Zeichen, ein optionales Profilfoto, bis zu 18 Kommunikationssprachen, die gewählte Oberflächensprache und der Zeitpunkt der E-Mail-Bestätigung. Eine Telefonnummer fragt die App nicht ab.

Name und Foto sind für eine Anfrage nicht vorausgesetzt. Vor einem Angebot wird ein Name verlangt. Entwürfe können auf dem Gerät liegen, bis sie gesendet oder verworfen werden.

Die Verarbeitung dient der Einrichtung und Führung des Kontos sowie der von Ihnen verlangten Nutzung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Das Speichern der Sitzung und der Entwürfe auf dem Gerät ist für diese Funktion technisch erforderlich, § 25 Abs. 2 TDDDG.

Abmelden beendet die Sitzung auf dem Gerät. Die App bietet keine Löschung des Kontos. Eine anonyme Sitzung bleibt bestehen, wenn die angegebene E-Mail-Adresse bereits zu einem anderen Konto gehört.

## § 4 Anfrage, Angebot und Zuordnung

Sie beschreiben ein Bedürfnis oder ein Angebot als Text. Die App übernimmt daraus die Angaben, die der Text enthält, insbesondere Ort, Preis oder Budget und Sprachen, und fragt nur nach dem, was noch fehlt.

Gespeichert werden der Text, Preis oder Budget, das Format (online, persönlich oder beides), der bestätigte Ort und die interne Kennung des Ortes.

Der Ortsname wird zur Auflösung an https://photon.komoot.io/api/ gesendet. Die App weist auf „© OpenStreetMap contributors · Photon“ hin. Eine laufende Karte ist nicht Bestandteil dieses Vorgangs.

Der Text der Anfrage oder des Angebots wird über das Vercel AI Gateway an Google Gemini 2.5 Flash-Lite gesendet, damit Ort, Preis und Gegenstand erkannt und die Eignung geprüft werden kann.

Vor einer bezahlten Verbindung erhält die andere Person Ihre privaten Kontaktdaten nicht. Eine Mitteilung über einen neuen Treffer kann bis zu 80 Zeichen des Anfragetextes enthalten. Eine Mitteilung über ein höheres Budget nennt den Betrag, nicht den Anfragetext.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, weil die Verarbeitung die von Ihnen verlangte Anfrage, das Angebot und deren Zuordnung ausführt.

## § 5 Spracheingabe

Wenn Sie das Mikrofon verwenden, entsteht eine kurze Aufnahme im Format AAC/MP4. Der Server nimmt sie an, wenn sie etwa 61 Sekunden und 1,2 MB nicht überschreitet. Die Aufnahme geht an die YouMe-API und von dort über das Vercel AI Gateway an OpenAI Whisper-1 zur Transkription. Zurückgegeben wird der erkannte Text. Die App speichert diese Aufnahme nicht als Chat-Nachricht. Tippen bleibt ohne Mikrofon möglich.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Die Systemfreigabe für das Mikrofon ist die technische Zugriffserlaubnis des Geräts.

## § 6 Chat, Anhänge und Beschwerden

Nachrichten gibt es nur zwischen den beiden Personen einer geöffneten Verbindung. Möglich sind Text mit höchstens 10.000 Zeichen, eine Sprachnachricht mit höchstens 180 Sekunden und 10 MB, ein Foto als JPEG mit längster Seite bis 1600 Pixel und bis 10 MB sowie ein einmaliger Standort, den Sie nach einer Vorschau senden.

Fotos und Sprachnachrichten liegen in einem nicht öffentlichen Speicher. Links zum Abruf eines Fotos gelten 60 Sekunden, Links zum Abruf einer Sprachnachricht 300 Sekunden. Die andere Person dieses Chats kann die Inhalte sehen.

Der genaue Standort wird nur für diese eine Nachricht abgefragt, im Vordergrund und erst nach Ihrem Tipp auf die Standortfunktion. Eine Ortung im Hintergrund oder ein dauerhaftes Tracking findet nicht statt. Die Karten-App des Geräts öffnet sich nur, wenn Sie eine Route aufrufen.

Eine Beschwerde ist ein Text zu der jeweiligen Unterhaltung und wird auf dem Server gespeichert.

Rechtsgrundlage für Chat, Anhänge und den einmaligen Standort ist Art. 6 Abs. 1 lit. b DSGVO. Für die Speicherung der Beschwerde gilt Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist die Missbrauchsprävention, die in der Datenschutzerklärung der Website beschrieben ist. Kamera, Fotomediathek, Mikrofon und Standort setzen jeweils eine eigene Systemfreigabe voraus.

Nachrichten und bereits gespeicherte Anhänge können in der App nicht gelöscht werden.

## § 7 Mitteilungen

Nach der Systemfreigabe für Mitteilungen speichert der Server eine Gerätekennung, ein Expo-Push-Token und die Plattform, iOS oder Android. Der Versand erfolgt an Expo. Auf iOS stellt Apple die Mitteilung zu. Der Android-Build enthält eine Firebase-Konfiguration, damit die Zustellung über Firebase Cloud Messaging möglich ist. Ein Analysewerkzeug von Firebase ist in der App nicht enthalten.

Mitteilungen zum Stand der Verbindung verwenden einen festen Text ohne Ihren Anfrage- oder Nachrichtentext. Eine Mitteilung über einen neuen Treffer kann bis zu 80 Zeichen des Anfragetextes enthalten. Eine Mitteilung über ein höheres Budget nennt den Betrag. Eine Mitteilung über eine neue Nachricht enthält bis zu 80 Zeichen des Verbindungskontexts, nicht den Text der neuen Nachricht.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Das Speichern des Tokens auf dem Gerät ist für diese Funktion technisch erforderlich, § 25 Abs. 2 TDDDG.

Beim Abmelden eines bestätigten Kontos wird die Zuordnung des Geräts nach Möglichkeit entfernt.

Die App ist für die Abfrage von Aktualisierungen bei Expo eingerichtet.

## § 8 Zahlung

Auf iOS läuft der Kauf in Apple StoreKit. Die App sendet die von Apple signierte Transaktion an den Server. Der Server prüft sie. Verbindung und Chat werden erst danach freigegeben. Gespeichert werden die Produktkennung com.freuly.youme.request_access.v1 bis v5, die Transaktionskennung, die Umgebung und der bezahlte Zugang zu der jeweiligen Verbindung. Kartennummern liegen bei Apple. YouMe erhält sie nicht.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Eine eigene Aufbewahrungsfrist für diese Angaben legt diese Erklärung nicht fest.

Die Android-App führt keinen Kauf über Google Play aus. Die App übermittelt keine Zahlungsdaten an Stripe.

## § 9 Technische Fehler

Die App enthält kein Werkzeug zur Nutzungsanalyse und kein Werkzeug zur Sammlung von Absturzberichten. Bei einem Fehler der Text- oder Sprachauswertung speichert der Server einen festen Fehlercode und den technischen Status, nicht Ihren Text.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist die Stabilität und die Fehleranalyse des Dienstes, wie sie in der Datenschutzerklärung der Website für den technischen Betrieb beschrieben sind.

Aufrufe der YouMe-API, von Supabase, Photon, Expo und des Vercel AI Gateway verwenden HTTPS.

## § 10 Übermittlung außerhalb des Europäischen Wirtschaftsraums

Die YouMe-API läuft bei Vercel auf dem Tarif Pro in der Region iad1 in den Vereinigten Staaten. Der Datenverarbeitungszusatz von Vercel ist nach den Nutzungsbedingungen Bestandteil des Vertrags. Für die Übermittlung personenbezogener Daten aus dem Europäischen Wirtschaftsraum an Vercel sehen diese Bedingungen die Standardvertragsklauseln vor.

Die Produktionsdatenbank von Supabase steht in der Region eu-central-1 in Frankfurt am Main, Deutschland. Die API in den Vereinigten Staaten verarbeitet die Daten, die sie entgegennimmt, auch wenn diese Datenbank in Frankfurt am Main steht.

Der Text einer Anfrage oder eines Angebots wird über das Vercel AI Gateway an Google Gemini 2.5 Flash-Lite weitergegeben. Eine Spracheingabe wird über dasselbe Gateway an OpenAI Whisper-1 weitergegeben. Für diese Aufrufe ist kein Zielgebiet im Europäischen Wirtschaftsraum festgelegt. Diese Erklärung besagt nicht, dass Google oder OpenAI die Daten nur dort verarbeiten.

Der Ortsname wird von der API in den Vereinigten Staaten an https://photon.komoot.io/api/ gesendet.

## § 11 Empfänger

Empfänger der in dieser Erklärung genannten Daten sind:

- Supabase in Frankfurt am Main für Konto, Datenbank und Dateien;
- Vercel in den Vereinigten Staaten, Tarif Pro, für den Betrieb der YouMe-API;
- das Vercel AI Gateway für den Text von Anfrage und Angebot sowie für die Spracheingabe;
- Google für die Auswertung dieses Textes mit Gemini 2.5 Flash-Lite;
- OpenAI für die Transkription mit Whisper-1;
- Photon unter https://photon.komoot.io/api/ für den Ortsnamen;
- Expo für den Versand der Mitteilungen;
- Apple für den Kauf auf iOS und für die Zustellung von Mitteilungen auf iOS;
- Google über Firebase Cloud Messaging für die Zustellung von Mitteilungen auf Android, soweit diese Zustellung genutzt wird;
- die andere Person einer bestehenden Verbindung für Name, Kurzvorstellung, Foto, Nachrichten und Anhänge dieses Chats.

## § 12 Speicherdauer

Eine automatische Löschfrist für Konten, Anfragen, Angebote, Nachrichten oder Push-Token ist in der App nicht eingerichtet. Die Frist von 12 Monaten für Anfragen auf der Website gilt für die App nicht. Eine konkrete Speicherdauer legt diese Erklärung nicht fest.

Soweit keine speziellere Dauer feststeht, bleiben personenbezogene Daten gespeichert, solange dies für den jeweiligen Zweck erforderlich ist. Maßgeblich sind die Dauer des Vertragsverhältnisses, die Bearbeitung laufender Anfragen und Verbindungen, gesetzliche Aufbewahrungspflichten, die Abwehr oder Durchsetzung von Ansprüchen sowie die Sicherheit des Dienstes.

Ein Angebot kann von der Person gelöscht werden, der es gehört. Eine Anfrage kann sie ändern. Nachrichten und veröffentlichte Anhänge kann sie in der App nicht löschen. Eine Löschung des Kontos ist in der App nicht möglich. Eine Anfrage auf Löschung kann an die in § 1 genannte E-Mail-Adresse gerichtet werden. Diese Erklärung legt keine Bearbeitungsfrist fest und beschreibt keinen bereits eingerichteten Löschweg.

## § 13 Rechte

Sie haben nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO). Eine Einwilligung können Sie mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO).

Ein Export der Chat-Inhalte ist in der App nicht vorhanden.

Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren. Zuständige Aufsichtsbehörde kann insbesondere die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen sein.

Anfragen zu diesen Rechten richten Sie an die in § 1 genannte E-Mail-Adresse.

## § 14 Erforderliche Angaben

Ohne die anonyme Sitzung wird ein Entwurf nicht auf dem Server gespeichert. Ohne bestätigte E-Mail-Adresse gibt es kein dauerhaftes Konto und keinen bezahlten Chat. Ohne Beschreibung entstehen keine Anfrage und kein Angebot. Ein Ort wird nur verlangt, wenn persönlich oder gemischt gesucht oder angeboten wird. Mikrofon, Kamera, Fotos, genauer Standort und Mitteilungen sind jeweils an eine Systemfreigabe gebunden. Ohne den Apple-Kauf öffnet sich auf iOS der bezahlte Chat nicht. Die Android-App kann diesen Kauf nicht ausführen.

## § 15 Änderungen

Diese Erklärung wird angepasst, wenn sich die Verarbeitung in den Apps oder die Rechtslage ändert. Es gilt die jeweils veröffentlichte Fassung für die mobilen Apps YouMe.
