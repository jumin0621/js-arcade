// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

const boardElement = document.getElementById("board");
const bugCountElement = document.getElementById("bugCount");
const timerElement = document.getElementById("timer");

const levels = {
	1: { size: 6, bugs: 3 },
	2: { size: 8, bugs: 6 },
	3: { size: 10, bugs: 15 },
	4: { size: 12, bugs: 30 },
	5: { size: 14, bugs: 55 },
};

let currentLevel = 1;
let size, bugTotal, cells, isGameOver, timer, timeElapsed;
let touchTimer;
let isLongPress = false;

// --- 모달 제어 변수 ---
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

// [점수 계산기] 레벨 점수(1000점 단위) + 오픈한 안전 셀 1개당 10점
function calculateScore() {
	const revealedCount = cells.filter(
		(c) => c.revealed && c.type !== "bug",
	).length;
	return (currentLevel - 1) * 1000 + revealedCount * 10;
}

// 1. 초기 시작 모달
function showStartModal() {
	document.getElementById("modalTitle").innerText = "BUG SWEEPER";
	document.getElementById("modalDesc").innerText =
		"숨어있는 버그를 모두 찾아내세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		currentLevel = 1;
		initGame();
	};
	modal.style.display = "flex";
}

// 2. 레벨 클리어 모달 (랭킹 등록 없음)
function showLevelClearModal() {
	document.getElementById("modalTitle").innerText =
		`LEVEL ${currentLevel - 1} CLEAR`;
	document.getElementById("modalDesc").innerText =
		"성공적으로 디버깅했습니다!\n다음 단계로 넘어가시겠습니까?";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "다음 단계";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		initGame();
	};
	modal.style.display = "flex";
}

// 3. 게임 오버 & 올 클리어 모달 (랭킹 등록 진행)
function showGameOverModal(finalScore, isAllClear = false) {
	document.getElementById("modalTitle").innerText = isAllClear
		? "ALL CLEAR!"
		: "GAME OVER";
	document.getElementById("modalDesc").innerText = isAllClear
		? `모든 버그를 제거했습니다!\n최종 점수: ${finalScore}점`
		: `버그를 밟았습니다!\n최종 점수: ${finalScore}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록";
	startBtn.disabled = false;

	// 랭킹 등록
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		// gameId는 bugsweeper!
		const result = await saveGameScore("bugsweeper", nickname, finalScore);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록";
		}
	};

	// 다시 시작 (1레벨부터)
	restartBtn.onclick = () => {
		modal.style.display = "none";
		currentLevel = 1;
		initGame();
	};

	modal.style.display = "flex";
}

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

function handleTouchStart(e, idx) {
	if (isGameOver) return;
	isLongPress = false;

	touchTimer = setTimeout(() => {
		handleRightClick(idx);
		isLongPress = true;
		if (navigator.vibrate) navigator.vibrate(50);
	}, 500);
}

function handleTouchEnd(e, idx) {
	if (touchTimer) {
		clearTimeout(touchTimer);
		touchTimer = null;
	}
	if (!isLongPress) handleClick(idx);
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

// 💣 지뢰 밟음
function gameOver() {
	isGameOver = true;
	clearInterval(timer);
	cells.forEach((c) => {
		if (c.type === "bug") {
			c.element.classList.add("bug");
			c.element.innerText = "💣";
		}
	});
	// 현재까지 달성한 점수로 랭킹 모달 호출
	showGameOverModal(calculateScore(), false);
}

// 🎉 클리어 체크
function checkWin() {
	const safeCells = cells.filter((c) => c.type !== "bug");
	if (safeCells.every((c) => c.revealed)) {
		isGameOver = true;
		clearInterval(timer);

		if (currentLevel < 5) {
			currentLevel++;
			showLevelClearModal(); // 레벨 클리어 모달 (랭킹 X)
		} else {
			// 올 클리어 시 보너스로 남은 시간 반영
			const finalScore = calculateScore() + Math.max(0, 1000 - timeElapsed);
			showGameOverModal(finalScore, true);
		}
	}
}

// 최초 화면 로드 시 시작 모달 표시
showStartModal();
