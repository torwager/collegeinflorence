# College in Florence 🏛️

**Live site:** https://torwager.github.io/collegeinflorence/

An interactive student map of Florence, Italy with three curated layers:

- 🎓 **Colleges** — every college and university based in Florence, including foreign campuses (NYU, Syracuse, Kent State, FSU, …), with programs, student numbers, demographics, and links.
- ☕ **Study Spots** — laptop-friendly cafés, libraries, and coworking spaces where you can park with a cappuccino, curated from Reddit, reviews, and student blogs with a synthesized 1–10 recommendation score.
- 🍷 **Eat & Nightlife** — the best budget-friendly aperitivo bars, street food, pubs, and clubs for students, same curation approach.

Plus a **verified student chat**: one room per school and a "Piazza" room for everyone, gated by school-email verification (you register with a recognized school domain and click an emailed sign-in link).

## Stack

Pure static site (GitHub Pages) — vanilla JS, [Leaflet](https://leafletjs.com) + CARTO tiles, no build step. Layer data lives in `data/*.json`. Chat and email verification run on Firebase's free tier (Auth email-link sign-in + Cloud Firestore), since GitHub Pages can't run a backend.

## Activating the chat (one-time setup, ~10 min)

The site works fully without this; the chat pages show "launching soon" until configured.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (free Spark plan is fine).
2. **Project settings → Your apps → Add web app**, copy the config object into `js/firebase-config.js` (replacing `null`).
3. **Authentication → Sign-in method** → enable **Email link (passwordless sign-in)** under Email/Password.
4. **Authentication → Settings → Authorized domains** → add `torwager.github.io`.
5. **Firestore Database → Create database** (production mode), then paste the contents of `firestore.rules` into **Rules** and publish.
6. Create the server-side domain allowlist — in Firestore, add collection `config`, document `allowlist`, with an array field `domains`. Generate the list from the map data:

   ```bash
   python3 -c "import json; d=json.load(open('data/colleges.json')); print(sorted({x.lower() for p in d['places'] for x in p.get('emailDomains', [])} | {x.lower() for x in d.get('extraDomains', [])}))"
   ```

   (`extraDomains` in `data/colleges.json` holds recognized domains that aren't tied to a Florence college — currently `dartmouth.edu`.)

7. Commit + push `js/firebase-config.js`. (The Firebase web config is safe to publish; access is enforced by the Firestore rules and email verification.)

## Data & curation

Recommendation scores in the study-spot and nightlife layers are synthesized from public review sentiment (Google reviews commentary, Reddit r/florence, student and travel blogs) — each entry keeps its source quotes and links. Lists are deliberately curated: roughly the top 15% of what's out there, not a directory. To update, edit the JSON in `data/` — the site picks it up on the next deploy.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
