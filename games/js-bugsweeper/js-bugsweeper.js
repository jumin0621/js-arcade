const boardElement = document.getElementById("board");
const bugCountElement = document.getElementById("bugCount");
const timerElement = document.getElementById("timer");
const modal = document.getElementById("gameModal");
const modalTitle = modal.querySelector("h2");
const modalText = modal.querySelector("p");
const startBtn = document.getElementById("startBtn");

const levels = {
	1: { size: 6, bugs: 3 },
	2: { size: 8, bugs: 6 },
	3: { size: 10, bugs: 15 },
	4: { size: 12, bugs: 30 },
	5: { size: 14, bugs: 55 },
};

let currentLevel = 1;
let size, bugTotal, cells, isGameOver, timer, timeElapsed;
let touchTimer; // 롱탭 감지용 타이머
let isLongPress = false; // 롱탭이 실행되었는지 확인하는 플래그

startBtn.onclick = () => {
	modal.style.display = "none";
	initGame();
};

function initGame() {
	const config = levels[currentLevel];
	size = config.size;
	bugTotal = config.bugs;
	cells = [];
	isGameOver = false;
	timeElapsed = 0;

	clearInterval(timer);
	timerElement.innerText = "0";
	bugCountElement.innerText = bugTotal;
	boardElement.innerHTML = "";

	const cellSize = Math.floor(280 / size);
	boardElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;

	const boardData = Array(size * size).fill("empty");
	let bugPlaced = 0;
	while (bugPlaced < bugTotal) {
		const idx = Math.floor(Math.random() * boardData.length);
		if (boardData[idx] !== "bug") {
			boardData[idx] = "bug";
			bugPlaced++;
		}
	}

	for (let i = 0; i < size * size; i++) {
		const el = document.createElement("div");
		el.classList.add("cell");
		el.style.width = `${cellSize}px`;
		el.style.height = `${cellSize}px`;

		const cellData = {
			id: i,
			element: el,
			type: boardData[i],
			revealed: false,
			flagged: false,
			neighborBugs: 0,
		};

		// --- 클릭 및 롱탭(모바일 깃발) 이벤트 ---
		el.addEventListener("touchstart", (e) => handleTouchStart(e, i), {
			passive: false,
		});
		el.addEventListener("touchend", (e) => handleTouchEnd(e, i), {
			passive: false,
		});
		el.addEventListener("mousedown", (e) => {
			if (e.button === 0) handleClick(i);
		});
		el.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			handleRightClick(i);
		});

		boardElement.appendChild(el);
		cells.push(cellData);
	}
	calculateNeighbors();
	startTimer();
}

// 모바일 롱탭 로직
function handleTouchStart(e, idx) {
	if (isGameOver) return;
	isLongPress = false; // 시작할 때는 항상 false

	touchTimer = setTimeout(() => {
		handleRightClick(idx); // 깃발 토글 실행
		isLongPress = true; // 롱탭이 성공적으로 실행됨을 표시

		// 깃발이 꽂힐 때 진동 피드백 (지원하는 기기에서)
		if (navigator.vibrate) navigator.vibrate(50);
	}, 500);
}

function handleTouchEnd(e, idx) {
	if (touchTimer) {
		clearTimeout(touchTimer); // 타이머 초기화
		touchTimer = null;
	}

	// [핵심 수정] 롱탭이 실행되지 않았을 때만(짧게 눌렀을 때만) 클릭 실행
	if (!isLongPress) {
		handleClick(idx);
	}

	// 이벤트 전파 방지 (필요 시)
	if (e.cancelable) e.preventDefault();
}

function calculateNeighbors() {
	cells.forEach((cell, i) => {
		if (cell.type === "bug") return;
		let count = 0;
		getNeighbors(i).forEach((idx) => {
			if (cells[idx].type === "bug") count++;
		});
		cell.neighborBugs = count;
	});
}

function getNeighbors(index) {
	const neighbors = [];
	const row = Math.floor(index / size);
	const col = index % size;
	for (let y = -1; y <= 1; y++) {
		for (let x = -1; x <= 1; x++) {
			const r = row + y,
				c = col + x;
			if (r >= 0 && r < size && c >= 0 && c < size && !(y === 0 && x === 0)) {
				neighbors.push(r * size + c);
			}
		}
	}
	return neighbors;
}

function handleClick(idx) {
	if (isGameOver || cells[idx].revealed || cells[idx].flagged) return;
	if (cells[idx].type === "bug") {
		gameOver();
	} else {
		revealCell(idx);
		checkWin();
	}
}

function revealCell(idx) {
	const cell = cells[idx];
	if (cell.revealed) return;
	cell.revealed = true;
	cell.element.classList.add("revealed");
	if (cell.neighborBugs > 0) {
		cell.element.innerText = cell.neighborBugs;
		cell.element.setAttribute("data-num", cell.neighborBugs);
	} else {
		getNeighbors(idx).forEach((nIdx) => revealCell(nIdx));
	}
}

function handleRightClick(idx) {
	if (isGameOver || cells[idx].revealed) return;
	cells[idx].flagged = !cells[idx].flagged;
	cells[idx].element.classList.toggle("flag");
}

function startTimer() {
	timer = setInterval(() => {
		timeElapsed++;
		timerElement.innerText = timeElapsed;
	}, 1000);
}

function showModal(title, text, btnText) {
	modalTitle.innerText = title;
	modalText.innerText = text;
	startBtn.innerText = btnText;
	modal.style.display = "flex";
}

function gameOver() {
	isGameOver = true;
	clearInterval(timer);
	cells.forEach((c) => {
		if (c.type === "bug") {
			c.element.classList.add("bug");
			c.element.innerText = "💣";
		}
	});
	showModal(
		"GAME OVER",
		"버그가 시스템을 장악했습니다! 다시 디버깅하시겠습니까?",
		"재시작",
	);
}

function checkWin() {
	const safeCells = cells.filter((c) => c.type !== "bug");
	if (safeCells.every((c) => c.revealed)) {
		isGameOver = true;
		clearInterval(timer);
		if (currentLevel < 5) {
			showModal(
				`LEVEL ${currentLevel} CLEAR`,
				`성공적으로 디버깅했습니다! 다음 단계로 넘어가시겠습니까?`,
				"다음 단계",
			);
			currentLevel++;
		} else {
			showModal(
				"ALL CLEAR",
				"모든 시스템의 버그를 완벽하게 제거했습니다!",
				"처음부터 다시",
			);
			currentLevel = 1;
		}
	}
}
