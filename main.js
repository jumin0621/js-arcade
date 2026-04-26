import { db } from "./common/firebase-config.js";
import {
	doc,
	setDoc,
	increment,
	collection,
	getDocs,
	getDoc,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { initCommentSystem } from "./common/comments.js";

const gameData = [
	{
		id: "snake",
		title: "바닐라 스네이크",
		description: "뱀의 몸통을 늘리는 게임",
		emoji: "🐍",
		path: "games/js-snake/index.html",
		category: "arcade",
	},
	{
		id: "brickmaster",
		title: "브릭 마스터",
		description: "벽돌을 부수는 게임",
		emoji: "🧱",
		path: "games/js-brickmaster/index.html",
		category: "arcade",
	},
	{
		id: "bounce",
		title: "바운스볼",
		description: "공을 튕겨서 탈출시키는 게임",
		emoji: "☄️",
		path: "games/js-bounce/index.html",
		category: "arcade",
	},
	{
		id: "brickstack",
		title: "브릭 스택",
		description: "블록 없애기 게임",
		emoji: "🟦",
		path: "games/js-brickstack/index.html",
		category: "arcade",
	},
	{
		id: "bugsweeper",
		title: "버그 스위퍼",
		description: "버그를 찾아내는 게임",
		emoji: "👿",
		path: "games/js-bugsweeper/index.html",
		category: "puzzle",
	},
	{
		id: "sudoku",
		title: "스도쿠",
		description: "1~9까지 숫자를 중복없이 채우는 게임",
		emoji: "✏️",
		path: "games/js-sudoku/index.html",
		category: "puzzle",
	},
	{
		id: "invader",
		title: "코드 브레이커",
		description: "바닐라JS로 버그를 격파하는 게임",
		emoji: "👾",
		path: "games/js-invader/index.html",
		category: "shooting",
	},
	{
		id: "pixelrunner",
		title: "픽셀 러너",
		description: "장애물을 피해서 달리는 게임",
		emoji: "🏃‍♂️",
		path: "games/js-pixelrunner/index.html",
		category: "escape",
	},
	{
		id: "puzzle",
		title: "슬라이드 퍼즐",
		description: "슬라이드로 완성하는 퍼즐 게임",
		emoji: "🌆",
		path: "games/js-puzzle/index.html",
		category: "puzzle",
	},
	{
		id: "jigsaw",
		title: "직소 퍼즐",
		description: "퍼즐 조각을 맞추는 게임",
		emoji: "🧩",
		path: "games/js-jigsawpuzzle/index.html",
		category: "puzzle",
	},
	{
		id: "pixeleater",
		title: "픽셀 이터",
		description: "데이터를 먹어치우는 게임",
		emoji: "👻",
		path: "games/js-pixeleater/index.html",
		category: "escape",
	},
	{
		id: "pixelmatch",
		title: "픽셀 매치",
		description: "같은 그림을 매치시키는 게임",
		emoji: "🀄",
		path: "games/js-pixelmatch/index.html",
		category: "puzzle",
	},
	{
		id: "shieldsurvivor",
		title: "실드 서바이버",
		description: "사방에서 몰려드는 적을 격추하는 게임",
		emoji: "🛡️",
		path: "games/js-shieldsurvivor/index.html",
		category: "shooting",
	},
	{
		id: "dragoncurve",
		title: "드래곤 커브",
		description: "전통 방식의 횡스크롤 슈팅 게임 ",
		emoji: "🐲",
		path: "games/js-dragoncurve/index.html",
		category: "shooting",
	},
	{
		id: "pixellogic",
		title: "픽셀 로직",
		description: "픽셀로 그림을 그리는 퍼즐 게임",
		emoji: "❤️",
		path: "games/js-pixellogic/index.html",
		category: "shooting",
	},
];

let dbViewStats = {};

// 파이어베이스에서 '모든 게임의 조회수'를 한 번에 가져오기
async function fetchGameStats() {
	try {
		const snapshot = await getDocs(collection(db, "game_stats"));
		snapshot.forEach((doc) => {
			dbViewStats[doc.id] = doc.data().views || 0;
		});
	} catch (error) {
		console.error("조회수 데이터 불러오기 실패:", error);
	}
}

// 3. 게임 리스트 화면에 그리기
async function renderGames() {
	await fetchGameStats();

	const listContainer = document.getElementById("game-list");

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

	listContainer.innerHTML = skeletonHTML;
	// 파이어베이스에서 조회수 데이터 로딩 (웨이팅 발생 구간)
	await fetchGameStats();

	// 로딩이 끝나면 스켈레톤을 지우고 진짜 게임 데이터로 덮어씌웁니다.
	listContainer.innerHTML = gameData
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

	listContainer.innerHTML = gameData
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

	let filteredGames = gameData;

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
				game.title.toLowerCase().includes(searchTerm) ||
				game.description.toLowerCase().includes(searchTerm),
		);
	}

	// 3. 화면에 다시 그리기
	renderFilteredGames(filteredGames);
}

function renderFilteredGames(games) {
	const listContainer = document.getElementById("game-list");
	if (games.length === 0) {
		listContainer.innerHTML = `<p style="color: #666; grid-column: 1/-1; text-align: center; padding: 50px;">검색 결과가 없습니다. 😅</p>`;
		return;
	}
	listContainer.innerHTML = games
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
	renderGames();
};

window.onload = renderGames;
