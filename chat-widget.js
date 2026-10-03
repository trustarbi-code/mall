// ============================================================
//  실시간 상담 — 불러오기 파일 (수정할 필요 없음)
//  사용법: 페이지 </body> 바로 앞에
//    <script type="module" src="chat/chat-widget.js"></script>
// ============================================================
import { isDemo } from "./chat-core.js";

// Firebase 연결 전(미리보기 모드)에는 실제 방문자에게 상담 아이콘을 숨깁니다.
// 미리보기는 주소 끝에 ?chatdemo 를 붙이거나 내 컴퓨터(localhost)에서 열 때만 보여요.
const allowDemo = /(^|[?&])chatdemo\b/.test(location.search) || /^(localhost|127\.0\.0\.1)?$/.test(location.hostname);

if (!isDemo || allowDemo) import("./chat-ui.js");
