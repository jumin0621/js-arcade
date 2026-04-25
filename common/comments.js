import { db } from "./firebase-config.js";
import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	onSnapshot,
	serverTimestamp,
	doc,
	deleteDoc,
	getDoc,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

let unsubscribe = null;
let currentGameId = null;

export function initCommentSystem(gameId) {
	currentGameId = gameId;
	const listEl = document.getElementById("commentList");

	if (unsubscribe) unsubscribe();

	const q = query(
		collection(db, "comments"),
		where("gameId", "==", gameId),
		orderBy("createdAt", "desc"),
	);

	unsubscribe = onSnapshot(q, (snapshot) => {
		if (!listEl) return;
		listEl.innerHTML = "";

		snapshot.forEach((docSnap) => {
			const data = docSnap.data();
			const date = data.createdAt?.toDate().toLocaleDateString() || "방금 전";
			// 고유 ID 추출
			const commentId = docSnap.id;

			listEl.innerHTML += `
                <div class="comment-item" style="border-bottom: 1px solid #222; padding: 15px 0;">
                    <div class="comment-info" style="font-size: 0.85rem; margin-bottom: 5px; display: flex; justify-content: space-between;">
                        <div>
                            <strong style="color: #bb86fc;">${data.nickname}</strong> 
                            <span style="color: #666; margin-left: 10px;">${date}</span>
                        </div>
                        <button class="delete-btn" data-id="${commentId}" style="background: none; border: none; color: #ff2e63; cursor: pointer; font-size: 0.8rem;">[삭제]</button>
                    </div>
                    <div class="comment-text" style="color: #ddd; line-height: 1.5; word-break: break-word;">${data.content}</div>
                </div>
            `;
		});
	});

	// 🔥 삭제 버튼 이벤트 위임 (리스트 전체에 하나의 이벤트만 걸어서 효율성 극대화)
	if (!listEl.dataset.bound) {
		listEl.dataset.bound = "true";
		listEl.addEventListener("click", async (e) => {
			if (e.target.classList.contains("delete-btn")) {
				const commentId = e.target.dataset.id;

				// 프롬프트 창으로 비밀번호 묻기
				const inputPw = prompt("댓글을 삭제하시려면 비밀번호를 입력해주세요.");
				if (!inputPw) return;

				try {
					const docRef = doc(db, "comments", commentId);
					const docSnap = await getDoc(docRef);

					if (docSnap.exists()) {
						const dbPassword = docSnap.data().password;

						// 비밀번호 검증
						if (dbPassword === inputPw) {
							await deleteDoc(docRef);
							alert("댓글이 정상적으로 삭제되었습니다. 🗑️");
						} else {
							alert("비밀번호가 일치하지 않습니다! 🚨");
						}
					}
				} catch (err) {
					console.error("삭제 중 오류 발생:", err);
					alert("삭제에 실패했습니다.");
				}
			}
		});
	}
	// 🔥 빠른 추천 문구 클릭 이벤트
	const phraseChips = document.querySelectorAll(".phrase-chips .chip");
	const contentInput = document.getElementById("commentContent");

	if (!listEl.dataset.chipBound) {
		listEl.dataset.chipBound = "true"; // 중복 바인딩 방지
		phraseChips.forEach((chip) => {
			chip.addEventListener("click", () => {
				const currentText = contentInput.value;
				const newText = chip.innerText;

				// 기존에 쓰던 글이 있다면 띄어쓰기 후 이어붙이고, 없으면 그냥 넣기
				if (currentText.trim() === "") {
					contentInput.value = newText;
				} else {
					contentInput.value = currentText + " " + newText;
				}

				// 글자수 제한(100자) 넘어가면 잘라내기
				if (contentInput.value.length > 100) {
					contentInput.value = contentInput.value.substring(0, 100);
				}

				// 입력창으로 커서(포커스) 자동 이동
				contentInput.focus();
			});
		});
	}
}

// 4. 등록 버튼 이벤트
const submitBtn = document.getElementById("submitComment");
if (submitBtn && !submitBtn.dataset.bound) {
	submitBtn.dataset.bound = "true";

	submitBtn.onclick = async () => {
		if (!currentGameId) return;

		const nickInput = document.getElementById("commentNickname");
		const pwInput = document.getElementById("commentPassword"); // 비밀번호
		const contentInput = document.getElementById("commentContent");

		const nickname = nickInput.value.trim();
		const password = pwInput.value.trim();
		const content = contentInput.value.trim();

		if (!nickname || !password || !content) {
			return alert("닉네임, 비밀번호, 내용을 모두 입력해주세요!");
		}

		try {
			submitBtn.disabled = true;
			submitBtn.innerText = "등록 중...";

			await addDoc(collection(db, "comments"), {
				gameId: currentGameId,
				nickname: nickname,
				password: password, // 데이터베이스에 비밀번호 함께 저장
				content: content,
				createdAt: serverTimestamp(),
			});

			// 내용만 비우기 (연속 댓글 작성을 위해 닉네임과 비번은 유지)
			contentInput.value = "";
		} catch (err) {
			console.error("댓글 저장 실패:", err);
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerText = "등록";
		}
	};
}
