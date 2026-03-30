# Openjacks

Openjacks는 확률과 통계 수업 참고용으로 만든 블랙잭 실습 웹앱입니다.

현재 포함된 기능:
- 실제 블랙잭 진행 흐름
- 히트, 스탠드, 더블다운, 1회 스플릿
- 기본 자금 `1000원`
- `100 / 200 / 300 / 500` 누적 베팅
- 오른쪽 분석 패널의 확률/카운트 정보
- GitHub Pages + 커스텀 도메인 `openjacks.mcv.kr` 배포 설정

## 실행

필수:
- Node.js

설치:
```powershell
npm install
```

개발 서버:
```powershell
npm run dev
```

빌드:
```powershell
npm run build
```

## 배포

GitHub Pages 배포는 `.github/workflows/deploy.yml` 기준으로 동작합니다.

커스텀 도메인:
- `openjacks.mcv.kr`

관련 파일:
- `public/CNAME`
- `.github/workflows/deploy.yml`

## 규칙 메모

현재 구현 기준:
- 블랙잭 3:2
- 딜러는 16 이하 히트, 17 이상 스탠드
- 보험, 서렌더, 재스플릿은 미구현
