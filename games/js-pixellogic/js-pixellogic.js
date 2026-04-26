// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

window.addEventListener("contextmenu", (e) => e.preventDefault());

const boardEl = document.getElementById("gameBoard");
const topHintsEl = document.getElementById("topHints");
const leftHintsEl = document.getElementById("leftHints");
const modeBtn = document.getElementById("modeToggle");
const timerEl = document.getElementById("timerDisplay");
const levelDisplay = document.getElementById("levelDisplay");
const gridLayoutEl = document.querySelector(".logic-grid-layout");

const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

let currentLevel = 1;
let isXMode = false;
let timer = 0;
let timerInterval = null;
let totalScore = 0;
let solution = [];
let userBoard = [];
let isGameOver = false;

// 🌟 [수정됨] 12x12 스테이지 2종 추가 (총 7단계)
const stages = {
	1: {
		name: "하트",
		size: 5,
		data: [
			[0, 1, 0, 1, 0],
			[1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1],
			[0, 1, 1, 1, 0],
			[0, 0, 1, 0, 0],
		],
	},
	2: {
		name: "화분",
		size: 5,
		data: [
			[0, 0, 1, 0, 0],
			[0, 1, 1, 1, 0],
			[0, 0, 1, 0, 0],
			[0, 1, 1, 1, 0],
			[0, 1, 1, 1, 0],
		],
	},
	// 🔥 3단계 수정: 5칸짜리 확실한 시작점(선체 부분)이 존재하는 '배' 모양으로 변경!
	3: {
		name: "배",
		size: 5,
		data: [
			[0, 0, 1, 0, 0],
			[0, 0, 1, 1, 0],
			[0, 1, 1, 1, 0],
			[1, 1, 1, 1, 1],
			[0, 1, 1, 1, 0],
		],
	},
	4: {
		name: "우산",
		size: 10,
		data: [
			[0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 10칸 힌트 제공
			[0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
		],
	},
	5: {
		name: "외계인",
		size: 10,
		data: [
			[0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
			[0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
			[0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 10칸 힌트 제공
			[1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
			[1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
			[0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		],
	},
	6: {
		name: "별",
		size: 12,
		data: [
			[0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
			[0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 12칸 힌트 제공
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
			[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0],
			[0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
			[0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
			[1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
		],
	},
	7: {
		name: "해골",
		size: 12,
		data: [
			[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
			[0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
			[0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
			[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
			[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
			[0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0],
			[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0],
			[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		],
	},
};
const MAX_LEVEL = 7;

function showStartModal() {
	modalTitle.innerText = "PIXEL LOGIC";
	modalDesc.innerText = "숫자 힌트를 보고 숨겨진 그림을 찾아보세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		currentLevel = 1;
		totalScore = 0;
		initGame(currentLevel);
	};
	modal.style.display = "flex";
}

function showClearModal(isAllClear, stageScore) {
	modalTitle.innerText = isAllClear
		? "ALL CLEAR!"
		: `STAGE ${currentLevel} CLEAR`;
	modalDesc.innerText = isAllClear
		? `모든 그림을 완성했습니다!\n최종 점수: ${totalScore}점`
		: `그림 완성!\n획득 점수: ${stageScore}점\n현재 누적 점수: ${totalScore}점`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록(종료)";
	startBtn.disabled = false;
	restartBtn.innerText = isAllClear ? "처음부터 다시" : "다음 단계";

	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		const result = await saveGameScore("pixellogic", nickname, totalScore);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록(종료)";
		}
	};

	restartBtn.onclick = () => {
		modal.style.display = "none";
		if (isAllClear) {
			currentLevel = 1;
			totalScore = 0;
		} else {
			currentLevel++;
		}
		initGame(currentLevel);
	};

	modal.style.display = "flex";
}

function initGame(level) {
	isGameOver = false;
	const stage = stages[level];
	solution = stage.data;
	const size = stage.size;
	userBoard = Array(size)
		.fill(0)
		.map(() => Array(size).fill(0));

	levelDisplay.innerText = level;
	startTimer();

	gridLayoutEl.classList.remove("reveal-mode");
	boardEl.classList.remove("reveal-board");

	const wrapper = document.querySelector(".game-wrapper");
	const availableWidth = wrapper.clientWidth - 40;
	const availableHeight = window.innerHeight - 200;

	// 🔥 실제 가장 긴 힌트 개수를 구해 낭비되는 공간을 최소화
	let maxRowHints = 1,
		maxColHints = 1;
	for (let r = 0; r < size; r++)
		maxRowHints = Math.max(maxRowHints, getHints(solution[r]).length);
	for (let c = 0; c < size; c++)
		maxColHints = Math.max(
			maxColHints,
			getHints(solution.map((row) => row[c])).length,
		);

	let cellSize = Math.floor(
		Math.min(
			availableWidth / (size + maxRowHints * 0.8),
			availableHeight / (size + maxColHints * 0.8),
		),
	);

	if (cellSize > 55) cellSize = 55;
	if (cellSize < 15) cellSize = 15;

	renderLayout(size, cellSize);
}

function getHints(arr) {
	let hints = [];
	let count = 0;
	arr.forEach((val) => {
		if (val === 1) count++;
		else if (count > 0) {
			hints.push(count);
			count = 0;
		}
	});
	if (count > 0) hints.push(count);
	return hints.length ? hints : [0];
}

function renderLayout(size, cellSize) {
	const boardWidth = cellSize * size;

	// max-content를 사용하여 왼쪽 여백 완전 제거
	gridLayoutEl.style.gridTemplateColumns = `max-content ${boardWidth}px`;
	const hintFontSize = Math.max(11, Math.floor(cellSize * 0.35));

	topHintsEl.innerHTML = "";
	topHintsEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;

	leftHintsEl.innerHTML = "";
	leftHintsEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

	boardEl.innerHTML = "";
	boardEl.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
	boardEl.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

	// 힌트를 span으로 감싸서 간격 유지 및 10 단위 숫자 가독성 향상
	for (let c = 0; c < size; c++) {
		const colData = solution.map((row) => row[c]);
		const hints = getHints(colData);
		const el = document.createElement("div");
		el.className = "hint-col";
		el.style.fontSize = `${hintFontSize}px`;
		el.innerHTML = hints.map((h) => `<span>${h}</span>`).join("");
		topHintsEl.appendChild(el);
	}

	for (let r = 0; r < size; r++) {
		const hints = getHints(solution[r]);
		const el = document.createElement("div");
		el.className = "hint-row";
		el.style.fontSize = `${hintFontSize}px`;
		el.innerHTML = hints.map((h) => `<span>${h}</span>`).join("");
		leftHintsEl.appendChild(el);
	}

	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			const cell = document.createElement("div");
			cell.className = "cell";

			if ((c + 1) % 5 === 0 && c !== size - 1)
				cell.classList.add("border-right");
			if ((r + 1) % 5 === 0 && r !== size - 1)
				cell.classList.add("border-bottom");

			cell.onmousedown = (e) => handleInput(r, c, e);
			boardEl.appendChild(cell);
		}
	}

	// 게임 헤더(STAGE, TIME) 너비를 게임판 컨테이너 너비와 똑같이 맞춤
	setTimeout(() => {
		const container = document.querySelector(".logic-container");
		const header = document.querySelector(".game-header");
		if (container && header) {
			header.style.width = container.offsetWidth + "px";
			header.style.margin = "0 auto"; // 중앙 정렬 보장
		}
	}, 10);
}

function handleInput(r, c, e) {
	if (isGameOver) return;
	const cell = boardEl.children[r * solution.length + c];

	if (e.button === 2 || isXMode) {
		if (cell.classList.contains("filled")) return;
		cell.classList.toggle("marked");
	} else {
		if (cell.classList.contains("marked")) return;
		cell.classList.toggle("filled");
		userBoard[r][c] = cell.classList.contains("filled") ? 1 : 0;
		checkWin();
	}
}

function checkWin() {
	const isWin = solution.every((row, r) =>
		row.every((val, c) => val === userBoard[r][c]),
	);

	if (isWin) {
		clearInterval(timerInterval);
		isGameOver = true;

		gridLayoutEl.classList.add("reveal-mode");
		boardEl.classList.add("reveal-board");

		Array.from(boardEl.children).forEach((cell) => {
			cell.classList.add("reveal-cell");
		});

		const filledCount = solution.flat().filter((v) => v === 1).length;
		const stageScore = Math.max(
			0,
			filledCount * 10 + currentLevel * 50 - timer,
		);
		totalScore += stageScore;

		setTimeout(() => {
			showClearModal(currentLevel >= MAX_LEVEL, stageScore);
		}, 2000);
	}
}

modeBtn.onclick = () => {
	isXMode = !isXMode;
	modeBtn.innerText = isXMode ? "❌ X 표시 모드" : "✏️ 칠하기 모드";
	modeBtn.className = `mode-btn ${isXMode ? "x-mode" : "fill-mode"}`;
};

function startTimer() {
	timer = 0;
	clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		timer++;
		timerEl.innerText = timer;
	}, 1000);
}

showStartModal();
