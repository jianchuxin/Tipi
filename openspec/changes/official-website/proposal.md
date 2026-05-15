## Why

Tipi is a capable browser extension but lacks an official website — users have no central place to discover the product, understand its features, or get installation help. A polished landing page hosted on GitHub Pages will establish credibility and make discovery easy.

## What Changes

- Create a new `website/` directory with a static site powered by a lightweight framework (Astro or plain HTML/CSS)
- Build a single-page landing site with: hero section, feature highlights, installation guide, download/install CTA, and footer
- Configure GitHub Actions to deploy the site to GitHub Pages on pushes to main
- Include the Tipi logo/branding and link to the GitHub repository

## Capabilities

### New Capabilities

- `landing-page`: A single-page static website introducing Tipi with hero, features, install guide, and CTA sections
- `github-pages-deploy`: GitHub Actions workflow that builds and deploys the static site to GitHub Pages on each push to main

### Modified Capabilities

<!-- No existing capabilities are changing -->

## Impact

- New directory: `website/` at project root (zero impact on existing extension code)
- New file: `.github/workflows/deploy-website.yml` for GitHub Pages deployment
- Repository settings: GitHub Pages source must be set to "GitHub Actions"
