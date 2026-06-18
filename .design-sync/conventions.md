# Tone Translator — brand kit

A **tokens-only** design system for Tone Translator, a Japanese ⇄ English casual
translator. There are no shippable components here — design with the tokens below.

**Aesthetic:** torii red-gold on a near-black, warm-toned **"ink-wash" dark**. Calm,
high-contrast, a little ceremonial. Default to dark surfaces; gold is for hairline
borders and quiet accents; red is the single primary accent — use it sparingly.

## Setup

Everything is reached through `styles.css` — importing it pulls in the color +
typography tokens and loads the brand fonts. Style with the CSS custom properties
it defines; **do not invent hex values or font names** — use the `var(--*)` tokens.

## Styling idiom — use these tokens (no utility classes, no component library)

**Surfaces** (warm near-black; layer upward for elevation):
- `--background` `#0D0D0B` — page base
- `--surface` `#1A1917` — cards, panels, message bubbles
- `--surface-elevated` `#24221F` — raised/hover surfaces, menus

**Accents** (red is primary; gold is secondary/borders):
- `--accent-red` `#C0392B` — primary actions, the send/translate control
- `--accent-red-dark` `#A83226` — pressed/hover red
- `--accent-red-glow` `rgba(192,57,43,0.3)` — focus rings, glows behind red
- `--accent-gold` `#C9A84C` — secondary accent, active/selected state
- `--border-gold` `#C9A84C` — solid gold border
- `--border` `rgba(201,168,76,0.15)` — default hairline border (translucent gold)

**Text** (warm off-white, four steps dim → bright):
- `--text-primary` `#F0EDE8` — headings, key UI text
- `--text-body` `#C2BDB6` — body copy, longer explanations
- `--text-secondary` `#8A8580` — labels, metadata, timestamps
- `--text-tertiary` `#5A5652` — placeholders, disabled

**Type:**
- `--font-sans` — `'DM Sans'` (UI + body; weights 400/500/600)
- `--font-serif` — `'Shippori Mincho'`, a mincho serif (Japanese display accents; 400/500/600)

## Where the truth lives

- `styles.css` — the entry; read it first.
- `tokens/colors.css`, `tokens/typography.css` — the full token set with comments.

## Idiomatic snippet

```jsx
// A message bubble + primary action, styled entirely from tokens.
<div style={{
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '12px 14px',
  color: 'var(--text-body)',
  fontFamily: 'var(--font-sans)',
}}>
  <p style={{ color: 'var(--text-primary)', marginBottom: 6 }}>おはよう！</p>
  <p>Good morning!</p>
  <button style={{
    marginTop: 10,
    background: 'var(--accent-red)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    boxShadow: '0 0 0 3px var(--accent-red-glow)',
  }}>Translate</button>
</div>
```
