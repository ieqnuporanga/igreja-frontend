  <script>
    console.log("Paz do senhor, o que você está fazendo aqui no console?? kkkkkk");
    const SHEET_ID = "1B8jnN0rSlNGtnyhR_kvGBvcNzyNPvDVnsltB4nhph30";
    const SHEET_TABS_TRY = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const UPCOMING_LIMIT = 6;

	function escapeHTML(str){
	  return String(str ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
	}


    function parseBRDayMonthToDate(ddmm){
      const s = String(ddmm || "").trim();
      const m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
      if(!m) return null;

      const day = Number(m[1]);
      const month = Number(m[2]);
      if(!(day>=1 && day<=31 && month>=1 && month<=12)) return null;

      const now = new Date();
      let year = now.getFullYear();

      let d = new Date(year, month-1, day, 0, 0, 0, 0);

      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if(now.getTime() - d.getTime() > thirtyDays){
        year = year + 1;
        d = new Date(year, month-1, day, 0, 0, 0, 0);
      }

      return d;
    }

    function startOfToday(){
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0, 0);
    }

    function formatBRShort(d){
      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
      const dd = String(d.getDate()).padStart(2,"0");
      const mm = String(d.getMonth()+1).padStart(2,"0");
      return `${dias[d.getDay()]} • ${dd}/${mm}`;
    }

    function buildGvizUrlBySheetName(sheetName){
      const qs = new URLSearchParams({ tqx: "out:json", sheet: sheetName });
      return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${qs.toString()}`;
    }

    function parseGviz(text){
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if(start === -1 || end === -1) throw new Error("Resposta GViz inválida");
      const json = text.slice(start, end + 1);
      return JSON.parse(json);
    }

    function gvizToObjects(gviz){
      const table = gviz && gviz.table;
      if(!table || !Array.isArray(table.cols) || !Array.isArray(table.rows)) return [];

      const headers = table.cols.map(c => (c && (c.label || c.id)) ? String(c.label || c.id) : "");
      const out = [];

      for(const r of table.rows){
        const row = {};
        const cells = (r && Array.isArray(r.c)) ? r.c : [];
        for(let i=0;i<headers.length;i++){
          const key = headers[i] || ("col" + i);
          const cell = cells[i];
          row[key] = cell ? (cell.f ?? cell.v ?? "") : "";
        }
        out.push(row);
      }
      return out;
    }

    async function fetchGvizSheet(sheetName){
      const url = buildGvizUrlBySheetName(sheetName);
      const res = await fetch(url, { cache: "no-store" });
      if(!res.ok) throw new Error("HTTP " + res.status);
      const txt = await res.text();
      const gviz = parseGviz(txt);
      return gvizToObjects(gviz);
    }

    async function fetchJsonTrySheets(sheetNames){
      let lastErr = null;
      for(const name of sheetNames){
        try{
          const rows = await fetchGvizSheet(name);
          if(Array.isArray(rows)) return rows;
        }catch(e){
          lastErr = e;
        }
      }
      throw lastErr || new Error("Falha ao carregar a planilha.");
    }

    function getValSmart(r, keys){
      for(const k of keys){
        if(r && Object.prototype.hasOwnProperty.call(r, k)) return r[k];
      }
      const map = {};
      for(const kk of Object.keys(r || {})){
        map[String(kk).toLowerCase()] = kk;
      }
      for(const k of keys){
        const hit = map[String(k).toLowerCase()];
        if(hit) return r[hit];
      }
      return undefined;
    }

    function monthTabNameFromDate(d){
      const months = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
      return months[d.getMonth()];
    }

    function monthLabelPt(d){
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      return months[d.getMonth()];
    }

    async function loadUpcomingSchedule(){
      const rows = await fetchJsonTrySheets(SHEET_TABS_TRY);
      const today = startOfToday().getTime();

      const parsed = (rows || []).map(r=>{
        const dataTxt = getValSmart(r, ["Data","data","DATA"]);
        const evento = getValSmart(r, ["Evento","evento","EVENTO"]);
        const horario = getValSmart(r, ["Horário","Horario","horario","HORÁRIO","HORARIO"]);
        const obs = getValSmart(r, ["Observações","Observacoes","obs","observacoes","OBS","OBSERVACOES","OBSERVAÇÕES"]);
        const date = parseBRDayMonthToDate(dataTxt);
        return { date, evento, horario, obs };
      }).filter(x => x.date);

      const upcoming = parsed
        .filter(x => x.date.getTime() >= today)
        .sort((a,b)=> a.date - b.date)
        .slice(0, UPCOMING_LIMIT);

      return upcoming;
    }

    function renderUpcomingHTML(items){
      if(!items || !items.length){
        return `<div style="opacity:.9">📌 Nenhum evento futuro encontrado na planilha.</div>`;
      }

      const lines = items.map(it=>{
        const when = formatBRShort(it.date);
        const evento = escapeHTML(it.evento || "Evento");
        const hora = (it.horario || "").trim();
        const obs = (it.obs || "").trim();

        const horaHTML = hora ? ` <span style="opacity:.9">• ${escapeHTML(hora)}</span>` : "";
        const obsHTML = obs ? `<div style="opacity:.82; font-size:13px; margin-top:4px">${escapeHTML(obs)}</div>` : "";

        return `
          <div style="padding:10px 0; border-top:1px solid rgba(255,255,255,.10)">
            <div style="font-weight:950; letter-spacing:-.2px">
              ${escapeHTML(when)}${horaHTML}
            </div>
            <div style="opacity:.92">${evento}</div>
            ${obsHTML}
          </div>
        `;
      }).join("");

      return `
        <div style="font-weight:950; margin-bottom:8px">📅 Agenda da Semana</div>
        <div style="opacity:.85; font-size:13px; margin-top:-6px; margin-bottom:6px">Póximos 6 compromissos da agenda mensal.</div>
        <div style="border-top:1px solid rgba(255,255,255,.10)">${lines}</div>
      `;
    }

    async function loadMonthScheduleAll(){
      const now = new Date();
      const tab = monthTabNameFromDate(now);
      const rows = await fetchJsonTrySheets([tab, ...SHEET_TABS_TRY]);
      const parsed = (rows || []).map(r=>{
        const dataTxt = getValSmart(r, ["Data","data","DATA"]);
        const evento = getValSmart(r, ["Evento","evento","EVENTO"]);
        const horario = getValSmart(r, ["Horário","Horario","horario","HORÁRIO","HORARIO"]);
        const obs = getValSmart(r, ["Observações","Observacoes","obs","observacoes","OBS","OBSERVACOES","OBSERVAÇÕES"]);
        const date = parseBRDayMonthToDate(dataTxt);
        return { date, evento, horario, obs };
      }).filter(x => x.date);

      const m = now.getMonth();
      const y = now.getFullYear();

      const monthItems = parsed.filter(it => it.date.getMonth() === m && it.date.getFullYear() === y)
        .sort((a,b)=> a.date - b.date);

      return { items: monthItems, monthLabel: monthLabelPt(now) };
    }

    function renderMonthList(items){
      if(!items || !items.length){
        return `<div class="muted" style="opacity:.92">Nenhum evento encontrado para este mês.</div>`;
      }
      return items.map(it=>{
        const when = formatBRShort(it.date);
        const evento = escapeHTML(it.evento || "Evento");
        const hora = (it.horario || "").trim();
        const obs = (it.obs || "").trim();

        const horaHTML = hora ? ` <span style="opacity:.9">• ${escapeHTML(hora)}</span>` : "";
        const obsHTML = obs ? `<div class="eventsObs">${escapeHTML(obs)}</div>` : "";

        return `
          <div class="eventsItem">
            <div class="eventsWhen">${escapeHTML(when)}${horaHTML}</div>
            <div class="eventsTitle">${evento}</div>
            ${obsHTML}
          </div>
        `;
      }).join("");
    }

    const PIX_KEY = "ieqnuporanga@gmail.com";
    const PIX_NAME = "Igreja do Evangelho Quadrangular";
    const PIX_QR_IMAGE_URL = "https://i.imgur.com/I5xVAmH.jpeg";

    const yearEl = document.getElementById("year");
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    function syncHeader(){
      if (window.scrollY > 18) document.body.classList.add("scrolled");
      else document.body.classList.remove("scrolled");
    }
    window.addEventListener("scroll", syncHeader, {passive:true});
    syncHeader();

    const menuBtn = document.getElementById("menuBtn");
    const closeBtn = document.getElementById("closeBtn");
    const backdrop = document.getElementById("backdrop");

    // lockScroll seguro (contador)
    let scrollLocks = 0;
    function lockScroll(on){
      scrollLocks += on ? 1 : -1;
      scrollLocks = Math.max(0, scrollLocks);
      document.body.style.overflow = scrollLocks > 0 ? "hidden" : "";
    }

    function openMenu(){ document.body.classList.add("menuOpen"); lockScroll(true); }
    function closeMenu(){ document.body.classList.remove("menuOpen"); lockScroll(false); }

    if(menuBtn) menuBtn.addEventListener("click", openMenu);
    if(closeBtn) closeBtn.addEventListener("click", closeMenu);
    if(backdrop) backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeMenu(); });

    function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
    function smoothScrollTo(targetY, duration=780){
      const startY = window.scrollY;
      const diff = targetY - startY;
      const start = performance.now();
      function step(now){
        const t = Math.min(1, (now - start)/duration);
        const eased = easeInOutCubic(t);
        window.scrollTo(0, startY + diff * eased);
        if(t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function scrollToSection(id){
      const el = document.getElementById(id);
      if(!el) return;
      const root = document.documentElement;
      const scrolled = document.body.classList.contains("scrolled");
      const varName = scrolled ? "--headerSmall" : "--headerTop";
      const headerH = parseFloat(getComputedStyle(root).getPropertyValue(varName)) || 96;
      const y = el.getBoundingClientRect().top + window.scrollY - (headerH + 18);
      smoothScrollTo(Math.max(0, y), 780);
    }

    function handleNavClick(e){
      const btn = e.target.closest("[data-target]");
      if(!btn) return;

      const href = btn.getAttribute("data-href");
      const hasHref = !!href && href.trim().length > 0;

      if(hasHref){
        if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey){
          return;
        }
        e.preventDefault();
        window.location.href = href;
        return;
      }

      e.preventDefault();
      const id = btn.getAttribute("data-target");
      closeMenu();
      scrollToSection(id);
    }
    // sem capturing
    document.addEventListener("click", handleNavClick);

    const toTop = document.getElementById("toTop");
    const topBtn = document.getElementById("topBtn");

	function updateToTop(){
	  if(!toTop) return;
	  // no celular aparece mais cedo
	  const isMobile = window.matchMedia("(max-width: 560px)").matches;
	  const threshold = isMobile ? 220 : 700;

	  if(window.scrollY > threshold) toTop.classList.add("show");
	  else toTop.classList.remove("show");
	}
    window.addEventListener("scroll", updateToTop, {passive:true});
    updateToTop();

    if(topBtn){
      topBtn.addEventListener("click", (e)=>{
        e.preventDefault();
        smoothScrollTo(0, 860);
      });
    }

    function buildEmbedUrl(id){
      const qs = new URLSearchParams({
        autoplay: "0",
        rel: "0",
        modestbranding: "1",
        playsinline: "1"
      });
      return `https://www.youtube.com/embed/${id}?${qs.toString()}`;
    }

    function mountInlinePlayer(container){
      if(!container) return;
      const id = container.getAttribute("data-video-id");
      const title = container.getAttribute("data-video-title") || "YouTube video";
      if(!id) return;

      const iframe = document.createElement("iframe");
      iframe.src = buildEmbedUrl(id);
      iframe.title = title;
      iframe.frameBorder = "0";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;

      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.display = "block";
      iframe.style.border = "0";

      container.innerHTML = "";
      container.appendChild(iframe);
    }

    const videoOpen = document.getElementById("videoOpen");
    if(videoOpen){
      const playBtn = videoOpen.querySelector(".playBtn");
      const clickPlay = (e)=>{
        if(e) e.preventDefault();
        mountInlinePlayer(videoOpen);
      };

      if(playBtn){
        playBtn.addEventListener("click", clickPlay);
        playBtn.addEventListener("keydown", (e)=>{
          if(e.key === "Enter" || e.key === " "){
            e.preventDefault();
            clickPlay(e);
          }
        });
      }else{
        videoOpen.addEventListener("click", clickPlay);
      }
    }

    const DRIVE_FOLDERS = {
      cultos: {
        id: "1G3-fLudBhqaOmxhQd8bjy31oYrPiqZWM",
        url: "https://drive.google.com/drive/folders/1G3-fLudBhqaOmxhQd8bjy31oYrPiqZWM?usp=drive_link",
        title: "Corrida Pela Vida - 2026"
      },
      eventos: {
        id: "1RcqD7vLWzPcRUVX5fq9pzuD9f1kzLY9v",
        url: "https://drive.google.com/drive/folders/1RcqD7vLWzPcRUVX5fq9pzuD9f1kzLY9v?usp=drive_link",
        title: "TEC Crianças - 2026"
      }
    };

    const galleryFrame = document.getElementById("galleryFrame");
    const openDriveBtn = document.getElementById("openDriveBtn");
    const tabBtns = Array.from(document.querySelectorAll(".tabBtn[data-gallery]"));

    function setActiveTab(key){
      tabBtns.forEach(b => b.classList.toggle("active", b.getAttribute("data-gallery") === key));
    }
    function setGallery(key){
      const folder = DRIVE_FOLDERS[key];
      if(!folder) return;

      if(galleryFrame){
        galleryFrame.src = `https://drive.google.com/embeddedfolderview?id=${folder.id}#grid`;
      }
      if(openDriveBtn){
        openDriveBtn.href = folder.url;
        openDriveBtn.textContent = `Abrir ${folder.title} no Drive`;
      }
      setActiveTab(key);
    }
    tabBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const key = btn.getAttribute("data-gallery");
        setGallery(key);
      });
    });
    setGallery("cultos");

    const CULTOS_FIXOS = [
      { dow: 0, hour: 18, min: 0, label: "Culto de Celebração" },
      { dow: 1, hour: 19, min: 0, label: "Culto de Mulheres" },
      { dow: 2, hour: 19, min: 0, label: "Culto de Intercessão" },
      { dow: 3, hour: 19, min: 0, label: "Culto de Jovens" },
      { dow: 4, hour: 19, min: 0, label: "Culto da Família" },
    ];

    const nextBadge = document.getElementById("nextCultoBadge");
    const nextIn = document.getElementById("nextCultoIn");
    const nextMeta = document.getElementById("nextCultoMeta");
    const nextHint = document.getElementById("nextCultoHint");

    let NEXT_CULTO_CACHE = null;

    function pad2(n){ return String(n).padStart(2,"0"); }

    function formatDateBR(d){
      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
      return `${dias[d.getDay()]} • ${pad2(d.getDate())}/${pad2(d.getMonth()+1)} • ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function isSameDay(a,b){
      return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    }

    function buildOccurrence(now, item){
      const d = new Date(now);
      const currentDow = d.getDay();
      let addDays = (item.dow - currentDow + 7) % 7;

      d.setHours(item.hour, item.min, 0, 0);
      d.setDate(now.getDate() + addDays);

      if(addDays === 0 && d.getTime() <= now.getTime()){
        d.setDate(d.getDate() + 7);
      }
      return d;
    }

    function getNextCulto(){
      const now = new Date();
      let best = null;

      for(const item of CULTOS_FIXOS){
        const when = buildOccurrence(now, item);
        const diff = when.getTime() - now.getTime();
        if(diff > 0 && (!best || diff < best.diff)){
          best = { when, diff, item, now };
        }
      }
      return best;
    }

    function humanizeDiff(ms){
      const totalMin = Math.max(0, Math.floor(ms / 60000));
      const days = Math.floor(totalMin / (60*24));
      const hours = Math.floor((totalMin % (60*24)) / 60);
      const mins = totalMin % 60;

      if(totalMin < 60) return `em ${totalMin} min`;

      const parts = [];
      if(days > 0) parts.push(days + (days === 1 ? " dia" : " dias"));
      if(hours > 0) parts.push(hours + (hours === 1 ? " hora" : " horas"));
      if(mins > 0) parts.push(mins + (mins === 1 ? " minuto" : " minutos"));

      return "daqui a " + parts.join(", ");
    }

    function updateNextCulto(){
      if(!nextBadge || !nextIn || !nextMeta) return;

      const next = getNextCulto();
      NEXT_CULTO_CACHE = next;

      if(!next){
        nextBadge.textContent = "Sem dados";
        nextIn.textContent = "—";
        nextMeta.textContent = "—";
        return;
      }

      const today = isSameDay(next.now, next.when);

      nextBadge.textContent = today ? "Hoje" : "Próximo culto";
      nextIn.textContent = humanizeDiff(next.diff);
      nextMeta.textContent = `${next.item.label} • ${formatDateBR(next.when)}`;

      if(nextHint){
        nextHint.textContent = today ? "Prepare-se — esperamos você hoje!" : "Baseado na programação semanal fixa.";
      }
    }

    updateNextCulto();
    setInterval(updateNextCulto, 30000);

    const WHATS_NUMBER = "5516991044148";
    function buildWhatsLink(text){
      const base = "https://wa.me/" + WHATS_NUMBER;
      const qs = new URLSearchParams({ text });
      return base + "?" + qs.toString();
    }

    function getNextCultoText(){
      return "Olá! Gostaria de mais informações sobre o próximo culto.";
    }

    const waFloatBtn = document.getElementById("waFloatBtn");

    // Whats com href real (anchor) e click handler só para botões
    function wireWhatsBtn(el){
      if(!el) return;

      const href = buildWhatsLink(getNextCultoText());

      if(el.tagName === "A"){
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
        return;
      }

      el.addEventListener("click", (e)=>{
        e.preventDefault();
        window.open(href, "_blank", "noopener");
      });
    }

    wireWhatsBtn(waFloatBtn);
    wireWhatsBtn(document.getElementById("firstTimeWhatsBtn"));
    wireWhatsBtn(document.getElementById("ministeriosWhatsBtn"));
    wireWhatsBtn(document.getElementById("contatoWhatsBtn"));

    const noticeWrap = document.getElementById("noticeWrap");
    const noticeClose = document.getElementById("noticeClose");
    const noticeBody = document.getElementById("noticeBody");

    async function showNoticeIfNeeded(){
      try{
        const key = "ieq_notice_dismissed_v1";
        const dismissed = localStorage.getItem(key) === "1";
        if(dismissed) return;

        const items = await loadUpcomingSchedule();

        const btnHTML = `
          <div class="row" style="margin-top:12px">
            <button class="btn" type="button" id="openEventsModalBtn">📅 Ver lista completa</button>
          </div>
        `;

        if(noticeBody) noticeBody.innerHTML = renderUpcomingHTML(items) + btnHTML;
        if(noticeWrap) noticeWrap.style.display = "block";

        if(noticeClose){
          noticeClose.addEventListener("click", ()=>{
            localStorage.setItem(key, "1");
            noticeWrap.style.display = "none";
          });
        }

        const openEventsModalBtn = document.getElementById("openEventsModalBtn");
        if(openEventsModalBtn){
          openEventsModalBtn.addEventListener("click", (e)=>{
            e.preventDefault();
            openEventsModal();
          });
        }

      }catch(err){
        if(noticeWrap) noticeWrap.style.display = "none";
      }
    }
    showNoticeIfNeeded();

    const eventsModalBack = document.getElementById("eventsModalBack");
    const eventsModalClose = document.getElementById("eventsModalClose");
    const eventsModalTitle = document.getElementById("eventsModalTitle");
    const eventsModalSubtitle = document.getElementById("eventsModalSubtitle");
    const eventsModalList = document.getElementById("eventsModalList");

    function openEventsModal(){
      if(!eventsModalBack) return;
      eventsModalBack.classList.add("show");
      eventsModalBack.setAttribute("aria-hidden","false");
      lockScroll(true);
      hydrateEventsModal();
    }
    function closeEventsModal(){
      if(!eventsModalBack) return;
      eventsModalBack.classList.remove("show");
      eventsModalBack.setAttribute("aria-hidden","true");
      lockScroll(false);
    }

    const openMonthAgendaBtn = document.getElementById("openMonthAgendaBtn");
    if(openMonthAgendaBtn){
      openMonthAgendaBtn.addEventListener("click", (e)=>{
        e.preventDefault();
        openEventsModal();
      });
    }

    if(eventsModalClose) eventsModalClose.addEventListener("click", closeEventsModal);
    if(eventsModalBack){
      eventsModalBack.addEventListener("click", (e)=>{
        if(e.target === eventsModalBack) closeEventsModal();
      });
    }

    async function hydrateEventsModal(){
      try{
        if(eventsModalTitle) eventsModalTitle.textContent = `📅 Lista completa • ${monthLabelPt(new Date())}`;
        if(eventsModalSubtitle) eventsModalSubtitle.textContent = "Carregando a agenda do mês…";
        if(eventsModalList) eventsModalList.innerHTML = "";

        const data = await loadMonthScheduleAll();
        if(eventsModalTitle) eventsModalTitle.textContent = `📅 Lista completa • ${data.monthLabel}`;
        if(eventsModalSubtitle) eventsModalSubtitle.textContent = data.items.length ? "Eventos cadastrados na planilha para este mês:" : "Nenhum evento encontrado para este mês.";
        if(eventsModalList) eventsModalList.innerHTML = renderMonthList(data.items);
      }catch(err){
        if(eventsModalSubtitle) eventsModalSubtitle.textContent = "Não consegui carregar a agenda do mês (verifique a aba do mês na planilha).";
        if(eventsModalList) eventsModalList.innerHTML = "";
      }
    }

    const addCalBtn = document.getElementById("addCalBtn");
    const calModalBack = document.getElementById("calModalBack");
    const calModalClose = document.getElementById("calModalClose");
    const googleCalLink = document.getElementById("googleCalLink");
    const downloadIcsBtn = document.getElementById("downloadIcsBtn");
    const calModalText = document.getElementById("calModalText");

    function openCalModal(){
      if(!calModalBack) return;
      calModalBack.classList.add("show");
      calModalBack.setAttribute("aria-hidden","false");
      lockScroll(true);
      updateCalendarLinks();
    }
    function closeCalModal(){
      if(!calModalBack) return;
      calModalBack.classList.remove("show");
      calModalBack.setAttribute("aria-hidden","true");
      lockScroll(false);
    }

    if(addCalBtn) addCalBtn.addEventListener("click", (e)=>{ e.preventDefault(); openCalModal(); });
    if(calModalClose) calModalClose.addEventListener("click", closeCalModal);
    if(calModalBack){
      calModalBack.addEventListener("click", (e)=>{
        if(e.target === calModalBack) closeCalModal();
      });
    }

    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape"){
        if(calModalBack && calModalBack.classList.contains("show")) closeCalModal();
        if(eventsModalBack && eventsModalBack.classList.contains("show")) closeEventsModal();
      }
    });

function toICSDateLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${y}${m}${day}T${hh}${mm}${ss}`;
}

function icsEscapeText(s){
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function icsFoldLine(line, maxLen = 75){
  const out = [];
  let s = String(line);
  while(s.length > maxLen){
    out.push(s.slice(0, maxLen));
    s = " " + s.slice(maxLen);
  }
  out.push(s);
  return out.join("\r\n");
}

function downloadICS({title, description, location, start, end}){
  const uid = "ieq-nuporanga-" + start.getTime() + "@site";
  const dtstamp = toICSDateLocal(new Date());
  const dtstart = toICSDateLocal(start);
  const dtend = toICSDateLocal(end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IEQ Nuporanga//Site//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + icsEscapeText(uid),
    "DTSTAMP:" + dtstamp,
    "DTSTART:" + dtstart,
    "DTEND:" + dtend,
    "SUMMARY:" + icsEscapeText(title),
    "DESCRIPTION:" + icsEscapeText(description),
    "LOCATION:" + icsEscapeText(location),
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  const ics = lines.map(l => icsFoldLine(l)).join("\r\n") + "\r\n";

  const blob = new Blob([ics], {type: "text/calendar;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "proximo-culto-ieq-nuporanga.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}

    function updateCalendarLinks(){
      const next = NEXT_CULTO_CACHE || getNextCulto();
      if(!next) return;

      const start = new Date(next.when);
      const end = new Date(start.getTime() + 90 * 60000);

      const title = `IEQ Nuporanga — ${next.item.label}`;
      const location = "R. Joao Sabaini Neto, 135 - Jardim Brasilia | Nuporanga - SP";
      const details = "Venha nos visitar! Culto com duração média de 1h30. Temos salinha para as crianças e você será muito bem recepcionado(a).";

      if(calModalText){
        calModalText.textContent = `Próximo culto: ${next.item.label} • ${formatDateBR(start)} (duração média: 1h30)`;
      }

      if(googleCalLink){
        googleCalLink.href = buildGoogleCalendarUrl({ title, details, location, start, end });
      }

      if(downloadIcsBtn){
        downloadIcsBtn.onclick = ()=>{
          downloadICS({ title, description: details, location, start, end });
        };
      }
    }

    (function(){
      const card = document.getElementById("firstTimeCard");
      const close = document.getElementById("firstTimeClose");
      const key = "ieq_first_time_dismissed_v1";

      if(!card || !close) return;

      try{
        if(localStorage.getItem(key) === "1"){
          card.style.display = "none";
          return;
        }
        close.addEventListener("click", ()=>{
          localStorage.setItem(key, "1");
          card.style.display = "none";
        });
      }catch(e){
        close.addEventListener("click", ()=>{ card.style.display = "none"; });
      }
    })();

    const pixKeyBox = document.getElementById("pixKeyBox");
    const copyPixBtn = document.getElementById("copyPixBtn");
    const pixStatus = document.getElementById("pixStatus");
    const pixQrImg = document.getElementById("pixQrImg");

    function setPixUI(){
      const key = (PIX_KEY || "").trim();

      if(pixKeyBox) pixKeyBox.textContent = key ? key : "Chave PIX ainda não configurada";
      if(pixStatus) pixStatus.textContent = key ? `Titular: ${PIX_NAME}` : "Edite PIX_KEY no código para ativar.";

      if(pixQrImg){
        const qr = (PIX_QR_IMAGE_URL || "").trim();
        if(qr){
          pixQrImg.src = qr;
          pixQrImg.style.display = "block";
        }else{
          pixQrImg.removeAttribute("src");
          pixQrImg.style.display = "block";
          pixQrImg.style.background = "rgba(0,0,0,.22)";
          pixQrImg.alt = "QR Code PIX (adicione a imagem)";
        }
      }

      if(copyPixBtn){
        copyPixBtn.disabled = !key;
        copyPixBtn.style.opacity = key ? "1" : ".6";
      }
    }
    setPixUI();

    if(copyPixBtn){
      copyPixBtn.addEventListener("click", async ()=>{
        const key = (PIX_KEY || "").trim();
        if(!key) return;

        try{
          await navigator.clipboard.writeText(key);
          copyPixBtn.textContent = "✅ PIX copiado";
          setTimeout(()=>{ copyPixBtn.textContent = "📋 Copiar chave PIX"; }, 1400);
        }catch(e){
          prompt("Copie a chave PIX:", key);
        }
      });
    }

    (function(){
      const box = document.getElementById("waMiniBox");
      const close = document.getElementById("waMiniClose");
      const key = "ieq_wa_mini_dismissed_v1";

      if(!box || !close) return;

      try{
        if(localStorage.getItem(key) === "1"){
          box.style.display = "none";
          return;
        }

        close.addEventListener("click", ()=>{
          box.style.display = "none";
          localStorage.setItem(key, "1");
        });

      }catch(e){
        close.addEventListener("click", ()=>{ box.style.display = "none"; });
      }
    })();

    (function(){
      const sections = Array.from(document.querySelectorAll("section[id]"));
      const navBtns = Array.from(document.querySelectorAll("[data-target]"));
      if(!sections.length || !navBtns.length) return;

      function setActive(id){
        navBtns.forEach(btn=>{
          btn.classList.toggle("active", btn.getAttribute("data-target") === id);
        });
      }

      function onScrollSpy(){
        const offset = 140;
        let current = sections[0].id;

        sections.forEach(sec=>{
          const top = sec.getBoundingClientRect().top;
          if(top - offset <= 0) current = sec.id;
        });

        const nearBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 6);
        if(nearBottom) current = sections[sections.length - 1].id;

        setActive(current);
      }

      window.addEventListener("scroll", onScrollSpy, { passive:true });
      onScrollSpy();
    })();

    const YT_CHANNEL_ID = "UCNmU-juUErNMbHAJOQ508Ow";
    const UPLOADS_PLAYLIST = "UU" + YT_CHANNEL_ID.substring(2);

    function liveEmbedUrl(){
      const qs = new URLSearchParams({
        channel: YT_CHANNEL_ID,
        autoplay: "0",
        rel: "0",
        modestbranding: "1",
        playsinline: "1"
      });
      return "https://www.youtube.com/embed/live_stream?" + qs.toString();
    }

    function mountIframeInto(el, src, title){
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = title || "YouTube";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";
      el.innerHTML = "";
      el.appendChild(iframe);
    }

    (function(){
      const liveMount = document.getElementById("liveMount");
      const liveMeta = document.getElementById("liveMeta");
      const liveTryBtn = document.getElementById("liveTryBtn");
      if(!liveMount) return;

      function tryLoadLive(){
        if(!YT_CHANNEL_ID || !YT_CHANNEL_ID.startsWith("UC")){
          liveMount.innerHTML = `
            <div class="livePlaceholder">
              <div style="font-size:16px;font-weight:950">⚠️ ID do canal inválido</div>
              <div class="liveHint">Edite <b>YT_CHANNEL_ID</b> no final do arquivo (precisa começar com <b>UC</b>).</div>
              <div class="row" style="justify-content:center">
                <a class="btn" href="https://www.youtube.com/@ieqnuporangasp" target="_blank" rel="noopener">Abrir canal</a>
              </div>
            </div>
          `;
          if(liveMeta) liveMeta.textContent = "🔴 Ao vivo (configure o ID do canal)";
          return;
        }
        mountIframeInto(liveMount, liveEmbedUrl(), "Transmissão ao vivo");
        if(liveMeta) liveMeta.textContent = "🔴 Ao vivo (quando houver transmissão ativa no canal)";
      }

      window.ieqTryLoadLive = tryLoadLive;

      if(liveTryBtn) liveTryBtn.addEventListener("click", (e)=>{ e.preventDefault(); tryLoadLive(); });
    })();

    (function(){
      const sec = document.getElementById("aoVivo");
      if(!sec) return;

      const LIVE_WINDOWS = [
        { dow: 4, startMin: 18*60, endMin: 22*60 },
        { dow: 0, startMin: 17*60, endMin: 21*60 },
      ];

      function minutesOfDay(d){ return d.getHours()*60 + d.getMinutes(); }

      function isNowInLiveWindow(now = new Date()){
        const dow = now.getDay();
        const m = minutesOfDay(now);
        return LIVE_WINDOWS.some(w => w.dow === dow && m >= w.startMin && m <= w.endMin);
      }

      let tried = false;

      function tryAutoLoadIfWindow(){
        if(tried) return;
        if(isNowInLiveWindow() && typeof window.ieqTryLoadLive === "function"){
          tried = true;
          try{ window.ieqTryLoadLive(); }catch(e){}
        }
      }

      tryAutoLoadIfWindow();
      setInterval(tryAutoLoadIfWindow, 60000);

		const obs = new IntersectionObserver((entries)=>{
		  for(const ent of entries){
			if(ent.isIntersecting && ent.intersectionRatio >= 0.35){
			  // Só carrega automaticamente se estiver na janela de live
			  if(!tried && isNowInLiveWindow() && typeof window.ieqTryLoadLive === "function"){
				tried = true;
				try{ window.ieqTryLoadLive(); }catch(e){}
			  }
			}
		  }
		}, { threshold: [0.35] });

		obs.observe(sec);
	})();


    let YT_API_READY = false;
    let YT_API_LOADING = false;
    const YT_READY_QUEUE = [];

    function loadYouTubeIframeAPI(){
      if(YT_API_READY) return Promise.resolve();
      if(YT_API_LOADING){
        return new Promise(res => YT_READY_QUEUE.push(res));
      }
      YT_API_LOADING = true;
      return new Promise((resolve)=>{
        YT_READY_QUEUE.push(resolve);
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        document.head.appendChild(s);
      });
    }

    window.onYouTubeIframeAPIReady = function(){
      YT_API_READY = true;
      YT_API_LOADING = false;
      while(YT_READY_QUEUE.length){
        try{ (YT_READY_QUEUE.shift())(); }catch(e){}
      }
    };

    (function(){
      const mount = document.getElementById("uploadsMount");
      if(!mount) return;

      if(!YT_CHANNEL_ID || !YT_CHANNEL_ID.startsWith("UC")){
        mount.textContent = "⚠️ Configure o ID do canal (YT_CHANNEL_ID) para carregar os vídeos.";
        return;
      }

      mount.innerHTML = '<div style="padding:14px; text-align:center; opacity:.9">Carregando player…</div>';

      const MAX_SKIPS = 15;
      const CHECK_DELAY_MS = 650;
      const MAX_CHECKS_PER_VIDEO = 10;

      let player = null;
      let skipCount = 0;
      let checking = false;
      let checkTimer = null;

      function clearCheckTimer(){
        if(checkTimer){
          clearTimeout(checkTimer);
          checkTimer = null;
        }
      }

      function safeNext(reason){
        clearCheckTimer();
        checking = false;

        if(!player) return;

        skipCount++;
        if(skipCount > MAX_SKIPS){
          mount.innerHTML = `
            <div class="livePlaceholder">
              <div style="font-size:16px;font-weight:950">⚠️ Não achei um vídeo válido</div>
              <div class="liveHint">
                Pulei ${MAX_SKIPS} itens (prováveis lives/upcoming/indisponíveis) e parei para não travar.
                <br><br>
                Motivo: <b>${String(reason || "—")}</b>
              </div>
              <div class="row" style="justify-content:center">
                <a class="btn" href="https://www.youtube.com/@ieqnuporangasp/videos" target="_blank" rel="noopener">Abrir vídeos no YouTube</a>
              </div>
            </div>
          `;
          try{ player.destroy(); }catch(e){}
          player = null;
          return;
        }

        try{
          player.nextVideo();
        }catch(e){}
      }

      function looksLikeLiveOrInvalid(){
        try{
          const d = player.getDuration();
          if(d && d > 0) return false;
          return true;
        }catch(e){
          return true;
        }
      }

      function scheduleCheck(triesLeft){
        clearCheckTimer();
        checkTimer = setTimeout(()=>{
          if(!player) return;

          if(looksLikeLiveOrInvalid()){
            if(triesLeft <= 0){
              safeNext("duração 0 (provável live/upcoming/indisponível)");
              return;
            }
            scheduleCheck(triesLeft - 1);
            return;
          }

          checking = false;
          clearCheckTimer();
        }, CHECK_DELAY_MS);
      }

      function startCheckCycle(){
        if(checking) return;
        checking = true;
        scheduleCheck(MAX_CHECKS_PER_VIDEO);
      }

      function onPlayerReady(){
        startCheckCycle();
      }

      function onPlayerError(e){
        safeNext("erro do player: " + (e && e.data));
      }

      function onPlayerStateChange(e){
        const state = e && e.data;
        if(state === YT.PlayerState.PLAYING){
          checking = false;
          clearCheckTimer();
          return;
        }

        if(state === YT.PlayerState.CUED || state === YT.PlayerState.BUFFERING || state === -1){
          startCheckCycle();
        }

        if(state === YT.PlayerState.ENDED){
          skipCount = Math.max(0, skipCount - 1);
        }
      }

      loadYouTubeIframeAPI().then(()=>{
        if(!window.YT || !window.YT.Player){
          mount.textContent = "⚠️ Falha ao carregar o player do YouTube.";
          return;
        }

        player = new YT.Player("uploadsMount", {
          height: "100%",
          width: "100%",
          playerVars: {
            listType: "playlist",
            list: UPLOADS_PLAYLIST,
            rel: 0,
            modestbranding: 1,
            playsinline: 1
          },
          events: {
            onReady: onPlayerReady,
            onError: onPlayerError,
            onStateChange: onPlayerStateChange
          }
        });
      });
    })();

    function toGCalDateUTC(d){
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth()+1).padStart(2,"0");
      const dd = String(d.getUTCDate()).padStart(2,"0");
      const hh = String(d.getUTCHours()).padStart(2,"0");
      const mi = String(d.getUTCMinutes()).padStart(2,"0");
      const ss = String(d.getUTCSeconds()).padStart(2,"0");
      return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
    }

    function buildGoogleCalendarUrl({ title, details, location, start, end }){
      const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
      const dates = `${toGCalDateUTC(start)}/${toGCalDateUTC(end)}`;

      const qs = new URLSearchParams({
        text: title || "",
        details: details || "",
        location: location || "",
        dates
      });

      return base + "&" + qs.toString();
    }
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", e=>{
   if(e.key==="F12") e.preventDefault();
});

  </script>
