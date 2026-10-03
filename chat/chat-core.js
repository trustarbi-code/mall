// ============================================================
//  실시간 상담 — 데이터 연결 모듈 (수정할 필요 없음)
//  Firebase 설정이 있으면 Firebase, 없으면 미리보기(데모) 저장소를 사용합니다.
// ============================================================
import { CHAT_CONFIG } from "./chat-config.js";

const FB_VER = "10.12.2";
const FB = `https://www.gstatic.com/firebasejs/${FB_VER}`;

export const isDemo = !(CHAT_CONFIG.firebase && CHAT_CONFIG.firebase.apiKey);
export const ONLINE_WINDOW_MS = 2.5 * 60 * 1000;   // 관리 페이지 신호가 이 시간 안에 있으면 "상담 가능"
export const MAX_LEN = 1000;

export function isAdminOnline(st) {
  if (!st || !st.online) return false;
  const t = toMs(st.lastSeen);
  return !!t && Date.now() - t < ONLINE_WINDOW_MS;
}
export function toMs(t) {
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (t.seconds) return t.seconds * 1000;
  return 0;
}

/* ------------------------------------------------------------
   Firebase 백엔드
------------------------------------------------------------ */
async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`)
  ]);
  const app = initializeApp(CHAT_CONFIG.firebase);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const now = () => F.serverTimestamp();
  const convRef = (cid) => F.doc(db, "conversations", cid);
  const msgCol = (cid) => F.collection(db, "conversations", cid, "messages");
  const statusRef = F.doc(db, "status", "admin");
  const est = { serverTimestamps: "estimate" };

  return {
    // --- 공통
    watchStatus(cb) {
      return F.onSnapshot(statusRef, (s) => cb(s.exists() ? s.data(est) : null), () => cb(null));
    },
    watchMessages(cid, cb) {
      const q = F.query(msgCol(cid), F.orderBy("createdAt", "asc"), F.limit(300));
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data(est) }))), () => cb([]));
    },
    // --- 방문자
    // create=false: 예전에 대화한 적 있는 방문자만 복원(새 익명 계정을 만들지 않음)
    async visitorInit(create) {
      await A.setPersistence(auth, A.browserLocalPersistence).catch(() => {});
      if (!auth.currentUser) {
        await new Promise((res) => { const off = A.onAuthStateChanged(auth, () => { off(); res(); }); });
      }
      if (!auth.currentUser && create) await A.signInAnonymously(auth);
      return auth.currentUser ? auth.currentUser.uid : null;
    },
    watchConversation(cid, cb) {
      return F.onSnapshot(convRef(cid), (s) => cb(s.exists() ? s.data(est) : null), () => cb(null));
    },
    async visitorSend(cid, text, meta, exists) {
      if (!exists) {
        try { exists = (await F.getDoc(convRef(cid))).exists(); } catch (e) {}
      }
      if (!exists) {
        await F.setDoc(convRef(cid), {
          name: meta.name || "", contact: meta.contact || "", page: (meta.page || "").slice(0, 300),
          createdAt: now(), updatedAt: now(), lastMessage: text.slice(0, 120), lastSender: "visitor",
          unreadByAdmin: true, unreadByVisitor: false
        });
      }
      await F.addDoc(msgCol(cid), { from: "visitor", text, createdAt: now() });
      if (exists) {
        await F.updateDoc(convRef(cid), {
          updatedAt: now(), lastMessage: text.slice(0, 120), lastSender: "visitor", unreadByAdmin: true
        });
      }
    },
    async visitorUpdate(cid, patch) {
      const allowed = {};
      ["name", "contact", "unreadByVisitor"].forEach((k) => { if (k in patch) allowed[k] = patch[k]; });
      await F.updateDoc(convRef(cid), allowed);
    },
    // --- 관리자
    async adminWatchAuth(cb) {
      await A.setPersistence(auth, A.browserLocalPersistence).catch(() => {});
      return A.onAuthStateChanged(auth, (u) => cb(u ? { email: u.email, verified: u.emailVerified, name: u.displayName } : null));
    },
    async adminSignIn() {
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      await A.signInWithPopup(auth, p);
    },
    async adminSignOut() { await A.signOut(auth); },
    watchConversations(cb, onErr) {
      const q = F.query(F.collection(db, "conversations"), F.orderBy("updatedAt", "desc"), F.limit(200));
      return F.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data(est) }))), (e) => onErr && onErr(e));
    },
    async adminSend(cid, text) {
      await F.addDoc(msgCol(cid), { from: "admin", text, createdAt: now() });
      await F.updateDoc(convRef(cid), {
        updatedAt: now(), lastMessage: text.slice(0, 120), lastSender: "admin", unreadByAdmin: false, unreadByVisitor: true
      });
    },
    async adminMarkRead(cid) { await F.updateDoc(convRef(cid), { unreadByAdmin: false }); },
    async adminSetStatus(online) { await F.setDoc(statusRef, { online: !!online, lastSeen: now() }); },
    async adminDelete(cid) {
      const snap = await F.getDocs(msgCol(cid));
      await Promise.all(snap.docs.map((d) => F.deleteDoc(d.ref)));
      await F.deleteDoc(convRef(cid));
    }
  };
}

/* ------------------------------------------------------------
   미리보기(데모) 백엔드 — 같은 브라우저의 탭끼리만 대화가 오갑니다.
------------------------------------------------------------ */
function demoBackend() {
  const KEY = "ecw-demo-db";
  const ch = ("BroadcastChannel" in window) ? new BroadcastChannel("ecw-demo") : null;
  const subs = new Set();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { conv: {}, status: null }; } catch (e) { return { conv: {}, status: null }; } };
  const write = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} fire(); if (ch) ch.postMessage("u"); };
  const fire = () => subs.forEach((f) => { try { f(); } catch (e) {} });
  if (ch) ch.onmessage = fire;
  window.addEventListener("storage", (e) => { if (e.key === KEY) fire(); });
  const sub = (f) => { subs.add(f); setTimeout(f, 0); return () => subs.delete(f); };
  const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const conv = (d, cid) => d.conv[cid];

  return {
    watchStatus(cb) { return sub(() => cb(read().status)); },
    watchMessages(cid, cb) { return sub(() => { const c = conv(read(), cid); cb(c ? c.messages.slice() : []); }); },
    async visitorInit(create) {
      let u = null; try { u = localStorage.getItem("ecw-demo-uid"); } catch (e) {}
      if (!u && create) { u = "demo-" + id(); try { localStorage.setItem("ecw-demo-uid", u); } catch (e) {} }
      return u;
    },
    watchConversation(cid, cb) { return sub(() => { const c = conv(read(), cid); if (!c) return cb(null); const { messages, ...rest } = c; cb(rest); }); },
    async visitorSend(cid, text, meta) {
      const d = read(); const t = Date.now();
      if (!d.conv[cid]) d.conv[cid] = { name: meta.name || "", contact: meta.contact || "", page: meta.page || "", createdAt: t, messages: [] };
      const c = d.conv[cid];
      c.messages.push({ id: id(), from: "visitor", text, createdAt: t });
      Object.assign(c, { updatedAt: t, lastMessage: text.slice(0, 120), lastSender: "visitor", unreadByAdmin: true });
      write(d);
    },
    async visitorUpdate(cid, patch) { const d = read(); if (d.conv[cid]) { Object.assign(d.conv[cid], patch); write(d); } },
    async adminWatchAuth(cb) { setTimeout(() => cb({ email: CHAT_CONFIG.adminEmail, verified: true, name: "미리보기" }), 0); return () => {}; },
    async adminSignIn() {}, async adminSignOut() {},
    watchConversations(cb) {
      return sub(() => {
        const d = read();
        cb(Object.entries(d.conv).map(([k, v]) => { const { messages, ...rest } = v; return { id: k, ...rest }; })
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      });
    },
    async adminSend(cid, text) {
      const d = read(); const c = d.conv[cid]; if (!c) return; const t = Date.now();
      c.messages.push({ id: id(), from: "admin", text, createdAt: t });
      Object.assign(c, { updatedAt: t, lastMessage: text.slice(0, 120), lastSender: "admin", unreadByAdmin: false, unreadByVisitor: true });
      write(d);
    },
    async adminMarkRead(cid) { const d = read(); if (d.conv[cid]) { d.conv[cid].unreadByAdmin = false; write(d); } },
    async adminSetStatus(online) { const d = read(); d.status = { online: !!online, lastSeen: Date.now() }; write(d); },
    async adminDelete(cid) { const d = read(); delete d.conv[cid]; write(d); }
  };
}

let _backend = null;
export function getBackend() {
  if (!_backend) _backend = isDemo ? Promise.resolve(demoBackend()) : firebaseBackend();
  return _backend;
}

/* ------------------------------------------------------------
   Gmail 알림 (Apps Script) — 응답을 기다리지 않는 단방향 호출
------------------------------------------------------------ */
export function sendAlert(payload) {
  if (!CHAT_CONFIG.alertUrl) return;
  try {
    fetch(CHAT_CONFIG.alertUrl, {
      method: "POST", mode: "no-cors", keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function fmtTime(ms) {
  if (!ms) return "";
  const d = new Date(ms), n = new Date();
  const hm = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === n.toDateString()) return hm;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
export { CHAT_CONFIG };
