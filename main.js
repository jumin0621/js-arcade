function playSnake() {
	document.getElementById("game-selection").style.display = "none";
	document.getElementById("game-display").style.display = "block";
	document.getElementById("game-frame").src = "games/snake/index.html";
}

function closeGame() {
	document.getElementById("game-selection").style.display = "block";
	document.getElementById("game-display").style.display = "none";
	document.getElementById("game-frame").src = ""; // 리소스 해제
}

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
		title: "퍼즐 맞추기",
		description: "흩어진 퍼즐 조각을 맞추는 게임",
		emoji: "🧩",
		path: "games/js-puzzle/index.html",
	},
	// 여기에 계속 추가 가능
];

function renderGames() {
	const listContainer = document.getElementById("game-list");
	listContainer.innerHTML = gameData
		.map(
			(game) => `
        <div class="game-card" onclick="enterGame('${game.path}')" style="cursor:pointer;">
            <div class="thumbnail">${game.emoji}</div>
            <div class="info">
                <h3>${game.title}</h3>
                <p>${game.description}</p>
            </div>
        </div>
    `,
		)
		.join("");
}

// 검색창 요소 가져오기
const searchInput = document.getElementById("game-search");

// 입력할 때마다 실행되는 이벤트 리스너
searchInput.addEventListener("input", (e) => {
	const searchTerm = e.target.value.toLowerCase(); // 입력값을 소문자로 변환

	// gameData에서 제목이나 설명에 검색어가 포함된 것만 필터링
	const filteredGames = gameData.filter(
		(game) =>
			game.title.toLowerCase().includes(searchTerm) ||
			game.description.toLowerCase().includes(searchTerm),
	);

	// 필터링된 결과로 화면 다시 그리기
	renderFilteredGames(filteredGames);
});

// 검색 결과 전용 렌더링 함수
function renderFilteredGames(games) {
	const listContainer = document.getElementById("game-list");

	if (games.length === 0) {
		listContainer.innerHTML = `<p style="color: #666; grid-column: 1/-1; text-align: center; padding: 50px;">검색 결과가 없습니다. 😅</p>`;
		return;
	}

	listContainer.innerHTML = games
		.map(
			(game) => `
        <div class="game-card" onclick="enterGame('${game.path}')">
            <div class="thumbnail">${game.emoji}</div>
            <div class="info">
                <h3>${game.title}</h3>
                <p>${game.description}</p>
            </div>
        </div>
    `,
		)
		.join("");
}

// 게임 시작 (방 교체)
function enterGame(path) {
	document.getElementById("selection-room").style.display = "none";
	document.getElementById("play-room").style.display = "block";
	document.getElementById("game-container").src = path;

	const playRoom = document.getElementById("play-room");
	const container = document.getElementById("game-container");

	document.getElementById("selection-room").style.display = "none";
	playRoom.style.display = "block";
	container.src = path;

	// iframe이 로드된 후 포커스를 줌
	container.onload = function () {
		container.contentWindow.focus();
	};

	// 페이지 최상단으로 스크롤 이동
	window.scrollTo(0, 0);
}

// 목록으로 돌아가기
function exitGame() {
	document.getElementById("selection-room").style.display = "block";
	document.getElementById("play-room").style.display = "none";
	document.getElementById("game-container").src = ""; // 메모리 해제
}

window.onload = renderGames;
