/* 한배미마을 · 주월리 — 공용 스크립트 */

document.addEventListener('DOMContentLoaded', () => {

  /* --- 헤더 스크롤 효과 --- */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  /* --- 모바일 네비 토글 --- */
  const toggle = document.querySelector('.nav__toggle');
  const menu   = document.querySelector('.nav__menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- 현재 페이지 활성 메뉴 ---
     Netlify처럼 .html 확장자가 숨겨지는 경우도 처리 */
  const normalize = (path) => {
    let p = path.split('/').pop() || '';
    p = p.replace(/\.html$/, '');
    return p === '' ? 'index' : p;
  };
  const currentKey = normalize(location.pathname);
  document.querySelectorAll('.nav__item a').forEach(link => {
    const linkKey = normalize(link.getAttribute('href'));
    if (linkKey === currentKey) {
      link.closest('.nav__item').classList.add('active');
    }
  });

  /* --- 체험 프로그램 탭 --- */
  const tabs   = document.querySelectorAll('.season-tab');
  const panels = document.querySelectorAll('.program-panel');
  if (tabs.length) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add('active');
      });
    });
  }

  /* --- 공지사항 필터 탭 (동적 로딩 대응) --- */
  const filterTabs = document.querySelectorAll('.notice-filter-tab');
  if (filterTabs.length) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        document.querySelectorAll('.notice-row').forEach(row => {
          row.style.display = (filter === 'all' || row.dataset.cat === filter) ? '' : 'none';
        });
      });
    });
  }

  /* --- 스크롤 진입 페이드업 --- */
  const fadeTargets = document.querySelectorAll(
    '.stay-card, .facility-card, .exp-card, .program-card, .info-card, .season-card, .notice-table, .reservation-box'
  );
  if (fadeTargets.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    fadeTargets.forEach(el => { el.classList.add('fade-up'); io.observe(el); });
  }

  /* --- 모바일 하단 고정 전화 버튼 (관리자·로그인 페이지 제외) --- */
  const pageKey = normalize(location.pathname);
  if (!['notice-admin', 'login'].includes(pageKey) && !document.querySelector('.mobile-call-btn')) {
    const callBtn = document.createElement('a');
    callBtn.href = 'tel:010-4223-2089';
    callBtn.className = 'mobile-call-btn';
    callBtn.textContent = '📞 전화 문의 010-4223-2089';
    document.body.appendChild(callBtn);
  }

  /* --- 푸터 연도 자동 갱신 --- */
  document.querySelectorAll('.footer-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* --- 날짜 최소값: 오늘 날짜로 동적 설정 --- */
  const dateInput = document.getElementById('dateInput');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  /* --- 예약 폼 제출 (Supabase 저장 + Formsubmit 이메일 알림) --- */
  const form      = document.getElementById('reservationForm');
  const modal     = document.getElementById('reservationModal');
  const submitBtn = document.getElementById('reservationSubmitBtn');

  if (form && modal) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '전송 중...'; }

      const fd = new FormData(form);
      const payload = {
        name:    fd.get('이름')        || '',
        phone:   fd.get('연락처')      || '',
        program: fd.get('체험프로그램') || '',
        date:    fd.get('희망날짜')    || '',
        adults:  Number(fd.get('어른인원') || 0),
        kids:    Number(fd.get('아이인원') || 0),
        note:    fd.get('요청사항')    || '',
      };

      /* ① Supabase 저장 (주) */
      let dbOk = false;
      try {
        if (typeof _supa !== 'undefined') {
          const { error } = await _supa.from('reservations').insert([payload]);
          dbOk = !error;
          if (error) console.error('[체험신청] DB 저장 실패:', error.message);
        }
      } catch (err) {
        console.error('[체험신청] DB 오류:', err);
      }

      /* ② Formsubmit 이메일 알림 (보조) */
      let mailOk = false;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' },
        });
        mailOk = res.ok;
      } catch (err) {
        console.error('[체험신청] 이메일 알림 실패:', err);
      }

      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '신청하기'; }

      if (dbOk || mailOk) {
        modal.classList.add('open');
        form.reset();
        if (!mailOk) console.warn('[체험신청] 이메일 알림 미발송 — DB 저장 완료');
        if (!dbOk)   console.warn('[체험신청] DB 저장 실패 — 이메일로만 접수됨');
      } else {
        alert('전송 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 010-4223-2089로 직접 연락해 주세요.');
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.modal-close')) {
        modal.classList.remove('open');
      }
    });
  }

});
