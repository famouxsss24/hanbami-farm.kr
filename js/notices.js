/* ============================================================
   한배미마을 — 공지사항 뷰어 (Supabase 연동)
   공지 작성/수정/삭제는 notice-admin.html 에서 처리
   ============================================================ */

let _isAdmin = false;
let _session = null;

/* ─── 공개 공지 불러오기 ────────────────────────────────────── */
async function fetchPublicNotices() {
  const { data, error } = await _supa
    .from('notices')
    .select('id, category, title, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ─── 유틸 ──────────────────────────────────────────────────── */
function noticeCatClass(cat) {
  if (cat === '체험') return 'exp';
  if (cat === '숙박') return 'stay';
  return 'notice';
}
function noticeFormatDate(iso) {
  return iso ? iso.slice(0, 10).replace(/-/g, '.') : '';
}

/* ─── 테이블 렌더 ────────────────────────────────────────────── */
function renderNoticeTable(notices) {
  const tbody = document.getElementById('noticeTableBody');
  const empty = document.getElementById('noticeEmpty');
  if (!tbody) return;

  if (!notices.length) {
    if (empty) empty.style.display = 'block';
    tbody.innerHTML = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = notices.map((n, idx) => {
    const num   = notices.length - idx;
    const cls   = noticeCatClass(n.category);
    const cat   = String(n.category || '공지').replace(/[<>]/g, '');
    const title = String(n.title).replace(/[<>]/g, '');
    return `
      <tr class="notice-row" data-cat="${cls}">
        <td>${num}</td>
        <td><span class="cat-badge ${cls}">${cat}</span></td>
        <td>${title}</td>
        <td>${noticeFormatDate(n.created_at)}</td>
      </tr>`;
  }).join('');
}

/* ─── 메인 페이지 미리보기 렌더 ─────────────────────────────── */
function renderNoticePreview(notices) {
  const list  = document.getElementById('noticePreviewList');
  const empty = document.getElementById('noticePreviewEmpty');
  if (!list) return;
  const top = notices.slice(0, 5);
  if (!top.length) {
    if (empty) empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = top.map(n => {
    const cat   = String(n.category || '공지').replace(/[<>]/g, '');
    const title = String(n.title).replace(/[<>]/g, '');
    return `
      <li class="notice-item">
        <span class="notice-item__cat">${cat}</span>
        <a href="notice.html" class="notice-item__title">${title}</a>
        <span class="notice-item__date">${noticeFormatDate(n.created_at)}</span>
      </li>`;
  }).join('');
}

/* ─── 관리자 바 표시 ─────────────────────────────────────────── */
function enableAdminBar(email) {
  _isAdmin = true;
  const bar = document.getElementById('adminBar');
  if (bar) bar.style.display = 'flex';
  const emailEl = document.getElementById('adminBarEmail');
  if (emailEl) emailEl.textContent = email;
  const loginWrap = document.getElementById('noticeAdminLoginWrap');
  if (loginWrap) loginWrap.style.display = 'none';
}

async function handleLogout() {
  await authSignOut();
  _isAdmin = false; _session = null;
  location.reload();
}

/* ─── 필터 탭 ───────────────────────────────────────────────── */
function initFilterTabs() {
  document.querySelectorAll('.notice-filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notice-filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('#noticeTableBody tr.notice-row').forEach(row => {
        row.style.display = (f === 'all' || row.dataset.cat === f) ? '' : 'none';
      });
    });
  });
}

/* ─── DOMContentLoaded ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    /* 1) 공개 공지 표시 */
    const notices = await fetchPublicNotices();
    renderNoticeTable(notices);
    renderNoticePreview(notices);
    initFilterTabs();

    /* 2) 관리자 여부 확인 */
    _session = await authGetSession();
    if (_session && await authIsAdmin(_session)) {
      enableAdminBar(_session.user.email);
    }

    /* 3) 이벤트 바인딩 */
    document.getElementById('btnAdminLogout')
      ?.addEventListener('click', handleLogout);

  } catch (err) {
    console.error('[공지사항] 오류:', err);
  }
});
