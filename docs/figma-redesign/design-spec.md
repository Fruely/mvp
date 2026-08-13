# Freuly redesign — design specification

Live MCP 2026-08-13. Every numeric/hex value is **EXACT_MCP_DATA** unless marked **INFERENCE**.

Figma variables: **absent** (`get_variable_defs` → `{}` on `102:1623` and `102:5864`).  
Figma components: named frames, not component instances.  
Code Connect: unavailable.

**Do not silently normalize conflicts.** Two visual languages exist on the same canvas.

---

## Language A — Warm restyle (`#107B80`)

Source: `102:1623` dashboard-restyled, `102:9` homepage, `102:2312` wizard, current `styles/tokens.css`.

| Role | Hex | Evidence |
|---|---|---|
| Primary teal | `#107B80` | `102:1626`, `102:1634`, `102:41` |
| Primary hover | `#0D686C` | **INFERENCE** (code token, not on DS board) |
| Page background | `#F8F7F5` | `102:1623`, `102:9`, `102:2312` |
| Surface | `#FFFFFF` | cards, sidebar, white header |
| Text primary | `#1E1E1E` | titles, wordmark |
| Text muted | `#6B6B6B` | subtitles, inactive nav |
| Placeholder | `#9B9B9B` | wizard/homepage inputs |
| Border | `#E6E4DF` | header border, cards, sidebar |
| Search bar border | `#E0DEDA` 1.5px | `102:36` |
| Footer bg | `#1E1E1E` | `102:1780` |
| Warning badge | bg `#FFF7ED` border `#FED7AA` text `#B45309` | `102:1687` |
| Success badge | bg `#F0FDF4` border `#BBF7D0` text `#15803D` | `102:1691` |
| Info callout | bg `#FDFBF7` border `#F1ECE4` | `102:1713` |
| Rec chip | `#F4F3EF` | improvements |

Card radius **10**. Button radius **6**. Header height **80**, px **64**.

---

## Language B — Slate foundations (`#0D9488`)

Source: `102:5864` / `102:6251` labeled “Freuly Design System”. Also used on later CRM dashboards (`102:4333`, services, requests, subscription, payment, videoguide).

### Primary palette — EXACT_MCP_DATA (`102:5871`)

| Role | Hex |
|---|---|
| Primary Teal | `#0D9488` |
| Primary Hover | `#0B7E74` |
| Primary Light | `#F0FDFA` |

### Neutral / surfaces

| Role | Hex |
|---|---|
| Page Background | `#FAF9F6` |
| Card Surface | `#FFFFFF` |
| Sidebar CRM | `#F8FAFB` |
| Text Primary | `#1E293B` |
| Text Secondary | `#475569` |
| Text Muted | `#94A3B8` |
| Text On Teal | `#FFFFFF` |
| Border Default | `#E2E8F0` |
| Border Subtle | `#F1F5F9` |
| Divider | `#E5E7EB` |

Also seen in DS nav copy: `#64748B` as secondary text (**EXACT_MCP_DATA** `102:6261`) — conflicts with table value `#475569`.

### Semantic

| Role | Hex |
|---|---|
| Success | `#16A34A` |
| Success Light | `#F0FDF4` |
| Warning | `#F59E0B` |
| Warning Light | `#FFFBEB` |
| Error | `#EF4444` |
| Error Light | `#FEF2F2` |
| Info alert | `#EFF6FF` / left `#2563EB` | `102:6455` |
| Success alert | `#ECFDF5` / left `#10B981` | `102:6459` |
| In-progress badge text | `#2563EB` | `102:6229` |

---

## CONFLICT: which language is approved?

| Signal | Favors |
|---|---|
| Named board “Freuly Design System” + “Consolidated specifications…from approved Freuly screens” | B `#0D9488` |
| Later dashboard pages (profile/services/leads/billing) use CRM shell | B |
| Prior accepted implementation + `tokens.css` + footer commit | A `#107B80` |
| Homepage + wizard + overview still painted in A | A |
| Human choice required | **NEEDS_REVIEW** |

Code today (`styles/tokens.css`) mirrors **Language A**. Implementing later CRM pages as Language B without a token migration will fork the UI.

---

## Typography scale

Font family: **Inter** (hardcoded on nodes; no Figma text styles).

### Language B board (`102:5987`) — EXACT_MCP_DATA

| Role | Spec |
|---|---|
| Page Title | Inter Bold 28px |
| Section Title | Inter Bold 24px |
| Card Title | Inter SemiBold 18px |
| Subtitle | Inter Regular 16px |
| Body | Inter Regular 14px |
| Body Small | Inter Regular 13px |
| Helper | Inter Regular 12px |
| Label | Inter Medium 14px |
| Table Header | Inter Bold 12px UPPERCASE |
| Button Text | Inter SemiBold 14px |
| Badge Label | Inter Medium 12px |

Visual example for Page Title used Extra Bold 28px (`102:6000`) while the spec cell says Bold — **conflict inside the board**.

### Language A overview (`102:1623`) — EXACT_MCP_DATA

| Role | Size | Weight |
|---|---|---|
| Page title | 28px | Bold |
| Card title | 20px | SemiBold (**conflicts with B 18px**) |
| Logo wordmark | 20px | Bold |
| Nav / sidebar | 15px | Medium / SemiBold active |
| Body / button | 14px | Regular / SemiBold |
| Badge | 12px | SemiBold |
| Profile views stat | 48px | Bold |

Line heights: mostly `normal`; body copy 1.5; homepage hero 1.2 / 1.6; footer brand 1.6.

---

## Spacing scale — EXACT_MCP_DATA (`102:6041`)

4, 8, 12, 16, 20, 24, 32, 40, 48 px.

Common layout values:

| Use | Value | Source |
|---|---|---|
| Header height | 80 | `102:1624`, `102:10`, `102:6267` |
| Header px (page frames) | 64 | `102:1624`, `102:10` |
| DS public header px | 40 | `102:6267` (1200-wide template) |
| Main content padding (overview) | 48 | `102:1678` |
| Card padding A | 24 | overview cards |
| Card padding B | 32 | DS about-card `102:6369` |
| Sidebar width | 240 | both languages |
| Sidebar item gap | 6 | both |
| Content stack gap | 32 | overview |
| Wizard card | 560 × hug, p 40, radius 16 | `102:2325` |

---

## Radius scale — EXACT_MCP_DATA (`102:6041`)

| Token | Value | Use |
|---|---|---|
| Small | 4 | badges, chips, checkboxes |
| Medium | 8 | inputs, standard buttons (Language B) |
| Large | 12 | cards, nested images (Language B) |
| XL | 16 | outer hero, CRM containers, wizard card |
| Pill | 99 / 999 | status badges |

**Conflicts:** Language A buttons radius **6**; Language A cards radius **10**; Language B small buttons radius **6** at 36px height.

---

## Borders

| Language | Default | Focus |
|---|---|---|
| A | 1px `#E6E4DF`; search 1.5px `#E0DEDA` | not specified on overview |
| B | 1px `#E2E8F0` | input 2px `#0D9488` + bg `#F0FDFA` (`102:6163`) |

Shadows (sparse):

| Node | Shadow | Provenance |
|---|---|---|
| `102:36` homepage search | `0 4px 8px rgba(0,0,0,0.06)` | EXACT_MCP_DATA |
| `102:2325` wizard card | `0 4px 12px rgba(0,0,0,0.05)` | EXACT_MCP_DATA |
| `102:6267` public header | `0 4px 6px rgba(0,0,0,0.03)` | EXACT_MCP_DATA |
| Overview cards | none in MCP output | EXACT_MCP_DATA (absent) |

---

## Buttons — EXACT_MCP_DATA (`102:6096`) Language B

| Variant | Geometry | Colors |
|---|---|---|
| Primary default | px 24 py 11, radius 8, Inter SemiBold 14 white | bg `#0D9488` |
| Primary hover | same | bg `#0B7E74` |
| Secondary | px 24 py 10, radius 8, 1px border | border/text `#0D9488`, bg white |
| Tertiary link | px 16 py 10, no radius fill | text `#0D9488` + 14px chevron |
| Destructive | px 24 py 10, radius 8 | border/text `#EF4444` |
| Disabled | px 24 py 11, radius 8 | bg `#E2E8F0` text `#94A3B8` |
| Small 36px | px 16 py 8, radius 6, 13px | primary / secondary |
| Mobile full primary | px 24 py 12, radius 8, 15px, fill width | `#0D9488` |
| Mobile full secondary | px 24 py 11, radius 8, 15px | border `#1E293B` |

Language A overview buttons: px 16 py 10, radius 6, 14px SemiBold, `#107B80` / strong `#1E1E1E` / outline primary.

---

## Inputs / selects / textareas — EXACT_MCP_DATA (`102:6149`)

Shared: radius **8**, padding **12**, label SemiBold 14 `#1E293B`, value Regular 14, helper 11.

| State | Box |
|---|---|
| Default | 1px `#E2E8F0`, white |
| Focus | 2px `#0D9488`, bg `#F0FDFA` |
| Error | 1px `#EF4444`, bg `#FEF2F2`, label+helper `#EF4444` |
| Disabled | bg `#E2E8F0`, text `#94A3B8` |
| Read-only computed | bg `#FAF9F6` |
| Search with icon | gap 10, 14px leading icon, placeholder `#94A3B8` |
| Select | same as default + 14px chevron-down |
| Checkbox | 18×18, radius 4; checked bg `#0D9488` |
| Textarea | h 100, p 16, radius 8 |

Language A wizard input: 1.5px `#E6E4DF`, px 16 py 12, radius 8, 16px search icon, placeholder `#9B9B9B`.

---

## Cards

| Pattern | Geometry | Source |
|---|---|---|
| Overview content card | white, 1px `#E6E4DF`, radius 10, p 24, gap 20 | `102:1682` |
| DS dashboard section card | white, 1px `#E2E8F0`, radius 16, p 32 | `102:6369` |
| Wizard card | 560 wide, radius 16, p 40, shadow | `102:2325` |
| Subscription offer | radius 16, p 32, 2px `#0D9488` border | `102:6411` |
| Request detail (mobile) | 450 wide, radius 16, p 24 | `102:6394` |
| Homepage category card | ~421×101, p 16 | `102:20:5` metadata |
| Homepage specialist card | 310×467, image 310×200 | `102:13:134` metadata |

---

## Badges — EXACT_MCP_DATA (`102:6215`)

Pill radius 99, px 10 py 4, SemiBold 12.

| Label (mock) | Fill | Border | Text |
|---|---|---|---|
| Активна | `#F0FDF4` | `#16A34A` | `#16A34A` |
| Новая | `#F0FDFA` | `#CCFBF1` | `#0D9488` |
| В работе | `#EFF6FF` | `#BFDBFE` | `#2563EB` |
| grace | `#FFFBEB` | `#FEF3C7` | `#F59E0B` |
| Льготный период | `#FFFBEB` | `#F59E0B` | `#F59E0B` |
| Выключена | `#FAF9F6` | `#E2E8F0` | `#94A3B8` |
| FREULY FIRST 50 | `#F0FDFA` | `#CCFBF1` | `#0D9488` Bold tracking 0.5 |
| ru • uk • de | `#FAF9F6` | `#E2E8F0` | `#475569` Regular 12 |
| За услугу | — | `#0D9488` radius 4 px 8 py 3 | `#0D9488` 11 SemiBold |

Language A warning/success badges use `#B45309` / `#15803D` (different from B `#F59E0B` / `#16A34A`).

---

## Alerts — EXACT_MCP_DATA (`102:6449`)

Radius 8, p 16, gap 12, 18px icon, Medium 13 `#1E293B`, **4px left border**.

| Kind | Bg | Left |
|---|---|---|
| Info | `#EFF6FF` | `#2563EB` |
| Success | `#ECFDF5` | `#10B981` |
| Warning | `#FFFBEB` | `#F59E0B` |
| Error | `#FEF2F2` | `#EF4444` |

Grace banner card: bg `#F0FDFA` border `#CCFBF1` radius 12 p 16 (`102:6426`).

---

## Sidebar / nav

### Warm sidebar `102:1637`

Width 240, white, right 1px `#E6E4DF`, px 16 py 32, item gap 6, item px 16 py 12 radius 8, icon 16. Active: bg `#107B80` text white 15 SemiBold. Inactive: `#6B6B6B` 15 Medium.

Order: Dashboard, Profile, Requests, Subscription, Payment, Services, Video guide, Settings.

### CRM sidebar `102:6292`

Width 240, white, 1px `#E2E8F0`, radius 16, p 24, h 500 in DS template. Title “FREULY CRM” 13 SemiBold `#64748B` tracking 1 uppercase — **mock label**. Item px 16 py 12 radius 8, icon 18, 13px. Active: bg `#F0FDFA` text `#0D9488` Bold. Inactive: `#1E293B` Medium.

Order (RU mock): Дашборд, Профиль, Заявки, Подписка, Оплата, Услуги, Видеогид, Настройки.

### Breadcrumb strip `102:6335`

White, 1px `#E2E8F0`, radius 12, px 32 py 20. Eyebrow 13 Medium `#64748B`, name 18 Bold `#1E293B`. Avatar 36 circle `#F0FDFA` / `#CCFBF1`. Exit: border `#E2E8F0` radius 8 px 16 py 8, 13 SemiBold.

---

## Global header

| Variant | Node | Height | Bg | Logo | Nav | CTA |
|---|---|---|---|---|---|---|
| Homepage dark | `102:10` | 80 | `#1E1E1E` | 32 mark `#107B80` radius 6, white wordmark 20 | Home / Find a Specialist / How it Works / For Specialists, 15 | Get Started `#107B80` px 16 py 10 r 6 |
| Overview white | `102:1624` | 80 | white, border-b `#E6E4DF`, px 64 | same mark, dark wordmark | Pricing / Partners / Specialist cabinet | Join Freuly |
| DS public | `102:6267` | 80 | white, px 40, r 12, w 1200 | mark `#0D9488` r 8, FREULY ExtraBold 20 | Тарифы / Партнёрам / Кабинет | Присоединиться, px 20 py 10 r 8 |
| DS mobile | `102:6351` | hug | white, px 20 py 16 r 12 | 28 mark r 6 | hamburger 18 + DE chip | — |

Product nav that must be preserved (not Figma English/Russian strings): pricing, partners, specialist cabinet, become-specialist. Langs: UA/RU/DE.

---

## Global footer — EXACT_MCP_DATA `102:1780`

Bg `#1E1E1E`, 1440×298, pt 56 pb 48 px 64. Logo mark 28 `#107B80` r 6, wordmark 18 Bold white. Brand blurb 14 Regular 1.6 `#A3A3A3` max ~320. Three columns: title 12 SemiBold uppercase `#A3A3A3`, links 14 Medium white, gap 12. Bottom row 13 `#6B6B6B`, links gap 24, language selector globe 13 + 13 Medium white.

**Mock-only footer links:** Careers, Success Stories, Trust & Safety, Resources.  
**Preserve beyond Figma:** datenschutz, AGB, impressum, cookie settings, real routes only.

Height conflict: 298 (`102:1780`) vs 347 (homepage/search) vs 383 (later profile/request).

---

## Specialist cards (public)

Homepage card ~310×467 (metadata). DS identity block (`102:6511` texts): FREULY FIRST 50, category, name, city, format, language pills, bio, dual CTAs “Сделать заявку” / “Услуги и цены”.

---

## Tables / lists — EXACT_MCP_DATA (`102:6623` texts + `102:6377`)

Header: Inter Bold 12 uppercase — НАЗВАНИЕ УСЛУГИ / КАК СЧИТАЕТСЯ / ЦЕНА / СТАТУС / ДЕЙСТВИЯ.  
Row: name 15 Bold, price 16 Bold `#0D9488`, status pill, actions 13 SemiBold (edit teal / disable muted / delete `#EF4444`).  
Mobile model: stacked card with price row (“Цена: 45 €”).

---

## Responsive conventions — EXACT_MCP_DATA (`102:6697`)

1. Service desktop row → mobile stacked card.  
2. Sidebar → mobile header menu.  
3. Grid inputs → stacked inputs.

Mobile width used on canvas: **390** (one requests mobile is **470**). Desktop artboards: **1440** (requests desktop **1520**).

Missing mobile: homepage, registration, onboarding, dashboard overview.

---

## Code tokens today

`styles/tokens.css` and `components/ui/*` implement **Language A**. A future Language B rollout needs an explicit token migration, not a silent hex swap.
