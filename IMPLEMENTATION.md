# 한배미마을 홈페이지 구현 명세서

> 작성일: 2026-05-14 / 최종 수정: 2026-05-15 (IMPLEMENTATION-review.md 반영)
> 기반 문서: `PLAN.md`, `PLAN-review.md`, `IMPLEMENTATION-review.md`
> 목적: 코드 작성 직전에 참조할 기술적 로직과 데이터 흐름 정의

---

## 0. 기술 스택 (현행 유지)

- **Frontend**: 정적 HTML/CSS/Vanilla JS (번들러 없음)
- **DB / Auth / Storage**: Supabase (CDN `@supabase/supabase-js@2`)
- **이메일 알림**: Formsubmit.co (AJAX)
- **호스팅**: Netlify (자동 배포)
- **검색**: 네이버 서치어드바이저 + Google Search Console

---

## 1. 작업 단계별 구현 흐름

### 1단계: 저위험 정리 (텍스트·주소·SEO 기초)

**대상 파일:**
- 전 페이지(`index/village/experience/stay/notice/inquiry/directions/login/notice-admin.html`)
- `css/style.css`

**작업:**

1. **주소 통일** — 모든 푸터의 주소를 `경기도 파주시 적성면 달빛길 440`으로 변경
   - 푸터 footer__contact-item 내 "체험관: ..., 숙소: ..." 두 줄 → 한 줄로
   - `directions.html` 의 카카오·네이버 지도 링크 query 도 `달빛길 440`로
   - 새 iframe 코드로 교체

2. **사계절 체험 카드 텍스트 수정** (`index.html`)
   - 섹션 헤더: `계절마다 특별한 한배미` → `한배미마을의 체험`
   - 각 카드 제목에서 `(괄호 내용)`을 줄바꿈
     - 마크업 방식: `<h3>벌이 되어주세요!<small class="season-card__sub">(배수정체험)</small></h3>`
     - CSS: `.season-card__sub { display:block; margin-top:4px; font-size:0.85rem; color:var(--text-muted); }`
   - 여름 기간 → `6월~8월`
   - 머루야반갑다 기간 → `9월~10월`

3. **기본 SEO 메타 태그** — 페이지별 고유 `title` + `description` + `og:*` 일괄 삽입
   - `og:image`는 임시로 `images/hero-road.png` 사용 (전용 OG 이미지가 없으니 대체)

4. **`robots.txt`, `sitemap.xml` 생성**
   ```
   robots.txt:
   User-agent: *
   Allow: /
   Sitemap: https://hanbami-farm.kr/sitemap.xml
   ```
   > ⚠️ robots.txt는 보안 장치가 아님. 관리자 페이지 보호는 Supabase Auth + RLS로 처리.

5. **네이버 인증 HTML** — 사용자가 받으면 루트에 그대로 업로드

---

### 2단계: 홈 화면 — 배경 동영상

**전략:**
- 현재 좌우 분할 구조(`.hero__left` + `.hero__right`)를 유지하되,
- 데스크톱 전체 배경에 동영상을 깔고 그 위에 기존 좌측 텍스트만 살림
- `hero-road.png`는 삭제하지 않고 **video poster + 모바일 fallback**으로 재사용

**HTML 구조 (index.html `.hero` 안):**
```html
<section class="hero">
  <video class="hero__bg-video" autoplay muted loop playsinline
         poster="images/hero-road.png">
    <source src="videos/hero.mp4" type="video/mp4">
  </video>
  <div class="hero__overlay"></div>
  <div class="container hero__inner">
    <div class="hero__left">
      <!-- 기존 텍스트 그대로 -->
    </div>
  </div>
</section>
```

**CSS 흐름:**
```css
.hero { position:relative; overflow:hidden; }
.hero__bg-video {
  position:absolute; inset:0;
  width:100%; height:100%;
  object-fit:cover; opacity:0.55;
  z-index:0;
}
.hero__overlay {
  position:absolute; inset:0;
  background:linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.45));
  z-index:1;
}
.hero__inner {
  position:relative; z-index:2;
  min-height: calc(100vh - 68px);
  display: flex;
  align-items: center;
}

/* ★ 기존 .hero__left 초록 배경 패널 재정의 (충돌 방지) */
.hero__left {
  flex: none;
  max-width: 560px;
  background: transparent;  /* 기존 초록 배경 제거 */
  padding: 80px 0;
}

/* 모바일: 동영상 숨기고 정적 이미지 fallback */
/* ★ style.css 기준 경로는 ../images/ */
@media (max-width: 640px) {
  .hero__bg-video { display:none; }
  .hero {
    background: url('../images/hero-road.png') center/cover no-repeat;
  }
}
```

**기존 `.hero__right` 사진 칸:** 제거 (동영상 배경에 통합)

---

### 3단계: 공지 첨부파일

**Supabase 작업 (사용자가 SQL Editor에서 실행할 쿼리):**

```sql
-- ① notices 테이블에 컬럼 추가
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_size INT;

-- ② Storage 버킷: 대시보드에서 'notice-files' 이름으로 생성 (public)

-- ③ Storage RLS 정책
CREATE POLICY "public read notice files"
ON storage.objects FOR SELECT
USING (bucket_id = 'notice-files');

CREATE POLICY "admin insert notice files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notice-files'
  AND EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
);

CREATE POLICY "admin update notice files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notice-files'
  AND EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
);

CREATE POLICY "admin delete notice files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notice-files'
  AND EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
);
```

**업로드 로직 (`notice-admin.js`):**
```
1. <input type="file"> change 이벤트
2. 클라이언트 검증
   - 확장자 화이트리스트: pdf, hwp, hwpx, docx, doc, jpg, jpeg, png, xlsx
   - 크기 ≤ 10MB
3. 통과 시 Supabase Storage 업로드
   - 파일명 충돌 방지: `${Date.now()}_${원본파일명}`
4. publicUrl 받아서 폼에 hidden input으로 보관
5. 공지 저장 시 file_url, file_name, file_size 함께 INSERT
6. 수정 모드에서 새 파일 업로드 시 → 기존 파일 Storage에서 삭제
7. 공지 삭제 시 → Storage 파일도 삭제 (cascade)
```

**`notices.js` SELECT 컬럼 수정:**
```js
// 기존 (변경 전)
.select('id, category, title, created_at')

// 변경 후 — 본문 펼침 + 첨부파일 표시용
.select('id, category, title, content, file_url, file_name, file_size, created_at')
```

**다운로드 표시 + 본문 펼침 UI:**
```
- 제목 행 클릭 시 아래로 본문 펼침 (toggle)
- 펼침 영역에:
  - content 텍스트 표시
  - file_url 있을 때: 📎 다운로드 버튼
    <a href="${file_url}" download="${file_name}" target="_blank">
      📎 ${file_name} (${(file_size/1024).toFixed(1)} KB)
    </a>
- 파일명 길면 말줄임 처리 (모바일 대응)
- 다운로드 버튼 터치 영역 최소 44px
```

---

### 4단계: 방문자 갤러리 (승인제)

**Supabase 작업:**

```sql
CREATE TABLE visitor_photos (
  id          BIGSERIAL PRIMARY KEY,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  uploader    TEXT,
  approved    BOOLEAN DEFAULT FALSE,  -- ★ 기본 미승인
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitor_photos ENABLE ROW LEVEL SECURITY;

-- 누구나 업로드 가능 (INSERT)
CREATE POLICY "anyone insert" ON visitor_photos
  FOR INSERT WITH CHECK (true);

-- 승인된 사진만 SELECT 가능
CREATE POLICY "public read approved" ON visitor_photos
  FOR SELECT USING (approved = true);

-- 관리자만 SELECT 전체/UPDATE/DELETE
CREATE POLICY "admin all" ON visitor_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
  );

-- Storage 버킷 'visitor-photos' (public)
```

**파일 구조:**
- 신규: `gallery.html` (전체 갤러리 + 업로드 폼)
- 신규: `gallery-admin.html` (관리자 승인 페이지)
- 신규: `js/gallery.js`, `js/gallery-admin.js`

**Storage RLS 정책 (`visitor-photos` 버킷):**
```sql
CREATE POLICY "public read visitor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'visitor-photos');

CREATE POLICY "anyone insert visitor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-photos');

CREATE POLICY "admin delete visitor photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visitor-photos'
  AND EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
);
```

**업로드 흐름:**
```
1. 사용자가 사진 + 이름 + 한줄 메시지 입력
2. 클라이언트 검증:
   - 확장자: jpg, jpeg, png, webp만 허용
   - 크기: ≤ 5MB
   - honeypot 필드 (빈칸이어야 통과 — 봇 차단)
3. 클라이언트 사이드 리사이즈 (최대 1600px)
4. Storage 업로드 (경로: visitors/{uuid}_{파일명})
5. 업로드 실패 시 → Storage 파일 cleanup 후 에러 표시
6. visitor_photos INSERT (approved=false)
7. "관리자 승인 후 게시됩니다" 안내 모달
8. 관리자에게 Formsubmit으로 이메일 알림
```

**홈 마퀴 (`index.html` 하단 신규 섹션):**
```html
<section class="visitor-strip">
  <h2>방문객 사진</h2>
  <div class="marquee">
    <div class="marquee__track" id="visitorTrack">
      <!-- JS가 approved=true 사진을 좌→우 무한 루프로 채움 -->
    </div>
  </div>
  <a href="gallery.html">전체 보기 →</a>
</section>
```

CSS는 `@keyframes scroll` + `animation: scroll 40s linear infinite`,
모바일은 속도 느리게 + `touchstart` 시 `animation-play-state: paused`.

**관리자 흐름:**
- `gallery-admin.html` 에서 `approved=false` 사진 목록 표시
- 각 사진 → [승인] / [거부(삭제)] 버튼
- 승인 시 `approved=true` UPDATE
- 거부 시 Storage 파일 + 행 둘 다 삭제

---

### 5단계: 숙소 예약 시스템 ★

#### 5-1. 데이터 모델

```sql
-- ① 관리자가 여는 예약 가능일
CREATE TABLE reservation_slots (
  id         BIGSERIAL PRIMARY KEY,
  lodge      TEXT NOT NULL CHECK (lodge IN ('보미','여르미','가으리','겨우리')),
  slot_date  DATE NOT NULL,
  is_open    BOOLEAN NOT NULL DEFAULT FALSE,
  memo       TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lodge, slot_date)
);

-- ② 실제 예약 (개인정보 포함)
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
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (check_out > check_in)
);

-- ③ 공개 뷰 (개인정보 제외, 가용성 확인용)
CREATE VIEW reservations_public AS
SELECT lodge, check_in, check_out
FROM reservations_v2
WHERE status = 'confirmed';

-- ★ 익명 사용자 조회 권한 명시 부여
GRANT SELECT ON reservations_public TO anon;
GRANT SELECT ON reservations_public TO authenticated;

-- ④ RLS
ALTER TABLE reservations_v2  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;

-- 예약 INSERT: 누구나 가능
CREATE POLICY "anyone insert reservation" ON reservations_v2
  FOR INSERT WITH CHECK (true);

-- 예약 SELECT/UPDATE/DELETE: 관리자만
CREATE POLICY "admin only reservation" ON reservations_v2
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
  );

-- 슬롯 SELECT: 누구나 (예약 가능일 표시용)
CREATE POLICY "public read slots" ON reservation_slots
  FOR SELECT USING (true);

-- 슬롯 INSERT/UPDATE/DELETE: 관리자만
CREATE POLICY "admin write slots" ON reservation_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notice_admins WHERE user_id = auth.uid())
  );
```

#### 5-2. 중복 예약 방지

**★ EXCLUDE 제약 (동시 요청 race condition까지 DB 레벨에서 차단):**
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations_v2
ADD CONSTRAINT reservations_no_overlap
EXCLUDE USING gist (
  lodge WITH =,
  daterange(check_in, check_out, '[)') WITH &&
)
WHERE (status = 'confirmed');
```

**트리거는 "슬롯 오픈 확인" 전용으로만 유지:**
```sql
CREATE OR REPLACE FUNCTION check_slot_open()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  -- 모든 날짜가 관리자가 연 슬롯인지 확인
  IF EXISTS (
    SELECT 1
    FROM generate_series(NEW.check_in, NEW.check_out - 1, INTERVAL '1 day') AS d
    WHERE NOT EXISTS (
      SELECT 1 FROM reservation_slots
      WHERE lodge = NEW.lodge
        AND slot_date = d::DATE
        AND is_open = true
    )
  ) THEN
    RAISE EXCEPTION '관리자가 열어놓지 않은 날짜가 포함되어 있습니다';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_slot
BEFORE INSERT OR UPDATE ON reservations_v2
FOR EACH ROW EXECUTE FUNCTION check_slot_open();
```

> 중복 방지: EXCLUDE 제약 담당 / 슬롯 오픈 확인: 트리거 담당 (역할 분리)

#### 5-3. 공개 가용성 판정 로직 (프론트)

```
사용자 페이지 로딩 시:
  1. reservation_slots에서 향후 90일치 SELECT
     → openDates[lodge] = Set<DATE>
  2. reservations_public 에서 향후 90일치 SELECT
     → bookedDates[lodge] = Set<DATE> (check_in ~ check_out-1 펼침)

날짜 D, 숙소 L 의 상태:
  IF D < today → '과거'
  ELIF D NOT IN openDates[L] → '마감(미오픈)'
  ELIF D IN bookedDates[L] → '예약완료'
  ELSE → '예약가능'
```

#### 5-4. UI 분기

**데스크톱 (≥ 901px) — 4×N 비교 캘린더:**
- `reservation.html` 새 페이지
- 월간 뷰 (이전/다음 월 이동)
- 행 = 숙소 4개, 열 = 일자
- 각 셀: 색·아이콘으로 상태 표시
- hover 시 살짝 떠오르고 툴팁 "예약 가능 / 마감"
- 예약가능 셀 클릭 → 예약 모달

**모바일 (< 901px) — 숙소 선택 → 날짜 선택:**
- Step 1: 숙소 선택 (4개 카드)
- Step 2: 선택된 숙소의 월간 캘린더 1개만 표시
- 날짜 버튼 최소 44×44px 터치 영역
- 상태 표시: 색상 + 텍스트(`가능`/`마감`/`예약됨`)
- 가능한 날짜 탭 → 예약 모달 (전체 화면에 가까움)

#### 5-5. 예약 모달 폼 흐름

```
1. 셀 클릭 시 → 모달 오픈
   - lodge, check_in 자동 채움
   - check_out 기본값 = check_in + 1
2. 입력 폼:
   - 체크인/체크아웃 (date input)
   - 이름 * (text)
   - 연락처 * (tel, pattern="010-?\d{4}-?\d{4}")
   - 어른 인원 * (number, min=1)
   - 아이 인원 (number, min=0)
   - 세부사항 (checkbox: 바베큐 신청, 체험 동시 신청)
   - 기타 문의 (textarea)
3. 제출 클릭:
   a. 클라이언트 검증 (모든 필수 + 연락처 패턴)
   b. 다시 가용성 확인 (race condition 대비)
   c. reservations_v2 INSERT
      - 트리거가 겹침/슬롯 미오픈 시 에러
   d. 성공:
      - Formsubmit으로 yuwin4387@naver.com에 알림
        제목/날짜/숙소/이름/연락처/인원/세부/메모
      - 이메일 실패해도 예약은 완료로 처리 (DB 저장 성공 기준)
      - 이메일 실패는 콘솔 로그로만 기록
      - 성공 모달 + 캘린더 리로드
   e. 실패: 에러 메시지 한글 표시
      - EXCLUDE 제약 위반 → "이미 예약된 날짜입니다"
      - 슬롯 미오픈 → "예약 불가능한 날짜가 포함되어 있습니다"
```

#### 5-6. 관리자 페이지 (`reservation-admin.html`)

**섹션 A — 슬롯 관리 (예약 오픈/마감):**
- 월간 캘린더 × 4숙소
- 셀 클릭 토글: 닫힘 → 열림 → 닫힘
- 일괄 작업 버튼:
  - `이번 주말 전부 열기`
  - `다음 주 7일 전부 열기`
  - `이 달 전부 닫기`
  - 숙소별 적용 / 전체 적용
- 이미 예약된 날짜를 닫으려 하면 `confirm()` 경고

**섹션 B — 예약 목록:**
- 필터: 숙소 / 기간 / 상태
- 데스크톱: 테이블 (체크인 / 숙소 / 이름 / 연락처 / 인원 / 메모 / 작업)
- 모바일: 카드 리스트
- 각 행 클릭 → 상세 (전체 메모, 상태 변경, 취소 처리)

---

### 6단계: SEO 마무리

1. **`sitemap.xml`** — 전 페이지 URL + `<lastmod>` (오늘 날짜)
   - 도메인: `https://hanbami-farm.kr`
   - 신규 페이지 포함: `gallery.html`, `reservation.html`
2. **`robots.txt`** — Allow `/`, Disallow `/notice-admin.html`, `/gallery-admin.html`, `/reservation-admin.html`, `/login.html`
3. **OG 이미지** — `images/og-cover.png` 별도 제작 권장 (없으면 hero-road.png 임시 사용)
4. **각 페이지별 description** —
   - index: `경기도 파주시 적성면 한배미마을 주월리. 사계절 농촌체험, 4동 독채 숙소, 수영장, 바베큐장`
   - village: `한배미마을의 역사와 자연 풍경`
   - experience: `봄 배수정 체험부터 겨울 설향 체험까지`
   - stay: `보미·여르미·가으리·겨우리 4동 독채 숙소`
   - reservation: `4동 숙소의 빈 날짜를 확인하고 예약하세요`
   - directions: `자가용·대중교통 이용 시 한배미마을 찾아오는 방법`
5. 네이버 서치어드바이저 등록 → 사이트맵 제출

---

## 2. 모바일 대응 체크리스트 (구현 직후 반드시 확인)

| 화면 | 핵심 확인 |
|------|----------|
| 홈 히어로 | 동영상 안 뜨고 hero-road.png poster로 노출, 텍스트 가독성 OK |
| 사계절 카드 | 괄호 줄바꿈이 모바일에서도 정렬 잘 됨 |
| 예약 캘린더 | 숙소 카드 → 날짜 단계 흐름이 자연스러움, 44px 터치 영역 |
| 예약 모달 | 키보드 올라와도 제출 버튼 보임, 스크롤 가능 |
| 갤러리 업로드 | 카메라/사진첩 호출 정상, 진행 표시, 승인 안내 |
| 공지 첨부 | 파일명 말줄임, 다운로드 버튼 터치 영역 확보 |
| 관리자 표 | 모바일에서 카드 형태로 자동 전환 |
| 햄버거 메뉴 | 신규 페이지(`gallery`) 포함됐는지 |

테스트 폭: 375 / 390 / 430 / 768 / 1024 / 1280px

---

## 3. 파일 변경 요약

### 신규 파일
- `reservation.html` — 사용자 예약 페이지
- `reservation-admin.html` — 관리자 슬롯/예약 관리
- `gallery.html` — 방문자 갤러리
- `gallery-admin.html` — 갤러리 승인 페이지
- `js/reservation.js`
- `js/reservation-admin.js`
- `js/gallery.js`
- `js/gallery-admin.js`
- `videos/hero.mp4` (사용자 제공)
- `sitemap.xml`, `robots.txt`
- 네이버 인증 HTML (사용자 제공)

### 수정 파일
- `index.html` — 배경 동영상, 사계절 텍스트, 방문자 마퀴 섹션, SEO 메타, 푸터 주소
- `village.html` — 갤러리 사진 추가, SEO 메타, 푸터 주소
- `experience.html` — (체험 소개 페이지로 유지), SEO 메타, 푸터 주소, `숙소 예약` 링크로 변경
- `stay.html` — `예약하기` 버튼 → `reservation.html` 링크, SEO 메타, 푸터 주소
- `notice.html` — 첨부파일 표시, SEO 메타, 푸터 주소
- `notice-admin.html` — 파일 업로드 UI
- `js/notices.js` — 첨부파일 렌더링
- `js/notice-admin.js` — 파일 업로드/삭제 로직
- `inquiry.html`, `directions.html`, `login.html` — SEO 메타, 푸터 주소
- `directions.html` — 새 iframe 적용
- `css/style.css` — 신규 컴포넌트(season-card__sub, hero__bg-video, hero__overlay, marquee, calendar, slot-grid 등) 추가

### Supabase 사용자 작업 (제공할 SQL 묶음)
1. `notices` 컬럼 추가
2. `visitor_photos` 테이블 + RLS
3. `reservation_slots` 테이블 + RLS
4. `reservations_v2` 테이블 + `btree_gist` EXCLUDE 제약 + 트리거 + 공개 뷰 + RLS + GRANT
5. Storage 버킷: `notice-files`, `visitor-photos` (둘 다 public read) + 각 버킷 RLS 정책

---

## 4. 구현 순서 (실행 권장)

체크포인트마다 사용자 테스트 + Git commit:

- [ ] **C1** 주소 통일 + 사계절 텍스트 수정 + SEO 기초 → commit
- [ ] **C2** robots.txt + sitemap.xml + 네이버 인증 → commit, 배포 후 네이버 등록
- [ ] **C3** 홈 히어로 배경 동영상 + 모바일 fallback → commit
- [ ] **C4** Supabase: notices 컬럼 추가 + notice-files 버킷
- [ ] **C5** 공지 첨부파일 업로드/다운로드 → commit
- [ ] **C6** Supabase: visitor_photos 테이블 + visitor-photos 버킷
- [ ] **C7** gallery.html / gallery-admin.html + 홈 마퀴 → commit
- [ ] **C8** Supabase: reservation_slots + reservations_v2 + 트리거 + 뷰
- [ ] **C9** reservation-admin.html (슬롯 관리부터 먼저) → commit
- [ ] **C10** reservation.html (데스크톱 캘린더) → commit
- [ ] **C11** reservation.html 모바일 흐름 + 예약 모달 → commit
- [ ] **C12** 전체 모바일 점검 + 미세 조정 → commit

---

## 5. 미해결 결정 사항 (사용자 확인 필요)

| 항목 | 옵션 |
|------|------|
| `experience.html` 운명 | (A) 체험 소개 페이지로 유지하고 예약 버튼만 `reservation.html`로 / (B) 페이지 자체 삭제 |
| OG 이미지 | (A) 별도 디자인 / (B) `hero-road.png` 임시 사용 |
| 첨부파일 크기 | 5MB / 10MB 중 택일 |
| 갤러리 사진 크기 | 5MB 제한 + 자동 리사이즈 / 무제한 |
| 마퀴 속도 | 데스크톱 40초/한바퀴, 모바일 60초 (변경 가능) |
| 예약 가능 기본 기간 | 향후 90일 / 60일 / 180일 |
| 예약 알림 받을 이메일 | `yuwin4387@naver.com` 유지 OK? |
| 갤러리 메뉴 노출 | nav에 추가 / 홈 섹션 "더 보기"로만 접근 |
