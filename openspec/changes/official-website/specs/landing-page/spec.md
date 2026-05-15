## ADDED Requirements

### Requirement: Hero section
The landing page SHALL display a hero section with the Tipi logo, a headline describing the product, a brief subtitle, and a prominent call-to-action button.

#### Scenario: User visits the landing page
- **WHEN** a user navigates to the Tipi website
- **THEN** the hero section is visible immediately with the Tipi name, description "Quickly find and jump back to websites from browser history", and a CTA linking to the install guide section

### Requirement: Features section
The landing page SHALL display a features section highlighting at least 4 key capabilities of Tipi, each with an icon, title, and short description.

#### Scenario: User scrolls to features
- **WHEN** the user scrolls past the hero section
- **THEN** a features grid is displayed showing at least: browser history search, keyboard shortcut access, local data privacy, and multi-browser support

### Requirement: Install guide section
The landing page SHALL include an installation guide with steps for Chrome, Edge, Arc, and Firefox browsers.

#### Scenario: User wants to install Tipi
- **WHEN** the user navigates to the install guide section
- **THEN** they see platform-specific instructions with links to the Chrome Web Store and Firefox Add-ons store

### Requirement: Footer
The landing page SHALL have a footer with a link to the GitHub repository and copyright information.

#### Scenario: User wants to view source code
- **WHEN** the user scrolls to the bottom of the page
- **THEN** a footer is visible with a link to the Tipi GitHub repository and the current year copyright

### Requirement: Responsive design
The landing page SHALL be responsive and display correctly on mobile (320px+), tablet, and desktop viewports.

#### Scenario: User visits on mobile device
- **WHEN** the user opens the website on a device with viewport width of 375px
- **THEN** all sections are readable and the layout adapts to a single-column format without horizontal scroll
