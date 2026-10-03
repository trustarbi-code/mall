// ============================================================
//  실시간 상담 — 방문자용 상담 아이콘 & 채팅창 화면 (수정할 필요 없음)
//  chat-widget.js 가 불러옵니다.
// ============================================================
import { CHAT_CONFIG, getBackend, isDemo, isAdminOnline, sendAlert, esc, fmtTime, toMs, MAX_LEN } from "./chat-core.js";

const P = CHAT_CONFIG.profile || {};

const base = new URL(".", import.meta.url);           // chat/ 폴더 위치
const avatarUrl = new URL(P.avatar ? P.avatar.replace(/^chat\//, "") : "avatar.jpg", base).href;

/* ------------------------------ 스타일 ------------------------------ */
const CSS = `
.ecw{--c-accent:var(--accent,#1088ED);--c-deep:var(--accent-deep,#0875D1);--c-bg:var(--bg,#fff);--c-surface:var(--surface,#fff);
  --c-surface2:var(--surface-2,#F3F9FF);--c-ink:var(--ink,#17161B);--c-soft:var(--ink-soft,#4A4A52);--c-muted:var(--muted,#7A7A82);
  --c-line:var(--line,#E6E5E5);--c-navy:var(--invert-bg,#172B4D);--c-cta:#0875D1;
  font-family:var(--kr,"Pretendard Variable","Noto Sans KR",-apple-system,BlinkMacSystemFont,sans-serif);
  -webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:anywhere;}
.ecw *{box-sizing:border-box;}
.ecw :where(div,p,span,img){margin:0;}
.ecw :where(img){display:inline-block;max-width:none;}
.ecw button{font-family:inherit;}
[data-theme="dark"] .ecw{--c-cta:#1777D6;}

/* 상담 아이콘 */
.ecw-launch{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:900;
  width:60px;height:60px;padding:0;border-radius:50%;border:1px solid var(--c-line);cursor:pointer;background:var(--c-surface);color:var(--c-cta);
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  box-shadow:0 14px 30px -10px rgba(15,30,60,.28),0 2px 8px rgba(15,30,60,.08);transition:transform .25s cubic-bezier(.2,.75,.25,1),box-shadow .25s,opacity .2s,width .2s,padding .2s;}
.ecw-launch:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 18px 36px -10px rgba(15,30,60,.32),0 2px 8px rgba(15,30,60,.1);}
.ecw-launch:focus-visible{outline:3px solid rgba(16,136,237,.35);outline-offset:3px;}
.ecw-launch .ecw-label{display:none;}
.ecw-launch svg{width:26px;height:26px;flex-shrink:0;transition:transform .3s,opacity .2s;}
@media (min-width:901px){
  .ecw-launch{width:auto;height:64px;padding:0 24px 0 20px;border-radius:100px;box-shadow:0 16px 34px -10px rgba(15,30,60,.3),0 3px 10px rgba(15,30,60,.1);}
  .ecw-launch:hover{box-shadow:0 20px 40px -10px rgba(15,30,60,.34),0 3px 10px rgba(15,30,60,.12);}
  .ecw-launch svg{width:24px;height:24px;}
  .ecw-launch .ecw-label{display:inline-block;font-size:.94rem;font-weight:800;color:var(--c-ink);white-space:nowrap;letter-spacing:-.01em;}
  .ecw.open .ecw-launch .ecw-label{display:none;}
  .ecw.open .ecw-launch{width:64px;padding:0;}
  .ecw:not(.open) .ecw-launch .ecw-dot{left:34px;right:auto;bottom:15px;}
  .ecw:not(.open) .ecw-launch .ecw-badge{left:30px;right:auto;top:9px;}
}
.ecw-launch .ecw-ic-x{position:absolute;opacity:0;transform:rotate(-90deg);}
.ecw.open .ecw-launch .ecw-ic-chat{opacity:0;transform:rotate(90deg);}
.ecw.open .ecw-launch .ecw-ic-x{opacity:1;transform:none;}
.ecw-dot{position:absolute;right:3px;bottom:3px;width:14px;height:14px;border-radius:50%;background:#22C55E;border:2.5px solid var(--c-bg);display:none;}
.ecw.online .ecw-dot{display:block;}
.ecw-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#FF4D4F;color:#fff;
  font-size:.74rem;font-weight:800;display:none;align-items:center;justify-content:center;border:2px solid var(--c-bg);}
.ecw.has-unread .ecw-badge{display:flex;}

/* 첫 방문 말풍선 */
.ecw-teaser{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:calc(max(20px,env(safe-area-inset-bottom)) + 74px);z-index:900;
  max-width:260px;display:flex;align-items:center;gap:10px;padding:12px 14px 12px 12px;border-radius:16px 16px 4px 16px;background:var(--c-surface);
  color:var(--c-ink);border:1px solid var(--c-line);box-shadow:0 14px 34px -12px rgba(15,30,60,.28);cursor:pointer;
  opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;transition:opacity .35s,transform .35s cubic-bezier(.2,.75,.25,1);}
.ecw-teaser.show{opacity:1;transform:none;pointer-events:auto;}
.ecw-teaser img{width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;}
.ecw-teaser b{display:block;font-size:.86rem;font-weight:800;line-height:1.35;}
.ecw-teaser span{display:block;font-size:.76rem;color:var(--c-muted);margin-top:2px;line-height:1.35;}
.ecw-teaser .tx-close{position:absolute;top:-8px;left:-8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--c-line);
  background:var(--c-surface);color:var(--c-muted);font-size:13px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;}

/* 채팅창 */
.ecw-panel{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:calc(max(20px,env(safe-area-inset-bottom)) + 76px);z-index:901;
  width:372px;height:min(600px,calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;border-radius:20px;background:var(--c-bg);
  border:1px solid var(--c-line);box-shadow:0 30px 70px -20px rgba(10,25,50,.45),0 4px 14px rgba(10,25,50,.08);
  opacity:0;transform:translateY(14px) scale(.98);transform-origin:bottom right;pointer-events:none;visibility:hidden;
  transition:opacity .28s,transform .32s cubic-bezier(.2,.75,.25,1),visibility 0s .32s;}
.ecw.open .ecw-panel{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .28s,transform .32s cubic-bezier(.2,.75,.25,1);}

.ecw-head{position:relative;background:var(--c-navy);color:#EAF5FF;padding:18px 18px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
.ecw-head::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(80% 120% at 0% 0%,rgba(79,168,245,.28),transparent 60%);}
.ecw-av{position:relative;width:44px;height:44px;flex-shrink:0;z-index:1;}
.ecw-av img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.85);}
.ecw-av i{position:absolute;right:-1px;bottom:-1px;width:13px;height:13px;border-radius:50%;background:#94A3B8;border:2.5px solid var(--c-navy);}
.ecw.online .ecw-av i{background:#22C55E;}
.ecw-who{flex:1;min-width:0;z-index:1;}
.ecw-who b{display:block;font-size:1.02rem;font-weight:800;letter-spacing:-.01em;}
.ecw-who span{display:block;font-size:.76rem;color:#B8C9DE;margin-top:2px;line-height:1.35;}
.ecw-close{z-index:1;width:34px;height:34px;border-radius:10px;border:0;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:grid;place-items:center;}
.ecw-close:hover{background:rgba(255,255,255,.18);}

.ecw-body{flex:1;overflow-y:auto;padding:18px 16px 10px;background:var(--c-surface2);scroll-behavior:smooth;overscroll-behavior:contain;}
.ecw-day{text-align:center;font-size:.7rem;color:var(--c-muted);margin:4px 0 14px;}
.ecw-row{display:flex;gap:8px;margin-bottom:6px;align-items:flex-end;}
.ecw-row.me{justify-content:flex-end;}
.ecw-row .mini{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;align-self:flex-start;}
.ecw-row .mini.ghost{visibility:hidden;}
.ecw-col{display:flex;flex-direction:column;max-width:78%;}
.ecw-row.me .ecw-col{align-items:flex-end;}
.ecw-bub{padding:10px 13px;border-radius:16px;font-size:.9rem;line-height:1.55;white-space:pre-wrap;}
.ecw-row.them .ecw-bub{background:var(--c-surface);color:var(--c-ink);border:1px solid var(--c-line);border-top-left-radius:6px;}
.ecw-row.me .ecw-bub{background:var(--c-cta);color:#fff;border-top-right-radius:6px;}
.ecw-meta{font-size:.66rem;color:var(--c-muted);margin:3px 4px 4px;}
.ecw-name{font-size:.72rem;font-weight:700;color:var(--c-soft);margin:0 0 4px 2px;}
.ecw-note{margin:10px auto 12px;max-width:92%;text-align:center;font-size:.76rem;line-height:1.5;color:var(--c-soft);
  background:var(--c-surface);border:1px dashed var(--c-line);border-radius:12px;padding:9px 12px;}

.ecw-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 6px 36px;}
.ecw-chips button{border:1px solid rgba(16,136,237,.35);background:var(--c-surface);color:var(--c-accent);border-radius:100px;
  padding:7px 13px;font-size:.78rem;font-weight:600;line-height:1.35;cursor:pointer;transition:background .2s,border-color .2s;}
.ecw-chips button:hover{background:rgba(16,136,237,.08);}

.ecw-card{margin:10px 0 12px 36px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:14px;padding:12px;}
.ecw-card p{margin:0 0 9px;font-size:.8rem;line-height:1.5;color:var(--c-soft);}
.ecw-card p b{color:var(--c-ink);}
.ecw-card input{width:100%;border:1px solid var(--c-line);background:var(--c-bg);color:var(--c-ink);border-radius:9px;padding:9px 10px;
  font:inherit;font-size:.84rem;margin-bottom:6px;outline:none;}
.ecw-card input:focus{border-color:var(--c-accent);}
.ecw-card .acts{display:flex;gap:6px;justify-content:flex-end;margin-top:4px;}
.ecw-card .acts button{border:0;border-radius:9px;padding:8px 13px;font-size:.8rem;font-weight:700;cursor:pointer;}
.ecw-card .save{background:var(--c-cta);color:#fff;}
.ecw-card .skip{background:transparent;color:var(--c-muted);}

.ecw-foot{flex-shrink:0;border-top:1px solid var(--c-line);background:var(--c-bg);padding:10px 10px 8px;}
.ecw-input{display:flex;align-items:flex-end;gap:8px;background:var(--c-surface2);border:1px solid var(--c-line);border-radius:16px;padding:6px 6px 6px 14px;transition:border-color .2s;}
.ecw-input:focus-within{border-color:var(--c-accent);}
.ecw-input textarea{flex:1;border:0;background:transparent;color:var(--c-ink);font:inherit;font-size:.92rem;line-height:1.5;resize:none;
  max-height:120px;min-height:24px;padding:6px 0;outline:none;}
.ecw-input textarea::placeholder{color:var(--c-muted);}
.ecw-send{width:38px;height:38px;border-radius:12px;border:0;background:var(--c-cta);color:#fff;cursor:pointer;display:grid;place-items:center;flex-shrink:0;transition:opacity .2s,transform .2s;}
.ecw-send:disabled{opacity:.35;cursor:default;}
.ecw-send:not(:disabled):hover{transform:translateY(-1px);}
.ecw-legal{font-size:.66rem;color:var(--c-muted);text-align:center;margin-top:7px;}
.ecw-legal a{color:inherit;text-decoration:underline;}
.ecw-demo{background:#FFF7D6;color:#7A5B00;font-size:.72rem;text-align:center;padding:6px 10px;flex-shrink:0;}
.ecw-err{color:#D92D20;font-size:.74rem;text-align:center;margin-top:6px;display:none;}

@media (max-width:520px){
  .ecw-panel{inset:0;right:0;bottom:0;width:100%;height:100%;height:100dvh;border-radius:0;border:0;transform:translateY(24px);}
  .ecw.open .ecw-launch{opacity:0;pointer-events:none;}
  .ecw-head{padding-top:max(16px,env(safe-area-inset-top));}
  .ecw-foot{padding-bottom:max(8px,env(safe-area-inset-bottom));}
  .ecw-teaser{max-width:230px;}
}
@media (prefers-reduced-motion:reduce){.ecw *{transition:none!important;animation:none!important;}}
`;

/* ------------------------------ 아이콘 ------------------------------ */
const I = {
  chat: '<svg class="ecw-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="2.6"/></svg>',
  x: '<svg class="ecw-ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>'
};

/* ------------------------------ 상태 ------------------------------ */
const S = { be: null, uid: null, conv: null, msgs: [], status: null, open: false, sending: false,
  cardDismissed: false, offNoteShown: false, unsubs: [] };
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ------------------------------ 화면 구성 ------------------------------ */
const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
const root = document.createElement("div");
root.className = "ecw";
root.innerHTML = `
  <div class="ecw-teaser" role="button" tabindex="0" aria-label="상담창 열기">
    <button class="tx-close" type="button" aria-label="안내 닫기">×</button>
    <img src="${avatarUrl}" alt="">
    <div><b>궁금한 점, 바로 물어보세요</b><span>${esc(P.name || "")}에게 직접 메시지가 전달돼요</span></div>
  </div>
  <div class="ecw-panel" role="dialog" aria-modal="false" aria-label="${esc(P.name || "")} 실시간 상담">
    ${isDemo ? '<div class="ecw-demo">미리보기 모드 · 실제 전송되지 않아요 (Firebase 연결 전)</div>' : ""}
    <div class="ecw-head">
      <div class="ecw-av"><img src="${avatarUrl}" alt=""><i></i></div>
      <div class="ecw-who"><b>${esc(P.name || "")}</b><span class="ecw-status">연결 중…</span></div>
      <button class="ecw-close" type="button" aria-label="상담창 닫기">${I.close}</button>
    </div>
    <div class="ecw-body" aria-live="polite"></div>
    <div class="ecw-foot">
      <div class="ecw-input">
        <textarea rows="1" maxlength="${MAX_LEN}" placeholder="메시지를 입력하세요" aria-label="메시지 입력"></textarea>
        <button class="ecw-send" type="button" aria-label="보내기" disabled>${I.send}</button>
      </div>
      <div class="ecw-err">메시지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.</div>
      <div class="ecw-legal">대화 내용은 상담 목적으로만 사용돼요${P.email ? ` · <a href="mailto:${esc(P.email)}">이메일로 문의</a>` : ""}</div>
    </div>
  </div>
  <button class="ecw-launch" type="button" aria-label="실시간 상담 열기" aria-expanded="false">
    ${I.chat}${I.x}<span class="ecw-label">상담하기</span><span class="ecw-dot"></span><span class="ecw-badge">1</span>
  </button>`;
document.body.appendChild(root);

const $ = (s) => root.querySelector(s);
const launch = $(".ecw-launch"), panel = $(".ecw-panel"), body = $(".ecw-body"), ta = $("textarea"), sendBtn = $(".ecw-send");
const statusEl = $(".ecw-status"), teaser = $(".ecw-teaser"), badge = $(".ecw-badge"), errEl = $(".ecw-err");

/* ------------------------------ 렌더링 ------------------------------ */
function online() { return isAdminOnline(S.status); }

function renderStatus() {
  const on = online();
  root.classList.toggle("online", on);
  statusEl.textContent = on ? "지금 대화 가능 · 보통 몇 분 안에 답장해요" : "부재중 · 남겨주시면 확인 후 답장드려요";
}

function renderMessages() {
  const stick = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  let h = `<div class="ecw-day">${esc(P.name || "")}와의 대화</div>`;
  // 인사말 (저장되지 않는 고정 메시지)
  h += bubble("them", P.greeting || "안녕하세요!", S.msgs.length ? toMs(S.msgs[0].createdAt) : 0, true, true);
  if (!S.msgs.length && (P.quickReplies || []).length) {
    h += `<div class="ecw-chips">${P.quickReplies.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`;
  }
  let prev = "them-greet";
  S.msgs.forEach((m, i) => {
    const who = m.from === "admin" ? "them" : "me";
    const next = S.msgs[i + 1];
    const last = !next || next.from !== m.from || toMs(next.createdAt) - toMs(m.createdAt) > 5 * 60 * 1000;
    const first = prev !== m.from;
    h += bubble(who, m.text, toMs(m.createdAt), last, first && who === "them");
    prev = m.from;
  });
  // 방문자가 메시지를 보낸 뒤: 부재중 안내 + 연락처 카드 (대화 맨 아래)
  if (firstVisitorIdx() >= 0) {
    if (!online()) h += `<div class="ecw-note">지금은 자리를 비웠어요. 메시지는 ${esc(P.name || "")}에게 바로 전달되었고, 확인하는 대로 답장드릴게요.</div>`;
    if (needCard()) h += card();
  }
  body.innerHTML = h;
  if (stick || S.justSent) { body.scrollTop = body.scrollHeight; S.justSent = false; }
}
function firstVisitorIdx() { return S.msgs.findIndex((m) => m.from === "visitor"); }
function needCard() {
  if (S.cardDismissed || LS.get("ecw-card-" + S.uid)) return false;
  return !(S.conv && (S.conv.name || S.conv.contact));
}
function card() {
  return `<div class="ecw-card"><p><b>답장을 놓치지 않도록</b> 성함과 연락처를 남겨주세요. (선택)</p>
    <input class="c-name" type="text" maxlength="40" placeholder="성함 · 회사명 (예: 김OO · OO회사 인사팀)" autocomplete="name">
    <input class="c-contact" type="text" maxlength="80" placeholder="이메일 또는 전화번호" autocomplete="email">
    <div class="acts"><button type="button" class="skip">괜찮아요</button><button type="button" class="save">남기기</button></div></div>`;
}
function bubble(who, text, ms, showMeta, showName) {
  const av = who === "them" ? `<img class="mini${showName ? "" : " ghost"}" src="${avatarUrl}" alt="">` : "";
  return `<div class="ecw-row ${who}">${av}<div class="ecw-col">${showName && who === "them" ? `<div class="ecw-name">${esc(P.name || "")}</div>` : ""}
    <div class="ecw-bub">${esc(text)}</div>${showMeta && ms ? `<div class="ecw-meta">${fmtTime(ms)}</div>` : ""}</div></div>`;
}

function renderUnread() {
  const seen = Number(LS.get("ecw-seen-" + S.uid) || 0);
  const n = S.msgs.filter((m) => m.from === "admin" && toMs(m.createdAt) > seen).length;
  const show = !S.open && n > 0;
  root.classList.toggle("has-unread", show);
  badge.textContent = n > 9 ? "9+" : String(n);
}
function markSeen() {
  if (!S.uid) return;
  const lastAdmin = S.msgs.filter((m) => m.from === "admin").pop();
  if (lastAdmin) LS.set("ecw-seen-" + S.uid, String(toMs(lastAdmin.createdAt) || Date.now()));
  if (S.conv && S.conv.unreadByVisitor && S.be) S.be.visitorUpdate(S.uid, { unreadByVisitor: false }).catch(() => {});
  renderUnread();
}

/* ------------------------------ 데이터 연결 ------------------------------ */
async function attach(uid) {
  if (S.uid === uid) return;
  S.unsubs.forEach((f) => { try { f(); } catch (e) {} }); S.unsubs = [];
  S.uid = uid;
  S.unsubs.push(S.be.watchConversation(uid, (c) => { S.conv = c; renderMessages(); }));
  S.unsubs.push(S.be.watchMessages(uid, (list) => {
    const before = S.msgs.length;
    S.msgs = list;
    renderMessages();
    if (S.open) markSeen(); else renderUnread();
    if (list.length > before && before > 0 && list[list.length - 1].from === "admin" && !S.open) ping();
  }));
}

async function boot() {
  try {
    S.be = await getBackend();
    S.be.watchStatus((st) => { S.status = st; renderStatus(); });
    const uid = await S.be.visitorInit(false);   // 이전 대화가 있으면 복원
    if (uid) await attach(uid);
    renderMessages();
  } catch (e) {
    statusEl.textContent = "연결할 수 없어요 · 이메일로 문의해 주세요";
  }
}
setInterval(renderStatus, 30000);

/* ------------------------------ 동작 ------------------------------ */
function setOpen(v) {
  S.open = v;
  root.classList.toggle("open", v);
  launch.setAttribute("aria-expanded", String(v));
  launch.setAttribute("aria-label", v ? "상담창 닫기" : "실시간 상담 열기");
  hideTeaser(true);
  if (v) {
    renderMessages(); markSeen();
    body.scrollTop = body.scrollHeight;
    if (window.matchMedia("(min-width:521px)").matches) setTimeout(() => ta.focus(), 250);
    if (window.matchMedia("(max-width:520px)").matches) document.documentElement.style.overflow = "hidden";
  } else {
    document.documentElement.style.overflow = "";
  }
}
launch.addEventListener("click", () => setOpen(!S.open));
$(".ecw-close").addEventListener("click", () => { setOpen(false); launch.focus(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.open) { setOpen(false); launch.focus(); } });
// 외부에서 열기: <a href="#chat"> 또는 window.openChat()
window.openChat = () => setOpen(true);
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest('a[href="#chat"],[data-open-chat]');
  if (a) { e.preventDefault(); setOpen(true); }
});

function autoGrow() { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; sendBtn.disabled = !ta.value.trim() || S.sending; }
ta.addEventListener("input", autoGrow);
ta.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
});
sendBtn.addEventListener("click", send);

async function send(textArg) {
  const text = (typeof textArg === "string" ? textArg : ta.value).trim().slice(0, MAX_LEN);
  if (!text || S.sending || !S.be) return;
  S.sending = true; sendBtn.disabled = true; errEl.style.display = "none";
  try {
    if (!S.uid) { const uid = await S.be.visitorInit(true); await attach(uid); }
    const exists = !!S.conv;
    const first = !exists;
    await S.be.visitorSend(S.uid, text, { page: location.href, name: "", contact: "" }, exists);
    if (typeof textArg !== "string") { ta.value = ""; }
    S.justSent = true;
    maybeAlert(text, first);
  } catch (e) {
    errEl.style.display = "block";
  } finally {
    S.sending = false; autoGrow(); renderMessages();
  }
}

function maybeAlert(text, first) {
  if (online()) return;                                  // 은비님이 접속 중이면 메일 생략
  const key = "ecw-alert-" + S.uid;
  const last = Number(LS.get(key) || 0);
  const gap = (CHAT_CONFIG.alertCooldownMin || 10) * 60 * 1000;
  if (!first && Date.now() - last < gap) return;
  LS.set(key, String(Date.now()));
  sendAlert({ cid: S.uid, text, first, name: (S.conv && S.conv.name) || "", contact: (S.conv && S.conv.contact) || "", page: location.href });
}

body.addEventListener("click", async (e) => {
  const q = e.target.closest("[data-q]");
  if (q) { send(q.getAttribute("data-q")); return; }
  if (e.target.closest(".ecw-card .skip")) { S.cardDismissed = true; LS.set("ecw-card-" + S.uid, "1"); renderMessages(); return; }
  if (e.target.closest(".ecw-card .save")) {
    const name = body.querySelector(".c-name").value.trim().slice(0, 40);
    const contact = body.querySelector(".c-contact").value.trim().slice(0, 80);
    if (!name && !contact) { body.querySelector(".c-name").focus(); return; }
    S.cardDismissed = true; LS.set("ecw-card-" + S.uid, "1");
    try {
      await S.be.visitorUpdate(S.uid, { name, contact });
      if (!online()) sendAlert({ cid: S.uid, text: "(연락처를 남겼어요)", first: false, name, contact, page: location.href, info: true });
    } catch (err) {}
    renderMessages();
  }
});

/* 첫 방문 말풍선 — 세션당 한 번 */
let teaserTimer = null;
function hideTeaser(remember) {
  teaser.classList.remove("show"); clearTimeout(teaserTimer);
  if (remember) { try { sessionStorage.setItem("ecw-teased", "1"); } catch (e) {} }
}
try {
  if (!sessionStorage.getItem("ecw-teased")) teaserTimer = setTimeout(() => { if (!S.open) teaser.classList.add("show"); }, 7000);
} catch (e) {}
teaser.addEventListener("click", (e) => { if (e.target.closest(".tx-close")) { hideTeaser(true); return; } setOpen(true); });
teaser.addEventListener("keydown", (e) => { if (e.key === "Enter") setOpen(true); });

/* 답장 도착 알림음 (창이 닫혀 있을 때) */
function ping() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.32);
  } catch (e) {}
}

// 페이지 첫 화면을 방해하지 않도록 잠시 뒤 연결
if ("requestIdleCallback" in window) requestIdleCallback(boot, { timeout: 2500 }); else setTimeout(boot, 1200);
