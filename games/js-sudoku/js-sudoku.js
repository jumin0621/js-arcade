// ✅ 랭킹 저장 함수 임포트
import { saveGameScore } from "../../common/firebase-config.js";

window.addEventListener(
	"keydown",
	function (e) {
		if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
	},
	false,
);

const boardEl = document.getElementById("sudokuBoard");
const padEl = document.getElementById("numberPad");
const levelDisplay = document.getElementById("levelDisplay");
const timerEl = document.getElementById("timer");

// --- 모달 제어 변수 ---
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const rankInputArea = document.getElementById("rankInputArea");
const nicknameInput = document.getElementById("nicknameInput");

const levels = {
	1: { size: 4, boxR: 2, boxC: 2, reveal: 0.7 },
	2: { size: 6, boxR: 2, boxC: 3, reveal: 0.6 },
	3: { size: 9, boxR: 3, boxC: 3, reveal: 0.6 },
	4: { size: 9, boxR: 3, boxC: 3, reveal: 0.5 },
	5: { size: 9, boxR: 3, boxC: 3, reveal: 0.45 },
	6: { size: 9, boxR: 3, boxC: 3, reveal: 0.4 },
	7: { size: 9, boxR: 3, boxC: 3, reveal: 0.35 },
	8: { size: 9, boxR: 3, boxC: 3, reveal: 0.3 },
	9: { size: 9, boxR: 3, boxC: 3, reveal: 0.25 },
	10: { size: 9, boxR: 3, boxC: 3, reveal: 0.2 },
};

let currentLevel = 1;
let board = [],
	solution = [],
	fixed = [];
let selectedIdx = null;
let timer,
	timeElapsed = 0;
let totalScore = 0; // 🔥 누적 점수 변수 추가

// 1. 초기 시작 모달
function showStartModal() {
	document.getElementById("modalTitle").innerText = "SUDOKU";
	document.getElementById("modalDesc").innerText =
		"중복 없이 숫자를 가득 채워주세요!";
	rankInputArea.style.display = "none";
	restartBtn.style.display = "none";

	startBtn.innerText = "게임 시작";
	startBtn.disabled = false;
	startBtn.onclick = () => {
		modal.style.display = "none";
		currentLevel = 1;
		totalScore = 0;
		initGame();
	};
	modal.style.display = "flex";
}

// 2. 레벨 클리어 & 랭킹 등록 모달
function showLevelClearModal(isAllClear = false) {
	document.getElementById("modalTitle").innerText = isAllClear
		? "MASTER CLEAR!"
		: `LEVEL ${currentLevel} CLEAR`;
	document.getElementById("modalDesc").innerText = isAllClear
		? `모든 레벨을 정복했습니다!\n최종 누적 점수: ${totalScore}점`
		: `클리어 타임: ${timeElapsed}초\n현재 누적 점수: ${totalScore}점\n(랭킹을 등록하면 게임이 종료됩니다)`;

	rankInputArea.style.display = "block";
	restartBtn.style.display = "block";
	nicknameInput.value = "";

	startBtn.innerText = "랭킹 등록(종료)";
	startBtn.disabled = false;

	restartBtn.innerText = isAllClear ? "처음부터 다시" : "다음 단계(계속)";

	// 랭킹 등록 진행 (진행 후 초기화)
	startBtn.onclick = async () => {
		const nickname = nicknameInput.value.trim();
		if (!nickname || nickname.length < 2)
			return alert("닉네임을 2자 이상 입력해주세요!");

		startBtn.disabled = true;
		startBtn.innerText = "데이터 확인 중...";

		// gameId는 sudoku!
		const result = await saveGameScore("sudoku", nickname, totalScore);
		alert(result.msg);

		if (result.status !== "error") {
			showStartModal();
		} else {
			startBtn.disabled = false;
			startBtn.innerText = "랭킹 등록(종료)";
		}
	};

	// 랭킹 포기하고 그냥 다음 단계 진행
	restartBtn.onclick = () => {
		modal.style.display = "none";
		if (isAllClear) {
			currentLevel = 1;
			totalScore = 0;
		} else {
			currentLevel++;
		}
		initGame();
	};

	modal.style.display = "flex";
}

function initGame() {
	const conf = levels[currentLevel];
	levelDisplay.innerText = currentLevel;
	timeElapsed = 0;
	clearInterval(timer);
	startTimer();

	solution = Array.from({ length: conf.size }, () => Array(conf.size).fill(0));
	solve(solution, conf);

	board = JSON.parse(JSON.stringify(solution));
	fixed = Array.from({ length: conf.size }, () => Array(conf.size).fill(false));

	const total = conf.size * conf.size;
	const holes = Math.floor(total * (1 - conf.reveal));
	let count = 0;
	while (count < holes) {
		let r = Math.floor(Math.random() * conf.size),
			c = Math.floor(Math.random() * conf.size);
		if (board[r][c] !== 0) {
			board[r][c] = 0;
			count++;
		}
	}
	for (let r = 0; r < conf.size; r++)
		for (let c = 0; c < conf.size; c++)
			if (board[r][c] !== 0) fixed[r][c] = true;

	render(conf);
}

window.addEventListener("keydown", (e) => {
	if (selectedIdx === null) return;
	const size = levels[currentLevel].size;
	let newIdx = selectedIdx;

	if (e.key === "ArrowUp") newIdx -= size;
	if (e.key === "ArrowDown") newIdx += size;
	if (e.key === "ArrowLeft") newIdx -= 1;
	if (e.key === "ArrowRight") newIdx += 1;

	if (newIdx >= 0 && newIdx < size * size) {
		const cells = document.querySelectorAll(".sudoku-cell");
		cells[selectedIdx].classList.remove("selected");
		selectedIdx = newIdx;
		cells[selectedIdx].classList.add("selected");
	}
});

window.addEventListener("keydown", (e) => {
	if (selectedIdx === null) return;
	const r = Math.floor(selectedIdx / levels[currentLevel].size);
	const c = selectedIdx % levels[currentLevel].size;
	if (fixed[r][c]) return;

	const isNumber = /^[0-9]$/.test(e.key);
	const isDelete = e.key === "Backspace" || e.key === "Delete";

	if (isNumber || isDelete) {
		const value = isDelete ? 0 : parseInt(e.key);
		updateCellValue(selectedIdx, value);
	}
});

function updateCellValue(idx, value) {
	const conf = levels[currentLevel];
	const r = Math.floor(idx / conf.size);
	const c = idx % conf.size;
	const cell = boardEl.children[idx];

	board[r][c] = value;
	cell.innerText = value === 0 ? "" : value;

	if (value !== 0 && value !== solution[r][c]) {
		cell.classList.add("error");
	} else {
		cell.classList.remove("error");
	}

	checkWin(conf.size);
}

function solve(grid, conf) {
	for (let r = 0; r < conf.size; r++) {
		for (let c = 0; c < conf.size; c++) {
			if (grid[r][c] === 0) {
				let nums = Array.from({ length: conf.size }, (_, i) => i + 1).sort(
					() => Math.random() - 0.5,
				);
				for (let num of nums) {
					if (check(grid, r, c, num, conf)) {
						grid[r][c] = num;
						if (solve(grid, conf)) return true;
						grid[r][c] = 0;
					}
				}
				return false;
			}
		}
	}
	return true;
}

function check(grid, r, col, num, conf) {
	for (let i = 0; i < conf.size; i++)
		if (grid[r][i] === num || grid[i][col] === num) return false;
	let startR = Math.floor(r / conf.boxR) * conf.boxR,
		startC = Math.floor(col / conf.boxC) * conf.boxC;
	for (let i = 0; i < conf.boxR; i++)
		for (let j = 0; j < conf.boxC; j++)
			if (grid[startR + i][startC + j] === num) return false;
	return true;
}

function render(conf) {
	boardEl.innerHTML = "";
	const header = document.querySelector(".game-header");
	setTimeout(() => {
		if (board && header) {
			const boardWidth = boardEl.getBoundingClientRect().width;
			header.style.width = boardWidth + "px";
			header.style.maxWidth = boardWidth + "px";
			header.style.minWidth = boardWidth + "px";
		}
	}, 0);

	let cellSize = 40;
	if (conf.size === 6) cellSize = 35;
	if (conf.size === 9) cellSize = 32;

	boardEl.style.gridTemplateColumns = `repeat(${conf.size}, ${cellSize}px)`;

	for (let i = 0; i < conf.size * conf.size; i++) {
		const r = Math.floor(i / conf.size),
			c = i % conf.size;
		const cell = document.createElement("div");
		cell.className = "sudoku-cell";

		if ((c + 1) % conf.boxC === 0 && c !== conf.size - 1)
			cell.classList.add("border-right");
		if ((r + 1) % conf.boxR === 0 && r !== conf.size - 1)
			cell.classList.add("border-bottom");

		cell.style.width = `${cellSize}px`;
		cell.style.height = `${cellSize}px`;
		cell.style.fontSize = `${cellSize * 0.5}px`;

		if (fixed[r][c]) {
			cell.classList.add("fixed");
			cell.innerText = board[r][c];
		}

		cell.onclick = () => {
			if (fixed[r][c]) return;
			const prevSelected = document.querySelector(".sudoku-cell.selected");
			if (prevSelected) prevSelected.classList.remove("selected");
			selectedIdx = i;
			cell.classList.add("selected");
		};
		boardEl.appendChild(cell);
	}
	renderPad(conf.size);
}

function renderPad(size) {
	padEl.innerHTML = "";
	padEl.style.gridTemplateColumns = `repeat(5, 1fr)`;

	for (let i = 0; i <= size; i++) {
		const btn = document.createElement("div");
		btn.className = "num-btn";
		btn.innerText = i === 0 ? "CLR" : i;
		btn.onclick = () => {
			if (selectedIdx === null) return;
			const r = Math.floor(selectedIdx / size),
				c = selectedIdx % size;
			const cell = boardEl.children[selectedIdx];

			board[r][c] = i;
			cell.innerText = i === 0 ? "" : i;

			if (i !== 0 && i !== solution[r][c]) {
				cell.classList.add("error");
			} else {
				cell.classList.remove("error");
			}
			checkWin(size);
		};
		padEl.appendChild(btn);
	}
}

// 🏆 스도쿠 점수 계산 로직 추가
function checkWin(size) {
	for (let r = 0; r < size; r++)
		for (let c = 0; c < size; c++) if (board[r][c] !== solution[r][c]) return;

	clearInterval(timer);

	// 점수 = (레벨 * 1000) + (남은 시간 보너스)
	const baseScore = currentLevel * 1000;
	const timeBonus = Math.max(0, currentLevel * 300 - timeElapsed * 10);
	totalScore += baseScore + timeBonus;

	if (currentLevel < 10) {
		showLevelClearModal(false);
	} else {
		showLevelClearModal(true);
	}
}

function startTimer() {
	timer = setInterval(() => {
		timeElapsed++;
		timerEl.innerText = timeElapsed;
	}, 1000);
}

// 최초 화면 로드
showStartModal();
