/* College in Florence — map application */
(function () {
  "use strict";

  const LAYERS = {
    colleges:   { file: "data/colleges.json",   icon: "🎓", label: "College" },
    studyspots: { file: "data/studyspots.json", icon: "☕", label: "Study Spot" },
    nightlife:  { file: "data/nightlife.json",  icon: "🍷", label: "Eat & Nightlife" },
  };

  const CATEGORY_LABELS = {
    "italian-university": "Italian University",
    "us-study-abroad": "Study-Abroad Campus",
    "art-design-school": "Art & Design School",
    "language-school": "Language School",
    "research-graduate": "Research / Graduate",
    "cafe": "Café",
    "library": "Library",
    "coworking": "Coworking",
    "bookshop-cafe": "Bookshop Café",
    "outdoor": "Outdoor",
    "aperitivo": "Aperitivo",
    "bar-pub": "Bar / Pub",
    "street-food": "Street Food",
    "restaurant": "Restaurant",
    "club": "Club",
    "cocktail": "Cocktail Bar",
    "gelato": "Gelato",
  };

  const map = L.map("map", { zoomControl: false }).setView([43.7715, 11.2558], 14);
  L.control.zoom({ position: "bottomleft" }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map);

  const clusterGroups = {};
  const allPlaces = []; // { layer, place, marker }

  function makeClusterGroup(layerKey) {
    return L.markerClusterGroup({
      maxClusterRadius: 44,
      showCoverageOnHover: false,
      iconCreateFunction: function (cluster) {
        return L.divIcon({
          html: '<div class="cif-cluster m-' + layerKey + '">' + cluster.getChildCount() + "</div>",
          className: "",
          iconSize: [36, 36],
        });
      },
    });
  }

  function makeMarker(layerKey, place) {
    const icon = L.divIcon({
      html: '<div class="cif-marker m-' + layerKey + '">' + LAYERS[layerKey].icon + "</div>",
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -26],
    });
    const marker = L.marker([place.lat, place.lng], { icon });
    const cat = CATEGORY_LABELS[place.category] || place.category || "";
    marker.bindPopup(
      '<div class="popup-mini"><h4>' + esc(place.name) + "</h4>" +
      '<div class="popup-cat">' + esc(cat) +
      (place.recScore ? " · " + place.recScore.toFixed(1) + "/10" : "") +
      '</div><span class="popup-more" data-open="' + esc(place.id) + '">Details →</span></div>'
    );
    marker.on("popupopen", function (e) {
      const el = e.popup.getElement().querySelector(".popup-more");
      if (el) el.addEventListener("click", () => openPanel(layerKey, place));
    });
    return marker;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function scoreColor(score) {
    if (score >= 9) return "#1e6b34";
    if (score >= 8) return "#b98a2f";
    return "#c2611e";
  }

  /* ---------- Detail panel ---------- */

  const panel = document.getElementById("detailPanel");
  const panelContent = document.getElementById("panelContent");
  document.getElementById("panelClose").addEventListener("click", closePanel);

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }

  function openPanel(layerKey, p) {
    let h = "";
    const cat = CATEGORY_LABELS[p.category] || p.category || LAYERS[layerKey].label;
    h += '<span class="panel-kicker k-' + layerKey + '"><span class="dot dot-' + layerKey + '"></span>' + esc(cat) + "</span>";
    h += "<h2>" + esc(p.name) + "</h2>";
    if (p.address) h += '<div class="panel-address">📍 ' + esc(p.address) + "</div>";

    if (typeof p.recScore === "number") {
      h += '<div class="rec-score"><div class="score-num" style="color:' + scoreColor(p.recScore) + '">' + p.recScore.toFixed(1) + "</div>" +
           '<div class="score-meta"><span class="score-label">Student Rec Score</span><br>' +
           esc(p.reviewSummary || "Synthesized from public reviews, Reddit, and student blogs.") + "</div></div>";
    }

    if (p.description) h += '<p class="panel-desc">' + esc(p.description) + "</p>";

    // Colleges: facts + programs
    if (layerKey === "colleges") {
      const facts = [];
      if (p.students) facts.push(["Students", p.students]);
      if (p.founded) facts.push(["In Florence since", p.founded]);
      if (facts.length) {
        h += '<div class="panel-section-title">At a glance</div><div class="fact-grid">';
        facts.forEach(([k, v]) => { h += '<div class="fact"><b>' + esc(k) + "</b>" + esc(v) + "</div>"; });
        h += "</div>";
      }
      if (p.demographics) h += '<div class="panel-section-title">Who studies here</div><p class="panel-desc">' + esc(p.demographics) + "</p>";
      if (p.programs && p.programs.length) {
        h += '<div class="panel-section-title">Programs</div><div class="tag-row">';
        p.programs.slice(0, 12).forEach((pr) => { h += '<span class="tag">' + esc(pr) + "</span>"; });
        h += "</div>";
      }
    }

    // Practical info (study spots / nightlife)
    if (p.practical) {
      const pr = p.practical;
      const facts = [];
      if (pr.price) facts.push(["Price", pr.price]);
      if (pr.hours) facts.push(["Hours", pr.hours]);
      if (pr.wifi !== undefined && pr.wifi !== "unknown") facts.push(["WiFi", pr.wifi === true ? "Yes" : pr.wifi === false ? "No" : pr.wifi]);
      if (pr.outlets) facts.push(["Outlets", pr.outlets === true ? "Yes" : pr.outlets]);
      if (pr.bestFor) facts.push(["Best for", pr.bestFor]);
      if (facts.length) {
        h += '<div class="panel-section-title">Practical</div><div class="fact-grid">';
        facts.forEach(([k, v]) => { h += '<div class="fact"><b>' + esc(k) + "</b>" + esc(v) + "</div>"; });
        h += "</div>";
      }
    }

    if (p.quotes && p.quotes.length) {
      h += '<div class="panel-section-title">What students say</div>';
      p.quotes.forEach((q) => {
        h += '<blockquote class="review-quote">“' + esc(q.text) + "”<cite>— " +
             (q.url ? '<a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.source || "source") + "</a>" : esc(q.source || "source")) +
             "</cite></blockquote>";
      });
    }

    const links = [];
    if (p.links) {
      if (p.links.website) links.push(["Website", p.links.website]);
      if (p.links.maps) links.push(["Google Maps", p.links.maps]);
      if (p.links.instagram) links.push(["Instagram", p.links.instagram]);
      if (Array.isArray(p.links.other)) p.links.other.forEach((o) => { if (o && o.url) links.push([o.label || "Link", o.url]); });
    }
    if (links.length) {
      h += '<div class="panel-section-title">Links</div><div class="panel-links">';
      links.slice(0, 6).forEach(([label, url]) => {
        h += '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + " ↗</a>";
      });
      h += "</div>";
    }

    if (layerKey === "colleges") {
      h += '<a class="chat-cta-inline" href="chat.html?room=' + encodeURIComponent(p.id) + '">💬 Open the ' + esc(p.shortName || p.name) + " chat</a>";
    }

    panelContent.innerHTML = h;
    panelContent.scrollTop = 0;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }

  /* ---------- Layer toggles ---------- */

  document.querySelectorAll(".layer-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.layer;
      chip.classList.toggle("active");
      if (chip.classList.contains("active")) map.addLayer(clusterGroups[key]);
      else map.removeLayer(clusterGroups[key]);
    });
  });

  /* ---------- Search ---------- */

  const searchBox = document.getElementById("searchBox");
  const searchResults = document.getElementById("searchResults");

  searchBox.addEventListener("input", () => {
    const q = searchBox.value.trim().toLowerCase();
    if (q.length < 2) { searchResults.classList.remove("open"); return; }
    const hits = allPlaces.filter((e) =>
      e.place.name.toLowerCase().includes(q) ||
      (e.place.category || "").toLowerCase().includes(q) ||
      (e.place.description || "").toLowerCase().includes(q)
    ).slice(0, 12);
    if (!hits.length) { searchResults.classList.remove("open"); return; }
    searchResults.innerHTML = hits.map((e, i) =>
      '<div class="search-result-item" data-i="' + i + '"><span class="dot dot-' + e.layer + '"></span>' +
      esc(e.place.name) + '<span class="sr-cat">' + esc(CATEGORY_LABELS[e.place.category] || "") + "</span></div>"
    ).join("");
    searchResults.classList.add("open");
    searchResults.querySelectorAll(".search-result-item").forEach((el) => {
      el.addEventListener("click", () => {
        const hit = hits[+el.dataset.i];
        searchResults.classList.remove("open");
        searchBox.value = "";
        focusPlace(hit);
      });
    });
  });

  document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchBox) searchResults.classList.remove("open");
  });

  function focusPlace(entry) {
    const chip = document.querySelector('.layer-chip[data-layer="' + entry.layer + '"]');
    if (chip && !chip.classList.contains("active")) chip.click();
    map.flyTo([entry.place.lat, entry.place.lng], 17, { duration: 0.8 });
    setTimeout(() => {
      clusterGroups[entry.layer].zoomToShowLayer(entry.marker, () => entry.marker.openPopup());
      openPanel(entry.layer, entry.place);
    }, 850);
  }

  /* ---------- Load data ---------- */

  Object.keys(LAYERS).forEach((key) => {
    clusterGroups[key] = makeClusterGroup(key);
    map.addLayer(clusterGroups[key]);
    fetch(LAYERS[key].file)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((data) => {
        const places = (data.places || []).filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
        places.forEach((p) => {
          const marker = makeMarker(key, p);
          marker.on("click", () => openPanel(key, p));
          clusterGroups[key].addLayer(marker);
          allPlaces.push({ layer: key, place: p, marker });
        });
        const countEl = document.getElementById("count-" + key);
        if (countEl) countEl.textContent = "(" + places.length + ")";
      })
      .catch((err) => console.warn("[CiF] could not load layer " + key + ":", err));
  });

  /* ---------- Mobile nav ---------- */
  const burger = document.getElementById("hamburger");
  if (burger) burger.addEventListener("click", () => document.querySelector(".topnav").classList.toggle("open"));

  map.on("click", closePanel);
})();
