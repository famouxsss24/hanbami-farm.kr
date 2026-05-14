/* ============================================================
   한배미마을 — 1:1 문의 (Supabase 연동)
   ============================================================ */

let _iqSession = null;
let _iqIsAdmin = false;
const _openDetails = new Set();

/* ─── 문의 목록 불러오기 ─────────────────────────────────────── */
async function fetchInquiries() {
  let query = _supa
    .from('inquiries')
    .select('id, title, author_email, created_at, is_answered')
    .order('created_at', { ascending: false });

  if (!_iqIsAdmin) {
    query = query.eq('user_id', _iqSession.user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/* ─── 목록 렌더 ─────────────────────────────────────────────── */
function renderInquiryTable(inquiries) {
  const tbody = document.getElementById('iqTableBody');
  const empty = document.getElementById('iqEmpty');
  if (!tbody) return;

  if (!inquiries.length) {
    if (empty) empty.style.display = 'block';
    tbody.innerHTML = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = inquiries.map((iq, idx) => {
    const num    = inquiries.length - idx;
    const title  = String(iq.title).replace(/[<>]/g, '');
    const date   = iq.created_at ? iq.created_at.slice(0, 10).replace(/-/g, '.') : '';
    const status = iq.is_answered
      ? '<span class="iq-badge iq-badge--done">답변완료</span>'
      : '<span class="iq-badge iq-badge--wait">대기중</span>';
    const emailCol = _iqIsAdmin
      ? `<td style="font-size:0.8rem;color:var(--text-muted);">${String(iq.author_email || '').replace(/[<>]/g, '')}</td>`
      : '';

    return `
      <tr class="inquiry-row" onclick="toggleInquiry('${iq.id}')">
        <td>${num}</td>
        <td style="text-align:left;">${title} <span style="font-size:0.75rem;color:var(--text-muted);">▾</span></td>
        ${emailCol}
        <td>${date}</td>
        <td>${status}</td>
      </tr>
      <tr id="iq-detail-${iq.id}" style="display:none;">
        <td colspan="${_iqIsAdmin ? 5 : 4}" style="padding:0;border-top:none;">
          <div id="iq-content-${iq.id}" class="inquiry-detail-wrap">
            <p style="padding:20px;color:var(--text-muted);font-size:0.85rem;">불러오는 중…</p>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ─── 상세 토글 ─────────────────────────────────────────────── */
async function toggleInquiry(id) {
  const row = document.getElementById(`iq-detail-${id}`);
  if (!row) return;

  if (_openDetails.has(id)) {
    row.style.display = 'none';
    _openDetails.delete(id);
  } else {
    row.style.display = '';
    _openDetails.add(id);
    await loadDetail(id);
  }
}

async function loadDetail(id) {
  const wrap = document.getElementById(`iq-content-${id}`);
  if (!wrap) return;

  const [{ data: iq }, { data: replies }] = await Promise.all([
    _supa.from('inquiries').select('*').eq('id', id).single(),
    _supa.from('inquiry_replies').select('*').eq('inquiry_id', id).order('created_at', { ascending: true }),
  ]);

  if (!iq) { wrap.innerHTML = '<p style="padding:20px;color:red;">불러오기 실패</p>'; return; }

  const replyListHtml = (replies && replies.length)
    ? replies.map(r => `
        <div class="inquiry-reply">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:0.72rem;background:var(--primary);color:#fff;padding:2px 10px;border-radius:20px;font-weight:600;">관리자 답변</span>
            <span style="font-size:0.78rem;color:var(--text-muted);">${r.created_at ? r.created_at.slice(0,10).replace(/-/g,'.') : ''}</span>
          </div>
          <p style="font-size:0.9rem;line-height:1.7;white-space:pre-wrap;">${String(r.content).replace(/[<>]/g, '')}</p>
        </div>`).join('')
    : '<p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;">아직 답변이 없습니다. 빠르게 확인 후 답변드리겠습니다.</p>';

  const replyFormHtml = _iqIsAdmin ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
      <p style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">답변 작성</p>
      <form onsubmit="submitReply(event, '${id}')">
        <textarea class="form-textarea" name="replyContent"
          style="min-height:80px;font-size:0.88rem;margin-bottom:8px;"
          placeholder="답변 내용을 입력하세요" required></textarea>
        <div style="text-align:right;">
          <button type="submit" class="btn btn--primary btn--sm">답변 등록</button>
        </div>
      </form>
    </div>` : '';

  wrap.innerHTML = `
    <div style="padding:20px 24px;">
      <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
        ${_iqIsAdmin ? `<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">작성자: ${String(iq.author_email||'').replace(/[<>]/g,'')}</p>` : ''}
        <p style="font-size:0.93rem;line-height:1.8;white-space:pre-wrap;">${String(iq.content).replace(/[<>]/g, '')}</p>
      </div>
      <div>${replyListHtml}</div>
      ${replyFormHtml}
    </div>`;
}

/* ─── 답변 등록 ─────────────────────────────────────────────── */
async function submitReply(e, inquiryId) {
  e.preventDefault();
  const content = e.target.replyContent.value.trim();
  if (!content) return;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '등록 중…';

  const { error } = await _supa.from('inquiry_replies').insert([{
    inquiry_id: inquiryId,
    admin_id:   _iqSession.user.id,
    content,
  }]);

  if (error) {
    showIqMsg('답변 등록 실패: ' + error.message, 'error');
    btn.disabled = false; btn.textContent = '답변 등록';
    return;
  }

  await _supa.from('inquiries').update({ is_answered: true }).eq('id', inquiryId);

  showIqMsg('답변이 등록되었습니다.', 'success');

  // 목록 재렌더 후 해당 행 열고 상세 다시 로드 (순서 중요)
  const inquiries = await fetchInquiries();
  _openDetails.delete(inquiryId); // 재렌더 전 초기화
  renderInquiryTable(inquiries);
  const detailRow = document.getElementById(`iq-detail-${inquiryId}`);
  if (detailRow) {
    detailRow.style.display = '';
    _openDetails.add(inquiryId);
    await loadDetail(inquiryId); // DOM이 새로 생긴 후 로드
  }
}

/* ─── 새 문의 제출 ───────────────────────────────────────────── */
async function handleIqSubmit(e) {
  e.preventDefault();
  const title   = document.getElementById('iqTitle').value.trim();
  const content = document.getElementById('iqContent').value.trim();
  if (!title || !content) { showIqMsg('제목과 내용을 모두 입력해 주세요.', 'error'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '제출 중…';

  const { error } = await _supa.from('inquiries').insert([{
    user_id:      _iqSession.user.id,
    author_email: _iqSession.user.email,
    title,
    content,
  }]);

  btn.disabled = false; btn.textContent = '제출하기';

  if (error) { showIqMsg('제출 실패: ' + error.message, 'error'); return; }

  // 관리자에게 이메일 알림 발송 (await — 실패 시 화면 경고)
  const mailOk = await sendInquiryNotification(_iqSession.user.email, title, content);
  if (!mailOk) {
    console.warn('[문의 알림] 이메일 발송 실패 — DB 저장은 완료됨');
    showIqMsg('문의가 등록되었습니다. (이메일 알림 발송에 실패했으나 문의는 정상 접수됐습니다)', 'success');
  } else {
    showIqMsg('문의가 등록되었습니다! 빠르게 답변드리겠습니다.', 'success');
  }
  document.getElementById('newInquiryForm').style.display = 'none';
  document.getElementById('iqTitle').value   = '';
  document.getElementById('iqContent').value = '';

  const inquiries = await fetchInquiries();
  renderInquiryTable(inquiries);
}

/* ─── 로그인 ─────────────────────────────────────────────────── */
async function handleIqLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('iqEmail').value.trim();
  const password = document.getElementById('iqPassword').value;
  if (!email || !password) { showIqLoginMsg('이메일과 비밀번호를 입력해 주세요.', 'error'); return; }
  if (!isValidEmail(email)) { showIqLoginMsg('올바른 이메일 형식이 아닙니다. (예: example@naver.com)', 'error'); return; }

  const btn = document.getElementById('btnIqLogin');
  btn.disabled = true; btn.textContent = '처리 중…';

  const { data, error } = await authSignIn(email, password);
  btn.disabled = false; btn.textContent = '로그인';

  if (error) { showIqLoginMsg(authErrorMsg(error.message), 'error'); return; }

  _iqSession = data.session;
  _iqIsAdmin = await authIsAdmin(_iqSession);
  await initInquiryPage();
}

async function handleIqSignup() {
  const email    = document.getElementById('iqEmail').value.trim();
  const password = document.getElementById('iqPassword').value;
  if (!email || !password)  { showIqLoginMsg('이메일과 비밀번호를 입력해 주세요.', 'error'); return; }
  if (!isValidEmail(email)) { showIqLoginMsg('올바른 이메일 형식이 아닙니다. (예: example@naver.com)', 'error'); return; }
  if (password.length < 6)  { showIqLoginMsg('비밀번호는 6자 이상이어야 합니다.', 'error'); return; }

  const btn = document.getElementById('btnIqSignup');
  btn.disabled = true; btn.textContent = '처리 중…';

  const { error: signUpErr } = await authSignUp(email, password);
  if (signUpErr) { showIqLoginMsg(authErrorMsg(signUpErr.message), 'error'); btn.disabled = false; btn.textContent = '회원가입'; return; }

  // 가입 후 바로 로그인
  const { data, error: signInErr } = await authSignIn(email, password);
  btn.disabled = false; btn.textContent = '회원가입';

  if (signInErr) { showIqLoginMsg('가입 완료! 로그인해 주세요.', 'success'); return; }

  _iqSession = data.session;
  _iqIsAdmin = await authIsAdmin(_iqSession);
  await initInquiryPage();
}

/* ─── 페이지 초기화 ─────────────────────────────────────────── */
async function initInquiryPage() {
  if (!_iqSession) {
    document.getElementById('loginRequired').style.display  = 'block';
    document.getElementById('inquiryContent').style.display = 'none';
    return;
  }

  document.getElementById('loginRequired').style.display  = 'none';
  document.getElementById('inquiryContent').style.display = 'block';
  document.getElementById('iqUserEmail').textContent = _iqSession.user.email;

  if (_iqIsAdmin) {
    document.getElementById('iqAdminBadge').style.display = '';
    const col = document.getElementById('iqEmailCol');
    if (col) col.style.display = '';
  }

  try {
    const inquiries = await fetchInquiries();
    renderInquiryTable(inquiries);
  } catch (err) {
    console.error('[문의] 불러오기 실패:', err);
    showIqMsg('문의 목록을 불러오지 못했습니다.', 'error');
  }
}

/* ─── 메시지 ─────────────────────────────────────────────────── */
function showIqMsg(text, type) {
  const el = document.getElementById('iqMsg');
  if (!el) return;
  el.textContent = text;
  el.className   = 'admin-msg admin-msg--' + type;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function showIqLoginMsg(text, type) {
  const el = document.getElementById('inquiryLoginMsg');
  if (!el) return;
  el.textContent = text;
  el.className   = 'admin-msg admin-msg--' + type;
  el.style.display = 'block';
}

/* ─── 이메일 알림 (Formsubmit) — 성공 여부 반환 ─────────────── */
async function sendInquiryNotification(authorEmail, title, content) {
  try {
    const fd = new FormData();
    fd.append('_subject', '[한배미마을] 새 문의가 접수되었습니다');
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append('작성자', authorEmail);
    fd.append('제목', title);
    fd.append('내용', content);
    fd.append('확인하기', 'https://juwolee-village.netlify.app/inquiry.html');
    const res = await fetch('https://formsubmit.co/ajax/yuwin4387@naver.com', {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' },
    });
    return res.ok;
  } catch (err) {
    console.error('[문의 알림] 네트워크 오류:', err);
    return false;
  }
}

/* ─── DOMContentLoaded ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  _iqSession = await authGetSession();
  if (_iqSession) _iqIsAdmin = await authIsAdmin(_iqSession);

  await initInquiryPage();

  // 로그인 패널 토글
  document.getElementById('btnShowInquiryLogin')?.addEventListener('click', () => {
    const p = document.getElementById('inquiryLoginPanel');
    if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('inquiryLoginForm')?.addEventListener('submit', handleIqLogin);
  document.getElementById('btnIqSignup')?.addEventListener('click', handleIqSignup);

  // 로그아웃
  document.getElementById('btnIqLogout')?.addEventListener('click', async () => {
    await authSignOut();
    location.reload();
  });

  // 새 문의 폼
  document.getElementById('btnNewInquiry')?.addEventListener('click', () => {
    const f = document.getElementById('newInquiryForm');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
    if (f && f.style.display === 'block') document.getElementById('iqTitle').focus();
  });
  document.getElementById('btnIqFormCancel')?.addEventListener('click', () => {
    document.getElementById('newInquiryForm').style.display = 'none';
  });
  document.getElementById('iqForm')?.addEventListener('submit', handleIqSubmit);
});
