# Claim flow: session и magic link (финальный паттерн)

## Причина проблемы (историческая)

На `/specialist/claim` при заходе без `?token=` использовался **service-role** клиент (`@/lib/supabase/server`) и `getSession()`. У service-role клиента нет пользовательской сессии (он не читает cookies), поэтому `getSession()` всегда возвращал `null` → редирект на `/specialist/claim/invalid`. Дополнительно: после magic link браузер открывает URL с `#access_token=...`; fragment на сервер не передаётся, сессия создаётся только на клиенте после обработки hash.

## Правильный паттерн (зафиксирован)

1. **Проверка сессии на сервере (когда нет `?token=`)**  
   Использовать **только** cookie-клиент из `@/lib/supabase/auth-server` (createServerComponentClient), не service-role из `@/lib/supabase/server`. Если `getSession()` возвращает сессию → `redirect("/specialist/dashboard")`.

2. **Обработка magic link (hash в URL)**  
   Если на сервере сессии нет — рендерить клиентский компонент (`ClaimNoTokenHandler`). В нём:
   - проверка `window.location.hash` на `access_token`;
   - подписка на `onAuthStateChange` и при появлении сессии — редирект в dashboard;
   - при отсутствии hash и сессии — редирект на `/specialist/claim/invalid`.

3. **Service-role клиент**  
   Использовать только для: чтения/записи БД (в т.ч. `specialists`), `admin.generateLink`, `admin.createUser`. Не использовать для `auth.getSession()` и любых проверок пользовательской сессии.

4. **Safeguard**  
   В `lib/supabase/server.ts` в JSDoc указано: не использовать этот клиент для проверки сессии; для этого — `@/lib/supabase/auth-server`.
