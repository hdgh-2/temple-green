(() => {
  const CFG = window.PARTY_CONFIG || {};
  const SCRIPT_URL = (CFG.SCRIPT_URL || "").trim();
  const DEMO = !SCRIPT_URL;
  const DEMO_KEY = "bothy-xmas-demo-responses";
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const disabledDow = new Set(CFG.DISABLED_WEEKDAYS || []);

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── Dates ─────────────────────────────────────────────
  const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const nice = (isoStr) => parse(isoStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const start = parse(CFG.START_DATE || "2026-12-01");
  const end = parse(CFG.END_DATE || "2026-12-23");
  const allDays = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) allDays.push(new Date(d));
  const isOff = (dt) => disabledDow.has(dt.getDay());

  // Build a month-by-month calendar. `cell(dt)` returns an element for each in-range day.
  function renderCalendar(container, cell) {
    container.innerHTML = "";
    const months = [];
    allDays.forEach((dt) => {
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!months.length || months[months.length - 1].key !== key) months.push({ key, y: dt.getFullYear(), m: dt.getMonth(), days: [] });
      months[months.length - 1].days.push(dt);
    });
    months.forEach(({ y, m, days }) => {
      const title = document.createElement("div");
      title.className = "cal-month";
      title.textContent = `${MONTHS[m]} ${y}`;
      const grid = document.createElement("div");
      grid.className = "cal-grid";
      DOW.forEach((d) => { const h = document.createElement("div"); h.className = "cal-dow"; h.textContent = d; grid.appendChild(h); });
      const lead = (days[0].getDay() + 6) % 7; // Monday-first
      for (let i = 0; i < lead; i++) { const b = document.createElement("div"); b.className = "day blank"; grid.appendChild(b); }
      days.forEach((dt) => grid.appendChild(cell(dt)));
      container.append(title, grid);
    });
  }

  // ── Picker ────────────────────────────────────────────
  const picks = {}; // iso -> "yes" | "maybe"
  const NEXT = { undefined: "yes", yes: "maybe", maybe: undefined };

  function drawPicker() {
    renderCalendar($("picker"), (dt) => {
      const key = iso(dt);
      if (isOff(dt)) {
        const el = document.createElement("div");
        el.className = "day off";
        el.title = "Bar Lotus is closed";
        el.textContent = dt.getDate();
        return el;
      }
      const b = document.createElement("button");
      b.type = "button";
      const state = picks[key];
      b.className = "day" + (state ? " " + state : "");
      b.innerHTML = `${dt.getDate()}${state ? `<span class="tag">${state}</span>` : ""}`;
      b.setAttribute("aria-label", `${nice(key)}: ${state || "not selected"}`);
      b.addEventListener("click", () => {
        const n = NEXT[picks[key]];
        if (n) picks[key] = n; else delete picks[key];
        drawPicker();
        const again = $("picker").querySelector(`[data-k="${key}"]`);
        if (again) again.focus();
      });
      b.dataset.k = key;
      return b;
    });
  }

  // ── Data layer ────────────────────────────────────────
  // Each response: { name, yes: [iso], maybe: [iso], note, updated }
  async function loadResponses() {
    if (DEMO) {
      try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); } catch { return []; }
    }
    const res = await fetch(`${SCRIPT_URL}?action=list&t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Unknown error");
    return data.responses || [];
  }

  async function saveResponse(r) {
    if (DEMO) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); } catch {}
      list = list.filter((x) => x.name.trim().toLowerCase() !== r.name.trim().toLowerCase());
      list.push({ ...r, updated: new Date().toISOString() });
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); } catch {}
      return;
    }
    // text/plain avoids a CORS preflight, which Apps Script can't answer.
    const res = await fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(r) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Save failed");
  }

  // ── Group view ────────────────────────────────────────
  let responses = [];

  function drawGroup() {
    const n = responses.length;
    const tally = {};
    allDays.forEach((dt) => (tally[iso(dt)] = { yes: [], maybe: [] }));
    responses.forEach((r) => {
      (r.yes || []).forEach((d) => tally[d] && tally[d].yes.push(r.name));
      (r.maybe || []).forEach((d) => tally[d] && tally[d].maybe.push(r.name));
    });
    const score = (k) => tally[k].yes.length + tally[k].maybe.length * 0.5;

    const ranked = Object.keys(tally)
      .filter((k) => !isOff(parse(k)) && score(k) > 0)
      .sort((a, b) => score(b) - score(a) || tally[b].yes.length - tally[a].yes.length || a.localeCompare(b));
    const topScore = ranked.length ? score(ranked[0]) : 0;
    const bestSet = new Set(ranked.filter((k) => score(k) === topScore));

    $("best").innerHTML = !n
      ? "No responses yet."
      : ranked.length
        ? `<strong>Best so far:</strong> ${ranked.slice(0, 3).map((k) => `${esc(nice(k))} (${tally[k].yes.length} yes${tally[k].maybe.length ? `, ${tally[k].maybe.length} maybe` : ""})`).join(" · ")}`
        : "No dates picked yet.";

    renderCalendar($("heatmap"), (dt) => {
      const k = iso(dt);
      const el = document.createElement("div");
      if (isOff(dt)) { el.className = "day off"; el.textContent = dt.getDate(); return el; }
      const t = tally[k];
      const frac = n ? score(k) / n : 0;
      el.className = "day heat" + (bestSet.has(k) && topScore > 0 ? " best-day" : "");
      // Interpolate white -> deep green
      const mix = (a, b) => Math.round(a + (b - a) * frac);
      el.style.background = `rgb(${mix(255, 31)},${mix(255, 77)},${mix(255, 58)})`;
      el.style.borderColor = frac > 0 ? "transparent" : "";
      el.style.color = frac > 0.5 ? "#fff" : "";
      el.innerHTML = `${dt.getDate()}${t.yes.length || t.maybe.length ? `<span class="cnt">${[t.yes.length ? `${t.yes.length}✓` : "", t.maybe.length ? `${t.maybe.length}?` : ""].filter(Boolean).join(" ")}</span>` : ""}`;
      const lines = [nice(k)];
      if (t.yes.length) lines.push(`Yes: ${t.yes.join(", ")}`);
      if (t.maybe.length) lines.push(`Maybe: ${t.maybe.join(", ")}`);
      el.title = lines.join("\n");
      return el;
    });

    $("resp-count").textContent = n;
    $("resp-list").innerHTML = responses
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => {
        const yes = (r.yes || []).map(nice).join(", ");
        const maybe = (r.maybe || []).map(nice).join(", ");
        return `<li><span class="who">${esc(r.name)}</span><br>
          ${yes ? `<span class="muted">Yes:</span> ${esc(yes)}<br>` : ""}
          ${maybe ? `<span class="muted">Maybe:</span> ${esc(maybe)}<br>` : ""}
          ${r.note ? `<span class="muted">Note:</span> ${esc(r.note)}` : ""}</li>`;
      })
      .join("");
  }

  async function refresh() {
    $("best").textContent = "Loading…";
    try {
      responses = await loadResponses();
      drawGroup();
    } catch (e) {
      console.error(e);
      $("best").textContent = "Couldn't load responses right now. Try Refresh in a moment.";
    }
  }

  // Pre-fill your previous answer when you type your name
  function prefillFromName() {
    const name = $("name").value.trim().toLowerCase();
    const mine = responses.find((r) => r.name.trim().toLowerCase() === name);
    if (!mine) return;
    Object.keys(picks).forEach((k) => delete picks[k]);
    (mine.yes || []).forEach((d) => (picks[d] = "yes"));
    (mine.maybe || []).forEach((d) => (picks[d] = "maybe"));
    if (mine.note && !$("note").value) $("note").value = mine.note;
    drawPicker();
    setStatus(`Loaded your previous answer, ${mine.name}. Change it and resubmit.`, "");
  }

  function setStatus(msg, cls) {
    const s = $("form-status");
    s.textContent = msg;
    s.className = "status" + (cls ? " " + cls : "");
  }

  $("avail-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("name").value.trim();
    if (!name) { setStatus("Please add your name.", "err"); $("name").focus(); return; }
    const yes = Object.keys(picks).filter((k) => picks[k] === "yes").sort();
    const maybe = Object.keys(picks).filter((k) => picks[k] === "maybe").sort();
    if (!yes.length && !maybe.length && !confirm("You haven't picked any dates. Submit anyway (i.e. you can't make any of them)?")) return;

    const btn = $("submit-btn");
    btn.disabled = true;
    setStatus("Saving…", "");
    try {
      await saveResponse({ name, yes, maybe, note: $("note").value.trim() });
      try { localStorage.setItem("bothy-xmas-name", name); } catch {}
      setStatus(`Thanks ${name}! Your availability has been saved.`, "ok");
      await refresh();
    } catch (err) {
      console.error(err);
      setStatus("Sorry, that didn't save. Please try again.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  $("name").addEventListener("change", prefillFromName);
  $("refresh-btn").addEventListener("click", refresh);

  // ── Map ───────────────────────────────────────────────
  function drawMap() {
    if (!window.L) return;
    const lotus = [51.5458, -0.0757];
    const lex = [51.5318, -0.1112];
    const map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const pin = (bg) => L.divIcon({
      className: "",
      html: `<div style="background:${bg};width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10],
    });
    L.marker(lotus, { icon: pin("#1f4d3a") }).addTo(map)
      .bindPopup("<strong>Bar Lotus</strong><br>480 Kingsland Rd, E8 4AE<br>Tasting").openPopup();
    L.marker(lex, { icon: pin("#62676c") }).addTo(map)
      .bindPopup("<strong>The Lexington</strong><br>96–98 Pentonville Rd, N1 9JB<br>Afterwards");
    L.polyline([lotus, lex], { color: "#62676c", weight: 2, dashArray: "4 6" }).addTo(map);
    map.fitBounds([lotus, lex], { padding: [50, 50] });
  }

  // ── Init ──────────────────────────────────────────────
  if (DEMO) $("demo-banner").hidden = false;
  try { const n = localStorage.getItem("bothy-xmas-name"); if (n) $("name").value = n; } catch {}
  drawPicker();
  refresh().then(() => { if ($("name").value) prefillFromName(); });
  drawMap();
})();
