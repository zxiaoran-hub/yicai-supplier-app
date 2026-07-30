/**
 * 异采 YiCai 供应商端 - 主应用入口
 * 负责: Supabase初始化、认证、路由、公共方法
 */

// ===== Supabase 初始化 =====
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 全局状态 =====
const state = {
  user: null,
  supplier: null,
  currentPage: 'dashboard'
};

// ===== 状态映射 =====
const STATUS_MAP = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  producing: { label: '生产中', color: 'info' },
  quality: { label: '质检中', color: 'gold' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'danger' }
};

const PROCESS_STATUS = [
  '原料到位', '排产完成', '生产中', '灌装中', '包装中', '质检中', '质检通过', '已发货'
];

// ===== 认证模块 =====
const auth = {
  // 登录
  async signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    state.user = data.user;
    await this.loadSupplier();
    return data;
  },

  // 注册
  async signUp(email, password, supplierId) {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    state.user = data.user;
    // 关联供应商
    if (supplierId) {
      await db.from('suppliers').update({ user_id: data.user.id }).eq('id', supplierId);
    }
    await this.loadSupplier();
    return data;
  },

  // 加载当前用户的供应商档案
  async loadSupplier() {
    if (!state.user) return null;
    const { data, error } = await db
      .from('suppliers')
      .select('*')
      .eq('user_id', state.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    state.supplier = data;
    return data;
  },

  // 登出
  async signOut() {
    await db.auth.signOut();
    state.user = null;
    state.supplier = null;
    showLogin();
  },

  // 检查登录状态
  async checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
      state.user = session.user;
      await this.loadSupplier();
      return true;
    }
    return false;
  }
};

// ===== 路由 =====
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const tabEl = document.querySelector(`.tab-item[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (tabEl) tabEl.classList.add('active');

  // 触发页面数据加载
  switch (page) {
    case 'dashboard': dashboard.load(); break;
    case 'orders': orders.load(); break;
    case 'products': products.load(); break;
    case 'inquiries': inquiries.load(); break;
    case 'profile': profile.load(); break;
  }
}

// ===== UI 工具 =====
function showLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  switchPage('dashboard');
}

function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function showModal(id) {
  document.getElementById(id).classList.add('active');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('active');
}

function formatMoney(n) {
  if (!n) return '¥0';
  return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 0 });
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getMonth()+1}/${date.getDate()}`;
}

function formatDateTime(d) {
  if (!d) return '-';
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

function getStatusLabel(status) {
  return STATUS_MAP[status]?.label || status;
}

// ===== 图片上传 =====
async function uploadImage(file, bucket) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;
  const { data, error } = await db.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;
  const { data: { publicUrl } } = db.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

// 处理图片选择并上传
async function handleImageUpload(input, bucket, callback) {
  const files = input.files;
  if (!files || files.length === 0) return;
  showToast('上传中...');
  try {
    const urls = [];
    for (const file of files) {
      const url = await uploadImage(file, bucket);
      urls.push(url);
    }
    showToast('上传成功 ✅');
    if (callback) callback(urls);
  } catch (e) {
    showToast('上传失败: ' + e.message);
  }
  input.value = '';
}

// ===== 初始化 =====
async function init() {
  try {
    const loggedIn = await auth.checkSession();
    if (loggedIn && state.supplier) {
      showApp();
    } else if (loggedIn && !state.supplier) {
      // 登录了但没有关联供应商，需要选择
      showLogin();
      showToast('请绑定您的供应商账号');
    } else {
      showLogin();
    }
  } catch (e) {
    console.error('Init error:', e);
    showLogin();
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// ===== 登录表单处理 =====
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  if (form.id === 'login-form') {
    const email = form.querySelector('[name=email]').value;
    const password = form.querySelector('[name=password]').value;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = '登录中...';
    try {
      await auth.signIn(email, password);
      if (state.supplier) {
        showApp();
        showToast('欢迎回来 👋');
      } else {
        showToast('未找到关联的供应商账号');
      }
    } catch (err) {
      showToast('登录失败: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = '登录';
  }

  if (form.id === 'register-form') {
    const email = form.querySelector('[name=email]').value;
    const password = form.querySelector('[name=password]').value;
    const supplierId = form.querySelector('[name=supplier]').value;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = '注册中...';
    try {
      await auth.signUp(email, password, supplierId);
      if (state.supplier) {
        showApp();
        showToast('注册成功 🎉');
      } else {
        showToast('注册成功，请联系管理员绑定供应商');
      }
    } catch (err) {
      showToast('注册失败: ' + err.message);
    }
    btn.disabled = false;
    btn.textContent = '注册';
  }
});

// 登录/注册切换
function toggleAuthForm(show) {
  document.getElementById('login-form').style.display = show === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = show === 'register' ? 'block' : 'none';
}

// 加载供应商选择列表（注册用）
async function loadSupplierOptions() {
  const { data } = await db.from('suppliers').select('id, company_name').is('user_id', null);
  const select = document.querySelector('#register-form [name=supplier]');
  if (select && data) {
    select.innerHTML = '<option value="">选择您的供应商账号</option>' +
      data.map(s => `<option value="${s.id}">${s.company_name}</option>`).join('');
  }
}
