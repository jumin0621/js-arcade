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
		title: "클래식 스네이크",
		description: "가장 고전적인 뱀 통과하기 게임",
		emoji: "🐍",
		path: "games/snake/index.html",
	},
	{
		id: "brick",
		title: "브릭 마스터",
		description: "레트로 게임의 정석 벽돌깨기",
		emoji: "🧱",
		path: "games/brick/index.html",
	},
	{
		id: "bounce",
		title: "바운스볼",
		description: "공튕기기 게임의 귀환",
		emoji: "🧱",
		path: "games/bounce/index.html",
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
