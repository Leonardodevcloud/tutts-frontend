# Central Tutts - Frontend

<!-- PADRAO-ICONES -->
## Padrão de Ícones

**A partir de julho/2026, o padrão oficial de ícones é o sprite Lucide embutido
no `index.html`.** Não usar emojis, Tabler, Font Awesome nem `lucide-react`.

Uso rápido:

```js
window.Icon('pencil', 'text-rose-600')
// ou, dentro de módulos lazy-loaded (sem depender do helper global):
React.createElement("svg", { className: "ico ico-sm", "aria-hidden": "true" },
  React.createElement("use", { href: "#i-refresh" }))
```

Documentação completa (símbolos disponíveis, como adicionar ícones, armadilhas):
**[`docs/PADRAO-ICONES.md`](docs/PADRAO-ICONES.md)**.

