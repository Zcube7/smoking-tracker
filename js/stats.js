// stats.js - 统计图表模块
const Stats = (() => {
  let chart = null;
  let currentRange = 'week';

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getDateRange(range) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = range === 'week' ? 7 : 30;
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  }

  function getShortLabel(dateStr) {
    const d = new Date(dateStr);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function buildChartData(range) {
    const dates = getDateRange(range);
    const labels = dates.map(getShortLabel);
    const data = dates.map((d) => Record.countByDate(d));
    return { labels, data, dates };
  }

  function renderChart() {
    const ctx = document.getElementById('stats-chart');
    const { labels, data } = buildChartData(currentRange);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
    } else {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: '吸烟数',
            data,
            backgroundColor: 'rgba(74, 157, 142, 0.6)',
            borderColor: 'rgba(74, 157, 142, 1)',
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, font: { size: 11 } },
              grid: { color: '#f0f0f0' },
            },
            x: {
              ticks: { font: { size: 10 } },
              grid: { display: false },
            }
          }
        }
      });
    }
  }

  function renderStats() {
    const records = Record.getAll();
    const todayCount = Record.getToday().length;

    // 按天聚合
    const dayMap = {};
    records.forEach((r) => {
      const d = formatDate(new Date(r.timestamp));
      dayMap[d] = (dayMap[d] || 0) + 1;
    });

    const dayCounts = Object.values(dayMap);
    const totalDays = dayCounts.length || 1;
    const total = records.length;
    const avg = (total / totalDays).toFixed(1);
    const max = dayCounts.length ? Math.max(...dayCounts) : 0;

    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('stat-avg').textContent = avg;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-max').textContent = max;
  }

  function refresh() {
    renderChart();
    renderStats();
  }

  function init() {
    document.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentRange = btn.dataset.range;
        renderChart();
      });
    });
  }

  return { init, refresh };
})();
