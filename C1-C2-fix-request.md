# C1~C2 배포 전 수정 요청

대상 작업자: Claude  
작성일: 2026-05-15  
기준 리뷰: Codex 배포 전 코드 리뷰

## 목적

C1~C2 작업은 전반적으로 잘 반영되었습니다.  
배포 전에 아래 항목만 수정하고 최종 확인해 주세요.

## 필수 수정

### 1. `notice-admin.html`에 noindex 메타 추가

보고서에는 `login.html`과 `notice-admin.html` 모두에 검색 차단 메타를 추가했다고 되어 있으나, 실제 코드에서는 `login.html`에만 들어가 있고 `notice-admin.html`에는 빠져 있습니다.

`notice-admin.html`의 `<head>` 안에 아래 한 줄을 추가해 주세요.

```html
<meta name="robots" content="noindex, nofollow">
```

예상 위치:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>공지사항 관리 · 한배미마을</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="css/style.css">
</head>
```

## 배포 후 확인 필요

현재 로컬에는 `robots.txt`, `sitemap.xml`이 존재하지만, 배포된 사이트에서는 아직 404로 확인되었습니다.  
배포 후 아래 URL이 모두 정상 접근되는지 확인해 주세요.

```text
https://hanbami-farm.kr/robots.txt
https://hanbami-farm.kr/sitemap.xml
https://hanbami-farm.kr/images/hero-road.png
```

기대 결과:

- `robots.txt`: 200 OK
- `sitemap.xml`: 200 OK
- `hero-road.png`: 200 OK

## 참고 사항

### 네이버 인증 코드

`index.html`의 아래 값은 아직 placeholder입니다.

```html
<meta name="naver-site-verification" content="여기에_네이버_인증코드">
```

배포 자체는 가능하지만, 네이버 서치어드바이저 소유확인은 실제 인증 코드로 교체해야 통과합니다.

### OG 이미지

현재 `og:image`는 아래 이미지로 설정되어 있습니다.

```text
https://hanbami-farm.kr/images/hero-road.png
```

접근은 가능하지만 파일이 약 3.45MB이고, 공유용 권장 비율인 1200x630과 다릅니다.  
지금 배포는 가능하지만, 추후 `images/og-cover.png` 같은 전용 이미지를 따로 제작하는 것을 권장합니다.

## 수정 후 보고 요청

수정이 끝나면 아래 항목을 포함해서 보고해 주세요.

- `notice-admin.html`에 noindex 메타 추가 여부
- 배포 후 `robots.txt` 접근 결과
- 배포 후 `sitemap.xml` 접근 결과
- 배포 후 `hero-road.png` 접근 결과
- 네이버 인증 코드는 placeholder 유지인지, 실제 코드로 교체했는지

