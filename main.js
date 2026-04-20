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

function renderGames() {
	const listContainer = document.getElementById("game-list");
	listContainer.innerHTML = gameData
		.map((game) => {
			// 로컬에서 조회수 가져오기 (기본값 랜덤 부여로 플랫폼 느낌 살리기)
			let views = localStorage.getItem(`v-${game.id}`);
			if (!views) {
				// 조회수 수정
				views = Math.floor(Math.random() * 1000) + 50;
				localStorage.setItem(`v-${game.id}`, views);
			}
			return `
    <div class="game-card" onclick="enterGameWithCount('${game.id}', '${game.path}')" style="cursor:pointer;">
        <span class="view-count">👁️ ${parseInt(views).toLocaleString()}</span>
        <div class="thumbnail">${game.emoji}</div>
        <div class="info">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
        </div>
    </div>`;
		})
		.join("");
}

// 조회수 증가 후 게임 입장
function enterGameWithCount(id, path) {
	// 로컬 조회수 즉시 증가
	let currentViews = parseInt(localStorage.getItem(`v-${id}`)) || 0;
	localStorage.setItem(`v-${id}`, currentViews + 1);

	enterGame(path);
}

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
			let views = localStorage.getItem(`v-${game.id}`) || 0;
			return `
        <div class="game-card" onclick="enterGameWithCount('${game.id}', '${game.path}')">
        <span class="view-count">👁️ ${parseInt(views).toLocaleString()}</span>
        <div class="thumbnail">${game.emoji}</div>
        <div class="info">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
        </div>
    </div>`;
		})
		.join("");
}

function enterGame(path) {
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
}

function exitGame() {
	document.getElementById("selection-room").style.display = "block";
	document.getElementById("play-room").style.display = "none";
	document.getElementById("game-container").src = "";
	renderGames(); // 돌아올 때 조회수 갱신
}

window.onload = renderGames;
