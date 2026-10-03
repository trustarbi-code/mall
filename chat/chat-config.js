// ============================================================
//  실시간 상담 설정 파일 — 은비님이 수정하는 파일은 이것 하나뿐입니다.
//  (설정가이드.md 의 순서대로 값을 채워 넣으세요)
// ============================================================

export const CHAT_CONFIG = {

  // [1] Firebase 설정값 — Firebase 콘솔 > 프로젝트 설정 > 내 앱 > "SDK 설정 및 구성"에서 복사
  //     apiKey 가 비어 있으면 "미리보기(데모) 모드"로 동작합니다. (같은 브라우저 안에서만 대화가 오감)
  firebase: {
    apiKey: "AIzaSyCvljV7d2_FaVOAZKcugb_7sPgStXntMMY",
    authDomain: "eunbi-chat.firebaseapp.com",
    projectId: "eunbi-chat",
    storageBucket: "eunbi-chat.firebasestorage.app",
    messagingSenderId: "977997443695",
    appId: "1:977997443695:web:39696aed4e7c6f8f10939a"
  },

  // [2] 상담 관리 페이지에 로그인할 구글 계정 (이 계정만 모든 대화를 볼 수 있습니다)
  adminEmail: "sdchloe5@gmail.com",

  // [3] Gmail 알림용 Apps Script 웹앱 주소 (배포 후 받은 https://script.google.com/macros/s/.../exec)
  //     비워두면 메일 알림 없이 채팅만 동작합니다.
  alertUrl: "https://script.google.com/macros/s/AKfycbxwa7X5ad7_AFlBA_5-BzH6Pan7VZ8yuTU-iHFNwck_ytqFBLZ2zxG7zt2YZQ4MsMJO/exec",

  // [4] 화면 문구
  profile: {
    name: "오은비",
    role: "영업지원 · 이커머스 온보딩 PM",
    avatar: "chat/avatar.jpg",
    greeting: "안녕하세요, 오은비입니다.\n포트폴리오를 보시고 궁금한 점이 있으면 편하게 남겨주세요. 확인하는 대로 답장드릴게요.",
    quickReplies: ["면접 일정을 조율하고 싶어요", "프로젝트에 대해 더 알고 싶어요", "이력서·자료를 받고 싶어요"],
    email: "sdchloe5@gmail.com"
  },

  // [5] 알림 조건 — 같은 대화에서 알림 메일을 다시 보내기까지의 최소 간격(분)
  alertCooldownMin: 10
};
