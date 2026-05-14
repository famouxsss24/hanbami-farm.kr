/* ============================================================
   한배미마을 — Supabase 클라이언트 + 인증 공통
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   🔧 설정 (Supabase 프로젝트 생성 후 이 두 줄을 채우세요)
   ───────────────────────────────────────────────────────────── */
const SUPABASE_URL      = 'https://iubwwjdwkksizcadahar.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lR2EougaWXkAWaV0ZacNNw_S24gpf0w';  // sb_publishable_... 값
/* ─────────────────────────────────────────────────────────────
   ↓ 아래는 수정 불필요
   ───────────────────────────────────────────────────────────── */

const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** 현재 로그인 세션 반환 (없으면 null) */
async function authGetSession() {
  const { data: { session } } = await _supa.auth.getSession();
  return session;
}

/** notice_admins 테이블에서 관리자 여부 확인 */
async function authIsAdmin(session) {
  if (!session) return false;
  const { data, error } = await _supa
    .from('notice_admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) {
    console.error('[authIsAdmin] 권한 확인 중 오류:', error.message);
    return false;
  }
  return !!data;
}

/** 이메일 + 비밀번호 로그인 */
async function authSignIn(email, password) {
  return _supa.auth.signInWithPassword({ email, password });
}

/** 이메일 + 비밀번호 회원가입 */
async function authSignUp(email, password) {
  return _supa.auth.signUp({ email, password });
}

/** 로그아웃 */
async function authSignOut() {
  return _supa.auth.signOut();
}

/** 이메일 형식 검사 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Supabase 영문 에러 → 한글 변환 */
function authErrorMsg(message) {
  if (!message) return '알 수 없는 오류가 발생했습니다.';
  const m = message.toLowerCase();

  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (m.includes('email not confirmed'))
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (m.includes('password should be at least') || m.includes('password must be'))
    return '비밀번호는 6자 이상이어야 합니다.';
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('valid email'))
    return '올바른 이메일 형식이 아닙니다. (예: example@naver.com)';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (m.includes('60 seconds') || m.includes('once every'))
    return '60초 후에 다시 시도해 주세요.';
  if (m.includes('network') || m.includes('fetch'))
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
  if (m.includes('signup is disabled'))
    return '현재 회원가입이 비활성화되어 있습니다.';
  if (m.includes('user not found'))
    return '등록되지 않은 이메일입니다.';

  // 번역 없으면 원문 그대로 반환
  return message;
}
