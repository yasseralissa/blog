let quillEditor = null;
let postId = null;
let categories = [];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  postId = urlParams.get('id');
  
  await loadCategories();
  initQuill();
  updateAIStatus();
  
  if (postId) {
    document.getElementById('page-title').textContent = 'Edit Post';
    await loadPost(postId);
  }
  
  setupEventListeners();
});

function initQuill() {
  const Font = Quill.import('formats/font');
  Font.whitelist = ['sans-serif', 'serif', 'monospace'];
  Quill.register(Font, true);
  
  quillEditor = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: [
          [{ 'font': Font.whitelist }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', 'image', 'video'],
          ['clean']
        ],
        handlers: {
          image: imageHandler
        }
      },
      keyboard: {
        bindings: {
          'shift enter': {
            key: 'Enter',
            shiftKey: true,
            handler(range) {
              const currentFormat = this.quill.getFormat(range);
              this.quill.insertText(range.index, '\n', currentFormat);
              this.quill.setSelection(range.index + 1, 0);
            }
          }
        }
      }
    },
    placeholder: 'Start writing your post...'
  });

  quillEditor.on('text-change', () => {
    document.getElementById('post-content').value = quillEditor.root.innerHTML;
    updateWordCount();
  });
}

function imageHandler() {
  const url = prompt('Enter image URL:');
  if (url) {
    const range = quillEditor.getSelection(true);
    quillEditor.insertEmbed(range.index, 'image', url);
    quillEditor.setSelection(range.index + 1);
  }
}

function updateWordCount() {
  const text = quillEditor.getText();
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = text.length;
  
  let statsEl = document.getElementById('word-count');
  if (!statsEl) {
    statsEl = document.createElement('div');
    statsEl.id = 'word-count';
    statsEl.className = 'word-count';
    document.querySelector('.ql-editor').parentElement.appendChild(statsEl);
  }
  statsEl.textContent = `${wordCount} words, ${charCount} characters`;
}

async function loadCategories() {
  try {
    const res = await apiCall('/api/categories');
    categories = res;
    const select = document.getElementById('post-category');
    select.innerHTML = '<option value="">Select category...</option>';
    categories.forEach(cat => {
      select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadPost(id) {
  try {
    const res = await apiCall(`/api/admin/posts/${id}`);
    
    document.getElementById('post-id').value = res.id;
    document.getElementById('post-title').value = res.title || '';
    document.getElementById('post-category').value = res.category_id || '';
    document.getElementById('post-image').value = res.featured_image || '';
    document.getElementById('post-excerpt').value = res.excerpt || '';
    document.getElementById('post-status').value = res.status || 'draft';
    document.getElementById('post-meta-title').value = res.meta_title || '';
    document.getElementById('post-meta-description').value = res.meta_description || '';
    
    if (quillEditor && res.content) {
      quillEditor.root.innerHTML = res.content;
    }
    
    updateCharCounts();
    updateImagePreview();
    
  } catch (err) {
    console.error('Failed to load post:', err);
    showToast('Failed to load post', 'error');
  }
}

async function savePost(status = null) {
  const title = document.getElementById('post-title').value.trim();
  if (!title) {
    showToast('Please enter a title', 'error');
    return;
  }
  
  const content = quillEditor ? quillEditor.root.innerHTML : '';
  const data = {
    title: title,
    content: content,
    excerpt: document.getElementById('post-excerpt').value.trim(),
    featured_image: document.getElementById('post-image').value.trim(),
    status: status || document.getElementById('post-status').value,
    category_id: document.getElementById('post-category').value || null,
    meta_title: document.getElementById('post-meta-title').value.trim(),
    meta_description: document.getElementById('post-meta-description').value.trim()
  };
  
  try {
    showLoading('Saving post...');
    
    if (postId) {
      await apiCall(`/api/admin/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } else {
      const res = await apiCall('/api/admin/posts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      postId = res.id;
      window.history.replaceState({}, '', `/admin/post.html?id=${postId}`);
      document.getElementById('page-title').textContent = 'Edit Post';
    }
    
    hideLoading();
    showToast('Post saved successfully');
    
  } catch (err) {
    hideLoading();
    console.error('Save error:', err);
    showToast('Failed to save post: ' + err.message, 'error');
  }
}

function setupEventListeners() {
  document.getElementById('post-title').addEventListener('input', function() {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  });
  
  document.getElementById('post-image').addEventListener('input', updateImagePreview);
  
  document.getElementById('post-meta-title').addEventListener('input', function() {
    document.getElementById('meta-title-count').textContent = this.value.length;
  });
  
  document.getElementById('post-meta-description').addEventListener('input', function() {
    document.getElementById('meta-desc-count').textContent = this.value.length;
  });
}

function updateImagePreview() {
  const url = document.getElementById('post-image').value.trim();
  const preview = document.getElementById('image-preview');
  
  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='Invalid image URL'">`;
  } else {
    preview.innerHTML = '';
  }
}

function updateCharCounts() {
  document.getElementById('meta-title-count').textContent = document.getElementById('post-meta-title').value.length;
  document.getElementById('meta-desc-count').textContent = document.getElementById('post-meta-description').value.length;
}

async function updateAIStatus() {
  try {
    const settings = await apiCall('/api/settings');
    const statusEl = document.getElementById('ai-status');
    
    if (settings.ai_api_key) {
      const provider = settings.ai_provider === 'anthropic' ? 'Claude' : 'GPT';
      statusEl.innerHTML = `<span style="color: var(--success);">✓ ${provider} configured</span>`;
    } else {
      statusEl.innerHTML = `<span style="color: var(--warning);">⚠ API key not set</span>`;
    }
  } catch (err) {
    console.error('Failed to check AI status:', err);
  }
}

async function generateAI() {
  const task = document.getElementById('ai-task').value;
  const prompt = document.getElementById('ai-prompt').value.trim();
  const title = document.getElementById('post-title').value.trim();
  const currentContent = quillEditor ? quillEditor.getText() : '';
  
  if (!prompt && !title) {
    showToast('Please enter a topic or title', 'error');
    return;
  }
  
  let fullPrompt = '';
  
  switch (task) {
    case 'complete':
      fullPrompt = `Create a complete blog post with all metadata about: "${prompt || title}".

Generate a JSON object with these fields:
- "title": A catchy, SEO-friendly blog post title (max 80 chars)
- "content": Full blog post content in markdown format with headings, paragraphs, and examples
- "excerpt": A compelling summary for previews (150-200 chars)
- "meta_title": SEO-optimized title for search engines (50-60 chars)
- "meta_description": SEO meta description (150-160 chars)

Topic: ${prompt || title}

Instructions: Make the content comprehensive, informative, and well-structured. Include an introduction, main sections with h2/h3 headings, practical examples, and a conclusion.

Return ONLY valid JSON, nothing else. Example format:
{
  "title": "How to Build Serverless Applications with Azure Functions",
  "content": "# Introduction\\n\\nServerless computing...",
  "excerpt": "Learn how to build scalable serverless applications using Azure Functions with step-by-step examples and best practices.",
  "meta_title": "Azure Functions: Building Serverless Apps Guide",
  "meta_description": "Step-by-step guide to building serverless applications with Azure Functions. Learn best practices, examples, and optimization tips."
}`;
      break;
      
    case 'generate':
      fullPrompt = `Write a comprehensive blog post about: "${prompt || title}".
      
Include:
- An engaging introduction
- Multiple sections with clear headings (h2, h3)
- Code examples where relevant (use markdown code blocks)
- Practical tips and best practices
- A conclusion with key takeaways

Format using markdown. Make it informative and professional.`;
      break;
      
    case 'expand':
      fullPrompt = `Expand and improve this blog post content:

Title: ${title}
Current Content: ${currentContent}

Instructions: ${prompt || 'Add more detail, examples, and depth while maintaining the original structure.'}`;
      break;
      
    case 'improve':
      fullPrompt = `Improve the writing quality of this blog post:

Title: ${title}
Content: ${currentContent}

Make it more engaging, clearer, and professional. Fix any grammar or style issues.`;
      break;
      
    case 'titles':
      fullPrompt = `Generate 5 catchy, SEO-friendly blog post titles about: "${prompt || title}".
      
Return only the titles, one per line, numbered 1-5.`;
      break;
      
    case 'excerpt':
      fullPrompt = `Write a compelling meta description (150-160 characters) for this blog post:

Title: ${title}
Content: ${currentContent.substring(0, 500)}

Return only the meta description, nothing else.`;
      break;
      
    case 'outline':
      fullPrompt = `Create a detailed outline for a blog post about: "${prompt || title}".

Include:
- Main sections with h2 headings
- Subsections with h3 headings
- Key points to cover in each section
- Potential code examples or tips

Format as a structured outline.`;
      break;
  }
  
  try {
    showLoading('Generating content...');
    
    const res = await apiCall('/api/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: fullPrompt, type: task })
    });
    
    hideLoading();
    
    if (task === 'complete') {
      try {
        const data = JSON.parse(res.content);
        if (data.title) {
          document.getElementById('post-title').value = data.title;
        }
        if (data.content && quillEditor) {
          quillEditor.root.innerHTML = markdownToHtml(data.content);
        }
        if (data.excerpt) {
          document.getElementById('post-excerpt').value = data.excerpt;
        }
        if (data.meta_title) {
          document.getElementById('post-meta-title').value = data.meta_title;
        }
        if (data.meta_description) {
          document.getElementById('post-meta-description').value = data.meta_description;
        }
        updateCharCounts();
        showToast('Complete post generated!');
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        showToast('Failed to parse AI response. Check console.', 'error');
      }
    } else if (task === 'titles') {
      showToast('Titles generated! Check console.');
      console.log('Generated Titles:\n' + res.content);
      alert('Generated Titles:\n\n' + res.content);
    } else if (task === 'excerpt') {
      document.getElementById('post-excerpt').value = res.content.trim();
      showToast('Excerpt generated!');
    } else {
      if (quillEditor) {
        if (task === 'expand' || task === 'improve') {
          if (confirm('Replace current content? Cancel to append.')) {
            quillEditor.root.innerHTML = markdownToHtml(res.content);
          } else {
            quillEditor.insertText(quillEditor.getLength(), '\n\n' + res.content);
          }
        } else {
          if (confirm('Replace current content with generated content?')) {
            quillEditor.root.innerHTML = markdownToHtml(res.content);
          }
        }
      }
      showToast('Content generated!');
    }
    
  } catch (err) {
    hideLoading();
    console.error('AI generation error:', err);
    showToast('AI generation failed: ' + err.message, 'error');
  }
}

async function generateMeta() {
  const title = document.getElementById('post-title').value.trim();
  const content = quillEditor ? quillEditor.getText().substring(0, 500) : '';
  
  if (!title) {
    showToast('Please enter a title first', 'error');
    return;
  }
  
  try {
    showLoading('Generating SEO meta...');
    
    const res = await apiCall('/api/admin/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: `Generate SEO metadata for this blog post:
        
Title: ${title}
Content excerpt: ${content}

Return JSON format:
{"meta_title": "SEO title (50-60 chars)", "meta_description": "Meta description (150-160 chars)"}

Return ONLY the JSON, nothing else.`,
        type: 'meta'
      })
    });
    
    hideLoading();
    
    try {
      const meta = JSON.parse(res.content);
      if (meta.meta_title) {
        document.getElementById('post-meta-title').value = meta.meta_title;
      }
      if (meta.meta_description) {
        document.getElementById('post-meta-description').value = meta.meta_description;
      }
      updateCharCounts();
      showToast('SEO metadata generated!');
    } catch (e) {
      showToast('Failed to parse AI response', 'error');
    }
    
  } catch (err) {
    hideLoading();
    showToast('Meta generation failed: ' + err.message, 'error');
  }
}

function markdownToHtml(text) {
  return text
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^([^<])/gm, '<p>$1')
    .replace(/([^>])$/gm, '$1</p>');
}

function showLoading(text = 'Loading...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('active');
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
