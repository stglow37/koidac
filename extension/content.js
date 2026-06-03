const currentUrl = window.location.href;
const KOIDAC_SERVER = "https://koidac.vercel.app";

const DEBUG = localStorage.getItem('koidac_debug') === '1';
function log(...args) { if (DEBUG) console.debug('[KOIDAC]', ...args); }

function fetchWithTimeout(resource, options = {}, timeout = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;
  return fetch(resource, options).finally(() => clearTimeout(id));
}

function showToast(message, timeout = 3000) {
  try {
    let t = document.getElementById('koidac-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'koidac-toast';
      t.style.cssText = 'position:fixed;right:12px;bottom:12px;padding:8px 12px;background:#111;color:#fff;border-radius:6px;z-index:99999;font-family:Segoe UI,system-ui,sans-serif;font-size:13px;';
      document.body.appendChild(t);
    }
    t.innerText = message;
    t.style.opacity = '1';
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, timeout - 250);
  } catch (e) { /* ignore */ }
}

// Inject reusable styles for badges
if (!document.getElementById('koidac-style')) {
  const s = document.createElement('style');
  s.id = 'koidac-style';
  s.textContent = `
    .koidac-badge { display:inline-block; font-family: 'JetBrains Mono', 'Segoe UI', monospace; font-size:11px; font-weight:800; padding:1px 4px; border-radius:3px; margin-right:6px; text-decoration:none; cursor:pointer; vertical-align:middle; line-height:1.1; transition:all .15s ease-in-out; }
  `;
  document.head.appendChild(s);
}

function calculateTier(avgRating) {
  const rating = parseFloat(avgRating);
  // 💡 평점이 없거나(NaN) 0인 경우: 회색 '??' 스타일 반환
  if (isNaN(rating) || rating === 0) {
    return { text: '??', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
  }
  const fracLevel = Math.max(1, Math.min(5, 5 - Math.floor((rating % 1) * 5)));
  if (rating < 2.0) return { text: `S${fracLevel}`, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
  if (rating < 3.0) return { text: `G${fracLevel}`, color: '#d97706', bg: '#fef3c7', border: '#fde68a' };
  if (rating < 4.0) return { text: `P${fracLevel}`, color: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' };
  return { text: `D${fracLevel}`, color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' };
}

// 2. 배지 스타일 적용 함수
function applyBadgeStyle(element, tier) {
  element.classList.add('koidac-badge');
  element.innerText = tier.text;
  element.style.color = tier.color;
  element.style.backgroundColor = tier.bg;
  element.style.border = `1px solid ${tier.border}`;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `KOIDAC ${tier.text}`);
}

// =============================================================
// 🚀 [모드 1] 문제 상세 페이지 화면 (prob_page)
// =============================================================
if (currentUrl.includes('prob_page')) {
  log('상세 페이지 감지');
  const urlParams = new URLSearchParams(window.location.search);
  const problemId = urlParams.get('NO');
  const problemTitleHeader = document.querySelector('.title h1');

  if (problemId && problemTitleHeader && !document.getElementById('koidac-tier-link')) {
    const rawTitle = problemTitleHeader.innerText.trim();

    fetchWithTimeout(`${KOIDAC_SERVER}/api/problem/${problemId}`)
      .then(res => {
        if (res.status === 404) throw new Error('NOT_REGISTERED');
        if (!res.ok) throw new Error('SERVER_ERROR');
        return res.json();
      })
      .then(data => {
        const tierLink = document.createElement('a');
        tierLink.id = 'koidac-tier-link';
        tierLink.href = `${KOIDAC_SERVER}/problem/${problemId}`;
        tierLink.target = '_blank';
        tierLink.rel = 'noopener noreferrer';
        applyBadgeStyle(tierLink, calculateTier(data.avgRating));
        problemTitleHeader.insertBefore(tierLink, problemTitleHeader.firstChild);
      })
      .catch(err => {
        log('problem fetch error', err);
        if (err.message === 'NOT_REGISTERED') {
          const autoRegBtn = document.createElement('a');
          autoRegBtn.id = 'koidac-tier-link';
          applyBadgeStyle(autoRegBtn, { text: '??', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' });

          autoRegBtn.onclick = (e) => {
            e.preventDefault();
            autoRegBtn.innerText = "⏳";
            fetchWithTimeout(`${KOIDAC_SERVER}/api/problem/${problemId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: rawTitle })
            })
            .then(res => res.json())
            .then(() => {
              showToast(`[KOIDAC] ${problemId}번 문제가 자동으로 등록되었습니다!`);
              autoRegBtn.href = `${KOIDAC_SERVER}/problem/${problemId}`;
              autoRegBtn.target = '_blank';
              autoRegBtn.rel = 'noopener noreferrer';
              applyBadgeStyle(autoRegBtn, calculateTier('0.0'));
            })
            .catch(e => { log('auto-register error', e); showToast('KOIDAC 자동 등록에 실패했습니다.'); });
          };
          problemTitleHeader.insertBefore(autoRegBtn, problemTitleHeader.firstChild);
        } else if (err.name === 'AbortError') {
          showToast('KOIDAC: 서버 응답이 지연되고 있습니다.');
        }
      });
  }
}

// =============================================================
// 🚀 [모드 2] 문제 목록 페이지 화면 (/problems)
// =============================================================
else if (currentUrl.includes('/problems')) {
  log('목록 페이지 감지');
  
  const rows = document.querySelectorAll('table tr');
  const problemMap = new Map();
  const problemIds = [];

  rows.forEach((row, idx) => {
    // 💡 방안 B 탑재: 칸의 순서(cells[0], cells[2])에 의존하지 않고, 
    // 행 내부에서 'prob_page?NO=' 가 매칭되는 진짜 제목 a 태그를 다이렉트로 색출합니다.
    const titleLink = row.querySelector('a[href*="prob_page?NO="]') || row.querySelector('a[href*="prob_page?NO="]');
    
    if (titleLink) {
      try {
        // a 태그의 href 값(예: "prob_page?NO=1")에서 문제 번호만 안전하게 파싱 추출
        const hrefValue = titleLink.getAttribute('href');
        const match = hrefValue.match(/NO=(\d+)/);
        
        if (match && match[1]) {
          const problemId = parseInt(match[1], 10);
          
          if (!isNaN(problemId) && problemId > 0) {
            problemIds.push(problemId);
            problemMap.set(problemId, {
              container: titleLink,
              rawTitle: titleLink.innerText.trim()
            });
          }
        }
      } catch (e) {
        console.error("[KOIDAC 디버그] 행 내부 파싱 에러 발생:", e);
      }
    } else {
      // 첫 행(설명 행)이나 링크가 없는 줄은 자연스럽게 로그 생략 및 패스
    }
  });

  console.log("[KOIDAC 디버그] 정밀 구조 저격 후 최종 검출된 문제 번호 배열:", problemIds);

  if (problemIds.length > 0) {
    fetchWithTimeout(`${KOIDAC_SERVER}/api/problem/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemIds })
    })
    .then(res => {
      if (!res.ok) throw new Error('Bulk fetch failed');
      return res.json();
    })
    .then(response => {
      const serverData = response.data || [];
      log('서버 벌크 조회 수신 수량:', serverData.length);

      serverData.forEach(item => {
        const uiMap = problemMap.get(item.problem_id);
        if (!uiMap) return;

        const badge = document.createElement('span');
        
        if (item.registered) {
          applyBadgeStyle(badge, calculateTier(item.avgRating));
          badge.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`${KOIDAC_SERVER}/problem/${item.problem_id}`, '_blank');
          };
        } else {
          applyBadgeStyle(badge, { text: 'X', color: '#ffffff', bg: '#1e293b', border: '#0f172a' });
          badge.title = "KOIDAC 미등록 문제 (클릭 시 자동 등록 후 이동)";
          badge.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            badge.innerText = "⏳";
            badge.style.color = "#1e293b"; // 로딩 중 가독성 확보

            fetchWithTimeout(`${KOIDAC_SERVER}/api/problem/${item.problem_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: uiMap.rawTitle })
            })
            .then(res => res.json())
            .then(() => {
              window.open(`${KOIDAC_SERVER}/problem/${item.problem_id}`, '_blank');
              applyBadgeStyle(badge, calculateTier('0.0'));
              badge.title = `KOIDAC 평점: ⭐️ 0.0 (0명 투표)`;
              badge.onclick = (event) => { event.preventDefault(); event.stopPropagation(); window.open(`${KOIDAC_SERVER}/problem/${item.problem_id}`, '_blank'); };
            })
            .catch(err => { applyBadgeStyle(badge, { text: 'X', color: '#ffffff', bg: '#1e293b', border: '#0f172a' }); log('auto-register error', err); showToast('KOIDAC 자동 등록에 실패했습니다.'); });
          };
        }

        uiMap.container.insertBefore(badge, uiMap.container.firstChild);
      });
      log('목록 배지 렌더링 정상 완료');
    })
    .catch(err => { log(' 벌크 엔진 에러', err); });
  }
}