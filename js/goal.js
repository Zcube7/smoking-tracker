// goal.js - 戒烟目标模块
const Goal = (() => {
  const STORAGE_KEY = 'smoking_goal';

  function getGoal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        dailyLimit: 10,
        startDate: formatDate(new Date()),
        bestStreak: 0
      };
    } catch {
      return { dailyLimit: 10, startDate: formatDate(new Date()), bestStreak: 0 };
    }
  }

  function saveGoal(goal) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function calcStreak() {
    const goal = getGoal();
    const limit = goal.dailyLimit;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 从昨天开始往回数（今天还没结束，不算）
    for (let i = 1; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const count = Record.countByDate(dateStr);
      // 如果那天没有任何记录且在开始日期之前，停止计算
      if (dateStr < goal.startDate) break;
      if (count <= limit) {
        streak++;
      } else {
        break;
      }
    }

    // 更新最佳记录
    if (streak > goal.bestStreak) {
      goal.bestStreak = streak;
      saveGoal(goal);
    }

    return { current: streak, best: goal.bestStreak };
  }

  function drawProgressRing(current, limit) {
    const canvas = document.getElementById('progress-ring');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 230;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 92;
    const lineWidth = 16;
    const startAngle = -Math.PI / 2;

    // 背景环
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#EAECF0';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 进度环
    const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const overLimit = current > limit;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = overLimit ? '#E17055' : '#4A9D8E';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 如果超标，画满圈红色
    if (overLimit) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(225, 112, 85, 0.3)';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 再画实际比例（超出部分）
      const overRatio = Math.min(current / limit, 2) - 1;
      const overEnd = startAngle + overRatio * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, overEnd);
      ctx.strokeStyle = '#E17055';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  function refresh() {
    const goal = getGoal();
    const todayCount = Record.getToday().length;
    const streak = calcStreak();

    document.getElementById('goal-limit').textContent = goal.dailyLimit;
    document.getElementById('progress-current').textContent = todayCount;
    document.getElementById('progress-limit').textContent = goal.dailyLimit;
    document.getElementById('streak-current').textContent = streak.current;
    document.getElementById('streak-best').textContent = streak.best;

    // 超标样式
    const currentEl = document.getElementById('progress-current');
    const statusEl = document.getElementById('progress-status');
    if (todayCount > goal.dailyLimit) {
      currentEl.classList.add('over-limit');
      statusEl.textContent = '⚠️ 已超过今日上限';
      statusEl.style.color = '#E17055';
    } else if (todayCount === goal.dailyLimit) {
      currentEl.classList.remove('over-limit');
      statusEl.textContent = '😰 已达到上限，忍住！';
      statusEl.style.color = '#E17055';
    } else if (todayCount === 0) {
      currentEl.classList.remove('over-limit');
      statusEl.textContent = '✨ 今天还没抽烟，太棒了';
      statusEl.style.color = '#00B894';
    } else {
      currentEl.classList.remove('over-limit');
      statusEl.textContent = `👍 还可以抽 ${goal.dailyLimit - todayCount} 支`;
      statusEl.style.color = '#4A9D8E';
    }

    drawProgressRing(todayCount, goal.dailyLimit);
  }

  function init() {
    document.getElementById('goal-minus').addEventListener('click', () => {
      const goal = getGoal();
      if (goal.dailyLimit > 1) {
        goal.dailyLimit--;
        saveGoal(goal);
        refresh();
        // 同步更新记录页的超标状态
        Record.renderTodayList();
      }
    });

    document.getElementById('goal-plus').addEventListener('click', () => {
      const goal = getGoal();
      if (goal.dailyLimit < 99) {
        goal.dailyLimit++;
        saveGoal(goal);
        refresh();
        Record.renderTodayList();
      }
    });
  }

  return { init, refresh, getGoal };
})();
