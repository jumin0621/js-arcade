/**
 * JS-Arcade 공통 레이아웃 (Header / Footer)
 * - 사용자 지정 디자인 복구
 * - 로컬/배포 환경에 따른 동적 URL 분기 처리
 */

// 1. 현재 환경(로컬 vs 배포) 파악 및 기본 경로(basePath) 설정
const hostname = window.location.hostname;
// 로컬 주소(127.0.0.1 또는 localhost)일 경우에만 폴더명(/js-arcade)을 붙입니다.
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
const basePath = isLocal ? "/web-game/js-arcade" : "";

// 2. 스타일 주입 (제공해주신 CSS 완벽 적용)
const injectStyles = () => {
	const style = document.createElement("style");
	style.textContent = `
    /* 기본 스타일 초기화 */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Pretendard", sans-serif; background-color: #121212; color: #e0e0e0; }
    a { text-decoration: none; color: inherit; }

    /* --- 상단 네비게이션 (헤더) --- */
    header {
      background-color: #1e1e1e;
      border-bottom: 1px solid #333;
      padding: 1rem 2rem;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.5rem; font-weight: bold; color: #bb86fc; }
    .logo-group {
      display: flex; align-items: center; gap: 12px; text-decoration: none;
    }
    .logo-symbol { height: 32px; width: auto; }
    .logo-text {
      font-size: 1.1rem; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; white-space: nowrap;
      background: linear-gradient(to right, #ffffff, #00e5ff);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    
    nav ul { display: flex; list-style: none; gap: 12px; }
    nav ul li {
      color: #b0b0b0; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: color 0.2s;
    }
    /* 현재 보고 있는 메뉴(active)와 마우스 호버 효과 */
    nav ul li:hover, nav ul li a.active { color: #00e5ff; }

    /* --- 푸터 스타일 --- */
    .site-footer {
      background-color: #1a1a1a; color: #666; padding: 60px 20px 40px; 
      text-align: center; border-top: 1px solid #333; margin-top: 50px;
    }
    .footer-content { max-width: 1200px; margin: 0 auto; }
    
    /* 푸터 로고 이미지 효과 */
    .footer-logo img {
      width: 40px; height: auto; margin-bottom: 15px;
      filter: grayscale(1) opacity(0.5); transition: all 0.3s ease;
    }
    .footer-logo img:hover {
      filter: grayscale(0) opacity(1); transform: scale(1.1);
    }
    
    .footer-title { color: #888; font-size: 1.2rem; letter-spacing: 1px; margin-bottom: 10px; }
    .footer-description { margin-bottom: 25px; font-size: 0.85rem; color: #555; }
    .footer-links { margin-bottom: 25px; }
    .footer-links a {
      color: #444; margin: 0 15px; text-decoration: none; font-size: 0.8rem; transition: color 0.2s;
    }
    .footer-links a:hover { color: #00e5ff; }
    .copyright { font-size: 0.75rem; color: #444; letter-spacing: 0.5px; }
    .copyright strong { color: #666; }
  `;
	document.head.appendChild(style);
};

// 3. 헤더 동적 생성
export const initHeader = () => {
	const currentPath = window.location.pathname;

	// 모든 링크에 basePath를 붙여 동적 라우팅 지원
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
          <li><a href="${basePath}/notice/" id="menu-notice">공지사항</a></li>
          <li><a href="${basePath}/devlog/" id="menu-devlog">개발일지</a></li>
        </ul>
      </nav>
    </header>
  `;

	document.body.insertAdjacentHTML("afterbegin", headerHTML);

	// 현재 메뉴에 active(청록색) 활성화 표시 로직
	const setActive = (id) =>
		document.getElementById(id)?.classList.add("active");
	if (currentPath.includes("/ranking")) setActive("menu-ranking");
	else if (currentPath.includes("/notice")) setActive("menu-notice");
	else if (currentPath.includes("/devlog")) setActive("menu-devlog");
	else if (currentPath === basePath + "/" || currentPath.endsWith("index.html"))
		setActive("menu-home");
};

// 4. 푸터 동적 생성
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
          <a href="https://github.com/jumin0621" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://imgtocode.tistory.com" target="_blank" rel="noopener noreferrer">Tistory</a>
        </nav>
        <p class="copyright">
          &copy; 2026 <strong>imgtocode</strong>. All rights reserved.
        </p>
      </div>
    </footer>
  `;
	document.body.insertAdjacentHTML("beforeend", footerHTML);
};

// 스크립트 실행 시 스타일 주입
injectStyles();
