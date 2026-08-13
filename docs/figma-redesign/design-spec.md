# Freuly redesign — design specification

Visual specifications extracted from **live Figma MCP** session (node `102:1623` and children). Values marked **(inference)** are not direct MCP output.

**Font family (MCP):** Inter (hardcoded per text node; no Figma text styles bound)

**Figma variables:** none on inspected nodes (`get_variable_defs` → `{}`)

**Code mirror:** `styles/tokens.css`, `tailwind.config.js`, `components/ui/*`

---

## 1. Color palette (MCP exact)

| Role | Hex | Token |
|---|---|---|
| Primary / brand teal | `#107B80` | `--freuly-primary` |
| Primary hover **(inference: code)** | `#0D686C` | `--freuly-primary-hover` |
| Text primary / dark UI | `#1E1E1E` | `--freuly-text-primary` |
| Text muted | `#6B6B6B` | `--freuly-text-secondary`, `--freuly-text-muted` |
| Page background | `#F8F7F5` | `--freuly-bg-page`, `--freuly-bg-dashboard` |
| Surface (card, header, sidebar) | `#FFFFFF` | `--freuly-bg-surface` |
| Border default | `#E6E4DF` | `--freuly-border-default` |
| Warning badge bg | `#FFF7ED` | `--freuly-warning-light` |
| Warning badge border | `#FED7AA` | `--freuly-warning-border` |
| Warning badge text | `#B45309` | `--freuly-warning` |
| Success badge bg | `#F0FDF4` | `--freuly-success-light` |
| Success badge border | `#BBF7D0` | `--freuly-success-border` |
| Success badge text | `#15803D` | `--freuly-success` |
| Info/callout box bg | `#FDFBF7` | — |
| Info/callout box border | `#F1ECE4` | — |
| Icon chip bg (recommendations) | `#F4F3EF` | — |
| Footer background | `#1E1E1E` | implemented in Footer |

---

## 2. Typography (MCP exact sizes/weights)

| Role | Size | Weight | Line height | Example nodes |
|---|---|---|---|---|
| Page title | 28px | Bold (700) | normal | `102:1680` |
| Card / section title | 20px | Semi Bold (600) | normal | `102:1683`, `102:1701` |
| Logo wordmark (header) | 20px | Bold | normal | `102:1628` |
| Logo mark letter | 18px | Bold | normal | `102:1627` |
| Logo wordmark (footer) | 18px | Bold | normal | `102:1786` |
| Nav / sidebar / subtitle | 15px | Medium (500) / Semi Bold active | normal | `102:1631`, sidebar items |
| Body / buttons / labels | 14px | Regular / Medium / Semi Bold | 1.5 body copy | cards, buttons |
| Field labels (PLAN, STATUS) | 13px | Semi Bold | normal | `102:1704` |
| Footer copyright / bottom links | 13px | Regular / Medium | normal | `102:1807` |
| Badge / footer column title | 12px | Semi Bold | normal; footer titles UPPERCASE | `102:1688`, `102:1790` |
| Profile views stat | 48px | Bold | normal | `102:1737` |
| Footer brand body | 14px | Regular | 1.6 | `102:1787` |

---

## 3. Spacing scale (MCP exact where noted)

4px-base auto-layout. Common values from `102:1623`:

| Token | Value | Usage |
|---|---|---|
| `--freuly-space-1` | 4px | Info box internal gap |
| `--freuly-space-2` | 8px | Stat row gaps, views count gap |
| `--freuly-space-3` | 12px | Sidebar item internal gap, card action gaps, status rows |
| `--freuly-space-4` | 16px | Card internal gaps (profile views), rec row padding |
| `--freuly-space-5` | 20px | Card internal stack gap |
| `--freuly-space-6` | 24px | Card padding, split-row gap, footer bottom section gap |
| `--freuly-space-8` | 32px | Main content stack gap, header right-actions gap |
| `--freuly-space-10` | 40px | Footer vertical section gap |
| `--freuly-space-12` | 48px | Main content padding, footer pb |

**Header horizontal padding:** 64px (`102:1624`)

**Footer padding:** pt 56px, pb 48px, px 64px (`102:1780`)

**Sidebar:** width 240px; px 16, py 32; item gap 6px; item px 16 py 12

**Main content:** p 48px; vertical gap 32px (`102:1678`)

**Split cards row:** gap 24px (`102:1699`)

**Footer link columns:** gap 80px (`102:1788`)

**Footer brand column:** width 320px (`102:1782`)

---

## 4. Radii (MCP exact)

| Element | Radius |
|---|---|
| Button | 6px |
| Logo mark | 6px |
| Sidebar item | 8px |
| Info box | 8px |
| Card | 10px |
| Recommendation icon chip | 12px |
| Badge | 99px (pill) |

Tokens: `--freuly-radius-button`, `--freuly-radius-md`, `--freuly-radius-card`, `--freuly-radius-lg`, `--freuly-radius-pill`

---

## 5. Button geometry (MCP exact)

| Variant | Background | Border | Text | Padding | Radius |
|---|---|---|---|---|---|
| Primary | `#107B80` | none | white 14px Semi Bold | 16×10 | 6px |
| Secondary | white | `#E6E4DF` 1px | `#6B6B6B` 14px Semi Bold | 16×10 | 6px |
| Strong / dark | `#1E1E1E` | none | white 14px Semi Bold | 16×10 | 6px |
| Outline primary | white | `#107B80` 1.5px | `#107B80` 14px Semi Bold | 16×10 | 6px |

**Min height (code):** 37px — matches py 10 + 14px text **(inference)**

---

## 6. Card geometry (MCP exact)

| Property | Value |
|---|---|
| Background | `#FFFFFF` |
| Border | 1px solid `#E6E4DF` |
| Radius | 10px |
| Padding | 24px |
| Internal stack gap | 20px (most cards); profile-views uses 16px |
| Shadow | none in Figma export |

**Requests card:** fixed width **420px** in split row (`102:1721`)

**Subscription card:** flex fill remainder of row (`102:1700`)

---

## 7. Badge geometry (MCP exact)

| Property | Value |
|---|---|
| Padding | 10px horizontal, 4px vertical |
| Radius | 99px |
| Font | 12px Semi Bold |
| Border | 1px solid (semantic color) |

Variants documented in §1 (success, warning).

---

## 8. Global header (`102:1624`)

| Property | Value |
|---|---|
| Size | 1440 × 80 |
| Background | white |
| Bottom border | 1px `#E6E4DF` |
| Layout | flex row, space-between, items-center |
| Horizontal padding | 64px |
| Logo group gap | 10px |
| Logo mark | 32×32, `#107B80`, radius 6px |
| Nav links gap | 24px |
| Right cluster gap | 32px (nav + CTA) |

---

## 9. Global footer (`102:1780`)

| Property | Value |
|---|---|
| Size | 1440 × 298 |
| Background | `#1E1E1E` |
| Border | 1px `#E6E4DF` |
| Top section | brand 320px + link columns, justify-between |
| Link column internal gap | 16px |
| Column title | 12px Semi Bold white uppercase |
| Link text | 14px Regular `#6B6B6B` |
| Divider | 1px line above copyright row |
| Copyright row | 13px `#6B6B6B`; bottom links gap 24px |
| Language selector | globe 13px + 13px Medium white label |

---

## 10. Sidebar (`102:1637`)

| Property | Value |
|---|---|
| Width | 240px |
| Background | white |
| Right border | 1px `#E6E4DF` |
| Padding | 16px horizontal, 32px vertical |
| Item gap | 6px |
| Item size | full width, px 16 py 12, min ~42px tall |
| Item radius | 8px |
| Icon | 16×16 |
| Active item | bg `#107B80`, text white 15px Semi Bold |
| Inactive item | text `#6B6B6B` 15px Medium |

**Items (order):** Dashboard, Profile, Requests, Subscription, Payment, Services, Video guide, Settings

---

## 11. Dashboard overview content blocks

Vertical stack in `main-content` (`102:1678`), gap 32px:

1. **page-header** — title + subtitle, gap 6px
2. **profile-status-card** — full width
3. **split-cards-row** — subscription (flex) + requests (420px)
4. **profile-views-card** — full width, gap 16px internal
5. **improvements-card** — recommendation rows, border-b between rows, py 16px per row

---

## 12. Responsive patterns

**MCP data:** desktop 1440px only for inspected frame.

**(inference)** Product implementation uses:

- `DashboardShell` mobile sidebar drawer
- Responsive main padding: `px-freuly-4 py-freuly-6 sm:px-freuly-6 lg:p-freuly-12`
- Header mobile second row in current `Header.tsx`

Mobile Figma variants **not captured** — require MCP file scan.

---

## 13. Recurring component patterns

| Pattern | Node examples | Implementation |
|---|---|---|
| Primary CTA button | `102:1634`, `102:1697`, `102:1717` | `Button variant="primary"` |
| Secondary button | `102:1719` | `Button variant="secondary"` |
| Strong/dark button | `102:1732` | `Button variant="strong"` |
| Outline primary | `102:1778` | `Button variant="outlinePrimary"` |
| Status badge | `102:1687`, `102:1691`, `102:1708` | `Badge variant="warning|success"` |
| Content card | all `*-card` nodes | `Card padding="lg"` |
| Info callout | `102:1713` | custom or Alert — bg `#FDFBF7`, border `#F1ECE4`, radius 8, p 16 |
| Rec row + icon chip | `102:1745+` | 24px chip, `#F4F3EF`, radius 12 |

---

## 14. Component / variable metadata

| Source | Result |
|---|---|
| Figma variables | Empty on `102:1623` |
| Figma components | Tree uses named frames, not component instances |
| Code Connect | Unavailable (plan/seat limitation) |

---

## 15. MCP screenshot reference

Screenshot captured at 1440×1900 for node `102:1623` during live session. **Not stored in repo** (remote MCP asset, ~7-day TTL). Re-fetch with `get_screenshot` when MCP available.

---

## 16. Gaps requiring live MCP

- Full-file color/type tokens from dedicated design-system board
- Mobile breakpoints and stacked layouts
- Public/marketplace page specs (homepage, search, profile)
- Input field geometry (not present on dashboard overview frame)
- Shadow/elevation tokens (none on inspected frame)
- Icon SVG sources (MCP asset URLs expire)
