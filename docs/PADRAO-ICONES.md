<!-- PADRAO-ICONES -->
# Padrão de Ícones — Central Tutts

> **Regra oficial (a partir de julho/2026):** o padrão de ícones do frontend é o
> **sprite Lucide embutido** no `index.html`. **Não usamos** emojis, Tabler Icons
> (`<i class="ti ...">`), Font Awesome, nem `lucide-react` (pacote npm, exige build).
> Os emojis legados estão sendo migrados gradualmente — há um **redesign geral em breve**.

---

## Por que sprite (e não CDN / npm)

O frontend é **React via CDN, sem build step** (`React.createElement` aliased como `h`).
Nesse cenário:

- **Lucide vanilla** substitui elementos no DOM via `lucide.createIcons()`. A cada
  re-render, o React descarta o SVG injetado e os ícones somem.
- **`lucide-react`** é pacote npm e exige build — que não temos.

O **sprite inline** resolve os dois problemas: os `<symbol>` ficam no HTML uma vez,
cacheiam junto com a página, e cada ícone é só um `<use href="#i-nome">`. Pesa ~2,5 KB
contra ~300 KB do set completo.

---

## Onde fica

- Arquivo: **`index.html`**, bloco `<svg id="tutts-icons" ...>` inserido **antes de `</body>`**.
- Helper global: **`window.Icon(nome, cls)`** (definido no `<script>` do sprite).
- Estilos de tamanho/traço: classes **`.ico`**, **`.ico-sm`** (14px), **`.ico-lg`** (18px),
  todas com `stroke:currentColor; fill:none`.

---

## Como usar

**Forma 1 — helper global** (mais curto, para uso comum):

```js
window.Icon('pencil')                 // no lugar de qualquer emoji
window.Icon('trash', 'text-rose-600') // com classe extra de cor
```

**Forma 2 — inline** (quando o helper global pode não estar no escopo, ou para não
depender de `window.Icon` em runtime — recomendado dentro de módulos lazy-loaded):

```js
React.createElement("svg", { className: "ico ico-sm", "aria-hidden": "true" },
  React.createElement("use", { href: "#i-refresh" }))
```

A cor vem de `currentColor` — basta setar `text-...` (Tailwind) no elemento ou no pai.
Cores da marca: roxo `#7c3aed` / `#770fa8`, laranja `#f67602`.

---

## Ícones disponíveis no sprite

`power`, `pencil`, `tag`, `truck`, `wallet`, `trash`, `search`, `plus`, `copy`, `x`,
`alert`, `refresh`, `check`, `corner`.

---

## Como adicionar um ícone novo

1. Pegue o SVG oficial no [lucide.dev](https://lucide.dev) (só os `<path>`/`<circle>` internos).
2. Adicione um `<symbol>` no sprite do `index.html`:

   ```html
   <symbol id="i-NOME" viewBox="0 0 24 24"><path d="..." /></symbol>
   ```

3. Use `id="i-NOME"` (prefixo `i-` obrigatório). **Só traço, sem `fill`** — o `.ico`
   já aplica `stroke:currentColor; fill:none`.

---

## Armadilhas conhecidas

- **`window.Icon` só existe em runtime.** Helpers locais (ex.: uma função `ico()`
  dentro de um `.map()`) precisam estar **no mesmo escopo onde são chamados**. Já
  ocorreu `ReferenceError: ico is not defined` porque a legenda de rodapé chamava
  `ico()` fora do `.map()` que a definia. Solução: usar a **Forma 2 (inline)** fora
  do escopo do helper.
- Não espalhar SVG escrito à mão pelo código — use o helper ou o padrão inline acima.
- Antes de adicionar qualquer ícone, confirme que não voltou Tabler/FA:
  `grep -rn "tabler\|font-awesome\|ti ti-" .`

---

## Status da migração

- **Migrado:** Configurações → Clientes API (cards, faixas identidade/configuração/ações).
- **Pendente:** demais telas e os 6 modais de Clientes API (Editar, Modalidades,
  Provedores, Preço e mensagem, Desativar, Excluir) — entram no redesign geral.
