const API_BASE = '/api';

let currentUser = null;

async function apiCall(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.className = 'toast', 3000);
}

async function checkAuth() {
  try {
    const user = await apiCall('/admin/me');
    currentUser = user;
    document.getElementById('loading-page').classList.add('hidden');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-avatar').textContent = user.username.charAt(0).toUpperCase();
    loadDashboard();
  } catch (error) {
    document.getElementById('loading-page').classList.add('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('admin-page').classList.add('hidden');
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');

  try {
    await apiCall('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    checkAuth();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await apiCall('/admin/logout', { method: 'POST' });
  location.reload();
});

async function loadDashboard() {
  try {
    const data = await apiCall('/admin/dashboard');
    document.getElementById('stat-total').textContent = data.stats.totalPosts;
    document.getElementById('stat-published').textContent = data.stats.publishedPosts;
    document.getElementById('stat-drafts').textContent = data.stats.draftPosts;
    document.getElementById('stat-categories').textContent = data.stats.categories;

    const tbody = document.getElementById('recent-posts');
    if (data.recentPosts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><h3>No posts yet</h3><p><a href="/admin/post.html">Create your first post</a></p></td></tr>';
    } else {
      tbody.innerHTML = data.recentPosts.map(post => `
        <tr>
          <td><a href="/admin/post.html?id=${post.id}" style="color: var(--text-primary); text-decoration: none;">${post.title}</a></td>
          <td>${post.category_name || '-'}</td>
          <td><span class="status-badge ${post.status}">${post.status}</span></td>
          <td>${new Date(post.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

checkAuth();
