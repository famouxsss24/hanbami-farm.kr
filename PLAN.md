# 한배미마을 홈페이지 개선 계획

> 작성일: 2026-05-14
> 대상 URL: https://juwolee-village.netlify.app
> 작성자: Claude (Opus 4.7)

---

## 0. 전제 조건 / 사용자가 준비해야 할 것

| # | 항목 | 비고 |
|---|------|------|
| A | 배경 동영상 파일 (mp4, 권장 10MB 이하, 15~30초 루프) | `images/` 또는 `videos/` 폴더에 저장 |
| B | 마을 갤러리 추가 사진 (jpg/png) | 파일명 + 캡션 같이 |
| C | 네이버 서치어드바이저 소유확인 HTML 파일 | `naver1234abcd.html` 형태 |
| D | Supabase Storage 버킷 2개 생성 권한 | `notice-files`, `visitor-photos` |

---

## 1. SEO — 네이버 / 구글 검색 노출

### 1-1. 각 페이지 `<head>`에 메타 태그 추가
```html
<meta name="description" content="경기도 파주시 적성면 한배미마을 주월리 농촌체험휴양마을. 사계절 농촌체험, 독채 숙소, 바베큐, 수영장">
<meta name="keywords" content="한배미마을, 주월리, 파주 농촌체험, 파주 숙소, 파주 펜션, 적성면 펜션, 농촌체험휴양마을, 가족여행">
<meta name="author" content="한배미마을">

<!-- 오픈그래프 (카카오톡/페이스북 공유용) -->
<meta property="og:title" content="한배미마을 · 주월리 농촌체험휴양마을">
<meta property="og:description" content="사계절 농촌체험과 독채 숙소가 있는 파주 한배미마을">
<meta property="og:image" content="https://juwolee-village.netlify.app/images/og-cover.png">
<meta property="og:url" content="https://juwolee-village.netlify.app">
<meta property="og:type" content="website">

<!-- 네이버 사이트 인증 (사용자가 받은 코드로 교체) -->
<meta name="naver-site-verification" content="여기에_네이버_인증코드" />
```

### 1-2. 파일 추가
- `robots.txt` — 모든 크롤러 허용
- `sitemap.xml` — 전 페이지 등록 (index, village, experience, stay, notice, inquiry, directions)
- `naver1234abcd.html` — 사용자가 받는 네이버 인증 파일

### 1-3. 네이버 서치어드바이저 등록 가이드 (README에 추가)
- searchadvisor.naver.com 접속
- 사이트 등록 → 소유확인 HTML 파일 업로드 → 사이트맵 제출

---

## 2. 홈 (index.html) 개선

### 2-1. 히어로 배경 동영상
- 기존 메인 사진 제거
- `<video autoplay muted loop playsinline>` 추가
- 전체 화면 배경으로 흐릿하게 (`opacity: 0.35`, `filter: brightness(0.7)`)
- 모바일에서는 정적 이미지 fallback (배터리 보호)
- 텍스트 가독성을 위해 어두운 오버레이 추가

```css
.hero-video-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  z-index: 0;
}
.hero-overlay { background: rgba(0,0,0,0.35); }
```

### 2-2. 사계절 체험 카드 텍스트 수정

| 변경 전 | 변경 후 |
|---------|---------|
| 계절마다 특별한 한배미 | 한배미마을의 체험 |
| 벌이 되어주세요!(배수정체험) | 벌이 되어주세요!<br>　(배수정체험) |
| 어린참게를 엄마품으로(○○체험) | 어린참게를 엄마품으로<br>　(○○체험) |
| 머루야반갑다(○○체험) | 머루야반갑다<br>　(○○체험) |
| 설향을 만나러 가자(○○체험) | 설향을 만나러 가자<br>　(○○체험) |

→ CSS `.season-card__title small { display:block; margin-top:4px; }` 형태로 처리

### 2-3. 계절 기간 표시 수정
- 여름: `여름` → `6월~8월`
- 머루야반갑다: `9월~10월`

### 2-4. 체험 사진 슬라이드 (방문객 갤러리)
- 홈 하단에 새 섹션 추가
- 방문객 업로드 사진을 좌→우 자동 스크롤 (CSS marquee 또는 JS)
- 클릭 시 크게 보기 / "더 보기" 버튼으로 갤러리 페이지 이동
- 5초 간격 무한 루프

---

## 3. 마을소개 (village.html)

### 3-1. 마을 갤러리 사진 추가
- 현재 6장 → 9~12장 권장
- 사용자가 추가 사진 제공 시 `village.html`의 `gallery-grid`에 `<img>` 추가
- 반응형 그리드 (`repeat(auto-fill, minmax(220px, 1fr))`) 유지

---

## 4. 체험프로그램 → 숙소 예약 시스템 ⭐ 가장 큰 변경

### 4-1. 기능 정의
- 기존 "체험 프로그램 신청" 폼 제거
- 4동 숙소 (보미·여르미·가으리·겨우리) 통합 예약 시스템 신설
- 사용자가 한눈에 4동의 가능/불가 날짜를 보고 클릭 → 예약 진행

### 4-2. UI 구성 (`stay.html` 또는 새 페이지 `reservation.html`)

```
┌──────────────────────────────────────────┐
│  ◀  2026년 5월  ▶                         │
├──────────────────────────────────────────┤
│      월  화  수  목  금  토  일           │
│ 보미  ●   ●   ○   ○   ○   ●   ●          │
│ 여르미 ○   ○   ●   ●   ○   ○   ○          │
│ 가으리 ○   ○   ○   ○   ●   ●   ○          │
│ 겨우리 ●   ○   ○   ○   ○   ●   ●          │
└──────────────────────────────────────────┘
  ○ 예약 가능 (밝게)  ● 예약 마감 (회색·반투명)
  hover 시 → "예약하기" 툴팁 또는 강조
  클릭 시 → 예약 모달 오픈
```

#### 컬러 컨벤션
- 예약 가능: 흰 배경 + 녹색 점 + hover에서 액센트 컬러 강조 + 살짝 위로 뜸 (`transform: translateY(-2px)`)
- 예약 마감: 회색 줄무늬 + `opacity: 0.4` + `cursor: not-allowed`
- 오늘 이전 날짜: `opacity: 0.2`

### 4-3. 예약 모달 폼
- 선택된 숙소 + 날짜 표시
- 입력 필드:
  - 체크인 / 체크아웃 날짜 (이미 선택된 것 자동 채움 + 사용자 조정 가능)
  - 이름 * (필수)
  - 연락처 * (필수, 010-XXXX-XXXX 검증)
  - 인원수 * (어른/아이 분리)
  - 세부사항 (체험 동시 신청 여부, 바베큐 신청 등)
  - 기타 문의 (textarea)
- 제출 시:
  1. Supabase `reservations_v2` 저장
  2. 관리자 이메일로 Formsubmit 알림
  3. 성공 모달

### 4-4. Supabase 테이블 (`reservations_v2`)
```sql
CREATE TABLE reservations_v2 (
  id           BIGSERIAL PRIMARY KEY,
  lodge        TEXT NOT NULL CHECK (lodge IN ('보미','여르미','가으리','겨우리')),
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  guest_name   TEXT NOT NULL,
  guest_phone  TEXT NOT NULL,
  adults       INT  NOT NULL DEFAULT 1,
  children     INT  NOT NULL DEFAULT 0,
  details      TEXT,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'confirmed', -- confirmed/cancelled
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE reservations_v2 ENABLE ROW LEVEL SECURITY;
-- 누구나 INSERT, SELECT는 가용성 확인용으로 누구나 가능 (개인정보는 SELECT에서 제외하는 뷰 활용)
-- 관리자만 전체 SELECT/UPDATE/DELETE
```

별도 공개 뷰:
```sql
CREATE VIEW reservations_public AS
SELECT lodge, check_in, check_out, status
FROM reservations_v2
WHERE status = 'confirmed';
-- 익명 사용자는 이 뷰만 SELECT (개인정보 가림)
```

### 4-5. 관리자 페이지 (`reservation-admin.html` 신설)
- 로그인된 관리자만 접근 (`notice_admins` 권한 재사용)
- 캘린더 뷰 + 리스트 뷰 토글
- 각 예약 클릭 → 상세보기 (전체 입력 정보 + 상태 변경/삭제)
- 날짜 필터, 숙소 필터, 검색
- CSV 내보내기 (선택)

---

## 5. 공지사항 첨부파일 기능

### 5-1. Supabase Storage 버킷 `notice-files`
- 공개 읽기 / 인증 사용자만 쓰기 정책
- 5MB 제한

### 5-2. `notices` 테이블 컬럼 추가
```sql
ALTER TABLE notices
  ADD COLUMN file_url TEXT,
  ADD COLUMN file_name TEXT,
  ADD COLUMN file_size INT;
```

### 5-3. notice-admin.html
- 공지 작성/수정 시 파일 업로드 인풋 추가
- 업로드 → public URL을 file_url에 저장

### 5-4. notice.html
- 공지 클릭 시 본문 펼침 + 첨부파일 다운로드 버튼
- `<a href="{file_url}" download="{file_name}">📎 {file_name} ({file_size} KB)</a>`
- 누구나 다운로드 가능

---

## 6. 방문자 갤러리 / 자유게시판

### 6-1. 기능
- 체험 방문객이 사진 + 짧은 메시지 + 이름을 업로드
- 홈 페이지 하단에서 자동 스크롤 슬라이드로 노출 (홍보 효과)
- 별도 갤러리 페이지 `gallery.html`에서 전체 사진 그리드 보기
- 관리자는 부적절한 사진 삭제 권한

### 6-2. Supabase
- Storage 버킷: `visitor-photos` (공개 읽기)
- 테이블:
```sql
CREATE TABLE visitor_photos (
  id           BIGSERIAL PRIMARY KEY,
  image_url    TEXT NOT NULL,
  caption      TEXT,
  uploader     TEXT,
  approved     BOOLEAN DEFAULT TRUE,  -- 기본 자동 게시, 부적절 시 관리자가 false 처리
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE visitor_photos ENABLE ROW LEVEL SECURITY;
-- INSERT: 누구나
-- SELECT: 누구나 (approved=true만)
-- UPDATE/DELETE: 관리자만
```

### 6-3. UI
- `gallery.html` 신설: 업로드 폼 + 그리드 뷰 + 라이트박스
- `index.html` 하단: 가로 자동 스크롤 마퀴 (CSS animation `translateX`)

---

## 7. 지도 주소 통일 (달빛길 440)

### 7-1. 변경 대상 페이지
- `directions.html` — 지도 iframe + 주소 박스
- `index.html` — 푸터, CTA 박스에 주소 있으면 변경
- `inquiry.html`, `stay.html`, `notice.html`, `village.html`, `experience.html` — 모든 푸터의 주소 항목

### 7-2. 새 iframe (사용자 제공)
```html
<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5288.627107444812!2d126.89933974578592!3d37.985611775219695!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ce6ce0f6aff55%3A0x5fcb72ee04c33318!2z6rK96riw64-EIO2MjOyjvOyLnCDsoIHshLHrqbQg64us67mb6ri4IDQ0MA!5e0!3m2!1sko!2skr!4v1778696091905!5m2!1sko!2skr"
  width="100%" height="400" style="border:0;border-radius:10px;"
  allowfullscreen="" loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  title="한배미마을 위치">
</iframe>
```

### 7-3. 주소 표기 통일
- 모든 푸터/연락처: `경기도 파주시 적성면 달빛길 440`
- 카카오맵·네이버지도 링크 쿼리도 `달빛길 440`으로 통일

---

## 8. 작업 순서 (구현 단계)

1. **백업** — 현재 상태를 git commit (`backup before plan implementation`)
2. **SEO 메타태그** — 전 페이지에 일괄 적용 (간단·저위험)
3. **지도 주소 통일** — 텍스트 치환 (간단·저위험)
4. **사계절 체험 텍스트 수정** + 기간 수정 (간단)
5. **마을 갤러리 사진 추가** — 사용자 파일 제공 후
6. **홈 배경 동영상** — 사용자 파일 제공 후
7. **공지 첨부파일** — Storage 버킷 + 컬럼 추가 + UI
8. **방문자 갤러리** — Storage + 테이블 + 업로드 폼 + 마퀴
9. **숙소 예약 시스템** ⭐ — 가장 크고 복잡. 별도 단계:
   - 9-1. DB 테이블 + 뷰 + RLS 작성 후 사용자가 Supabase에서 실행
   - 9-2. 캘린더 컴포넌트 JS 구현 (4행 × N일 그리드)
   - 9-3. 예약 모달 + 검증 + Formsubmit 연동
   - 9-4. `reservation-admin.html` 관리자 화면
   - 9-5. `experience.html` 기존 폼 제거 / 페이지 자체 폐기 검토
10. **sitemap.xml + robots.txt + naver 인증 파일** — 마지막에 한꺼번에
11. **배포 후 네이버 서치어드바이저 등록 + 사이트맵 제출**

---

## 9. 위험·결정 필요 사항

| 항목 | 결정 필요 사항 |
|------|---------------|
| 체험프로그램 페이지 | 숙소 예약으로 **완전 대체**할지, 체험 소개는 별도 페이지로 유지할지 |
| 방문자 갤러리 업로드 | 자동 게시 vs 관리자 승인 후 게시 |
| 동영상 모바일 | 데이터 절약을 위해 모바일에서는 정적 이미지로 fallback할지 |
| 예약 데이터 익명 공개 | 가용성 확인을 위해 `lodge/check_in/check_out`만 익명 공개 OK? |
| 이메일 알림 | 예약 들어올 때마다 `yuwin4387@naver.com`로 알림 OK? |
| 첨부파일 크기 제한 | 5MB? 10MB? |

---

## 10. 예상 작업량

| 단계 | 난이도 | 예상 시간 |
|------|--------|----------|
| 1~6 (텍스트/주소/메타) | ⭐ | 30분 |
| 7 (공지 첨부) | ⭐⭐ | 1시간 |
| 8 (방문자 갤러리) | ⭐⭐⭐ | 2시간 |
| 9 (숙소 예약 시스템) | ⭐⭐⭐⭐ | 4~6시간 |
| 10~11 (SEO) | ⭐ | 30분 |
| **합계** | | **약 8~10시간 작업** |
