import { db } from "./common/firebase-config.js";
import {
	doc,
	setDoc,
	increment,
	collection,
	getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { initCommentSystem } from "./common/comments.js";

const gameData = [
	{
		id: "snake",
		title: "바닐라 스네이크",
		description: "먹이를 모아 몸을 성장시키고 벽·자기 몸 충돌을 피하는 클래식 아케이드 게임",
		emoji: "🐍",
		path: "games/js-snake/index.html",
		category: "arcade",
	},
	{
		id: "brickmaster",
		title: "브릭 마스터",
		description: "패들과 공을 컨트롤해 벽돌을 깨고 스테이지를 돌파하는 타격감 중심 액션 게임",
		emoji: "🧱",
		path: "games/js-brickmaster/index.html",
		category: "arcade",
	},
	{
		id: "bounce",
		title: "바운스볼",
		description: "중력과 탄성을 이용해 공을 조작하며 함정 지형을 통과하는 물리 퍼즐형 게임",
		emoji: "☄️",
		path: "games/js-bounce/index.html",
		category: "arcade",
	},
	{
		id: "brickstack",
		title: "브릭 스택",
		description: "블록을 정확히 쌓고 라인을 정리해 점수를 높이는 템포형 스택 퍼즐 게임",
		emoji: "🟦",
		path: "games/js-brickstack/index.html",
		category: "arcade",
	},
	{
		id: "bugsweeper",
		title: "버그 스위퍼",
		description: "숫자 힌트를 해석해 숨은 버그 타일을 찾아내는 논리 기반 탐색 퍼즐 게임",
		emoji: "👿",
		path: "games/js-bugsweeper/index.html",
		category: "puzzle",
	},
	{
		id: "sudoku",
		title: "스도쿠",
		description: "행·열·박스 규칙을 지키며 숫자를 채워 완성하는 정통 수리 논리 퍼즐 게임",
		emoji: "✏️",
		path: "games/js-sudoku/index.html",
		category: "puzzle",
	},
	{
		id: "invader",
		title: "코드 브레이커",
		description: "픽셀 탄막을 회피하며 적 패턴을 공략해 클리어하는 레트로 감성 슈팅 게임",
		emoji: "👾",
		path: "games/js-invader/index.html",
		category: "shooting",
	},
	{
		id: "pixelrunner",
		title: "픽셀 러너",
		description: "점프 타이밍으로 장애물을 넘기며 기록을 늘려가는 하이템포 러닝 액션 게임",
		emoji: "🏃‍♂️",
		path: "games/js-pixelrunner/index.html",
		category: "racing",
	},
	{
		id: "puzzle",
		title: "슬라이드 퍼즐",
		description: "타일을 밀어 원본 이미지를 복원하는 단계형 두뇌 트레이닝 슬라이드 퍼즐",
		emoji: "🌆",
		path: "games/js-puzzle/index.html",
		category: "puzzle",
	},
	{
		id: "jigsaw",
		title: "직소 퍼즐",
		description: "조각을 드래그해 정확한 위치에 배치하며 그림을 완성하는 직소 퍼즐 게임",
		emoji: "🧩",
		path: "games/js-jigsawpuzzle/index.html",
		category: "puzzle",
	},
	{
		id: "pixeleater",
		title: "픽셀 이터",
		description: "미로를 순회하며 픽셀을 수집하고 추격 적을 피하는 고전 아케이드 오마주 게임",
		emoji: "👻",
		path: "games/js-pixeleater/index.html",
		category: "arcade",
	},
	{
		id: "pixelmatch",
		title: "픽셀 매치",
		description: "같은 타일을 연결해 제거하며 제한 시간 안에 점수를 올리는 매치 퍼즐 게임",
		emoji: "🀄",
		path: "games/js-pixelmatch/index.html",
		category: "puzzle",
	},
	{
		id: "shieldsurvivor",
		title: "실드 서바이버",
		description: "실드를 유지하며 사방에서 몰려오는 적을 처리하는 생존형 디펜스 슈팅 게임",
		emoji: "🛡️",
		path: "games/js-shieldsurvivor/index.html",
		category: "shooting",
	},
	{
		id: "dragoncurve",
		title: "드래곤 커브",
		description: "장애물과 적 탄환을 동시에 돌파하는 속도감 높은 횡스크롤 드래곤 슈팅 게임",
		emoji: "🐲",
		path: "games/js-dragoncurve/index.html",
		category: "shooting",
	},
	{
		id: "pixellogic",
		title: "픽셀 로직",
		description: "행·열 힌트를 해석해 숨은 도트를 완성하는 노노그램 기반 그림 퍼즐 게임",
		emoji: "❤️",
		path: "games/js-pixellogic/index.html",
		category: "puzzle",
	},
	{
		id: "pixelclimber",
		title: "픽셀 클라이머",
		description: "타이밍 입력으로 방향을 맞춰 끝없이 계단을 오르는 리듬형 반응 속도 게임",
		emoji: "🧗‍♀️",
		path: "games/js-pixelclimber/index.html",
		category: "arcade",
	},
	{
		id: "retroracing",
		title: "레트로 레이싱",
		description: "차선 변경과 회피 타이밍으로 앞차를 추월하는 레트로 스타일 고속 레이싱 게임",
		emoji: "🚗",
		path: "games/js-retroracing/index.html",
		category: "racing",
	},
];

let dbViewStats = {};
let lastStatsFetchedAt = 0;
const STATS_CACHE_MS = 15000;
const searchableGameData = gameData.map((game) => ({
	...game,
	_searchTitle: game.title.toLowerCase(),
	_searchDescription: game.description.toLowerCase(),
}));

function buildGameCardsHTML(games) {
	return games
		.map((game) => {
			const views = dbViewStats[game.id] || 0;
			return `
    <div class="game-card" onclick="enterGameWithCount('${game.id}', '${game.path}')" style="cursor:pointer;">
        <span class="view-count" id="view-${game.id}">👁️ ${views.toLocaleString()}</span>
        <div class="thumbnail">${game.emoji}</div>
        <div class="info">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
        </div>
    </div>`;
		})
		.join("");
}

// 파이어베이스에서 '모든 게임의 조회수'를 한 번에 가져오기
async function fetchGameStats() {
	if (
		Object.keys(dbViewStats).length > 0 &&
		Date.now() - lastStatsFetchedAt < STATS_CACHE_MS
	) {
		return;
	}

	try {
		const snapshot = await getDocs(collection(db, "game_stats"));
		snapshot.forEach((doc) => {
			dbViewStats[doc.id] = doc.data().views || 0;
		});
		lastStatsFetchedAt = Date.now();
	} catch (error) {
		console.error("조회수 데이터 불러오기 실패:", error);
	}
}

// 3. 게임 리스트 화면에 그리기
async function renderGames(options = {}) {
	const { showSkeleton = true } = options;
	const listContainer = document.getElementById("game-list");
	if (!listContainer) return;

	// 데이터를 기다리는 동안 스켈레톤 카드 6개를 미리 띄워둡니다.
	const skeletonHTML = Array(6)
		.fill(0)
		.map(
			() => `
        <div class="skeleton-card">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-desc"></div>
            </div>
        </div>
    `,
		)
		.join("");

	if (showSkeleton) {
		listContainer.innerHTML = skeletonHTML;
	}
	// 파이어베이스에서 조회수 데이터 로딩 (웨이팅 발생 구간)
	await fetchGameStats();

	// 최초 렌더 이후에도 현재 카테고리/검색 상태를 유지한 채 목록 구성
	applyFilters();
}

// 4. 게임 입장 시 파이어베이스 조회수 증가
window.enterGameWithCount = async function (id, path) {
	initCommentSystem(id);

	const gameRef = doc(db, "game_stats", id);

	try {
		await setDoc(gameRef, { views: increment(1) }, { merge: true });
		dbViewStats[id] = (dbViewStats[id] || 0) + 1;
		const viewElement = document.getElementById(`view-${id}`);
		if (viewElement) {
			viewElement.innerText = `👁️ ${dbViewStats[id].toLocaleString()}`;
		}
	} catch (error) {
		console.error("조회수 증가 에러:", error);
	}

	window.enterGame(path);
};

// 5. 검색 및 필터링 기능
// 현재 선택된 카테고리 상태 저장
let currentCategory = "all";

// 카테고리 버튼 클릭 시 실행되는 함수
window.filterCategory = function (category) {
	currentCategory = category;

	// 버튼 UI 활성화/비활성화 처리
	document.querySelectorAll(".filter-btn").forEach((btn) => {
		btn.classList.remove("active");
		if (btn.dataset.category === category) {
			btn.classList.add("active");
		}
	});

	// 카테고리 + 검색어 연동 필터링 실행
	applyFilters();
};

const searchInput = document.getElementById("game-search");
if (searchInput) {
	searchInput.addEventListener("input", applyFilters);
}

// 🔥 카테고리와 검색어를 모두 고려하여 게임을 필터링하는 핵심 함수
function applyFilters() {
	const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

	let filteredGames = searchableGameData;

	// 1. 카테고리로 먼저 필터링
	if (currentCategory !== "all") {
		filteredGames = filteredGames.filter(
			(game) => game.category === currentCategory,
		);
	}

	// 2. 검색어가 있다면 검색어로 2차 필터링
	if (searchTerm) {
		filteredGames = filteredGames.filter(
			(game) =>
				game._searchTitle.includes(searchTerm) ||
				game._searchDescription.includes(searchTerm),
		);
	}

	// 3. 화면에 다시 그리기
	renderFilteredGames(filteredGames);
}

function renderFilteredGames(games) {
	const listContainer = document.getElementById("game-list");
	if (!listContainer) return;
	if (games.length === 0) {
		listContainer.innerHTML = `<p style="color: #666; grid-column: 1/-1; text-align: center; padding: 50px;">검색 결과가 없습니다. 😅</p>`;
		return;
	}
	listContainer.innerHTML = buildGameCardsHTML(games);
}

// 6. 게임 화면 토글 관련 함수들
window.enterGame = function (path) {
	const selectionRoom = document.getElementById("selection-room");
	const playRoom = document.getElementById("play-room");
	const container = document.getElementById("game-container");

	selectionRoom.style.display = "none";
	playRoom.style.display = "block";
	container.src = path;

	container.onload = function () {
		container.contentWindow.focus();
	};
	window.scrollTo(0, 0);
};

window.exitGame = function () {
	document.getElementById("selection-room").style.display = "block";
	document.getElementById("play-room").style.display = "none";
	document.getElementById("game-container").src = "";
	// 로비로 돌아올 때 최신 게임 조회수로 한 번 더 갱신 (전체 방문자 수는 오르지 않음)
	renderGames({ showSkeleton: false });
};

window.addEventListener("DOMContentLoaded", renderGames);
