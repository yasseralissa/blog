document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadSettings();
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

async function loadSettings() {
  try {
    const settings = await apiCall('/api/settings');
    
    document.getElementById('setting-site_title').value = settings.site_title || '';
    document.getElementById('setting-site_description').value = settings.site_description || '';
    document.getElementById('setting-google_analytics_id').value = settings.google_analytics_id || '';
    document.getElementById('setting-ai_provider').value = settings.ai_provider || 'openai';
    document.getElementById('setting-ai_api_key').value = settings.ai_api_key || '';
    document.getElementById('setting-ai_model').value = settings.ai_model || '';
    document.getElementById('setting-ai_temperature').value = settings.ai_temperature || '0.7';
    document.getElementById('temp-slider').value = settings.ai_temperature || '0.7';
    
    if (settings.openrouter_base_url) {
      document.getElementById('setting-openrouter_base_url').value = settings.openrouter_base_url;
    }
    
    onProviderChange();
  } catch (err) {
    console.error('Failed to load settings:', err);
    showToast('Failed to load settings', 'error');
  }
}

function onProviderChange() {
  const provider = document.getElementById('setting-ai_provider').value;
  const modelHint = document.getElementById('model-hint');
  const openrouterDiv = document.getElementById('openrouter-base-url');
  
  saveSetting('ai_provider', provider);
  
  switch (provider) {
    case 'openai':
      modelHint.textContent = 'e.g., gpt-4, gpt-4-turbo, gpt-3.5-turbo';
      openrouterDiv.style.display = 'none';
      break;
    case 'anthropic':
      modelHint.textContent = 'e.g., claude-3-opus-20240229, claude-3-sonnet-20240229';
      openrouterDiv.style.display = 'none';
      break;
    case 'deepseek':
      modelHint.textContent = 'e.g., deepseek-chat, deepseek-coder';
      openrouterDiv.style.display = 'none';
      break;
    case 'openrouter':
      modelHint.textContent = 'e.g., openai/gpt-4, anthropic/claude-3-opus, meta-llama/llama-3-70b-instruct';
      openrouterDiv.style.display = 'flex';
      break;
  }
}

function updateTemperature(value) {
  document.getElementById('setting-ai_temperature').value = value;
  saveSetting('ai_temperature', value);
}

async function saveSetting(key, value) {
  try {
    await apiCall('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value })
    });
    showToast('Setting saved');
  } catch (err) {
    showToast('Failed to save setting', 'error');
  }
}

async function testAI() {
  const resultEl = document.getElementById('ai-test-result');
  resultEl.innerHTML = '<span style="color: var(--text-secondary);">Testing...</span>';
  
  try {
    const res = await apiCall('/api/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Say "Connection successful!" in exactly those words.',
        type: 'test'
      })
    });
    
    resultEl.innerHTML = `<span style="color: var(--success);">✓ Connection successful!</span><br><small style="color: var(--text-secondary);">Response: ${res.content.substring(0, 100)}</small>`;
    showToast('AI connection successful');
  } catch (err) {
    resultEl.innerHTML = `<span style="color: var(--danger);">✗ ${err.message}</span>`;
    showToast('AI connection failed', 'error');
  }
}

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
    const response = await fetch(endpoint, {
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
