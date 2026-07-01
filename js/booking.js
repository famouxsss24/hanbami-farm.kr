/* ============================================================
   한배미마을 — 예약 페이지 (booking.html)
   숙소 선택 → 달력에서 체크인/체크아웃 → 전화 또는 웹 예약
   전화 예약 등록·취소는 notice-admin.html 에서 처리
   ============================================================ */

(function () {

  const ROOMS = {
    bomi:     '보미',
    yeoreumi: '여르미',
    gaeuri:   '가으리',
    gyeouri:  '겨우리',
  };

  let _roomId    = null;
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
    const [y, m, d] = iso.split('-').map(Number);
    const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(iso + 'T00:00:00').getDay()];
    return `${m}월 ${d}일 (${day})`;
  };

  /* 해당 밤이 이미 예약됐는지 — [start, end) */
  const isBookedNight = iso =>
    _booked.some(b => iso >= b.start_date && iso < b.end_date);

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

  /* ─── 숙소 선택 ─────────────────────────────────────────── */
  async function selectRoom(roomId) {
    _roomId = roomId;
    _checkIn = null; _checkOut = null;

    document.querySelectorAll('.bk-room').forEach(btn =>
      btn.classList.toggle('selected', btn.dataset.room === roomId));

    const wrap = document.getElementById('bkCalWrap');
    wrap.classList.remove('disabled');
    document.getElementById('bkCalGrid').innerHTML =
      '<span style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);">예약현황 불러오는 중…</span>';

    try {
      _booked = await fetchBooked(roomId);
    } catch (err) {
      console.error('[예약] 예약현황 불러오기 실패:', err);
      _booked = [];
    }
    renderCalendar();
    updateSummary();
  }

  /* ─── 달력 렌더 ─────────────────────────────────────────── */
  function renderCalendar() {
    const y = _viewYear, m = _viewMonth;
    document.getElementById('bkMonthLabel').textContent = `${y}년 ${m + 1}월`;

    const first    = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const today    = todayStr();

    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span class="bk-cal__cell"></span>';

    for (let d = 1; d <= lastDate; d++) {
      const iso      = fmt(y, m, d);
      const isPast   = iso < today;
      const isBooked = isBookedNight(iso);
      const disabled = isPast || isBooked;

      let cls = 'bk-cal__cell';
      if (isPast)                cls += ' bk-cal__cell--past';
      else if (isBooked)         cls += ' bk-cal__cell--booked';
      if (iso === _checkIn)      cls += ' bk-cal__cell--checkin';
      if (iso === _checkOut)     cls += ' bk-cal__cell--checkout';
      if (_checkIn && _checkOut && iso > _checkIn && iso < _checkOut)
        cls += ' bk-cal__cell--range';

      cells += disabled
        ? `<span class="${cls}">${d}</span>`
        : `<button type="button" class="${cls}" data-date="${iso}">${d}</button>`;
    }

    document.getElementById('bkCalGrid').innerHTML = cells;
    document.querySelectorAll('#bkCalGrid button[data-date]').forEach(btn =>
      btn.addEventListener('click', () => onDateClick(btn.dataset.date)));

    const t = new Date();
    document.getElementById('bkPrevMonth').disabled =
      y === t.getFullYear() && m === t.getMonth();
  }

  function onDateClick(iso) {
    if (!_checkIn || (_checkIn && _checkOut)) {
      _checkIn = iso; _checkOut = null;
    } else if (iso <= _checkIn) {
      _checkIn = iso;
    } else if (rangeHasBooked(_checkIn, iso)) {
      _checkIn = iso; _checkOut = null;
    } else {
      _checkOut = iso;
    }
    renderCalendar();
    updateSummary();
  }

  /* ─── 우측 요약 ─────────────────────────────────────────── */
  function updateSummary() {
    const guide   = document.getElementById('bkGuide');
    const actions = document.getElementById('bkActions');

    document.getElementById('smRoom').textContent     = _roomId ? ROOMS[_roomId] : '—';
    document.getElementById('smCheckIn').textContent  = _checkIn  ? displayDate(_checkIn)  : '—';
    document.getElementById('smCheckOut').textContent = _checkOut ? displayDate(_checkOut) : '—';

    if (_checkIn && _checkOut) {
      const nights = (new Date(_checkOut) - new Date(_checkIn)) / 86400000;
      document.getElementById('smNights').textContent = `${nights}박 ${nights + 1}일`;
      guide.style.display = 'none';
      actions.style.display = 'block';
    } else {
      document.getElementById('smNights').textContent = '—';
      guide.style.display = 'block';
      guide.textContent = !_roomId
        ? '숙소와 날짜를 선택해 주세요'
        : !_checkIn
          ? '달력에서 체크인 날짜를 선택해 주세요'
          : '체크아웃 날짜를 선택해 주세요';
      actions.style.display = 'none';
    }

    document.getElementById('bkForm').style.display = 'none';
    document.getElementById('bkDone').style.display = 'none';
    document.getElementById('bkFormMsg').textContent = '';
  }

  /* ─── 웹 예약 저장 ──────────────────────────────────────── */
  async function submitBooking(e) {
    e.preventDefault();
    const name  = document.getElementById('bkName').value.trim();
    const phone = document.getElementById('bkPhone').value.trim();
    const msgEl = document.getElementById('bkFormMsg');

    if (!name)  { msgEl.textContent = '이름을 입력해 주세요.'; return; }
    if (!/^[0-9\-+ ]{9,15}$/.test(phone)) {
      msgEl.textContent = '연락처를 확인해 주세요. (예: 010-1234-5678)'; return;
    }

    const btn = document.getElementById('bkSubmitBtn');
    btn.disabled = true; btn.textContent = '예약 중…';
    msgEl.textContent = '';

    const roomName = ROOMS[_roomId];
    const inDate = _checkIn, outDate = _checkOut;

    const { error } = await _supa.from('room_bookings').insert([{
      room_id:     _roomId,
      guest_name:  name,
      guest_phone: phone,
      start_date:  inDate,
      end_date:    outDate,
      source:      'web',
    }]);

    btn.disabled = false; btn.textContent = '예약 확정하기';

    if (error) {
      msgEl.textContent = error.code === '23P01'
        ? '방금 다른 분이 먼저 예약했습니다. 날짜를 다시 선택해 주세요.'
        : '예약 처리 중 오류가 발생했습니다. 전화(010-4223-2089)로 문의해 주세요.';
      _booked = await fetchBooked(_roomId).catch(() => _booked);
      _checkIn = null; _checkOut = null;
      renderCalendar();
      return;
    }

    /* 성공 */
    document.getElementById('bkForm').style.display    = 'none';
    document.getElementById('bkActions').style.display = 'none';
    document.getElementById('bkGuide').style.display   = 'none';
    const done = document.getElementById('bkDone');
    done.style.display = 'block';
    document.getElementById('bkDoneText').innerHTML =
      `<strong>${roomName}</strong><br>${displayDate(inDate)} ~ ${displayDate(outDate)}<br>예약이 접수되었습니다.<br>확인 전화를 드리겠습니다.`;

    _booked = await fetchBooked(_roomId).catch(() => _booked);
    _checkIn = null; _checkOut = null;
    renderCalendar();
  }

  /* ─── 초기화 ────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('bkRooms')) return;

    const t = new Date();
    _viewYear = t.getFullYear(); _viewMonth = t.getMonth();

    document.querySelectorAll('.bk-room').forEach(btn =>
      btn.addEventListener('click', () => selectRoom(btn.dataset.room)));

    document.getElementById('bkPrevMonth').addEventListener('click', () => {
      _viewMonth--; if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
      renderCalendar();
    });
    document.getElementById('bkNextMonth').addEventListener('click', () => {
      _viewMonth++; if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
      renderCalendar();
    });

    document.getElementById('bkWebBtn').addEventListener('click', () => {
      document.getElementById('bkForm').style.display = 'block';
      document.getElementById('bkName').focus();
    });

    document.getElementById('bkForm').addEventListener('submit', submitBooking);

    document.getElementById('bkNewBtn').addEventListener('click', () => {
      document.getElementById('bkForm').reset();
      updateSummary();
    });

    /* ?room=bomi 로 진입하면 해당 숙소 자동 선택 */
    const roomParam = new URLSearchParams(location.search).get('room');
    if (roomParam && ROOMS[roomParam]) selectRoom(roomParam);
  });

})();
