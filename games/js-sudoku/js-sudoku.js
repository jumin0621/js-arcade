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
const modal = document.getElementById("gameModal");
const startBtn = document.getElementById("startBtn");

// 1. 단계별 설정 (size: 판크기, boxR/boxC: 박스규격, reveal: 공개비율)
const levels = {
	1: { size: 4, boxR: 2, boxC: 2, reveal: 0.7 }, // 4x4 입문
	2: { size: 6, boxR: 2, boxC: 3, reveal: 0.6 }, // 6x6 초급
	3: { size: 9, boxR: 3, boxC: 3, reveal: 0.6 }, // 9x9 중급 시작
	4: { size: 9, boxR: 3, boxC: 3, reveal: 0.5 },
	5: { size: 9, boxR: 3, boxC: 3, reveal: 0.45 },
	6: { size: 9, boxR: 3, boxC: 3, reveal: 0.4 },
	7: { size: 9, boxR: 3, boxC: 3, reveal: 0.35 },
	8: { size: 9, boxR: 3, boxC: 3, reveal: 0.3 },
	9: { size: 9, boxR: 3, boxC: 3, reveal: 0.25 },
	10: { size: 9, boxR: 3, boxC: 3, reveal: 0.2 }, // 최상급
};

let currentLevel = 1;
let board = [],
	solution = [],
	fixed = [];
let selectedIdx = null;
let timer,
	timeElapsed = 0;

startBtn.onclick = () => {
	modal.style.display = "none";
	initGame();
};

function initGame() {
	const conf = levels[currentLevel];
	levelDisplay.innerText = currentLevel;
	timeElapsed = 0;
	clearInterval(timer);
	startTimer();

	// 1. 정답 판 생성 (Backtracking)
	solution = Array.from({ length: conf.size }, () => Array(conf.size).fill(0));
	solve(solution, conf);

	// 2. 문제 판 생성
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

	// 범위를 벗어나지 않을 때만 선택 이동
	if (newIdx >= 0 && newIdx < size * size) {
		const cells = document.querySelectorAll(".sudoku-cell");
		cells[selectedIdx].classList.remove("selected");
		selectedIdx = newIdx;
		cells[selectedIdx].classList.add("selected");
	}
});

// 키보드 입력 이벤트 추가
window.addEventListener("keydown", (e) => {
	// 1. 선택된 셀이 없으면 무시
	if (selectedIdx === null) return;

	const r = Math.floor(selectedIdx / levels[currentLevel].size);
	const c = selectedIdx % levels[currentLevel].size;

	// 이미 고정된(시작 시 주어진) 숫자는 수정 불가
	if (fixed[r][c]) return;

	// 2. 누른 키가 숫자인지 확인 (0~9)
	// 숫자 키패드와 상단 숫자 키 모두 대응
	const isNumber = /^[0-9]$/.test(e.key);

	// 3. 백스페이스나 Delete 키는 숫자 0(지우기)과 동일하게 처리
	const isDelete = e.key === "Backspace" || e.key === "Delete";

	if (isNumber || isDelete) {
		const value = isDelete ? 0 : parseInt(e.key);

		// 로직 실행 (기존 숫자 패드 클릭 시와 동일한 로직)
		updateCellValue(selectedIdx, value);
	}
});

// 중복 코드를 방지하기 위해 입력 로직을 별도 함수로 분리 (권장)
function updateCellValue(idx, value) {
	const conf = levels[currentLevel];
	const r = Math.floor(idx / conf.size);
	const c = idx % conf.size;
	const cell = boardEl.children[idx];

	board[r][c] = value;
	cell.innerText = value === 0 ? "" : value;

	// 정답 검증 시각적 피드백
	if (value !== 0 && value !== solution[r][c]) {
		cell.classList.add("error");
	} else {
		cell.classList.remove("error");
	}

	checkWin(conf.size);
}

// 백트래킹 알고리즘
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

	// 모바일 터치 최적화 타일 크기 (size에 따라 유동적으로)
	// 4x4일 때는 크게, 9x9일 때는 적당하게 조정
	let cellSize = 40;
	if (conf.size === 6) cellSize = 35;
	if (conf.size === 9) cellSize = 32;

	boardEl.style.gridTemplateColumns = `repeat(${conf.size}, ${cellSize}px)`;

	for (let i = 0; i < conf.size * conf.size; i++) {
		const r = Math.floor(i / conf.size),
			c = i % conf.size;
		const cell = document.createElement("div");
		cell.className = "sudoku-cell";

		// 박스 경계선 강조 로직
		if ((c + 1) % conf.boxC === 0 && c !== conf.size - 1)
			cell.classList.add("border-right");
		if ((r + 1) % conf.boxR === 0 && r !== conf.size - 1)
			cell.classList.add("border-bottom");

		cell.style.width = `${cellSize}px`;
		cell.style.height = `${cellSize}px`;
		cell.style.fontSize = `${cellSize * 0.5}px`; // 타일 크기에 비례한 폰트 크기

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
	// 숫자 패드도 현재 판 크기에 맞게 1~N 까지 생성
	padEl.style.gridTemplateColumns = `repeat(5, 1fr)`;

	for (let i = 0; i <= size; i++) {
		const btn = document.createElement("div");
		btn.className = "num-btn";
		btn.innerText = i === 0 ? "CLR" : i; // 0은 지우기 버튼으로 표기
		btn.onclick = () => {
			if (selectedIdx === null) return;
			const r = Math.floor(selectedIdx / size),
				c = selectedIdx % size;
			const cell = boardEl.children[selectedIdx];

			board[r][c] = i;
			cell.innerText = i === 0 ? "" : i;

			// 정답 검증 및 시각적 피드백
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

function checkWin(size) {
	for (let r = 0; r < size; r++)
		for (let c = 0; c < size; c++) if (board[r][c] !== solution[r][c]) return;
	clearInterval(timer);
	if (currentLevel < 10) {
		showModal("LEVEL CLEAR", "완벽한 논리입니다!", "다음 레벨");
		currentLevel++;
	} else {
		showModal(
			"MASTER CLEAR",
			"당신은 진정한 스도쿠 마스터입니다!",
			"처음부터 다시",
		);
		currentLevel = 1;
	}
}

function startTimer() {
	timer = setInterval(() => {
		timeElapsed++;
		timerEl.innerText = timeElapsed;
	}, 1000);
}
function showModal(t, p, b) {
	modal.querySelector("h2").innerText = t;
	modal.querySelector("p").innerText = p;
	startBtn.innerText = b;
	modal.style.display = "flex";
}
