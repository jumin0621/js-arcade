/**
 * JS-Arcade 공통 레이아웃 (Header / Footer / Visitor Counter)
 * - 사용자 지정 디자인 복구
 * - 로컬/배포 환경에 따른 동적 URL 분기 처리
 */

import {
	doc,
	setDoc,
	getDoc,
	increment,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const hostname = window.location.hostname;
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
const basePath = isLocal ? "/web-game/js-arcade" : "";
//const basePath = isLocal ? "/js-arcade" : "";

// 1. 스타일 주입 (제공해주신 CSS + 카운터 CSS)
const injectStyles = () => {
	const style = document.createElement("style");
	style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Pretendard", sans-serif; background-color: #121212; color: #e0e0e0; }
    a { text-decoration: none; color: inherit; }

    /* --- 헤더 --- */
    header { background-color: #1e1e1e; border-bottom: 1px solid #333; padding: 1rem 2rem; position: sticky; top: 0; z-index: 100; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 1.5rem; font-weight: bold; color: #bb86fc; }
    .logo-group { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-symbol { height: 32px; width: auto; }
    .logo-text { font-size: 1.1rem; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; white-space: nowrap; background: linear-gradient(to right, #ffffff, #00e5ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    
    nav ul { display: flex; list-style: none; gap: 12px; }
    nav ul li { color: #b0b0b0; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: color 0.2s; }
    nav ul li:hover, nav ul li a.active { color: #00e5ff; }
    @media (max-width: 768px) {
      .logo-text { display: none; }
    }

    /* --- 푸터 --- */
    .site-footer { background-color: #1a1a1a; color: #666; padding: 60px 20px 40px; text-align: center; border-top: 1px solid #333; margin-top: 50px; }
    .footer-content { max-width: 1200px; margin: 0 auto; }
    .footer-logo img { width: 40px; height: auto; margin-bottom: 15px; filter: grayscale(1) opacity(0.5); transition: all 0.3s ease; }
    .footer-logo img:hover { filter: grayscale(0) opacity(1); transform: scale(1.1); }
    .footer-title { color: #888; font-size: 1.2rem; letter-spacing: 1px; margin-bottom: 10px; }
    .footer-description { margin-bottom: 25px; font-size: 0.85rem; color: #555; }
    .footer-links { margin-bottom: 25px; }
    .footer-links a { color: #444; margin: 0 15px; text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
    .footer-links a:hover { color: #00e5ff; }
    .copyright { font-size: 0.75rem; color: #444; letter-spacing: 0.5px; }
    .copyright strong { color: #666; }

    /* --- 방문자 카운터 (플로팅 위젯) --- */
    .visitor-counter {
      position: fixed; bottom: 20px; right: 20px;
      background: rgba(30, 30, 30, 0.85); backdrop-filter: blur(5px);
      border: 1px solid #444; border-radius: 10px; padding: 12px 20px;
      display: flex; align-items: center; gap: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); z-index: 1000;
    }
    .visitor-stat { display: flex; flex-direction: column; align-items: center; }
    .v-label { font-size: 0.75rem; color: #888; letter-spacing: 1px; margin-bottom: 4px; }
    .v-value { font-size: 1.3rem; font-weight: 800; color: #fff; }
    .visitor-stat:last-child .v-value { color: #00e5ff; }
    .v-divider { width: 1px; height: 30px; background: #444; }
    @media (max-width: 768px) {
      .visitor-counter { bottom: 15px; right: 50%; transform: translateX(50%); padding: 10px 25px; width: max-content; }
    }
  `;
	document.head.appendChild(style);
};

// 2. 헤더 동적 생성
export const initHeader = () => {
	const currentPath = window.location.pathname;
	const headerHTML = `
    <header>
      <a href="${basePath}/" class="logo-group" aria-label="JS-Arcade 홈으로 이동">
        <img src="https://i.ibb.co/21Jb6jD1/image.png" alt="JS-Arcade 로고 심볼" class="logo-symbol" />
        <span class="logo-text">JS-Arcade</span>
      </a>
      <nav>
        <ul>
          <li><a href="${basePath}/" id="menu-home">홈</a></li>
          <li><a href="${basePath}/ranking/" id="menu-ranking">랭킹</a></li>
          <li><a href="${basePath}/game-intro/" id="menu-game-intro">게임소개</a></li>
          <li><a href="${basePath}/notice/" id="menu-notice">공지사항</a></li>
          <li><a href="${basePath}/devlog/" id="menu-devlog">개발일지</a></li>
        </ul>
      </nav>
    </header>
  `;
	document.body.insertAdjacentHTML("afterbegin", headerHTML);

	const setActive = (id) =>
		document.getElementById(id)?.classList.add("active");
	if (currentPath.includes("/ranking")) setActive("menu-ranking");
	else if (currentPath.includes("/game-intro")) setActive("menu-game-intro");
	else if (currentPath.includes("/notice")) setActive("menu-notice");
	else if (currentPath.includes("/devlog")) setActive("menu-devlog");
	else if (currentPath === basePath + "/" || currentPath.endsWith("index.html"))
		setActive("menu-home");
};

// 3. 푸터 동적 생성
export const initFooter = () => {
	const footerHTML = `
    <footer class="site-footer">
      <div class="footer-content">
        <a href="${basePath}/" class="footer-logo">
          <img src="https://i.ibb.co/21Jb6jD1/image.png" alt="JS-Arcade 하단 로고" />
        </a>
        <h2 class="footer-title">JS-Arcade</h2>
        <p class="footer-description">Pure Vanilla JS Web Game Archive</p>
        <nav class="footer-links">
          <a href="https://github.com/jumin0621" target="_blank">GitHub</a>
          <a href="https://imgtocode.tistory.com" target="_blank">Tistory</a>
					<a href="${basePath}/privacy.html" style="color: #bb86fc;">개인정보처리방침</a>
					<a href="https://open.kakao.com/o/sSTaIFpi" target="_blank" rel="noopener noreferrer">문의하기</a>
        </nav>
        <p class="copyright">&copy; 2026 <strong>imgtocode</strong>. All rights reserved.</p>
      </div>
    </footer>
  `;
	document.body.insertAdjacentHTML("beforeend", footerHTML);
};

// 4. 공통 방문자 카운터 동적 생성 및 로직
export const initVisitorCounter = async () => {
	// 위젯 HTML 주입
	const counterHTML = `
      <div class="visitor-counter">
			 <div class="visitor-stat">
          <span class="v-label">TODAY</span>
          <span class="v-value" id="todayVisits">...</span>
        </div>
        <div class="v-divider"></div>
        <div class="visitor-stat">
          <span class="v-label">TOTAL</span>
          <span class="v-value" id="totalVisits">...</span>
        </div>
       
      </div>
    `;
	document.body.insertAdjacentHTML("beforeend", counterHTML);

	try {
		// 경로 꼬임 방지를 위해 firebase-config 동적 임포트 (basePath 활용)
		const { db } = await import(`${basePath}/common/firebase-config.js`);
		const statsRef = doc(db, "site_stats", "total_visits");
		const todayStr = new Date().toLocaleDateString("ko-KR", {
			timeZone: "Asia/Seoul",
		});
		const lastVisitDate = localStorage.getItem("last_visit_date");

		const docSnap = await getDoc(statsRef);
		let currentTotal = 0;
		let currentToday = 0;
		let lastDateInDB = "";

		if (docSnap.exists()) {
			const data = docSnap.data();
			currentTotal = data.total || data.count || 0;
			currentToday = data.today || 0;
			lastDateInDB = data.lastDate;
		}

		// DB 갱신 로직 (하루 한 번만 +1)
		if (lastVisitDate !== todayStr) {
			if (lastDateInDB !== todayStr) {
				await setDoc(
					statsRef,
					{ total: increment(1), today: 1, lastDate: todayStr },
					{ merge: true },
				);
				document.getElementById("totalVisits").innerText = currentTotal + 1;
				document.getElementById("todayVisits").innerText = 1;
			} else {
				await setDoc(
					statsRef,
					{ total: increment(1), today: increment(1) },
					{ merge: true },
				);
				document.getElementById("totalVisits").innerText = currentTotal + 1;
				document.getElementById("todayVisits").innerText = currentToday + 1;
			}
			localStorage.setItem("last_visit_date", todayStr); // 도장 쾅!
		} else {
			// 이미 방문했으면 읽어오기만 (새로고침 방어)
			if (lastDateInDB !== todayStr) {
				document.getElementById("totalVisits").innerText = currentTotal;
				document.getElementById("todayVisits").innerText = 0;
			} else {
				document.getElementById("totalVisits").innerText = currentTotal;
				document.getElementById("todayVisits").innerText = currentToday;
			}
		}
	} catch (error) {
		console.error("방문자 카운터 에러:", error);
		document.getElementById("totalVisits").innerText = "-";
		document.getElementById("todayVisits").innerText = "-";
	}
};

// 스크립트 실행 시 스타일 즉시 주입
injectStyles();
