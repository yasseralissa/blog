let categoryId = null;
let originalSlug = '';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  categoryId = urlParams.get('id');
  
  await checkAuth();
  updateAIStatus();
  
  if (categoryId) {
    document.getElementById('page-title').textContent = 'Edit Category';
    await loadCategory(categoryId);
  }
  
  setupEventListeners();
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

function setupEventListeners() {
  const nameInput = document.getElementById('category-name');
  nameInput.addEventListener('input', () => {
    const slug = generateSlug(nameInput.value);
    document.getElementById('category-slug').value = slug;
  });
  
  document.getElementById('category-description').addEventListener('input', updateCharCount);
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadCategory(id) {
  try {
    const category = await apiCall(`/api/admin/categories/${id}`);
    document.getElementById('category-id').value = category.id;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-description').value = category.description || '';
    document.getElementById('category-slug').value = category.slug;
    document.getElementById('post-count').value = category.post_count || 0;
    originalSlug = category.slug;
  } catch (err) {
    console.error('Failed to load category:', err);
    showToast('Failed to load category', 'error');
    setTimeout(() => window.location.href = '/admin/categories', 2000);
  }
}

async function saveCategory() {
  const nameInput = document.getElementById('category-name');
  const descInput = document.getElementById('category-description');
  
  const name = nameInput.value.trim();
  const description = descInput.value.trim();
  
  if (!name) {
    showToast('Category name is required', 'error');
    nameInput.focus();
    return;
  }
  
  if (name.length > 100) {
    showToast('Category name must be less than 100 characters', 'error');
    nameInput.focus();
    return;
  }
  
  if (description.length > 500) {
    showToast('Description must be less than 500 characters', 'error');
    descInput.focus();
    return;
  }
  
  try {
    if (categoryId) {
      await apiCall(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description })
      });
      showToast('Category updated');
    } else {
      await apiCall('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
      showToast('Category created');
    }
    
    window.location.href = '/admin/categories';
  } catch (err) {
    console.error('Failed to save category:', err);
    showToast('Failed to save category: ' + err.message, 'error');
  }
}

function cancelEdit() {
  if (confirm('Are you sure? Unsaved changes will be lost.')) {
    window.location.href = '/admin/categories';
  }
}

async function updateAIStatus() {
  try {
    const settings = await apiCall('/api/settings');
    const statusEl = document.getElementById('ai-status');
    
    if (settings.ai_api_key) {
      const provider = settings.ai_provider === 'anthropic' ? 'Claude' : 
                      settings.ai_provider === 'deepseek' ? 'DeepSeek' :
                      settings.ai_provider === 'openrouter' ? 'OpenRouter' : 'GPT';
      statusEl.textContent = `AI ready (${provider})`;
      statusEl.style.color = 'var(--success)';
    } else {
      statusEl.textContent = 'AI not configured. Go to Settings to add API key.';
      statusEl.style.color = 'var(--warning)';
    }
  } catch (err) {
    console.error('Failed to check AI status:', err);
  }
}

async function generateCategoryAI() {
  const promptInput = document.getElementById('ai-prompt');
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showToast('Please enter a topic or description for the category', 'error');
    promptInput.focus();
    return;
  }
  
  const fullPrompt = `Create a blog category with a name and description.
  
Topic: ${prompt}

Please respond in this exact format:
Name: [Category Name]
Description: [A concise description of what this category covers, 1-2 sentences]

Example:
Name: Azure Cloud
Description: Tutorials, best practices, and news about Microsoft Azure cloud services including VMs, storage, and serverless computing.

Make the name catchy, relevant, and SEO-friendly. Make the description clear and informative.`;

  try {
    showLoading('Generating category with AI...');
    
    const res = await apiCall('/api/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: fullPrompt, type: 'category' })
    });
    
    hideLoading();
    
    const content = res.content.trim();
    const lines = content.split('\n');
    
    let name = '';
    let description = '';
    
    for (const line of lines) {
      if (line.startsWith('Name:')) {
        name = line.substring(5).trim();
      } else if (line.startsWith('Description:')) {
        description = line.substring(12).trim();
      }
    }
    
    if (name && description) {
      document.getElementById('category-name').value = name;
      document.getElementById('category-description').value = description;
      document.getElementById('category-slug').value = generateSlug(name);
      showToast('Category generated successfully!');
    } else {
      showToast('Could not parse AI response. Please try again.', 'error');
      console.log('AI Response:', content);
    }
  } catch (err) {
    hideLoading();
    console.error('AI generation error:', err);
    showToast('AI generation failed: ' + err.message, 'error');
  }
}

function updateCharCount() {
  const textarea = document.getElementById('category-description');
  const count = textarea.value.length;
  const hint = textarea.parentElement.querySelector('.hint');
  if (hint) {
    const originalHint = hint.textContent.includes('500') ? hint.textContent : hint.textContent + ' (' + count + '/500)';
    hint.textContent = originalHint;
  }
}

function showLoading(message = 'Loading...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay active';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner-large"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('p').textContent = message;
    overlay.classList.add('active');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
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