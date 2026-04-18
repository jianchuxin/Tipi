# Design System Strategy: The Architect’s Journal

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Architect’s Journal."** It represents the precise intersection of a disciplined technical blueprint and a soulful, hand-sketched diary. 

While most browser extensions lean toward "utility-chic" or "flat minimalism," this system breaks the template by embracing intentional asymmetry, overlapping layers, and a tactile "fine-ink" aesthetic. We are moving away from the rigid, sterile grids of standard SaaS products toward a high-density editorial experience that feels curated and artisanal. The objective is to make the user feel like they are interacting with a high-end physical tool—one that balances professional authority with the warmth of human touch.

## 2. Colors & Tonal Depth
The palette is built on sophisticated "Journal" tones: deep sage greens, muted terracottas, and a foundation of warm cream.

### The "No-Line" Rule
Standard 1px solid CSS borders are strictly prohibited for defining sections. Boundaries must be established through:
- **Tonal Shifts:** Use `surface-container-low` for secondary content sitting on a `surface` background.
- **Watercolor Accents:** Use a subtle horizontal gradient of `primary-container` (8a9a5b) at 10% opacity to "wash" over a section header, providing a soft boundary without a hard edge.

### Surface Hierarchy & Nesting
Treat the browser extension as a series of stacked paper sheets.
- **Base Layer:** `surface` (#fbf9f4).
- **Secondary Containers:** `surface-container-low` (#f5f3ee) for grouped information.
- **Interactive Elements:** `surface-container-highest` (#e4e2dd) for elements that require immediate user focus.
Nesting should always move from light to dark or dark to light to create depth. For example, a card using `surface-container-lowest` (#ffffff) should sit atop a `surface-container` (#f0eee9) background to create a "lifted" effect.

### The "Glass & Paper" Rule
To ensure the UI feels modern and premium, use **Glassmorphism** for floating elements (like dropdowns or tooltips). Apply the `surface` color at 85% opacity with a `backdrop-filter: blur(12px)`. This allows the "ink" of the underlying layers to softly bleed through, mimicking the translucency of vellum paper.

### Signature Textures
Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#56642b) to `primary-container` (#8a9a5b) at a 45-degree angle. This provides a "soft marker" feel that adds visual soul to the interface.

## 3. Typography
The system utilizes a high-contrast typographic scale to drive editorial authority.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Architectural" anchors. Use `headline-lg` and `headline-md` with tighter letter-spacing (-0.02em) to create a bold, professional presence.
*   **Body & Labels (Work Sans):** These are our "Technical" anchors. Work Sans provides a clean, neutral counterpoint to the more expressive headers. 
*   **The Editorial Rhythm:** Combine a `headline-sm` title with a `label-sm` subtitle in `on-surface-variant` (#46483c) to create a clear, dense information hierarchy that feels like a meticulously labeled diagram.

## 4. Elevation & Depth
In this design system, depth is organic, not artificial.

*   **The Layering Principle:** Depth is achieved by "stacking" the surface tiers. A `surface-container-lowest` card on a `surface-container-low` section creates a natural lift.
*   **Ambient Shadows:** If a floating effect is required, shadows must be ultra-diffused. Use a 24px blur with 4% opacity. The shadow color should be a tinted version of `on-surface` (#1b1c19) rather than pure black, ensuring it feels like natural ambient light on paper.
*   **The "Ghost Border":** For elements requiring a "hand-drawn" definition, use the `outline-variant` (#c6c8b8) at 30% opacity. This "Ghost Border" should be applied with a slightly irregular `border-radius` (mixing `md` and `lg` values) to simulate the slight imperfection of a technical pen.

## 5. Components

### Buttons
- **Primary:** Gradient of `primary` to `primary-container`. `rounded-md` (0.375rem). Text in `on-primary`.
- **Secondary:** Transparent background with a "Ghost Border" (outline-variant at 40%). Text in `secondary`.
- **Tertiary:** No border, no background. Use `title-sm` typography in `primary`.

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Implementation:** Separate list items using 8px of vertical white space or a 1-step shift in the `surface-container` scale.
- **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-high` and apply a "Ghost Border."

### Input Fields
- Avoid the "four-sided box." Use a single 1.5px bottom border in `outline`. 
- **Focus State:** Transition the bottom border to `primary` and add a very subtle watercolor wash of `primary-container` (5% opacity) to the input background.

### Tooltips & Overlays
- Use the Glassmorphism rule (85% opacity + blur).
- Use a `secondary` (#8b4e3b) "marker" accent—a 2px vertical line on the left side of the tooltip to highlight the core message.

### Chips
- Use `full` roundedness. 
- **Inactive:** `surface-container-highest` background with `on-surface-variant` text.
- **Active:** `secondary-container` background with `on-secondary-container` text.

## 6. Do's and Don'ts

### Do:
- **Embrace White Space:** Use the spacing scale to let elements breathe. This is a high-density UI, but density requires "islands of calm."
- **Use Intentional Asymmetry:** If a group of cards is displayed, consider making one card slightly wider or using a different `surface` tier to draw the eye.
- **Apply the "Ink" Logic:** Ensure text in `on-surface` feels like it was pressed into the paper, not floating on top of it.

### Don't:
- **Don't use pure black (#000000):** It breaks the journal aesthetic. Use `on-surface` or `on-background` charcoal tones.
- **Don't use sharp corners:** Even for "precise" elements, never go below the `sm` (0.125rem) roundedness. Pure 90-degree angles feel too digital/corporate.
- **Don't over-animate:** Transitions should be "ink-like"—smooth and slightly weighted (e.g., 300ms ease-out), not bouncy or "cartoony."