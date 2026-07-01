/* ============================================================
   한배미마을 — 숙소 예약 달력 (Supabase 연동)
   전화 예약 등록·취소는 notice-admin.html 에서 처리
   ============================================================ */

(function () {

  const PHONE = '010-4223-2089';

  let _room      = null;   // { id, name }
  let _booked    = [];     // [{ start_date, end_date }]
  let _viewYear  = 0;
  let _viewMonth = 0;      // 0-11
  let _checkIn   = null;   // 'YYYY-MM-DD'
  let _checkOut  = null;

  /* ─── 날짜 유틸 ─────────────────────────────────────────── */
  const fmt = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayStr = () => {
    const t = new Date();
    return fmt(t.getFullYear(), t.getMonth(), t.getDate());
  };
  const addDays = (iso, n) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return fmt(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const displayDate = iso => {
    const [y, m, d] = iso.split('-');
    return `${Number(m)}/${Number(d)}`;
  };

  /* 해당 날짜(숙박일 밤)가 이미 예약됐는지 — [start, end) */
  const isBookedNight = iso =>
    _booked.some(b => iso >= b.start_date && iso < b.end_date);

  /* [checkIn, checkOut) 구간에 예약된 밤이 하나라도 있는지 */
  const rangeHasBooked = (inDate, outDate) => {
    for (let d = inDate; d < outDate; d = addDays(d, 1)) {
      if (isBookedNight(d)) return true;
    }
    return false;
  };

  /* ─── 예약 데이터 ───────────────────────────────────────── */
  async function fetchBooked(roomId) {
    const { data, error } = await _supa
      .from('public_booked_ranges')
      .select('start_date, end_date')
      .eq('room_id', roomId)
      .gte('end_date', todayStr());
    if (error) throw error;
    return data || [];
  }

  /* ─── 달력 렌더 ─────────────────────────────────────────── */
  function renderCalendar() {
    const y = _viewYear, m = _viewMonth;
    document.getElementById('bkMonthLabel').textContent = `${y}년 ${m + 1}월`;

    const first    = new Date(y, m, 1).getDay();       // 0=일
    const lastDate = new Date(y, m + 1, 0).getDate();
    const today    = todayStr();

    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span class="bk-cal__cell bk-cal__cell--empty"></span>';

    for (let d = 1; d <= lastDate; d++) {
      const iso      = fmt(y, m, d);
      const isPast   = iso < today;
      const isBooked = isBookedNight(iso);
      const disabled = isPast || isBooked;

      let cls = 'bk-cal__cell';
      if (disabled)  cls += isBooked && !isPast ? ' bk-cal__cell--booked' : ' bk-cal__cell--past';
      if (iso === _checkIn)  cls += ' bk-cal__cell--checkin';
      if (iso === _checkOut) cls += ' bk-cal__cell--checkout';
      if (_checkIn && _checkOut && iso > _checkIn && iso < _checkOut) cls += ' bk-cal__cell--range';

      cells += disabled
        ? `<span class="${cls}">${d}</span>`
        : `<button type="button" class="${cls}" data-date="${iso}">${d}</button>`;
    }

    document.getElementById('bkCalGrid').innerHTML = cells;
    document.querySelectorAll('#bkCalGrid button[data-date]').forEach(btn =>
      btn.addEventListener('click', () => onDateClick(btn.dataset.date)));

    /* 이전 달 버튼: 이번 달 이전으로는 못 감 */
    const t = new Date();
    document.getElementById('bkPrevMonth').disabled =
      y === t.getFullYear() && m === t.getMonth();
  }

  function onDateClick(iso) {
    if (!_checkIn || (_checkIn && _checkOut)) {
      /* 새로 시작 */
      _checkIn = iso; _checkOut = null;
    } else if (iso <= _checkIn) {
      _checkIn = iso;
    } else if (rangeHasBooked(_checkIn, iso)) {
      /* 중간에 마감일이 끼면 체크인부터 다시 */
      _checkIn = iso; _checkOut = null;
    } else {
      _checkOut = iso;
    }
    renderCalendar();
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const info    = document.getElementById('bkSelectionInfo');
    const actions = document.getElementById('bkActions');

    if (_checkIn && _checkOut) {
      const nights = (new Date(_checkOut) - new Date(_checkIn)) / 86400000;
      info.textContent = `${displayDate(_checkIn)} 체크인 → ${displayDate(_checkOut)} 체크아웃 · ${nights}박`;
      actions.style.display = 'flex';
    } else if (_checkIn) {
      info.textContent = `${displayDate(_checkIn)} 체크인 — 체크아웃 날짜를 선택하세요`;
      actions.style.display = 'none';
    } else {
      info.textContent = '체크인 날짜를 선택하세요';
      actions.style.display = 'none';
    }
    document.getElementById('bkForm').style.display = 'none';
    document.getElementById('bkDone').style.display = 'none';
  }

  /* ─── 모달 열기/닫기 ─────────────────────────────────────── */
  async function openModal(roomId, roomName) {
    _room = { id: roomId, name: roomName };
    _checkIn = null; _checkOut = null;

    const t = new Date();
    _viewYear = t.getFullYear(); _viewMonth = t.getMonth();

    document.getElementById('bkRoomName').textContent = roomName;
    document.getElementById('bookingModal').classList.add('open');
    document.getElementById('bkCalGrid').innerHTML =
      '<span style="grid-column:1/-1;padding:24px;color:var(--text-muted);">불러오는 중…</span>';

    try {
      _booked = await fetchBooked(roomId);
    } catch (err) {
      console.error('[예약달력] 불러오기 실패:', err);
      _booked = [];
    }
    renderCalendar();
    updateSelectionUI();
  }

  function closeModal() {
    document.getElementById('bookingModal').classList.remove('open');
  }

  /* ─── 웹 예약 저장 ──────────────────────────────────────── */
  async function submitBooking(e) {
    e.preventDefault();
    const name  = document.getElementById('bkName').value.trim();
    const phone = document.getElementById('bkPhone').value.trim();
    const msgEl = document.getElementById('bkFormMsg');

    if (!name)  { msgEl.textContent = '이름을 입력해 주세요.'; return; }
    if (!/^[0-9\-+ ]{9,15}$/.test(phone)) { msgEl.textContent = '연락처를 확인해 주세요. (예: 010-1234-5678)'; return; }

    const btn = document.getElementById('bkSubmitBtn');
    btn.disabled = true; btn.textContent = '예약 중…';
    msgEl.textContent = '';

    const { error } = await _supa.from('room_bookings').insert([{
      room_id:     _room.id,
      guest_name:  name,
      guest_phone: phone,
      start_date:  _checkIn,
      end_date:    _checkOut,
      source:      'web',
    }]);

    btn.disabled = false; btn.textContent = '예약 확정하기';

    if (error) {
      msgEl.textContent = error.code === '23P01'
        ? '방금 다른 분이 먼저 예약했습니다. 날짜를 다시 선택해 주세요.'
        : '예약 처리 중 오류가 발생했습니다. 전화로 문의해 주세요.';
      _booked = await fetchBooked(_room.id).catch(() => _booked);
      _checkIn = null; _checkOut = null;
      renderCalendar();
      return;
    }

    /* 성공 */
    document.getElementById('bkForm').style.display = 'none';
    document.getElementById('bkActions').style.display = 'none';
    const done = document.getElementById('bkDone');
    done.style.display = 'block';
    document.getElementById('bkDoneText').textContent =
      `${_room.name} · ${displayDate(_checkIn)} ~ ${displayDate(_checkOut)} 예약이 접수되었습니다. 확인 연락을 드리겠습니다.`;
    _booked = await fetchBooked(_room.id).catch(() => _booked);
    _checkIn = null; _checkOut = null;
    renderCalendar();
  }

  /* ─── 초기화 ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;

    /* 숙소 카드의 예약 버튼 */
    document.querySelectorAll('.stay-card .btn-book').forEach(btn => {
      const card = btn.closest('.stay-card');
      const name = card.querySelector('.stay-card__name').childNodes[0].textContent.trim();
      btn.addEventListener('click', () => openModal(card.dataset.room, name));
    });

    /* 모달 닫기 */
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('.modal-close')) closeModal();
    });

    /* 달 이동 */
    document.getElementById('bkPrevMonth').addEventListener('click', () => {
      _viewMonth--; if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
      renderCalendar();
    });
    document.getElementById('bkNextMonth').addEventListener('click', () => {
      _viewMonth++; if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
      renderCalendar();
    });

    /* 전화 예약 / 웹 예약 선택 */
    document.getElementById('bkCallBtn').addEventListener('click', () => {
      location.href = `tel:${PHONE}`;
    });
    document.getElementById('bkWebBtn').addEventListener('click', () => {
      document.getElementById('bkForm').style.display = 'block';
      document.getElementById('bkName').focus();
    });

    document.getElementById('bkForm').addEventListener('submit', submitBooking);
  });

})();
