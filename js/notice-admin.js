/* ============================================================
   한배미마을 — 공지사항 관리자 (CRUD)
   ============================================================ */

let _session   = null;
let _editingId = null;

document.addEventListener('DOMContentLoaded', async () => {

  /* 1) 세션 확인 — 없으면 로그인 페이지로 */
  _session = await authGetSession();
  if (!_session) { location.href = 'login.html'; return; }

  /* 2) 관리자 여부 확인 */
  const admin = await authIsAdmin(_session);

  document.getElementById('adminLogoutArea').style.display = 'flex';
  document.getElementById('adminUserEmail').textContent = _session.user.email;
  document.getElementById('btnLogout').addEventListener('click', handleLogout);

  if (!admin) {
    document.getElementById('accessDenied').style.display = 'block';
    document.getElementById('adminContent').style.display  = 'none';
    return;
  }

  /* 3) 관리자 화면 표시 */
  document.getElementById('adminContent').style.display = 'block';

  await loadNotices();
  await loadRoomStatus();
  await loadBookings();

  document.getElementById('phoneBookingForm')
    ?.addEventListener('submit', handlePhoneBooking);
  document.getElementById('btnNewNotice').addEventListener('click', openNewForm);
  document.getElementById('noticeForm').addEventListener('submit', handleSubmit);
  document.getElementById('btnCancel').addEventListener('click', closeForm);
});

/* ─── 목록 불러오기 ─────────────────────────────────────────── */
async function loadNotices() {
  const { data, error } = await _supa
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showMsg('목록을 불러오지 못했습니다: ' + error.message, 'error'); return; }
  renderAdminTable(data || []);
}

function renderAdminTable(notices) {
  const tbody = document.getElementById('adminTableBody');

  if (!notices.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">
          등록된 공지사항이 없습니다.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = notices.map(n => {
    const cls   = noticeCatClass(n.category);
    const cat   = String(n.category || '공지').replace(/[<>]/g, '');
    const title = String(n.title).replace(/[<>]/g, '');
    const date  = n.created_at ? n.created_at.slice(0, 10) : '';
    const pub   = n.is_published
      ? '<span style="color:var(--primary);font-weight:600;">게시중</span>'
      : '<span style="color:var(--text-muted);">비공개</span>';
    return `
      <tr>
        <td><span class="cat-badge ${cls}">${cat}</span></td>
        <td class="admin-table__title">${title}</td>
        <td>${date}</td>
        <td>${pub}</td>
        <td class="admin-table__actions">
          <button class="btn btn--sm btn--outline" onclick="openEditForm('${n.id}')">수정</button>
          <button class="btn btn--sm btn--danger"  onclick="handleDelete('${n.id}')">삭제</button>
        </td>
      </tr>`;
  }).join('');
}

function noticeCatClass(cat) {
  if (cat === '체험') return 'exp';
  if (cat === '숙박') return 'stay';
  return 'notice';
}

/* ─── 숙소 예약현황 관리 ─────────────────────────────────────── */
const ROOM_STATUS_OPTIONS = [
  { value: 'available', label: '🟢 예약 가능' },
  { value: 'limited',   label: '🟡 일부 마감 · 문의요망' },
  { value: 'full',      label: '🔴 예약 마감' },
  { value: 'closed',    label: '⚫ 운영 중지' },
];

async function loadRoomStatus() {
  const tbody = document.getElementById('roomStatusBody');
  if (!tbody) return;

  const { data, error } = await _supa
    .from('room_status')
    .select('*')
    .order('room_id');

  if (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted);">
          예약현황 테이블이 없습니다. sql/room_status.sql 을 Supabase에서 실행해 주세요.
        </td>
      </tr>`;
    return;
  }

  /* 사계절 순서로 정렬 */
  const order = ['bomi', 'yeoreumi', 'gaeuri', 'gyeouri'];
  const rows = (data || []).slice().sort(
    (a, b) => order.indexOf(a.room_id) - order.indexOf(b.room_id)
  );

  tbody.innerHTML = rows.map(r => {
    const name = String(r.room_name).replace(/[<>]/g, '');
    const note = String(r.note || '').replace(/"/g, '&quot;').replace(/[<>]/g, '');
    const options = ROOM_STATUS_OPTIONS.map(o =>
      `<option value="${o.value}" ${o.value === r.status ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    return `
      <tr data-room="${r.room_id}">
        <td style="font-weight:600;">${name}</td>
        <td><select class="form-select rs-status">${options}</select></td>
        <td><input type="text" class="form-input rs-note" value="${note}" placeholder="비워두면 배지만 표시됩니다" maxlength="40"></td>
        <td><button class="btn btn--sm btn--primary" onclick="saveRoomStatus('${r.room_id}', this)">저장</button></td>
      </tr>`;
  }).join('');
}

async function saveRoomStatus(roomId, btn) {
  const row = btn.closest('tr');
  const payload = {
    status:     row.querySelector('.rs-status').value,
    note:       row.querySelector('.rs-note').value.trim(),
    updated_at: new Date().toISOString(),
  };

  btn.disabled = true; btn.textContent = '저장 중…';
  const { error } = await _supa
    .from('room_status')
    .update(payload)
    .eq('room_id', roomId);
  btn.disabled = false; btn.textContent = '저장';

  if (error) { showMsg('예약현황 저장 실패: ' + error.message, 'error'); return; }
  showMsg('예약현황이 저장되었습니다.', 'success');
}

/* ─── 숙소 예약 관리 ─────────────────────────────────────────── */
const ROOM_NAMES = { bomi: '보미', yeoreumi: '여르미', gaeuri: '가으리', gyeouri: '겨우리' };

async function loadBookings() {
  const tbody = document.getElementById('bookingTableBody');
  if (!tbody) return;

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await _supa
    .from('room_bookings')
    .select('*')
    .eq('status', 'confirmed')
    .gte('end_date', today)
    .order('start_date');

  if (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
          예약 테이블이 없습니다. sql/room_bookings.sql 을 Supabase에서 실행해 주세요.
        </td>
      </tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
          예정된 예약이 없습니다.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = data.map(b => {
    const room  = ROOM_NAMES[b.room_id] || b.room_id;
    const name  = String(b.guest_name  || '—').replace(/[<>]/g, '');
    const phone = String(b.guest_phone || '—').replace(/[<>]/g, '');
    const src   = b.source === 'web'
      ? '<span style="color:var(--primary);font-weight:600;">웹</span>'
      : '<span style="color:var(--accent);font-weight:600;">전화</span>';
    const nights = (new Date(b.end_date) - new Date(b.start_date)) / 86400000;
    return `
      <tr>
        <td style="font-weight:600;">${room}</td>
        <td>${b.start_date} ~ ${b.end_date} (${nights}박)</td>
        <td>${name}</td>
        <td>${phone}</td>
        <td>${src}</td>
        <td><button class="btn btn--sm btn--danger" onclick="cancelBooking('${b.id}')">취소</button></td>
      </tr>`;
  }).join('');
}

async function handlePhoneBooking(e) {
  e.preventDefault();
  const payload = {
    room_id:     document.getElementById('pbRoom').value,
    start_date:  document.getElementById('pbStart').value,
    end_date:    document.getElementById('pbEnd').value,
    guest_name:  document.getElementById('pbName').value.trim(),
    guest_phone: document.getElementById('pbPhone').value.trim(),
    source:      'admin',
  };

  if (!payload.start_date || !payload.end_date) {
    showMsg('체크인·체크아웃 날짜를 선택해 주세요.', 'error'); return;
  }
  if (payload.end_date <= payload.start_date) {
    showMsg('체크아웃 날짜는 체크인보다 뒤여야 합니다.', 'error'); return;
  }

  const { error } = await _supa.from('room_bookings').insert([payload]);

  if (error) {
    showMsg(error.code === '23P01'
      ? '해당 기간에 이미 예약이 있습니다. 아래 목록을 확인해 주세요.'
      : '등록 실패: ' + error.message, 'error');
    return;
  }

  showMsg('전화예약이 등록되었습니다. 달력에서 마감 처리됩니다.', 'success');
  document.getElementById('phoneBookingForm').reset();
  await loadBookings();
}

async function cancelBooking(id) {
  if (!confirm('이 예약을 취소하시겠습니까? 달력에서 다시 예약 가능해집니다.')) return;
  const { error } = await _supa
    .from('room_bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) { showMsg('취소 실패: ' + error.message, 'error'); return; }
  showMsg('예약이 취소되었습니다.', 'success');
  await loadBookings();
}

/* ─── 폼 열기/닫기 ──────────────────────────────────────────── */
function openNewForm() {
  _editingId = null;
  document.getElementById('formHeading').textContent     = '새 공지 작성';
  document.getElementById('fCategory').value            = '공지';
  document.getElementById('fTitle').value               = '';
  document.getElementById('fContent').value             = '';
  document.getElementById('fPublished').checked         = true;
  document.getElementById('noticeFormWrap').style.display = 'block';
  document.getElementById('noticeFormWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('fTitle').focus();
}

async function openEditForm(id) {
  const { data, error } = await _supa
    .from('notices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) { showMsg('공지를 불러오지 못했습니다.', 'error'); return; }

  _editingId = id;
  document.getElementById('formHeading').textContent     = '공지 수정';
  document.getElementById('fCategory').value            = data.category || '공지';
  document.getElementById('fTitle').value               = data.title    || '';
  document.getElementById('fContent').value             = data.content  || '';
  document.getElementById('fPublished').checked         = !!data.is_published;
  document.getElementById('noticeFormWrap').style.display = 'block';
  document.getElementById('noticeFormWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('fTitle').focus();
}

function closeForm() {
  document.getElementById('noticeFormWrap').style.display = 'none';
  _editingId = null;
}

/* ─── 저장 ──────────────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    category:     document.getElementById('fCategory').value,
    title:        document.getElementById('fTitle').value.trim(),
    content:      document.getElementById('fContent').value.trim(),
    is_published: document.getElementById('fPublished').checked,
  };

  if (!payload.title) { showMsg('제목을 입력해 주세요.', 'error'); return; }

  let error;

  if (_editingId) {
    ({ error } = await _supa
      .from('notices')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', _editingId));
  } else {
    ({ error } = await _supa
      .from('notices')
      .insert([{ ...payload, author_id: _session.user.id }]));
  }

  if (error) { showMsg('저장 실패: ' + error.message, 'error'); return; }

  showMsg(_editingId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.', 'success');
  closeForm();
  await loadNotices();
}

/* ─── 삭제 ──────────────────────────────────────────────────── */
async function handleDelete(id) {
  if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
  const { error } = await _supa.from('notices').delete().eq('id', id);
  if (error) { showMsg('삭제 실패: ' + error.message, 'error'); return; }
  showMsg('삭제되었습니다.', 'success');
  await loadNotices();
}

/* ─── 로그아웃 ───────────────────────────────────────────────── */
async function handleLogout() {
  await authSignOut();
  location.href = 'login.html';
}

/* ─── 메시지 배너 ────────────────────────────────────────────── */
function showMsg(text, type) {
  const el = document.getElementById('adminMsg');
  if (!el) return;
  el.textContent   = text;
  el.className     = 'admin-msg admin-msg--' + type;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
