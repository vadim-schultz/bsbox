# Accessibility audit (WCAG 2.2 AA)

Automated coverage: `e2e/tests/a11y.spec.ts` runs axe-core on the lobby, live, ended and Outlook task-pane
views in EN and DE, in light, dark and forced-colors (high contrast) modes. The suite must report zero violations.

## Checklist

| Criterion                                  | Result  | Evidence                                                            |
| ------------------------------------------ | ------- | ------------------------------------------------------------------- |
| 1.1.1 Non-text content                     | Pass    | Chart has a visually hidden table twin; score ring has a text value |
| 1.4.3 / 1.4.11 Contrast                    | Pass    | axe color-contrast in light, dark, forced-colors                    |
| 1.4.4 / 1.4.10 Resize, reflow              | Pass    | Mobile-first layout, no horizontal scroll at 320 px                 |
| 2.1.1 Keyboard                             | Pass    | All controls are native buttons or links                            |
| 2.4.7 / 2.4.11 Focus visible, not obscured | Pass    | Default focus ring kept; no sticky overlays                         |
| 2.5.8 Target size (minimum)                | Pass    | Vote controls are at least 44 px                                    |
| 3.1.1 / 3.1.2 Language                     | Pass    | `lang` follows the UI locale (en, de)                               |
| 4.1.2 Name, role, value                    | Pass    | Vote buttons expose `aria-pressed`; axe reports no violations       |
| Screen reader pass (NVDA/VoiceOver)        | Pending | Owner check before submission (M9)                                  |

## Security headers

All worker responses carry a strict CSP without `unsafe-inline` or `unsafe-eval`, HSTS,
`X-Content-Type-Options: nosniff` and `Referrer-Policy`. Framing is allowed only on `/host/*` from Outlook and Teams origins.
