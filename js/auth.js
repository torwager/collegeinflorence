/* College in Florence — registration with school-domain allowlist + email-link verification */
(function () {
  "use strict";

  const statusArea = document.getElementById("statusArea");
  const schoolSelect = document.getElementById("regSchool");
  const emailInput = document.getElementById("regEmail");
  const nameInput = document.getElementById("regName");
  const submitBtn = document.getElementById("regSubmit");
  const domainHint = document.getElementById("domainHint");

  let schools = [];        // [{id, name, emailDomains}]
  let allDomains = new Set();

  function notice(kind, html) {
    statusArea.innerHTML = '<div class="notice ' + kind + '">' + html + "</div>";
  }

  /* Load the school list (also the access-control list) from the map data. */
  fetch("data/colleges.json")
    .then((r) => r.json())
    .then((data) => {
      schools = (data.places || []).map((p) => ({
        id: p.id,
        name: p.name,
        emailDomains: p.emailDomains || [],
      }));
      schoolSelect.innerHTML = '<option value="">Select your school…</option>' +
        schools.map((s) => '<option value="' + s.id + '">' + s.name + "</option>").join("") +
        '<option value="visiting">Visiting / other recognized school</option>';
      schools.forEach((s) => s.emailDomains.forEach((d) => allDomains.add(d.toLowerCase())));
      (data.extraDomains || []).forEach((d) => allDomains.add(d.toLowerCase()));
    })
    .catch(() => {
      schoolSelect.innerHTML = '<option value="">Could not load school list</option>';
    });

  schoolSelect.addEventListener("change", () => {
    const s = schools.find((x) => x.id === schoolSelect.value);
    if (s && s.emailDomains.length) {
      domainHint.textContent = "Recognized domains for " + s.name + ": " + s.emailDomains.map((d) => "@" + d).join(", ");
    } else {
      domainHint.textContent = "Must match a recognized school domain.";
    }
  });

  function emailDomain(email) {
    const at = email.lastIndexOf("@");
    return at === -1 ? "" : email.slice(at + 1).toLowerCase();
  }

  function domainRecognized(domain) {
    // exact match, or subdomain of a recognized domain (e.g. stern.nyu.edu → nyu.edu)
    if (allDomains.has(domain)) return true;
    for (const d of allDomains) if (domain.endsWith("." + d)) return true;
    return false;
  }

  submitBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const schoolId = schoolSelect.value;
    const email = emailInput.value.trim().toLowerCase();

    if (!name) return notice("err", "Please choose a display name.");
    if (!schoolId) return notice("err", "Please select your school.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notice("err", "That doesn't look like a valid email address.");

    const domain = emailDomain(email);
    if (!domainRecognized(domain)) {
      return notice("err", "<strong>@" + domain + "</strong> isn't on our list of recognized school domains. The chat is limited to verified students and staff of the colleges on the map. If your school's domain is missing, let us know via GitHub.");
    }

    if (!window.CIF_FIREBASE_CONFIG) {
      return notice("info", "✅ Your email domain <strong>@" + domain + "</strong> is recognized! Chat is <strong>launching soon</strong> — verification emails aren't being sent yet. Check back shortly.");
    }

    if (!firebase.apps.length) firebase.initializeApp(window.CIF_FIREBASE_CONFIG);

    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname.replace(/register\.html$/, "chat.html"),
      handleCodeInApp: true,
    };

    submitBtn.disabled = true;
    firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
      .then(() => {
        localStorage.setItem("cif_email", email);
        localStorage.setItem("cif_name", name);
        localStorage.setItem("cif_school", schoolId);
        notice("ok", "📬 <strong>Check your inbox.</strong> We sent a verification link to <strong>" + email + "</strong>. Click it to finish registration and open the chat. (Look in spam if you don't see it within a minute.)");
      })
      .catch((err) => {
        notice("err", "Could not send the verification email: " + err.message);
      })
      .finally(() => { submitBtn.disabled = false; });
  });
})();
