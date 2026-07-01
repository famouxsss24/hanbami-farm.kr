# 한배미마을 홈페이지 — 세션 인계 문서

> **최종 갱신**: 2026-07-02

---

## 0. 한 줄 현황

달력 기반 예약 시스템(booking.html) 배포 완료. UI 마감 수정 2건 + **관리자 전용 앱 전환·예약 승인제 개편**이 다음 세션의 메인 작업.

---

## 1. 프로젝트 개요

- **사이트**: hanbami-farm.kr (한배미마을 · 주월리 농촌체험휴양마을, 경기 파주)
- **스택**: 순수 정적 HTML/CSS/JS (빌드 없음) + Supabase (인증·DB)
- **배포**: GitHub `famouxsss24/hanbami-farm.kr` main 푸시 → Netlify 자동 배포
- **운영자**: 아빠(마을 관리자, 비개발자) — 모든 관리 UI는 아빠 기준으로 설계할 것

## 2. 현재 구현 상태 (배포됨)

| 기능 | 파일 | 상태 |
|---|---|---|
| 예약 페이지 (숙소 선택→달력→전화/웹 예약) | booking.html, js/booking.js | ✅ 배포 |
| 예약 DB (겹침 방지 제약 포함) | sql/room_bookings.sql | ✅ Supabase 실행됨 |
| 숙소 상태 배지 (stay.html 카드) | js/stay.js, sql/room_status.sql | ✅ 배포 |
| 관리자: 전화예약 등록 + 예약 목록/취소 | notice-admin.html, js/notice-admin.js | ✅ 배포 (단, §4에서 앱으로 대체 예정) |
| 공지사항 CRUD | js/notices.js, js/notice-admin.js | ✅ 기존 기능 |
| 모바일 대응 (375px 무넘침 확인) | css/style.css 하단 미디어쿼리 | ✅ 배포 |
| 캐시 무력화 | 전 html의 css/js에 `?v=20260702` | ✅ (파일 수정 시 버전 갱신 필요!) |

**Supabase 구조**:
- `room_status`: 방별 상태 배지 (available/limited/full/closed + note)
- `room_bookings`: 예약 (room_id, guest_name/phone, start/end_date, source(web/admin), status(confirmed/cancelled))
  - `btree_gist` exclusion 제약: confirmed끼리 같은 방 날짜 겹침 불가 (에러코드 23P01)
  - RLS: anon은 insert만(현재 status='confirmed'로 즉시 확정 — **§4에서 pending으로 변경 예정**), 조회·관리는 notice_admins만
- `public_booked_ranges` 뷰: 개인정보 없이 마감 날짜만 공개
- 방 id: bomi(보미)/yeoreumi(여르미)/gaeuri(가으리)/gyeouri(겨우리)

## 3. 확정된 핵심 결정

1. 예약은 **전용 페이지**(booking.html)에서, 카드별 모달 ❌ (사용자 피드백으로 모달 폐기)
2. 웹 예약과 전화 예약 병행. 전화 예약은 관리자가 수동 등록해 날짜 마감
3. 체크인 15:00 / 체크아웃 11:00 표기 중 — **실제 시간 아빠에게 미확인, 확인 필요**
4. **(신규, 미구현)** 웹 예약은 즉시 확정이 아니라 **신청(pending) → 아빠가 앱에서 승인해야 확정**되고 그때부터 달력이 막히는 구조로 변경하기로 함
5. **(신규, 미구현)** notice-admin.html 웹 로그인 방식 대신 **아빠 전용 관리자 앱**으로 전환 (아래 §4)

## 4. 다음 세션 메인 작업 (PLAN)

### A. UI 마감 수정 (소, 즉시 가능)
1. **예약 완료 화면의 ✅ 이모지 제거** — booking.html `#bkDone .bk-done__icon`. 이모지 대신 CSS 원형 배지(브랜드 초록 `--primary` 원 + 흰 체크 SVG) 로 교체
2. **달력 기간 밴드 정렬** — 밴드(연초록 배경)가 날짜 원(40px)보다 크고 세로로 어긋나 보임.
   수정 방향: `.bk-cal__cell--range`, `--band-left/right`의 배경을 셀 전체가 아니라 **원과 같은 높이(40px, 모바일 34px)로 세로 중앙 정렬** — 배경을 `linear-gradient` 대신 `::before` 절대배치(top:50% translateY(-50%); height:40px)로 바꾸면 확실함. css/style.css의 `/* 기간 밴드 */` 블록 + js/booking.js `renderCalendar()` 참고

### B. 예약 승인제 전환 (중)
1. SQL 마이그레이션 (새 파일 sql/booking_approval.sql):
   - `status` check에 `'pending'` 추가, anon insert 정책의 `status='confirmed'` → `'pending'`
   - exclusion 제약은 confirmed만 대상이므로 그대로 둠 (pending은 겹쳐도 됨)
   - `public_booked_ranges` 뷰는 confirmed만 노출하므로 그대로 → pending은 달력 안 막음 (의도된 동작)
2. js/booking.js: 완료 문구를 "예약 신청이 접수되었습니다. 관리자 승인 후 확정됩니다"로
3. 관리자 화면: pending 목록에 [승인]/[거절] 버튼. 승인 시 status='confirmed' (이때 23P01 나면 "겹치는 확정 예약 있음" 안내)

### C. 아빠 전용 관리자 앱 (대)
- **권장: PWA 방식** — 새 앱 개발 없이 admin 페이지를 홈 화면에 설치 가능한 앱으로:
  1. 관리자 화면을 `admin/` 폴더로 분리 (또는 notice-admin.html 개편), 모바일 우선 큰 버튼 UI
  2. `manifest.json` + 아이콘 + service worker 최소 구성 → 안드로이드/아이폰 "홈 화면에 추가"시 앱처럼 뜸
  3. Supabase 세션 유지(localStorage 기본) → 최초 1회 로그인 후 재로그인 불필요
  4. 핵심 화면: ① 새 신청 목록(승인/거절 원터치) ② 달력 뷰(방별 예약 현황) ③ 전화예약 등록 ④ 공지 관리
- 네이티브 앱(스토어 배포)은 과투자 — PWA로 충분하다고 판단. 새 예약 알림이 필요해지면 Supabase Edge Function → 이메일/카카오 알림톡 검토
- 홈페이지용 별도 앱은 불필요 (모바일웹 이미 대응)

### D. 백로그 (우선순위 낮음)
- 이미지 WebP 변환 + 히어로 최적화
- 인라인 스타일 → CSS 클래스 정리
- 이모지 아이콘(📞✉️📍) → SVG
- 계절별 히어로 자동 전환
- 장난 웹예약 방지(승인제 도입으로 대부분 해소, 추가로 rate limit 검토)

## 5. 다음 할 일 (정확한 재개 지점)

1. **A-1**: booking.html 155행 부근 `bk-done__icon` 이모지 → CSS 배지로
2. **A-2**: css/style.css `bk-cal__cell--range`/`--band-*` 블록을 ::before 방식으로 재작성, 로컬 프리뷰(.claude/launch.json `static-site`, python 8899)로 확인
3. **B-1**: sql/booking_approval.sql 작성 → **Supabase MCP로 직접 실행 가능** (아래 §6)
4. 이후 C(PWA 관리자 앱) 착수 — 시작 전 아빠에게 화면 우선순위 확인
5. 파일 수정 시 html의 `?v=` 버전 갱신 잊지 말 것

## 6. 환경 메모 / 함정

- **Supabase MCP 등록됨** (`~/.claude.json` 로컬, 프로젝트 ref `iubwwjdwkksizcadahar`) — **세션 재시작 후부터 사용 가능**. 되면 SQL을 대시보드 안 거치고 직접 실행할 것
- git 커밋 정체성: 이 저장소 로컬에 유명현/gemini3943@gmail.com 설정됨
- Git Bash에서 `cmd /c`는 `//c`로 이스케이프 필요
- 배포 후 스타일 안 바뀌어 보이면 = 캐시. `?v=` 갱신했는지부터 확인
- preview_screenshot이 자주 타임아웃 → preview_eval/inspect로 DOM 검증하는 게 확실
- 루트의 PLAN.md, IMPLEMENTATION.md, *-review.md 등은 과거 세션 산출물 (이 문서와 무관)

## 7. 진행 로그

- 2026-07-02 — 예약 시스템 배포(booking.html 전용 페이지, 달력 범위선택, 웹/전화 예약, 관리자 등록·취소), 모바일 대응, 캐시버스팅, Supabase MCP 등록. 사용자 피드백: 이모지 체크 어색·밴드 정렬 이상·관리자는 앱으로·웹예약은 승인제로 — **다음: §5의 1번(A-1 이모지 배지)부터**
