import { db } from "./common/firebase-config.js";
// ✅ 에러 방지를 위해 CDN에서 직접 파이어베이스 함수들을 가져옵니다.
import {
	doc,
	setDoc,
	increment,
	collection,
	getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const gameData = [
	{
		id: "snake",
		title: "바닐라 스네이크",
		description: "뱀의 몸통을 늘리는 게임",
		emoji: "🐍",
		path: "games/js-snake/index.html",
	},
	{
		id: "brickmaster",
		title: "브릭 마스터",
		description: "벽돌을 부수는 게임",
		emoji: "🧱",
		path: "games/js-brickmaster/index.html",
	},
	{
		id: "bounce",
		title: "바운스볼",
		description: "공을 튕겨서 탈출시키는 게임",
		emoji: "☄️",
		path: "games/js-bounce/index.html",
	},
	{
		id: "brickstack",
		title: "브릭 스택",
		description: "블록 없애기 게임",
		emoji: "🟦",
		path: "games/js-brickstack/index.html",
	},
	{
		id: "bugsweeper",
		title: "버그 스위퍼",
		description: "버그를 찾아내는 게임",
		emoji: "👿",
		path: "games/js-bugsweeper/index.html",
	},
	{
		id: "sudoku",
		title: "스도쿠",
		description: "1~9까지 숫자를 충복없이 채우는 게임",
		emoji: "✏️",
		path: "games/js-sudoku/index.html",
	},
	{
		id: "invader",
		title: "코드 브레이커",
		description: "바닐라JS로 버그 코드를 격파하는 게임",
		emoji: "👾",
		path: "games/js-invader/index.html",
	},
	{
		id: "pixelrunner",
		title: "픽셀 러너",
		description: "장애물을 피해서 달리는 게임",
		emoji: "🏃‍♂️",
		path: "games/js-pixelrunner/index.html",
	},
	{
		id: "puzzle",
		title: "슬라이드 퍼즐",
		description: "슬라이드로 완성하는 퍼즐 게임",
		emoji: "🖼️",
		path: "games/js-puzzle/index.html",
	},
	{
		id: "jigsaw",
		title: "직소 퍼즐",
		description: "퍼즐 조각을 맞추는 게임",
		emoji: "🧩",
		path: "games/js-jigsawpuzzle/index.html",
	},
	{
		id: "pixeleater",
		title: "픽셀 이터",
		description: "몬스터를 피해 데이터를 먹어치우는 게임",
		emoji: "👻",
		path: "games/js-pixeleater/index.html",
	},
];

// DB에서 불러온 각 게임의 실제 조회수를 담아둘 객체
let dbViewStats = {};

// 1. 전체 사이트 방문자 수 증가 로직
async function updateVisitCount() {
	try {
		const statsRef = doc(db, "site_stats", "total_visits");
		await setDoc(statsRef, { count: increment(1) }, { merge: true });
	} catch (error) {
		console.error("전체 방문자 업데이트 실패:", error);
	}
}

// 2. 파이어베이스에서 '모든 게임의 조회수'를 한 번에 가져오기
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
	updateVisitCount(); // 전체 방문자 +1
	await fetchGameStats(); // DB 데이터 동기화 완료 대기

	const listContainer = document.getElementById("game-list");
	listContainer.innerHTML = gameData
		.map((game) => {
			// DB에 값이 없으면 0으로 표시
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

// 4. 게임 입장 시 파이어베이스 조회수 증가 (HTML에서 접근 가능하도록 window 객체에 할당)
window.enterGameWithCount = async function (id, path) {
	const gameRef = doc(db, "game_stats", id);

	try {
		// 파이어베이스 DB 조회수 +1 업데이트
		await setDoc(gameRef, { views: increment(1) }, { merge: true });

		// 사용자 화면(DOM)의 숫자도 바로 변경하여 딜레이가 없게 만듦
		dbViewStats[id] = (dbViewStats[id] || 0) + 1;
		const viewElement = document.getElementById(`view-${id}`);
		if (viewElement) {
			viewElement.innerText = `👁️ ${dbViewStats[id].toLocaleString()}`;
		}
	} catch (error) {
		console.error("조회수 증가 에러:", error);
	}

	// 기존 게임 진입 로직 실행
	window.enterGame(path);
};

// 5. 검색 기능
const searchInput = document.getElementById("game-search");
searchInput.addEventListener("input", (e) => {
	const searchTerm = e.target.value.toLowerCase();
	const filteredGames = gameData.filter(
		(game) =>
			game.title.toLowerCase().includes(searchTerm) ||
			game.description.toLowerCase().includes(searchTerm),
	);
	renderFilteredGames(filteredGames);
});

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
	// 로비로 돌아올 때 최신 조회수로 한 번 더 갱신
	renderGames();
};

// 페이지 로드 시 최초 실행
window.onload = renderGames;
