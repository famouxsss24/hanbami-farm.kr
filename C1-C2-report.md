# C1~C2 작업 완료 보고서

> 작업일: 2026-05-15
> 작업자: Claude Sonnet 4.6
> 검토 요청: Codex

---

## 작업 범위

IMPLEMENTATION.md 기준 C1(주소·텍스트·SEO 기초) + C2(robots.txt·sitemap.xml) 완료.

---

## C1 — 완료 항목

### 1. 주소 통일 (달빛길 440)

모든 페이지 푸터의 주소를 단일 주소로 통일했습니다.

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| index.html | 체험관: 달빛길 343 / 숙소: 달빛길 440 (두 줄) | 경기도 파주시 적성면 달빛길 440 |
| village.html | 동일 | 동일 |
| experience.html | 동일 | 동일 |
| stay.html | 동일 | 동일 |
| notice.html | 동일 | 동일 |
| inquiry.html | 동일 | 동일 |
| directions.html | 동일 + 지도 박스 내 주소 별도 | 동일 |

directions.html 추가 변경:
- 카카오맵 링크: `달빛길 343` → `달빛길 440`
- 네이버지도 링크: `달빛길 343` → `달빛길 440`
- 주소 박스: 두 줄 → `경기도 파주시 적성면 달빛길 440` 한 줄
- Google Maps iframe: 달빛길 343 기준 → 달빛길 440 기준으로 교체

### 2. 사계절 체험 카드 수정 (index.html)

섹션 헤더:
- `계절마다 특별한 한배미의 체험` → `한배미마을의 체험`

카드 제목 괄호 줄바꿈 (`<small class="season-card__sub">` 방식):
- `벌이 되어주세요! (배수정체험)` → 제목 + 아래줄 `(배수정체험)`
- `어린참게를 엄마품으로… (참게방류체험)` → 제목 + 아래줄 `(참게방류체험)`
- `머루야 반갑다! (머루 수확체험)` → 제목 + 아래줄 `(머루 수확체험)`
- `설향을 만나러가자! (딸기 수확체험)` → 제목 + 아래줄 `(딸기 수확체험)`

기간 수정:
- 여름: `여름` → `6월~8월`
- 가을(머루야반갑다): `10월` → `9월~10월`

CSS 추가 (css/style.css):
```css
.season-card__sub {
  display: block;
  margin-top: 3px;
  font-size: 0.82rem;
  font-weight: 400;
  color: var(--text-muted);
}
```

### 3. SEO 메타태그 추가

각 페이지에 삽입한 태그:
- `<meta name="description">`
- `<meta property="og:type">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">` → `https://hanbami-farm.kr/images/hero-road.png` (임시)
- `<meta property="og:url">`
- `<link rel="canonical">`
- `<meta name="naver-site-verification">` (index.html만, 코드 자리만 확보)

login.html / notice-admin.html:
- `<meta name="robots" content="noindex, nofollow">` 추가 (검색 노출 차단)

| 페이지 | description 요약 |
|--------|-----------------|
| index.html | 사계절 농촌체험, 4동 독채 숙소, 수영장, 바베큐장 |
| village.html | 20년 이상 운영, 파주 한배미마을 이야기 |
| experience.html | 봄~겨울 사계절 농촌 체험 프로그램 |
| stay.html | 보미·여르미·가으리·겨우리 4동 독채 숙소 |
| notice.html | 최신 소식과 체험 일정 |
| inquiry.html | 체험 예약 및 숙소 문의 |
| directions.html | 경기도 파주시 적성면 달빛길 440 찾아오는 방법 |

---

## C2 — 완료 항목

### 4. sitemap.xml 생성

경로: `/sitemap.xml`

포함 페이지 7개:
- `/` (priority 1.0, weekly)
- `/village.html` (0.8, monthly)
- `/experience.html` (0.9, monthly)
- `/stay.html` (0.9, monthly)
- `/notice.html` (0.7, weekly)
- `/inquiry.html` (0.7, monthly)
- `/directions.html` (0.8, monthly)

관리자 전용 페이지(login, notice-admin)는 제외.

### 5. robots.txt 생성

경로: `/robots.txt`

```
User-agent: *
Allow: /
Disallow: /login.html
Disallow: /notice-admin.html

Sitemap: https://hanbami-farm.kr/sitemap.xml
```

---

## 미완료 / 사용자 작업 필요

| 항목 | 이유 |
|------|------|
| `naver-site-verification` 코드 | 사용자가 네이버 서치어드바이저에서 받은 코드를 index.html에 직접 입력 필요 |
| 네이버 서치어드바이저 등록 | 배포 후 searchadvisor.naver.com에서 사이트 등록 + 사이트맵 제출 |
| `og:image` 전용 이미지 | 현재 hero-road.png 임시 사용 중. 별도 OG 이미지 제작 권장 (1200×630px) |
| `hanbami-farm.kr` DNS 전파 | 가비아 네임서버 변경 후 전파 대기 중 (최대 24시간) |

---

## 점검 요청 사항

Codex에게 아래 항목 검토를 요청합니다:

1. SEO 메타태그가 각 페이지 `<head>` 내에 올바르게 삽입되었는지
2. `og:image` 경로가 실제 접근 가능한 URL인지
3. `sitemap.xml`의 URL 형식과 우선순위가 적절한지
4. `robots.txt`의 Disallow 대상이 누락된 관리자 페이지 없는지
5. `season-card__sub` CSS가 모바일에서도 정상 렌더링되는지
6. 주소 통일이 모든 페이지에서 빠짐없이 적용되었는지
7. 네이버 서치어드바이저 등록 절차상 추가로 필요한 작업이 있는지

---

## 다음 단계 (C3~)

- C3: 홈 배경 동영상 (사용자가 mp4 파일 제공 후 진행)
- C4~C5: 공지 첨부파일
- C6~C7: 방문자 갤러리
- C8~C12: 숙소 예약 시스템
