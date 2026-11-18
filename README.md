# MediFind — Health Facility Resource Directory

MediFind is a six-page CSE326 university project demonstrating a structured, searchable healthcare resource directory. It uses plain semantic HTML, CSS, vanilla JavaScript ES modules, JSON and browser storage. There is no build step, framework, backend, analytics or paid API.

## Project overview

**Problem:** Healthcare information is often inconsistent across listings, making it hard to compare services, hours, locations and contacts.

**Objective:** Present standardized facility profiles with discovery, filtering, comparison, feedback and a browser-local administration demonstration.

The 30 included listings are fictional academic samples in Punjab, India. The names, addresses, contacts, ratings and verification statuses are illustrative. The phone numbers are deliberately non-dialable examples, and email and website values use the reserved example.com domain. Maps links use a Google Maps address search, not a verified provider location. Do not use these listings to seek medical care or contact real providers. The assistant only searches the demo directory and does not provide medical advice.

## Features

- Six connected pages: landing, directory, facility profile, compare, admin and about.
- 30 sample facilities across Clinic, Lab, Pharmacy and Support Facility categories; loaded via fetch and seeded into localStorage.
- Instant text search and suggestions; category, city/area, open now, verified, minimum rating and favorites filters; four sorting options.
- Opening status calculated in India Standard Time, including overnight opening hours, and refreshed every 15 seconds.
- Profile services, address, location, weekly hours, phone, email, website and Google Maps search link.
- Star ratings, breakdowns and comments, with local feedback persisted in the browser.
- Saved favorites and comparison of up to three facilities.
- Demo admin login, add/edit/delete records, verification toggles, feedback deletion and reset.
- Midnight Emerald (#0B1210) default theme with malachite green (#31EC56) and razzmatazz (#EF036C) accents, responsive grids, optional soft light theme, desktop cursor follower, scroll reveal, counters, page transitions, skeleton loaders, toasts and reduced-motion-aware accent animations.
- Ctrl/Cmd+K command palette and CatDoc, a draggable rule-based directory assistant using the supplied doctor-cat image. CatDoc includes cross-page guided tours, saved position, keyboard movement, quick search, walk and idle animations, and optional browser speech synthesis.
- Visible keyboard focus, skip link, accessible form labels, reduced-motion support and font fallbacks.

## Folder structure

```text
medifind-editorial/
├── index.html
├── README.md
├── assets/
│   ├── guide.svg
│   └── catdoc.webp
├── css/
│   └── style.css
├── data/
│   └── facilities.json
├── js/
│   ├── app.js
│   ├── catdoc.js
│   ├── admin.js
│   ├── compare.js
│   ├── directory.js
│   ├── facility.js
│   ├── home.js
│   ├── storage.js
│   └── ui.js
└── pages/
    ├── about.html
    ├── admin.html
    ├── compare.html
    ├── directory.html
    └── facility.html
```

## Run locally

Opening the HTML by double-clicking uses file://, which generally blocks ES module imports and fetch(). Run it through HTTP instead.

### Option A — VS Code Live Server

1. Extract the ZIP and open the extracted folder in Visual Studio Code.
2. Install the Live Server extension if needed.
3. Right-click `index.html` and select **Open with Live Server**.
4. Use the URL that appears in your browser.

### Option B — Python

Open a terminal in the folder containing `index.html`, and run:

```bash
python -m http.server 8000
```

On Windows, `py -m http.server 8000` is another option. Visit `http://localhost:8000/`.

## Demo admin

- Username: `admin`
- Password: `medifind326`

These credentials are intentionally public. The login uses sessionStorage and is not real security. Facility edits, comments, favorites and comparison selections are localStorage data on the current browser and origin only. Other visitors cannot see them. The reset control restores the original JSON data without changing your theme. To publish permanent facility changes, edit `data/facilities.json` in the repository. A returning browser may need the demo reset to see new seed data.

## Deploy to GitHub Pages (free public repository)

1. Sign in at https://github.com/ and choose **+ → New repository**.
2. Name the repository `medifind` (or another name), choose **Public**, and click **Create repository**. Do not initialize a separate README; one is included.
3. Extract the ZIP. Open the folder containing `index.html`, `README.md`, `assets`, `css`, `data`, `js` and `pages`.
4. In the GitHub repository, click **uploading an existing file** or **Add file → Upload files**.
5. Drag the contents of the project folder, including all five subfolders, into GitHub. Do not upload the ZIP itself or wrap the files in another folder. `index.html` must be directly at the repository root.
6. Commit the upload to `main`, with a message such as `Publish MediFind editorial website`.
7. Open the repository's **Settings → Pages** (under Code and automation).
8. In **Build and deployment**, set Source to **Deploy from a branch**.
9. Select the `main` branch and `/ (root)` folder. Click **Save**.
10. Check the repository's **Actions** tab for a successful Pages deployment. Return to **Settings → Pages** and select the published URL.

The URL format is:

```text
https://<username>.github.io/<repo-name>/
```

Example: `https://yourusername.github.io/medifind/`.

If updating an existing MediFind repository, replace the old files with these files, preserving folder names; delete the old `assets/placeholder.svg` if present. No absolute repository paths are used.

## Submission checklist

- Open the published homepage, then select each navbar destination.
- Open the directory, search for NightOwl, and test category, city, rating, favorites and open-now filters.
- Open a profile, leave a test review, reload, and verify the review persists.
- Add three facilities to Compare; check the comparison limit.
- Open the assistant and ask `Find a 24-hour pharmacy`.
- Open Admin, use the demo login, add a test facility, edit its name, toggle verification, delete it and moderate the test review.
- Test the theme switch, Ctrl/Cmd+K, mobile menu and responsive layout.
- Project team: Veronic, Sunil and Sushanth. The names appear on the About page and the shared footer.

Google Fonts and external contact/map links depend on internet availability. The directory itself has no external data dependencies and falls back to system fonts if the font service is unavailable.
