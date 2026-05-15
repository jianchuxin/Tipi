## ADDED Requirements

### Requirement: Automatic deployment on push to main
The GitHub Actions workflow SHALL build and deploy the website to GitHub Pages whenever changes are pushed to the `main` branch that affect the `website/` directory.

#### Scenario: Push to main with website changes
- **WHEN** a commit is pushed to the `main` branch that modifies files in `website/`
- **THEN** the website is built and deployed to GitHub Pages automatically

### Requirement: Build artifact output
The deployment workflow SHALL produce a production-ready static build of the website with optimized assets.

#### Scenario: Successful build
- **WHEN** the GitHub Actions workflow runs the build step
- **THEN** it generates a static site with minified CSS, optimized images, and no JavaScript errors

### Requirement: Deployment isolation
The website build and deployment SHALL NOT affect or depend on the browser extension build process.

#### Scenario: Extension build unaffected
- **WHEN** the website deployment workflow runs
- **THEN** the extension source in `src/` remains untouched and the extension build scripts continue to work independently
