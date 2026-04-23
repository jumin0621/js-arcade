// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import {
	collection,
	query,
	where,
	getDocs,
	addDoc,
	updateDoc,
	serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
	apiKey: "AIzaSyBLtO8XI50TH39TuhwBAPG1volbquLvsAA",
	authDomain: "js-arcade.firebaseapp.com",
	projectId: "js-arcade",
	storageBucket: "js-arcade.firebasestorage.app",
	messagingSenderId: "258991520448",
	appId: "1:258991520448:web:8fa463a7a29d3a6ad90b25",
	measurementId: "G-EZJHX4SPWH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);

/**
 * 점수 저장 고도화 함수 (최고 점수 갱신형)
 */
export const saveGameScore = async (gameId, nickname, score) => {
	const leaderboardsRef = collection(db, "leaderboards");

	// 1. 해당 게임에서 이 닉네임으로 등록된 기록이 있는지 조회
	const q = query(
		leaderboardsRef,
		where("gameId", "==", gameId),
		where("nickname", "==", nickname),
	);

	try {
		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			// 2. 기록이 이미 있는 경우
			const docRef = querySnapshot.docs[0].ref;
			const existingData = querySnapshot.docs[0].data();

			if (Number(score) > existingData.score) {
				// 기존 점수보다 높을 때만 업데이트!
				await updateDoc(docRef, {
					score: Number(score),
					updatedAt: serverTimestamp(),
				});
				return {
					status: "updated",
					msg: "축하합니다! 최고 기록을 경신했습니다! 🏆",
				};
			} else {
				// 기존 점수가 더 높거나 같을 때
				return {
					status: "maintained",
					msg: "아쉽네요! 기존 기록이 더 높습니다. 다음 기회에! 💪",
				};
			}
		} else {
			// 3. 기록이 없는 경우 (새로 등록)
			await addDoc(leaderboardsRef, {
				gameId,
				nickname,
				score: Number(score),
				createdAt: serverTimestamp(),
			});
			return { status: "new", msg: "명예의 전당 첫 등록을 축하합니다! 👑" };
		}
	} catch (e) {
		console.error("데이터베이스 저장 에러:", e);
		return {
			status: "error",
			msg: "저장 중 오류가 발생했습니다. 다시 시도해주세요.",
		};
	}
};
