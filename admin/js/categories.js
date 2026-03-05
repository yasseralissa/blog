let categories = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadCategories();
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
    renderCategories();
  } catch (err) {
    console.error('Failed to load categories:', err);
    document.getElementById('categories-list').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--danger);">Failed to load categories</td></tr>';
  }
}

function renderCategories() {
  const tbody = document.getElementById('categories-list');
  
  if (categories.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px; color: var(--text-secondary);">
          <div style="margin-bottom: 12px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 style="margin-bottom: 8px;">No categories yet</h3>
          <p>Create your first category to organize posts</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = categories.map(cat => `
    <tr>
      <td><strong>${escapeHtml(cat.name)}</strong></td>
      <td><code>${escapeHtml(cat.slug)}</code></td>
      <td>${escapeHtml(cat.description || '-')}</td>
      <td>${cat.post_count || 0}</td>
      <td class="action-buttons">
        <a href="/admin/category-edit.html?id=${cat.id}" class="action-btn">Edit</a>
        <button class="action-btn danger" onclick="deleteCategory(${cat.id}, '${escapeJsString(cat.name)}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to delete the category "${name}"? Posts in this category will have their category removed.`)) {
    return;
  }
  
  try {
    await apiCall(`/api/admin/categories/${id}`, {
      method: 'DELETE'
    });
    showToast('Category deleted');
    await loadCategories();
  } catch (err) {
    console.error('Failed to delete category:', err);
    showToast('Failed to delete category: ' + err.message, 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeJsString(text) {
  return JSON.stringify(text).slice(1, -1);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function apiCall(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  
  return res.json();
}