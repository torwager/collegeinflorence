/* College in Florence — verified student chat (Firebase Auth + Firestore) */
(function () {
  "use strict";

  const roomList = document.getElementById("roomList");
  const roomTitle = document.getElementById("roomTitle");
  const messagesEl = document.getElementById("messages");
  const gate = document.getElementById("gate");
  const inputRow = document.getElementById("inputRow");
  const msgInput = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");
  const whoami = document.getElementById("whoami");

  let db = null;
  let unsubscribe = null;
  let currentRoom = new URLSearchParams(location.search).get("room") || "all";
  let user = null;
  let schools = [];
  let allDomains = new Set();

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- Rooms sidebar (from map data) ---------- */

  fetch("data/colleges.json")
    .then((r) => r.json())
    .then((data) => {
      schools = (data.places || []).map((p) => ({
        id: p.id, name: p.shortName || p.name, emailDomains: p.emailDomains || [],
      }));
      schools.forEach((s) => s.emailDomains.forEach((d) => allDomains.add(d.toLowerCase())));
      renderRooms();
    })
    .catch(() => {});

  function renderRooms() {
    let h = "<h3>Rooms</h3>";
    h += roomButton("all", "🏛️ Piazza — All Schools");
    h += "<h3>Schools</h3>";
    schools.forEach((s) => { h += roomButton(s.id, s.name); });
    roomList.innerHTML = h;
    roomList.querySelectorAll(".room-item").forEach((btn) => {
      btn.addEventListener("click", () => switchRoom(btn.dataset.room));
    });
  }

  function roomButton(id, label) {
    return '<button class="room-item' + (id === currentRoom ? " active" : "") + '" data-room="' + esc(id) + '">' + esc(label) + "</button>";
  }

  function roomName(id) {
    if (id === "all") return "Piazza — All Schools";
    const s = schools.find((x) => x.id === id);
    return s ? s.name : id;
  }

  function switchRoom(id) {
    currentRoom = id;
    roomTitle.textContent = roomName(id);
    roomList.querySelectorAll(".room-item").forEach((b) => b.classList.toggle("active", b.dataset.room === id));
    history.replaceState(null, "", "chat.html?room=" + encodeURIComponent(id));
    if (user) listenToRoom(id);
  }

  /* ---------- Firebase not configured yet ---------- */

  if (!window.CIF_FIREBASE_CONFIG) {
    gate.innerHTML =
      '<div class="gate-icon">🚧</div>' +
      '<h2 style="font-family:var(--font-display); margin-bottom:0.5rem">Chat is launching soon</h2>' +
      '<p style="color:var(--ink-soft); max-width:420px; margin:0 auto 1.2rem; line-height:1.6">' +
      "The verified student chat is being set up. You'll be able to sign in with your school email " +
      "and talk to students across every college in Florence. In the meantime, explore the map!</p>" +
      '<a class="btn" href="index.html">Back to the map</a>';
    roomTitle.textContent = roomName(currentRoom);
    return;
  }

  /* ---------- Auth ---------- */

  firebase.initializeApp(window.CIF_FIREBASE_CONFIG);
  const auth = firebase.auth();
  db = firebase.firestore();

  // Complete email-link sign-in if we arrived from the verification email.
  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = localStorage.getItem("cif_email");
    if (!email) email = window.prompt("Confirm your school email address to finish signing in:");
    auth.signInWithEmailLink(email, window.location.href)
      .then(() => { history.replaceState(null, "", "chat.html?room=" + encodeURIComponent(currentRoom)); })
      .catch((err) => {
        gate.innerHTML = '<div class="gate-icon">⚠️</div><p class="notice err">Sign-in failed: ' + esc(err.message) +
          '</p><a class="btn" href="register.html">Try registering again</a>';
      });
  }

  function emailDomain(email) {
    const at = email.lastIndexOf("@");
    return at === -1 ? "" : email.slice(at + 1).toLowerCase();
  }

  function domainRecognized(domain) {
    if (allDomains.has(domain)) return true;
    for (const d of allDomains) if (domain.endsWith("." + d)) return true;
    return false;
  }

  auth.onAuthStateChanged((u) => {
    if (!u) return; // stay gated
    // Access control: the signed-in email's domain must be on the recognized list.
    const check = () => {
      const domain = emailDomain(u.email || "");
      if (allDomains.size && !domainRecognized(domain)) {
        gate.innerHTML = '<div class="gate-icon">🚫</div><p class="notice err">Your account (' + esc(u.email) +
          ") isn't from a recognized school domain.</p>";
        return;
      }
      user = u;
      gate.style.display = "none";
      inputRow.style.display = "flex";
      whoami.innerHTML = esc(localStorage.getItem("cif_name") || u.email) +
        ' · <button id="signOut">sign out</button>';
      document.getElementById("signOut").addEventListener("click", () => {
        auth.signOut().then(() => location.reload());
      });
      listenToRoom(currentRoom);
    };
    // school list may still be loading
    if (schools.length) check(); else setTimeout(check, 1200);
  });

  /* ---------- Messages ---------- */

  function listenToRoom(roomId) {
    if (unsubscribe) unsubscribe();
    messagesEl.innerHTML = "";
    unsubscribe = db.collection("rooms").doc(roomId).collection("messages")
      .orderBy("ts", "desc").limit(80)
      .onSnapshot((snap) => {
        const msgs = [];
        snap.forEach((doc) => msgs.push(doc.data()));
        msgs.reverse();
        messagesEl.innerHTML = msgs.map((m) => {
          const mine = user && m.uid === user.uid;
          const when = m.ts && m.ts.toDate ? m.ts.toDate().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
          return '<div class="msg' + (mine ? " mine" : "") + '"><div class="msg-meta">' +
            esc(m.name || "student") + (m.school ? " · " + esc(m.school) : "") + (when ? " · " + when : "") +
            '</div><div class="msg-bubble">' + esc(m.text) + "</div></div>";
        }).join("");
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }, (err) => {
        messagesEl.innerHTML = '<p class="notice err" style="margin:1rem">Could not load messages: ' + esc(err.message) + "</p>";
      });
  }

  function send() {
    const text = msgInput.value.trim();
    if (!text || !user) return;
    msgInput.value = "";
    db.collection("rooms").doc(currentRoom).collection("messages").add({
      text: text,
      uid: user.uid,
      email: user.email,
      name: localStorage.getItem("cif_name") || (user.email || "").split("@")[0],
      school: roomNameForEmail(user.email),
      ts: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch((err) => alert("Could not send: " + err.message));
  }

  function roomNameForEmail(email) {
    const domain = emailDomain(email || "");
    const s = schools.find((x) => x.emailDomains.some((d) =>
      domain === d.toLowerCase() || domain.endsWith("." + d.toLowerCase())));
    return s ? s.name : "";
  }

  sendBtn.addEventListener("click", send);
  msgInput.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  roomTitle.textContent = roomName(currentRoom);
})();
