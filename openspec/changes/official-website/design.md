## Context

Tipi is a cross-browser extension (Chrome, Edge, Arc, Firefox) for searching and reopening pages from browsing history. It's built with WXT, React 19, TypeScript, and Tailwind CSS. There is currently no official website — users discover Tipi through the extension store or GitHub repo. We need a lightweight, fast static site that introduces the product and guides users to install it.

The site will live in a new `website/` directory, deployed to GitHub Pages via Actions. It must not affect the extension build or add complexity to the main project.

## Goals / Non-Goals

**Goals:**
- Single-page static site introducing Tipi (hero, features, install guide, download CTA)
- Responsive design matching Tipi's visual identity
- GitHub Pages deployment via Actions on push to main
- Fast loading with minimal JavaScript

**Non-Goals:**
- Blog, documentation, or multi-page architecture
- User accounts, analytics, or any backend
- i18n or multi-language support (Chinese-only content is fine initially)
- SEO beyond basic meta tags

## Decisions

### Static site framework: Astro

Use [Astro](https://astro.build) with Tailwind CSS for the website. Rationale:
- Astro ships zero JavaScript by default and generates pure static HTML/CSS
- Built-in support for Tailwind CSS and component-based architecture
- Project team already knows React — Astro supports React components if needed later
- Small build output and fast performance by default

**Alternatives considered:**
- Plain HTML/CSS: No build step, but harder to maintain consistent styling
- Vite + React: Familiar tech but ships unnecessary JS for a static landing page
- Next.js: Overkill — requires a server or generates heavy static exports

### Deployment: GitHub Actions with `actions/deploy-pages`

Use the official `actions/deploy-pages` workflow. The build step runs `npm run build` inside `website/`, and the deploy step publishes the output to GitHub Pages. Source branch setting in repo must be set to "GitHub Actions."

### Styling: Tailwind CSS v4

Same design system as the extension — Tailwind CSS v4 with the same color palette and typography. This keeps the brand consistent and lets the team reuse design tokens.

## Risks / Trade-offs

- **Astro adds a new tool to the project** → The website is fully isolated in `website/` with its own `package.json`; no impact on the extension code or build
- **GitHub Pages requires repo settings change** → One-time manual configuration documented in the deployment guide
- **Custom domain not configured initially** → Default `*.github.io` domain is acceptable for launch; custom domain can be added later
