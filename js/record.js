// record.js - 吸烟记录模块
const Record = (() => {
  const STORAGE_KEY = 'smoking_records';
  const HOLD_DURATION = 650;
  let holdTimer = null;
  let isHolding = false;

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function add() {
    const records = getAll();
    const now = Date.now();
    records.push({ id: String(now), timestamp: now });
    save(records);
    return records;
  }

  function remove(id) {
    const records = getAll().filter((r) => r.id !== id);
    save(records);
    return records;
  }

  function getToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startTs = start.getTime();
    return getAll().filter((r) => r.timestamp >= startTs);
  }

  function getByDate(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 86400000;
    return getAll().filter((r) => r.timestamp >= start && r.timestamp < end);
  }

  function countByDate(dateStr) {
    return getByDate(dateStr).length;
  }

  // 渲染今日记录列表
  function renderTodayList() {
    const list = document.getElementById('record-list');
    const emptyTip = document.getElementById('empty-tip');
    const countEl = document.getElementById('today-count');
    const todayRecords = getToday().sort((a, b) => b.timestamp - a.timestamp);

    countEl.textContent = todayRecords.length;

    // 检查是否超过目标
    const goal = Goal.getGoal();
    if (goal.dailyLimit > 0 && todayRecords.length > goal.dailyLimit) {
      countEl.classList.add('over-limit');
    } else {
      countEl.classList.remove('over-limit');
    }

    if (todayRecords.length === 0) {
      list.innerHTML = '';
      emptyTip.style.display = 'block';
      return;
    }

    emptyTip.style.display = 'none';
    list.innerHTML = todayRecords.map((r) => {
      const t = new Date(r.timestamp);
      const time = t.getHours().toString().padStart(2, '0') + ':' +
                   t.getMinutes().toString().padStart(2, '0') + ':' +
                   t.getSeconds().toString().padStart(2, '0');
      return `<li class="record-item">
        <span class="record-time-group"><span class="record-emoji">🚬</span><span class="record-time">${time}</span></span>
        <button class="record-delete" data-id="${r.id}">删除</button>
      </li>`;
    }).join('');
  }

  function playRecordEffect(btn) {
    btn.classList.remove('pulse', 'smoke');
    void btn.offsetWidth;
    btn.classList.add('pulse', 'smoke');
    setTimeout(() => btn.classList.remove('smoke'), 900);
  }

  function commitRecord(btn) {
    add();
    playRecordEffect(btn);
    renderTodayList();
    // 触发其他模块更新
    if (typeof Stats !== 'undefined') Stats.refresh();
    if (typeof Goal !== 'undefined') Goal.refresh();
    if (typeof Rank !== 'undefined') Rank.syncToFirebase();
  }

  function clearHold(btn) {
    clearTimeout(holdTimer);
    holdTimer = null;
    if (btn) btn.classList.remove('holding');
    isHolding = false;
  }

  // 初始化
  function init() {
    const recordBtn = document.getElementById('record-btn');

    recordBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (isHolding) return;
      isHolding = true;
      recordBtn.classList.add('holding');
      holdTimer = setTimeout(() => {
        commitRecord(recordBtn);
        clearHold(recordBtn);
      }, HOLD_DURATION);
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((eventName) => {
      recordBtn.addEventListener(eventName, () => {
        if (!holdTimer) return;
        clearHold(recordBtn);
      });
    });
    recordBtn.addEventListener('contextmenu', (e) => e.preventDefault());

    document.getElementById('record-list').addEventListener('click', (e) => {
      if (e.target.classList.contains('record-delete')) {
        const id = e.target.dataset.id;
        remove(id);
        renderTodayList();
        if (typeof Stats !== 'undefined') Stats.refresh();
        if (typeof Goal !== 'undefined') Goal.refresh();
        if (typeof Rank !== 'undefined') Rank.syncToFirebase();
      }
    });

    renderTodayList();
  }

  return { init, getAll, getToday, getByDate, countByDate, renderTodayList };
})();
