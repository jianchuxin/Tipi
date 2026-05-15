## 1. Project scaffolding

- [x] 1.1 Create `website/` directory and initialize with `package.json` (Astro + Tailwind CSS v4)
- [x] 1.2 Configure Astro with static output mode and Tailwind integration
- [x] 1.3 Set up project structure: `src/pages/`, `src/components/`, `public/`

## 2. Landing page implementation

- [x] 2.1 Create the main page layout with responsive container
- [x] 2.2 Build the hero section with Tipi logo, headline, subtitle, and CTA button
- [x] 2.3 Build the features section showcasing at least 4 key capabilities with icons
- [x] 2.4 Build the install guide section with browser-specific instructions and store links
- [x] 2.5 Build the footer with GitHub link and copyright
- [x] 2.6 Add Tipi brand colors and typography matching the extension's design

## 3. Deployment setup

- [x] 3.1 Create `.github/workflows/deploy-website.yml` with build and deploy steps
- [x] 3.2 Configure the workflow to trigger on pushes to main affecting `website/`
- [x] 3.3 Set up `actions/deploy-pages` for the deploy step

## 4. Verification

- [x] 4.1 Run `npm run build` in `website/` and verify static output
- [x] 4.2 Test the built site locally with `npm run preview`
- [x] 4.3 Verify responsive layout on mobile (375px), tablet (768px), and desktop (1280px)
- [x] 4.4 Confirm extension source and build are unaffected
