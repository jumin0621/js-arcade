// 1. 보안을 적용할 경로 설정 (/yt-code 하위 모든 곳에 자물쇠를 채움)
export const config = {
	matcher: "/yt-code/:path*",
};

export default function middleware(request) {
	const authorizationHeader = request.headers.get("authorization");

	if (authorizationHeader) {
		// 2. 입력받은 데이터 디코딩
		const basicAuth = authorizationHeader.split(" ")[1];
		const [user, password] = atob(basicAuth).split(":");

		// 🔥 3. 여기에 멤버십용 아이디와 비밀번호를 세팅하세요
		if (user === "arcade" && password === "shinju2026!") {
			return; // 아이디/비밀번호가 일치하면 통과 (렌더링 허용)
		}
	}

	// 4. 인증 실패 또는 최초 접속 시 브라우저의 기본 로그인 팝업 호출
	return new Response("프리미엄 라운지 인증이 필요합니다.", {
		status: 401,
		headers: {
			"WWW-Authenticate": 'Basic realm="Premium Code Lounge"',
		},
	});
}
