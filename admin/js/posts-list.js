let posts = [];
let categories = [];
let deletePostId = null;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadCategories();
  await loadPosts();
});

async function checkAuth() {
  try {
    const user = await apiCall('/api/admin/me');
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-avatar').textContent = user.username.charAt(0).toUpperCase();
  } catch (err) {
    window.location.href = '/admin';
  }
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await apiCall('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin';
});

async function loadCategories() {
  try {
    categories = await apiCall('/api/admin/categories');
    const select = document.getElementById('filter-category');
    select.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
      select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadPosts() {
  try {
    posts = await apiCall('/api/admin/posts');
    renderPosts();
  } catch (err) {
    console.error('Failed to load posts:', err);
    document.getElementById('posts-list').innerHTML = '<div class="empty-state"><p>Failed to load posts</p></div>';
  }
}

function renderPosts() {
  const container = document.getElementById('posts-list');
  const statusFilter = document.getElementById('filter-status').value;
  const categoryFilter = document.getElementById('filter-category').value;
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  
  let filtered = posts;
  
  if (statusFilter) {
    filtered = filtered.filter(p => p.status === statusFilter);
  }
  
  if (categoryFilter) {
    filtered = filtered.filter(p => p.category_id == categoryFilter);
  }
  
  if (searchTerm) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(searchTerm) ||
      (p.content && p.content.toLowerCase().includes(searchTerm))
    );
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <h3>No posts found</h3>
        <p>Create your first post to get started</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(post => `
    <div class="post-row">
      <div class="post-title-cell">
        <a href="/admin/post.html?id=${post.id}">${post.title}</a>
        <div class="excerpt">${post.excerpt || stripHtml(post.content || '').substring(0, 100) || 'No excerpt'}</div>
      </div>
      <div>${post.category_name || '-'}</div>
      <div><span class="status-badge ${post.status}">${post.status}</span></div>
      <div>${formatDate(post.created_at)}</div>
      <div class="action-buttons">
        <a href="/admin/post.html?id=${post.id}" class="action-btn">Edit</a>
        <button class="action-btn danger" onclick="confirmDelete(${post.id}, '${escapeHtml(post.title)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

function escapeHtml(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(renderPosts, 300);
}

function confirmDelete(id, title) {
  deletePostId = id;
  document.getElementById('delete-post-title').textContent = title;
  document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
  deletePostId = null;
}

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!deletePostId) return;
  
  try {
    await apiCall(`/api/admin/posts/${deletePostId}`, { method: 'DELETE' });
    closeDeleteModal();
    loadPosts();
    showToast('Post deleted');
  } catch (err) {
    showToast('Failed to delete post', 'error');
  }
});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function apiCall(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
