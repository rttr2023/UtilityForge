/* UtilityForge — app.js
   Premium = license key (COOKIE), Stripe = Payment Link / Buy Button (sur premium.html)
   -> aucun “mode test”, aucun toggle premium.
*/

const COOKIE_PREMIUM = "uf_premium";
const COOKIE_KEY = "uf_key";

function qs(id){ return document.getElementById(id); }

function toast(msg){
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "18px";
  t.style.transform = "translateX(-50%)";
  t.style.background = "rgba(15,19,32,.92)";
  t.style.border = "1px solid rgba(255,255,255,.12)";
  t.style.color = "#eef2ff";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "999px";
  t.style.zIndex = "9999";
  t.style.boxShadow = "0 18px 50px rgba(0,0,0,.45)";
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 1600);
}

/* ===== Cookies ===== */
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
}
function getCookie(name) {
  const n = encodeURIComponent(name) + "=";
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(n)) return decodeURIComponent(p.slice(n.length));
  }
  return "";
}
function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
}

/* ===== Premium ===== */
function isPremium(){
  return getCookie(COOKIE_PREMIUM) === "1";
}
function setPremium(active, key = ""){
  if(active){
    setCookie(COOKIE_PREMIUM, "1", 365);
    if(key) setCookie(COOKIE_KEY, key, 365);
  } else {
    deleteCookie(COOKIE_PREMIUM);
    deleteCookie(COOKIE_KEY);
  }
}

function updatePremiumBadge(){
  const b = qs("premiumBadge");
  if(!b) return;
  const on = isPremium();
  b.textContent = on ? "Premium activé" : "Premium";
  b.style.borderColor = on ? "rgba(34,211,238,.45)" : "rgba(255,255,255,.12)";
  b.style.background = on ? "rgba(34,211,238,.10)" : "rgba(255,255,255,.06)";
}

/* ===== Utils ===== */
function copyText(text){
  navigator.clipboard.writeText(text)
    .then(()=> toast("Copié ✅"))
    .catch(()=> toast("Copie impossible"));
}

function urlWithParams(base, params){
  const u = new URL(base);
  Object.entries(params).forEach(([k,v])=>{
    if(v && String(v).trim() !== "") u.searchParams.set(k, String(v).trim());
  });
  return u.toString();
}

/* ===== Modal helper ===== */
function modalOpen(title, html){
  const m = qs("modal");
  const t = qs("modalTitle");
  const b = qs("modalBody");
  if(!m || !t || !b) return;
  t.textContent = title;
  b.innerHTML = html;
  m.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";

  const close = ()=> modalClose();
  qs("modalClose")?.addEventListener("click", close, {once:true});
  m.addEventListener("click", (e)=>{ if(e.target === m) modalClose(); }, {once:true});
}
function modalClose(){
  const m = qs("modal");
  if(!m) return;
  m.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

/* ===== Premium gating ===== */
function requirePremiumOrUpsell(featureName){
  if(isPremium()) return true;

  modalOpen("Accès Premium requis", `
    <p class="muted">La fonctionnalité <strong>${featureName}</strong> est disponible avec l’accès Premium.</p>
    <div class="row">
      <a class="btn" href="premium.html">Voir Premium</a>
      <button class="btn ghost" id="closeUpsell">Fermer</button>
    </div>
  `);

  document.getElementById("closeUpsell")?.addEventListener("click", modalClose, {once:true});
  return false;
}

/* ===== Tools init ===== */
function initUTM(){
  const make = qs("utm_make");
  const copy = qs("utm_copy");
  const out = qs("utm_out");
  if(!make || !copy || !out) return;

  make.addEventListener("click", ()=>{
    const base = (qs("utm_url")?.value || "").trim();
    if(!base) return toast("Mets une URL");
    try{
      const url = urlWithParams(base, {
        utm_source: qs("utm_source")?.value,
        utm_medium: qs("utm_medium")?.value,
        utm_campaign: qs("utm_campaign")?.value,
        utm_content: qs("utm_content")?.value,
        utm_term: qs("utm_term")?.value
      });
      out.value = url;
    } catch(e){
      toast("URL invalide");
    }
  });

  copy.addEventListener("click", ()=> copyText(out.value || ""));

  qs("utm_bulk_open")?.addEventListener("click", ()=>{
    if(!requirePremiumOrUpsell("UTM Bulk + Export CSV")) return;

    modalOpen("UTM Bulk", `
      <p class="muted">Colle une ligne par UTM. Format CSV : <code>url,source,medium,campaign,content,term</code></p>
      <textarea id="bulk_in" rows="8" placeholder="https://site.com, tiktok, organic, lancement_v1, hook1, keyword"></textarea>
      <div class="row">
        <button class="btn small" id="bulk_gen">Générer</button>
        <button class="btn small ghost" id="bulk_csv">Télécharger CSV</button>
      </div>
      <textarea id="bulk_out" rows="8" readonly placeholder="Résultats…"></textarea>
    `);

    const inEl = document.getElementById("bulk_in");
    const outEl = document.getElementById("bulk_out");
    let lastRows = [];

    document.getElementById("bulk_gen")?.addEventListener("click", ()=>{
      const lines = (inEl.value || "").split("\n").map(l=>l.trim()).filter(Boolean);
      const results = [];
      lastRows = [];

      for(const line of lines){
        const parts = line.split(",").map(s=>s.trim());
        const [url, source, medium, campaign, content, term] = parts;
        if(!url) continue;

        try{
          const final = urlWithParams(url, {
            utm_source: source,
            utm_medium: medium,
            utm_campaign: campaign,
            utm_content: content,
            utm_term: term
          });
          results.push(final);
          lastRows.push({url, source, medium, campaign, content, term, final});
        } catch(e){}
      }

      outEl.value = results.join("\n");
    });

    document.getElementById("bulk_csv")?.addEventListener("click", ()=>{
      if(!lastRows.length) return toast("Génère d’abord");
      const header = ["url","utm_source","utm_medium","utm_campaign","utm_content","utm_term","final_url"];
      const rows = [header.join(",")].concat(
        lastRows.map(r=>[
          r.url, r.source, r.medium, r.campaign, r.content, r.term, r.final
        ].map(v => `"${String(v||"").replaceAll('"','""')}"`).join(","))
      );
      downloadText("utm_bulk.csv", rows.join("\n"));
    });
  });
}

function initPassword(){
  const make = qs("pw_make");
  const copy = qs("pw_copy");
  const out = qs("pw_out");
  if(!make || !copy || !out) return;

  function gen(){
    const len = Math.max(8, Math.min(64, parseInt(qs("pw_len")?.value || "16", 10)));
    const mode = qs("pw_mode")?.value || "mix";

    if(mode === "words"){
      const words = ["alpha","bravo","cobalt","delta","ember","forge","neon","orbit","pixel","quantum","river","solace","titan","velvet","zenith"];
      const pick = ()=> words[Math.floor(Math.random()*words.length)];
      const n = Math.max(3, Math.min(6, Math.round(len/6)));
      const nums = String(Math.floor(100 + Math.random()*900));
      return Array.from({length:n}, pick).join("-") + "-" + nums;
    }

    const sets = {
      alnum: "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
      mix: "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{};:,.?"
    };
    const chars = sets[mode] || sets.mix;
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let s="";
    for(let i=0;i<len;i++) s += chars[arr[i] % chars.length];
    return s;
  }

  make.addEventListener("click", ()=>{ out.value = gen(); });
  copy.addEventListener("click", ()=> copyText(out.value || ""));

  qs("pw_bulk_open")?.addEventListener("click", ()=>{
    if(!requirePremiumOrUpsell("Passwords Bulk + Export CSV")) return;

    modalOpen("Passwords Bulk", `
      <p class="muted">Génère une liste et télécharge en CSV.</p>
      <div class="grid2">
        <label>Quantité
          <input id="pw_q" type="number" value="50" min="10" max="500">
        </label>
        <label>Mode
          <select id="pw_m">
            <option value="mix">Mix</option>
            <option value="alnum">Alnum</option>
            <option value="words">Passphrase</option>
          </select>
        </label>
      </div>
      <div class="row">
        <button class="btn small" id="pw_bulk_gen">Générer</button>
        <button class="btn small ghost" id="pw_bulk_csv">Télécharger CSV</button>
      </div>
      <textarea id="pw_bulk_out" rows="10" readonly></textarea>
    `);

    let list = [];
    const outEl = document.getElementById("pw_bulk_out");

    document.getElementById("pw_bulk_gen")?.addEventListener("click", ()=>{
      const q = Math.max(10, Math.min(500, parseInt(document.getElementById("pw_q").value || "50", 10)));
      const mode = document.getElementById("pw_m").value;

      const oldMode = qs("pw_mode")?.value || "mix";
      qs("pw_mode").value = mode;

      list = Array.from({length:q}, gen);

      qs("pw_mode").value = oldMode;
      outEl.value = list.join("\n");
    });

    document.getElementById("pw_bulk_csv")?.addEventListener("click", ()=>{
      if(!list.length) return toast("Génère d’abord");
      const rows = ["password"].concat(list.map(p=> `"${p.replaceAll('"','""')}"`));
      downloadText("passwords.csv", rows.join("\n"));
    });
  });
}

function initJSONTool(){
  const inp = qs("json_in");
  if(!inp) return;

  function setStatus(ok, msg){
    const s = qs("json_status");
    if(!s) return;
    s.textContent = ok ? `✅ ${msg}` : `❌ ${msg}`;
  }

  qs("json_beautify")?.addEventListener("click", ()=>{
    try{
      const obj = JSON.parse(inp.value);
      inp.value = JSON.stringify(obj, null, 2);
      setStatus(true, "JSON valide");
    }catch(e){
      setStatus(false, "JSON invalide");
    }
  });

  qs("json_minify")?.addEventListener("click", ()=>{
    try{
      const obj = JSON.parse(inp.value);
      inp.value = JSON.stringify(obj);
      setStatus(true, "Minify OK");
    }catch(e){
      setStatus(false, "JSON invalide");
    }
  });

  qs("json_copy")?.addEventListener("click", ()=> copyText(inp.value || ""));
}

function initInvoice(){
  const make = qs("inv_make");
  const copy = qs("inv_copy");
  const out = qs("inv_out");
  if(!make || !copy || !out) return;

  // date default today
  const d = new Date();
  const iso = d.toISOString().slice(0,10);
  if(qs("inv_date") && !qs("inv_date").value) qs("inv_date").value = iso;

  function render(){
    const from = qs("inv_from")?.value || "";
    const to = qs("inv_to")?.value || "";
    const no = qs("inv_no")?.value || "";
    const date = qs("inv_date")?.value || "";
    const desc = qs("inv_desc")?.value || "";
    const amt = qs("inv_amount")?.value || "";
    const total = Number(amt || 0).toFixed(2);

    return `FACTURE ${no}
Date: ${date}

De:
${from}

À:
${to}

Description:
${desc}

Total: ${total} EUR
Merci.`;
  }

  make.addEventListener("click", ()=>{ out.value = render(); });
  copy.addEventListener("click", ()=> copyText(out.value || ""));

  qs("inv_pdf")?.addEventListener("click", ()=>{
    if(!requirePremiumOrUpsell("Export PDF Facture")) return;

    const text = render();
    out.value = text;

    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) return toast("Export PDF indisponible (jsPDF)");

    const doc = new jsPDF({unit:"pt", format:"a4"});
    const margin = 40;
    const width = doc.internal.pageSize.getWidth() - margin*2;

    doc.setFont("helvetica","bold");
    doc.setFontSize(18);
    doc.text("FACTURE", margin, 60);

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, margin, 90);

    const safeNo = (qs("inv_no")?.value || "facture").replace(/[^\w\-]+/g,"_");
    doc.save(`${safeNo}.pdf`);
  });
}

function initPalette(){
  const grid = qs("pal_grid");
  if(!grid) return;

  let current = [];

  function randHex(){
    const a = new Uint8Array(3);
    crypto.getRandomValues(a);
    return "#" + Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
  }

  function make(){
    current = Array.from({length:5}, randHex);
    grid.innerHTML = "";
    current.forEach(hex=>{
      const d = document.createElement("div");
      d.className = "swatch";
      d.style.background = hex;
      d.innerHTML = `<span>${hex}</span>`;
      d.addEventListener("click", ()=> copyText(hex));
      grid.appendChild(d);
    });
  }

  qs("pal_make")?.addEventListener("click", make);
  qs("pal_copy")?.addEventListener("click", ()=> copyText(current.join(", ")));

  qs("pal_export_css")?.addEventListener("click", ()=>{
    if(!requirePremiumOrUpsell("Export CSS variables")) return;
    if(!current.length) make();

    const css = `:root{
  --c1:${current[0]};
  --c2:${current[1]};
  --c3:${current[2]};
  --c4:${current[3]};
  --c5:${current[4]};
}`;

    downloadText("palette.css", css);
  });

  make();
}

/* ===== Download helper ===== */
function downloadText(filename, content){
  const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(a.href), 500);
}

/* ===== Footer year ===== */
function initFooterYear(){
  const y = qs("y");
  if(y) y.textContent = String(new Date().getFullYear());
}

/* ===== Boot ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  updatePremiumBadge();
  initFooterYear();
  initUTM();
  initPassword();
  initJSONTool();
  initInvoice();
  initPalette();
});
