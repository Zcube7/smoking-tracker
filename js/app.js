// app.js - 应用入口
(function () {
  // Tab 切换
  const tabItems = document.querySelectorAll('.tab-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.tab;

      tabItems.forEach((t) => t.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      item.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');

      // 切换到对应 Tab 时刷新数据
      if (target === 'stats') Stats.refresh();
      if (target === 'goal') Goal.refresh();
      if (target === 'rank') Rank.refresh();
    });
  });

  // 初始化各模块
  Record.init();
  Stats.init();
  Goal.init();
  Rank.init();

  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
