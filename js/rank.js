// rank.js - 排行榜模块（Firebase Realtime Database）
const Rank = (() => {
  const USER_KEY = 'smoking_user';

  // ========== Firebase 配置 ==========
  const firebaseConfig = {
    apiKey: "AIzaSyAdtetqiVzXElK-e9vJK2dbM94U3r1-_Lg",
    authDomain: "smoking-tracker-7a586.firebaseapp.com",
    databaseURL: "https://smoking-tracker-7a586-default-rtdb.firebaseio.com",
    projectId: "smoking-tracker-7a586",
    storageBucket: "smoking-tracker-7a586.firebasestorage.app",
    messagingSenderId: "491549151902",
    appId: "1:491549151902:web:3d7247e69d6f1e4ddaa18f"
  };
  // ====================================

  let db = null;
  let roomRef = null;
  let unsubscribe = null;
  let currentView = 'least';
  let membersCache = {};

  function initFirebase() {
    if (db) return;
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK 未加载');
      showError('Firebase SDK 加载失败，请检查网络连接');
      return;
    }
    try {
      const app = firebase.initializeApp(firebaseConfig);
      db = firebase.database();
    } catch (e) {
      console.warn('Firebase 初始化失败', e);
      showError('Firebase 初始化失败: ' + e.message);
    }
  }

  // 用户信息
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch { return null; }
  }

  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(USER_KEY);
  }

  function generateUserId() {
    return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // 房间操作
  async function createRoom() {
    if (!db) { showError('⚠️ Firebase 未初始化，请检查网络或配置'); return; }
    const nickname = document.getElementById('rank-nickname').value.trim();
    if (!nickname) { showError('请先输入昵称'); return; }

    const btn = document.getElementById('rank-create');
    btn.textContent = '创建中...';
    btn.disabled = true;

    const userId = generateUserId();
    const roomCode = generateRoomCode();

    try {
      await db.ref(`rooms/${roomCode}/members/${userId}`).set({
        nickname,
        todayCount: Record.getToday().length,
        todayDate: formatDate(new Date()),
        streak: calcCurrentStreak(),
        dailyLimit: Goal.getGoal().dailyLimit,
        lastUpdate: Date.now()
      });

      saveUser({ userId, nickname, roomCode });
      showError('');
      enterRoom();
    } catch (e) {
      showError('创建房间失败: ' + e.message);
    } finally {
      btn.textContent = '创建房间';
      btn.disabled = false;
    }
  }

  async function joinRoom() {
    if (!db) { showError('⚠️ Firebase 未初始化，请检查网络或配置'); return; }
    const nickname = document.getElementById('rank-nickname').value.trim();
    if (!nickname) { showError('请先输入昵称'); return; }

    const roomCode = document.getElementById('rank-room-input').value.trim().toUpperCase();
    if (!roomCode || roomCode.length !== 6) { showError('请输入6位房间码'); return; }

    const btn = document.getElementById('rank-join');
    btn.textContent = '加入中...';
    btn.disabled = true;

    try {
      const snapshot = await db.ref(`rooms/${roomCode}`).once('value');
      if (!snapshot.exists()) { showError('房间不存在，请检查房间码'); return; }

      const userId = generateUserId();
      await db.ref(`rooms/${roomCode}/members/${userId}`).set({
        nickname,
        todayCount: Record.getToday().length,
        todayDate: formatDate(new Date()),
        streak: calcCurrentStreak(),
        dailyLimit: Goal.getGoal().dailyLimit,
        lastUpdate: Date.now()
      });

      saveUser({ userId, nickname, roomCode });
      showError('');
      enterRoom();
    } catch (e) {
      showError('加入房间失败: ' + e.message);
    } finally {
      btn.textContent = '加入房间';
      btn.disabled = false;
    }
  }

  async function leaveRoom() {
    const user = getUser();
    if (!user || !db) return;

    try {
      await db.ref(`rooms/${user.roomCode}/members/${user.userId}`).remove();
    } catch (e) { /* ignore */ }

    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    roomRef = null;
    membersCache = {};
    clearUser();
    showSetup();
  }

  // 进入房间 - 开始监听
  function enterRoom() {
    const user = getUser();
    if (!user || !db) return;

    document.getElementById('rank-setup').style.display = 'none';
    document.getElementById('rank-board').style.display = 'block';
    document.getElementById('rank-room-code').textContent = user.roomCode;

    roomRef = db.ref(`rooms/${user.roomCode}/members`);
    unsubscribe = roomRef.on('value', (snapshot) => {
      membersCache = snapshot.val() || {};
      renderRankList();
    });
  }

  function showSetup() {
    document.getElementById('rank-setup').style.display = 'block';
    document.getElementById('rank-board').style.display = 'none';
    // 恢复昵称
    const user = getUser();
    if (user && user.nickname) {
      document.getElementById('rank-nickname').value = user.nickname;
    }
  }

  function showError(msg) {
    document.getElementById('rank-error').textContent = msg;
  }

  // 数据同步
  function syncToFirebase() {
    const user = getUser();
    if (!user || !user.roomCode || !db) return;

    const today = formatDate(new Date());
    const updates = {
      todayCount: Record.getToday().length,
      todayDate: today,
      streak: calcCurrentStreak(),
      dailyLimit: Goal.getGoal().dailyLimit,
      lastUpdate: Date.now()
    };

    db.ref(`rooms/${user.roomCode}/members/${user.userId}`).update(updates).catch(() => {});
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function calcCurrentStreak() {
    const goal = Goal.getGoal();
    const limit = goal.dailyLimit;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      if (dateStr < goal.startDate) break;
      if (Record.countByDate(dateStr) <= limit) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // 排行渲染
  function renderRankList() {
    const user = getUser();
    const today = formatDate(new Date());
    const list = document.getElementById('rank-list');
    const empty = document.getElementById('rank-empty');

    // 转为数组，过滤掉过期数据（todayDate 不是今天的，todayCount 显示为 0）
    let members = Object.entries(membersCache).map(([uid, data]) => ({
      uid,
      nickname: data.nickname || '???',
      todayCount: data.todayDate === today ? (data.todayCount || 0) : 0,
      streak: data.streak || 0,
      dailyLimit: data.dailyLimit || 10,
      isMe: user && uid === user.userId
    }));

    if (members.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    // 排序
    if (currentView === 'least') {
      members.sort((a, b) => a.todayCount - b.todayCount || a.nickname.localeCompare(b.nickname));
    } else if (currentView === 'streak') {
      members.sort((a, b) => b.streak - a.streak || a.nickname.localeCompare(b.nickname));
    } else {
      members.sort((a, b) => b.todayCount - a.todayCount || a.nickname.localeCompare(b.nickname));
    }

    const medals = ['🥇', '🥈', '🥉'];

    list.innerHTML = members.map((m, i) => {
      const medal = i < 3 ? medals[i] : `<span class="rank-num">${i + 1}</span>`;
      const meClass = m.isMe ? ' rank-item-me' : '';
      let value = '';
      if (currentView === 'streak') {
        value = `${m.streak} 天`;
      } else {
        value = `${m.todayCount} 支`;
      }
      const meTag = m.isMe ? '<span class="rank-me-tag">我</span>' : '';
      return `<li class="rank-item${meClass}">
        <span class="rank-medal">${medal}</span>
        <span class="rank-name">${m.nickname}${meTag}</span>
        <span class="rank-value">${value}</span>
      </li>`;
    }).join('');
  }

  function refresh() {
    const user = getUser();
    if (user && user.roomCode) {
      syncToFirebase();
    }
  }

  function init() {
    initFirebase();

    const user = getUser();
    if (user && user.roomCode && db) {
      enterRoom();
    } else {
      showSetup();
    }

    // 创建房间
    document.getElementById('rank-create').addEventListener('click', createRoom);
    // 加入房间
    document.getElementById('rank-join').addEventListener('click', joinRoom);
    // 退出房间
    document.getElementById('rank-leave').addEventListener('click', leaveRoom);

    // 复制房间码
    document.getElementById('rank-copy').addEventListener('click', () => {
      const user = getUser();
      if (!user) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(user.roomCode).then(() => {
          const btn = document.getElementById('rank-copy');
          btn.textContent = '✅ 已复制';
          setTimeout(() => { btn.textContent = '📋 复制'; }, 1500);
        });
      }
    });

    // 排行视图切换
    document.querySelectorAll('.rank-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rank-toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderRankList();
      });
    });
  }

  return { init, refresh, syncToFirebase };
})();
