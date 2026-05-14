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
