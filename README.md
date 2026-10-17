# The Intelligent Grid — Interactive Logistics Research Website

A responsive, static website based on the supplied 13-page presentation **“The Intelligent Grid: Transforming Route Optimization and Vehicle Routing from Tactical Necessity to Strategic Advantage.”** The site preserves the presentation's central themes: the logistics expectation gap, speed/cost/reliability, last-mile complexity, four-layer architecture, static vs dynamic routing, automation stages, KPIs, the smart logistics flywheel, and future roadmap.

## Included files
- `index.html` — page structure and research content
- `style.css` — responsive visual design and layout
- `script.js` — route estimator, scenario comparison lab, and KPI calculator

## Interactive features
1. Sample route estimator with start/destination selection and a disruption toggle.
2. Decision Lab that compares modeled static and dynamic planning estimates as stop count, disruption severity, and vehicle utilization change.
3. KPI calculator for on-time delivery and complete order fill rates using the formulas shown in the supplied presentation.
4. Responsive navigation and external technical reading links.

**Important:** This is an educational demonstration, not a live routing engine. It does not connect to real maps, traffic, weather, GPS, or fleet systems. Scenario Lab figures are explicitly illustrative assumptions; do not present them as measured results. The supplied presentation lists KPI weights/targets and automation costs/payback estimates; the site labels those as source figures that need validation for a real business case.

## Publish on GitHub Pages
1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site and open the URL shown on the Pages settings screen.

No build step, framework, or package installation is required.
