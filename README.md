# MediFind

MediFind is a static, multi-page **Health Facility Resource Directory** created for the **CSE326** university course. It demonstrates a searchable and comparable directory for clinics, diagnostic labs, pharmacies, and support facilities using only HTML, CSS, vanilla JavaScript, JSON, and browser storage.

## Project overview

**Problem:** People can struggle to compare nearby healthcare resources because information such as services, hours, contact details, and verification status is inconsistent across listings.

**Objective:** Present structured public information in one consistent interface with search, filters, facility profiles, comparison tools, feedback, favorites, and a browser-only admin demonstration.

> The included facilities and verification flags are sample data for academic demonstration. The admin page is explicitly demo-only and is not secure authentication for a real deployment.

## Features

- 30 sample facility records loaded from `data/facilities.json`
- Categories: Clinic, Lab, Pharmacy, Support Facility
- Search-as-you-type with suggestions
- Filters for category, area/city, open now, verified only, and minimum rating
- Sorting by rating, review count, and name
- Live open/closed status calculated from device time
- Facility profiles with services, location, hours, phone, email, website, and Maps link
- Favorites saved to `localStorage`
- Compare up to three facilities side by side
- Star-rating and comment feedback saved to `localStorage`
- Rating breakdown including browser-local feedback
- Admin demo to add, edit, delete, verify/unverify facilities, and delete feedback
- Light/dark theme toggle
- Ctrl/Cmd + K command-palette search
- Rule-based chat assistant for simple facility queries
- Scroll reveal, card tilt, animated counters, typing headline, cursor glow, skeleton loaders, toasts, ripples, and page transitions
- Responsive and keyboard-accessible layout
- No frameworks, backend, analytics, tracking, or build tools

## Folder structure

```text
medifind/
├── index.html
├── README.md
├── assets/
│   └── placeholder.svg
├── css/
│   └── style.css
├── data/
│   └── facilities.json
├── js/
│   ├── app.js
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

Because MediFind loads JSON with `fetch()`, do not open `index.html` directly with the `file://` protocol. Use a small local web server.

### Option 1: VS Code Live Server

1. Open the `medifind` folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

### Option 2: Python

From inside the `medifind` folder, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Demo admin credentials

```text
Username: admin
Password: medifind326
```

The admin session and all data changes are client-side only. This is intentionally labeled as demo security in the interface.

## Deploy to GitHub Pages

1. Sign in to GitHub and create a new repository, for example `medifind`.
2. Keep the repository public if you want to use GitHub Pages on a standard free setup.
3. Upload the **contents** of this project folder so that `index.html` is at the repository root.
4. Commit the files to the `main` branch.
5. Open the repository's **Settings**.
6. In the left sidebar, open **Pages**.
7. Under **Build and deployment**, choose **Deploy from a branch**.
8. Select branch **main**.
9. Select folder **/ (root)**.
10. Click **Save**.
11. After GitHub publishes the site, your URL will follow this format:

```text
https://<username>.github.io/<repo-name>/
```

Example:

```text
https://yourusername.github.io/medifind/
```

All project links use relative paths, so the site works correctly when hosted inside a GitHub Pages repository subfolder.

## Resetting browser data

The site seeds `localStorage` from `data/facilities.json` only on first load. If you edit facilities or submit feedback, those changes persist in that browser. Use the **Reset all demo data** control on the Admin page to restore the original JSON sample data.
