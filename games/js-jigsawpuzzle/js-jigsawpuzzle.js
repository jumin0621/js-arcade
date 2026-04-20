const canvas = document.getElementById("puzzleCanvas");
const ctx = canvas.getContext("2d");
const modal = document.getElementById("gameModal");
const progressDisplay = document.getElementById("progressDisplay");
const pieceDisplay = document.getElementById("pieceDisplay");

// [원상복구] 이미지 6개 리스트 누락 없이 전체 포함
const PUZZLE_IMAGES = [
	"https://i.ibb.co/DHN1JxbY/image.png",
	"https://i.ibb.co/r2Gm2XLs/Astonishia-Story-Wallpaper-B-1920x1080.png",
	"https://i.ibb.co/B25ZdxQP/Astonishia-Story-Wallpaper-A-1920x1080.png",
	"https://i.ibb.co/N6PTKf0F/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
	"https://i.ibb.co/BHCmCnSw/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
	"https://i.ibb.co/zV0MwJrH/u2337176951-httpss-mj-run-Uq5lap-HI-p-I-Please-transform-my-styl-b9cfab23-1ca6-4e3b-8b78-5311c8ba566.png",
];

let img = new Image();
let pieces = [];
let gridSize = 3;
let selectedPiece = null;
let offset = { x: 0, y: 0 };
let solvedCount = 0;

document.querySelectorAll(".diff-btn").forEach((btn) => {
	btn.onclick = () => {
		gridSize = parseInt(btn.dataset.grid);
		const randomImg =
			PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
		img.src = randomImg;
		img.onload = () => {
			document.getElementById("hintThumb").style.backgroundImage =
				`url(${img.src})`;
			document.getElementById("hintPreview").style.backgroundImage =
				`url(${img.src})`;
			initGame();
		};
	};
});

function initGame() {
	modal.style.display = "none";
	const container = document.getElementById("gameArea");
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
	createPieces();
	shufflePieces();
	draw();
}

function createPieces() {
	pieces = [];
	solvedCount = 0;
	const pWidth = (canvas.width * 0.8) / gridSize;
	const pHeight = (canvas.height * 0.6) / gridSize;
	const startX = (canvas.width - pWidth * gridSize) / 2;
	const startY = (canvas.height - pHeight * gridSize) / 2;

	for (let r = 0; r < gridSize; r++) {
		for (let c = 0; c < gridSize; c++) {
			pieces.push({
				sx: (img.width / gridSize) * c,
				sy: (img.height / gridSize) * r,
				sw: img.width / gridSize,
				sh: img.height / gridSize,
				destX: startX + c * pWidth,
				destY: startY + r * pHeight,
				x: 0,
				y: 0,
				width: pWidth,
				height: pHeight,
				isSolved: false,
			});
		}
	}
	pieceDisplay.innerText = `${gridSize}x${gridSize}`;
}

function shufflePieces() {
	pieces.forEach((p) => {
		p.x = Math.random() * (canvas.width - p.width);
		p.y = Math.random() * (canvas.height - p.height);
	});
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 가이드 라인 (정답 위치 표시)
	ctx.strokeStyle = "rgba(187, 134, 252, 0.1)";
	pieces.forEach((p) => ctx.strokeRect(p.destX, p.destY, p.width, p.height));

	// 조각 그리기 (맞춘 조각을 밑에, 드래그 중인 조각을 위에 그리기 위해 정렬)
	const sortedPieces = [...pieces].sort((a, b) => a.isSolved - b.isSolved);

	sortedPieces.forEach((p) => {
		ctx.save();
		if (p.isSolved) {
			ctx.drawImage(
				img,
				p.sx,
				p.sy,
				p.sw,
				p.sh,
				p.destX,
				p.destY,
				p.width,
				p.height,
			);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.strokeRect(p.destX, p.destY, p.width, p.height);
		} else {
			ctx.shadowBlur = 10;
			ctx.shadowColor = "black";
			ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, p.x, p.y, p.width, p.height);
			ctx.strokeStyle = "#bb86fc";
			ctx.lineWidth = 2;
			ctx.strokeRect(p.x, p.y, p.width, p.height);
		}
		ctx.restore();
	});
}

canvas.onmousedown = (e) => handleStart(e.offsetX, e.offsetY);
canvas.ontouchstart = (e) => {
	const rect = canvas.getBoundingClientRect();
	handleStart(
		e.touches[0].clientX - rect.left,
		e.touches[0].clientY - rect.top,
	);
};

function handleStart(mx, my) {
	for (let i = pieces.length - 1; i >= 0; i--) {
		const p = pieces[i];
		if (
			!p.isSolved &&
			mx > p.x &&
			mx < p.x + p.width &&
			my > p.y &&
			my < p.y + p.height
		) {
			selectedPiece = p;
			offset.x = mx - p.x;
			offset.y = my - p.y;
			// 선택한 조각을 맨 위로
			pieces.push(pieces.splice(i, 1)[0]);
			break;
		}
	}
}

window.onmousemove = window.ontouchmove = (e) => {
	if (!selectedPiece) return;
	const rect = canvas.getBoundingClientRect();
	const mx = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
	const my = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

	let nX = mx - offset.x;
	let nY = my - offset.y;

	// [유지] 화면 이탈 방지 (70% 이탈 허용 로직)
	const mW = selectedPiece.width * 0.7;
	const mH = selectedPiece.height * 0.7;
	selectedPiece.x = Math.max(
		-mW,
		Math.min(canvas.width - (selectedPiece.width - mW), nX),
	);
	selectedPiece.y = Math.max(
		-mH,
		Math.min(canvas.height - (selectedPiece.height - mH), nY),
	);
	draw();
};

window.onmouseup = window.ontouchend = () => {
	if (!selectedPiece) return;

	// [유지] 스냅 기능 (30px 이내 부착)
	if (
		Math.abs(selectedPiece.x - selectedPiece.destX) < 30 &&
		Math.abs(selectedPiece.y - selectedPiece.destY) < 30
	) {
		selectedPiece.x = selectedPiece.destX;
		selectedPiece.y = selectedPiece.destY;
		selectedPiece.isSolved = true;
		solvedCount++;
	}

	selectedPiece = null;
	draw();

	const progress = Math.round((solvedCount / (gridSize * gridSize)) * 100);
	progressDisplay.innerText = `${progress}%`;

	if (solvedCount === gridSize * gridSize) {
		setTimeout(() => {
			document.getElementById("modalTitle").innerText = "COMPLETED!";
			document.getElementById("modalMessage").innerText =
				"모든 퍼즐조각을 맞췄습니다.";
			document.getElementById("difficultyOptions").style.display = "none";
			document.getElementById("resultOptions").style.display = "flex";
			modal.style.display = "flex";
		}, 500);
	}
};
