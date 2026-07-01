/* ============================================================
   한배미마을 — 숙소 예약현황 표시 (Supabase 연동)
   상태 변경은 notice-admin.html 의 예약현황 관리에서 처리
   ============================================================ */

const ROOM_STATUS_LABEL = {
  available: '예약 가능',
  limited:   '일부 마감 · 문의요망',
  full:      '예약 마감',
  closed:    '운영 중지',
};

async function fetchRoomStatus() {
  const { data, error } = await _supa
    .from('room_status')
    .select('room_id, status, note, updated_at');
  if (error) throw error;
  return data || [];
}

function renderRoomStatus(rows) {
  rows.forEach(r => {
    const card = document.querySelector(`.stay-card[data-room="${r.room_id}"]`);
    if (!card) return;
    const slot = card.querySelector('.room-status');
    if (!slot) return;

    const label = ROOM_STATUS_LABEL[r.status] || r.status;
    const note  = String(r.note || '').replace(/[<>]/g, '');

    slot.innerHTML = `
      <span class="room-status__badge room-status__badge--${r.status}">${label}</span>
      ${note ? `<span class="room-status__note">${note}</span>` : ''}`;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    renderRoomStatus(await fetchRoomStatus());
  } catch (err) {
    /* 테이블 미생성 등 오류 시 배지 없이 기존 화면 유지 */
    console.error('[예약현황] 불러오기 실패:', err);
  }
});
