<!-- PADRAO-ICONES -->
# Padrão de Ícones — Central Tutts

> **Regra oficial (a partir de julho/2026):** o padrão de ícones do frontend é o
> **sprite Lucide embutido** no `index.html`. **Não usamos** emojis novos, Tabler
> (`<i class="ti ...">`), Font Awesome, nem `lucide-react` (npm, exige build).
> Os emojis legados estão sendo migrados gradualmente. Onde não houver ícone
> adequado, o emoji pode permanecer. As telas **home** não são mexidas.

---

## Por que sprite (e não CDN / npm)

Frontend é **React via CDN, sem build** (`React.createElement` aliased como `h`).
Lucide vanilla some no re-render; `lucide-react` exige build. O sprite inline
resolve os dois: `<symbol>` no HTML uma vez, cada ícone é um `<use href="#i-nome">`.

## Onde fica
- `index.html`, bloco `<svg id="tutts-icons">` antes de `</body>`.
- Helper global `window.Icon(nome, cls)`.
- Classes `.ico` / `.ico-sm` (14px) / `.ico-lg` (18px), `stroke:currentColor`.

## Como usar

```js
window.Icon('pencil', 'text-rose-600')
// ou inline (recomendado em módulos lazy-loaded, sem depender do global):
React.createElement("svg", { className: "ico ico-sm", "aria-hidden": "true" },
  React.createElement("use", { href: "#i-refresh" }))
```

Cor vem de `currentColor`. Marca: roxo `#7c3aed`/`#770fa8`, laranja `#f67602`.

---

## Ícones disponíveis no sprite

**Base:** `power` `pencil` `tag` `truck` `wallet` `trash` `search` `plus` `copy`
`x` `alert` `refresh` `check` `corner` `link` `list` `pin` `lock` `eye` `eyeoff`
`settings` `message`

**Expansão (jul/2026):** `chart` `calendar` `package` `wrench` `map` `filetext`
`building` `bike` `ban` `users` `user` `target` `camera` `zap` `clock` `crown`
`rocket` `save` `bulb` `new` `clipboard` `home` `bell` `star` `mail` `phone`
`card` `key` `info` `help` `circle` `arrowright` `arrowleft` `trendup`
`trenddown` `download` `upload` `filter`

---

## Mapa emoji → ícone (para a migração)

| emoji | ícone | | emoji | ícone |
|---|---|---|---|---|
| ✅ ✓ | `check` | | 📦 | `package` |
| ❌ ✕ | `x` | | 🔧 | `wrench` |
| ⚠️ | `alert` | | 🗺️ | `map` |
| 🔄 | `refresh` | | 📝 📄 | `filetext` |
| 🔍 | `search` | | 🏢 | `building` |
| 📍 | `pin` | | 🏍️ | `bike` |
| 🗑️ | `trash` | | 🚫 | `ban` |
| ✏️ | `pencil` | | 👥 | `users` |
| ➕ | `plus` | | 👤 | `user` |
| 🔒 | `lock` | | 🎯 | `target` |
| 👁️ | `eye` / `eyeoff` | | 📷 | `camera` |
| ⚙️ | `settings` | | ⚡ | `zap` |
| 💬 | `message` | | ⏱️ ⏰ | `clock` |
| 💰 | `wallet` | | 👑 | `crown` |
| 📊 📈 | `chart` / `trendup` | | 🚀 | `rocket` |
| 📅 | `calendar` | | 💾 | `save` |
| 📋 | `clipboard` / `list` | | 💡 | `bulb` |
| 🔗 | `link` | | 🆕 | `new` |
| 🏠 | `home` | | 🔔 | `bell` |
| ⭐ | `star` | | 📧 ✉️ | `mail` |
| 📞 | `phone` | | 💳 | `card` |
| 🔑 | `key` | | ℹ️ | `info` |
| ❓ | `help` | | ↩️ | `corner` |
| → | `arrowright` | | ← | `arrowleft` |
| 📥 | `download` | | 📤 | `upload` |

Sem correspondência boa? **Deixa o emoji.** Botões "Salvando..." ficam só texto.

## Como adicionar um ícone novo
Pegue o SVG em [lucide.dev](https://lucide.dev) (só os paths internos) e adicione
`<symbol id="i-NOME" viewBox="0 0 24 24">...</symbol>` no sprite. Só stroke, sem fill.

## Armadilhas
- `window.Icon` só existe em runtime. Helper local (ex.: `ico()` dentro de `.map`)
  precisa estar no escopo onde é chamado (bug já ocorrido: `ico is not defined`).
- Não espalhar SVG na mão; use o helper ou o padrão inline.
- `grep -rn "tabler\|font-awesome\|ti ti-" .` antes de adicionar ícones.

## Status da migração
- **Feito:** Configurações → Clientes API (cards + 4 modais).
- **Regra:** converter onde há ícone; deixar emoji onde não há; **não tocar nas home**;
  toasts/alerts por enquanto mantidos.
