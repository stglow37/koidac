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

// =============================================================
// [모드 1] 문제 상세 페이지 (prob_page)
// — .problem-container 바로 앞에 KOIDAC 정보 블록 삽입
// =============================================================
if (currentUrl.includes('prob_page')) {
  log('상세 페이지 감지');
  const urlParams = new URLSearchParams(window.location.search);
  const problemId = urlParams.get('NO');

  if (problemId && !document.getElementById('koidac-info-block')) {
    fetchWithTimeout(`${KOIDAC_SERVER}/api/problem/${problemId}`)
      .then(res => {
        if (res.status === 404) throw new Error('NOT_REGISTERED');
        if (!res.ok) throw new Error('SERVER_ERROR');
        return res.json();
      })
      .then(data => {
        const problemContainer = document.querySelector('.problem-container');
        if (!problemContainer) return;

        const block = document.createElement('div');
        block.id = 'koidac-info-block';
        block.style.cssText = [
          'padding:10px 15px',
          'margin-bottom:15px',
          'font-size:14px',
          'line-height:1.9',
          'background-color:#eff6ff',
          'border-radius:6px',
          'border:1px solid #bfdbfe',
          'font-family:Segoe UI,system-ui,sans-serif',
        ].join(';');

        const tier = data.ai_tier || '분석 전';
        const algos = data.ai_algorithms || '';
        const rating = parseFloat(data.avg_rating) || 0;
        const votes = data.vote_count || 0;
        const ratingText = votes > 0
          ? `★ ${rating.toFixed(1)} / 5 (${votes}명 투표)`
          : '아직 투표 없음';

        // header row
        const header = document.createElement('div');
        header.style.cssText = 'font-weight:700;color:#1e40af;font-size:15px;margin-bottom:4px;';
        header.textContent = 'KOIDAC 난이도 정보';
        block.appendChild(header);

        // info row
        const row = document.createElement('div');
        row.style.color = '#334155';

        const aiSpan = document.createElement('span');
        aiSpan.innerHTML = `AI 티어: <strong>${tier}</strong>`;
        row.appendChild(aiSpan);

        if (algos) {
          const sep1 = document.createElement('span');
          sep1.style.cssText = 'margin:0 8px;color:#94a3b8;';
          sep1.textContent = '|';
          row.appendChild(sep1);

          const algoSpan = document.createElement('span');
          algoSpan.textContent = `알고리즘: ${algos}`;
          row.appendChild(algoSpan);
        }

        const sep2 = document.createElement('span');
        sep2.style.cssText = 'margin:0 8px;color:#94a3b8;';
        sep2.textContent = '|';
        row.appendChild(sep2);

        const ratingSpan = document.createElement('span');
        ratingSpan.textContent = `유저 평점: ${ratingText}`;
        row.appendChild(ratingSpan);

        const sep3 = document.createElement('span');
        sep3.style.cssText = 'margin:0 8px;color:#94a3b8;';
        sep3.textContent = '|';
        row.appendChild(sep3);

        const link = document.createElement('a');
        link.href = `${KOIDAC_SERVER}/problem/${problemId}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = 'color:#2563eb;text-decoration:underline;';
        link.textContent = 'KOIDAC에서 자세히 보기 →';
        row.appendChild(link);

        block.appendChild(row);
        problemContainer.insertAdjacentElement('beforebegin', block);
      })
      .catch(err => {
        log('problem fetch error', err);
        if (err.name === 'AbortError') {
          showToast('KOIDAC: 서버 응답이 지연되고 있습니다.');
        }
      });
  }
}

// =============================================================
// [모드 2] 문제 목록 페이지 (/problems)
// — 제목 링크가 있는 <td> 안에 한 줄 텍스트 추가
// =============================================================
else if (currentUrl.includes('/problems')) {
  log('목록 페이지 감지');

  const rows = document.querySelectorAll('table tr');
  const problemMap = new Map();
  const problemIds = [];

  rows.forEach((row) => {
    const titleLink = row.querySelector('a[href*="prob_page?NO="]');
    if (titleLink) {
      try {
        const match = titleLink.getAttribute('href').match(/NO=(\d+)/);
        if (match && match[1]) {
          const problemId = parseInt(match[1], 10);
          if (!isNaN(problemId) && problemId > 0) {
            problemIds.push(problemId);
            problemMap.set(problemId, { container: titleLink });
          }
        }
      } catch (e) {
        console.error('[KOIDAC] 행 파싱 에러:', e);
      }
    }
  });

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
      log('서버 벌크 조회 수신:', serverData.length);

      serverData.forEach(item => {
        const uiMap = problemMap.get(item.problem_id);
        if (!uiMap || !item.registered) return;

        const rating = parseFloat(item.avg_rating) || 0;
        const votes = item.vote_count || 0;
        const tier = item.ai_tier || '?';

        const infoLine = document.createElement('div');
        infoLine.style.cssText = [
          'font-size:11px',
          'color:#475569',
          'margin-top:2px',
          'cursor:pointer',
          'font-family:Segoe UI,system-ui,sans-serif',
        ].join(';');

        let text = `[KOIDAC] AI: ${tier}`;
        if (votes > 0) {
          text += `  |  ★ ${rating.toFixed(1)} (${votes}명)`;
        }
        infoLine.textContent = text;

        infoLine.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(`${KOIDAC_SERVER}/problem/${item.problem_id}`, '_blank');
        };

        uiMap.container.parentNode.appendChild(infoLine);
      });

      log('목록 텍스트 렌더링 완료');
    })
    .catch(err => { log('벌크 에러', err); });
  }
}
