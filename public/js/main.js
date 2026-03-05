const API_BASE = '/api';

async function fetchAPI(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

function createPostCard(post) {
  const date = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const imageUrl = post.featured_image || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800';
  const excerpt = post.excerpt || post.content?.substring(0, 150) + '...';

  return `
    <article class="blog-card">
      <a href="/post/${post.slug}">
        <div class="blog-card-image">
          <img src="${imageUrl}" alt="${post.title}" loading="lazy">
        </div>
      </a>
      <div class="blog-card-content">
        ${post.category_name ? `<span class="category-tag">${post.category_name}</span>` : ''}
        <a href="/post/${post.slug}">
          <h3>${post.title}</h3>
        </a>
        <p>${excerpt}</p>
        <div class="post-meta">
          <span>${post.author_name || 'Admin'}</span>
          <span>${date}</span>
        </div>
        <a href="/post/${post.slug}" class="read-more">Read Article →</a>
      </div>
    </article>
  `;
}

function createFeaturedCard(post) {
  const date = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const imageUrl = post.featured_image || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200';

  return `
    <a href="/post/${post.slug}" class="featured-card">
      <div class="featured-image">
        <img src="${imageUrl}" alt="${post.title}" loading="eager">
      </div>
      <div class="featured-info">
        ${post.category_name ? `<span class="category-tag">${post.category_name}</span>` : ''}
        <h2>${post.title}</h2>
        <p>${post.excerpt || post.content?.substring(0, 200) + '...'}</p>
        <div class="post-meta">
          <span>${post.author_name || 'Admin'}</span>
          <span>${date}</span>
        </div>
      </div>
    </a>
  `;
}

function createCategoryCard(category) {
  return `
    <a href="/category/${category.slug}" class="category-card">
      <h3>${category.name}</h3>
      <p>${category.description || ''}</p>
      <span class="count">${category.post_count || 0} posts</span>
    </a>
  `;
}

async function loadHomepage() {
  try {
    const [settings, postsData, categories] = await Promise.all([
      fetchAPI('/settings'),
      fetchAPI('/posts?limit=9'),
      fetchAPI('/categories')
    ]);

    document.title = settings.site_title || 'ElegantBlog';
    document.querySelector('meta[name="description"]').content = settings.site_description || '';

    const heroSection = document.querySelector('.hero-content');
    if (postsData.posts.length > 0) {
      const featured = postsData.posts[0];
      heroSection.innerHTML = `
        <h1>${settings.site_title || 'Welcome to ElegantBlog'}</h1>
        <p>${settings.site_description || 'Discover insightful articles on technology, lifestyle, and more.'}</p>
        <div class="featured-post">
          ${createFeaturedCard(featured)}
        </div>
      `;
    }

    const grid = document.getElementById('blog-grid');
    if (postsData.posts.length > 1) {
      grid.innerHTML = postsData.posts.slice(1).map(createPostCard).join('');
    } else if (postsData.posts.length === 1) {
      grid.innerHTML = '<div class="no-posts">No more articles. Check back soon!</div>';
    } else {
      grid.innerHTML = '<div class="no-posts">No posts yet. Check back soon!</div>';
    }

    const categoriesGrid = document.getElementById('categories-grid');
    if (categories.length > 0) {
      categoriesGrid.innerHTML = categories.map(createCategoryCard).join('');
    }

    setupPagination(postsData.page, postsData.totalPages);

  } catch (error) {
    console.error('Error loading homepage:', error);
  }
}

async function loadPosts(page = 1) {
  try {
    const data = await fetchAPI(`/posts?page=${page}&limit=9`);
    const grid = document.getElementById('blog-grid');
    grid.innerHTML = data.posts.map(createPostCard).join('');
    setupPagination(data.page, data.totalPages);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function setupPagination(currentPage, totalPages) {
  const container = document.getElementById('pagination');
  if (!container || totalPages <= 1) return;

  let html = `
    <button ${currentPage === 1 ? 'disabled' : ''} onclick="loadPosts(${currentPage - 1})">Previous</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadPosts(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<button disabled>...</button>`;
    }
  }

  html += `
    <button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadPosts(${currentPage + 1})">Next</button>
  `;

  container.innerHTML = html;
}

async function loadPost(slug) {
  try {
    const [post, settings] = await Promise.all([
      fetchAPI(`/posts/${slug}`),
      fetchAPI('/settings')
    ]);

    document.title = post.meta_title || post.title;
    document.querySelector('meta[name="description"]').content = post.meta_description || post.excerpt || '';

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.content = post.featured_image || '';

    document.getElementById('post-category').textContent = post.category_name || '';
    document.getElementById('post-title').textContent = post.title;

    const date = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('post-meta').innerHTML = `
      <span>${post.author_name || 'Admin'}</span>
      <span>${date}</span>
      <span>${post.category_name || ''}</span>
    `;

    const postImage = document.getElementById('post-image');
    if (post.featured_image) {
      postImage.src = post.featured_image;
      postImage.style.display = 'block';
    } else {
      postImage.style.display = 'none';
    }

    const content = document.getElementById('post-content');
    if (post.content && post.content.includes('<')) {
      content.innerHTML = post.content;
    } else {
      content.innerHTML = parseMarkdown(post.content || '');
    }

    setupJsonLd(post, settings);
    loadRelatedPosts(post.category_id, post.id);

  } catch (error) {
    console.error('Error loading post:', error);
    document.getElementById('post-title').textContent = 'Post not found';
  }
}

function parseMarkdown(text) {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(?!<[hulo])/gim, '<p>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
}

function setupJsonLd(post, settings) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.featured_image,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": post.author_name || 'Admin'
    },
    "publisher": {
      "@type": "Organization",
      "name": settings.site_title || 'ElegantBlog',
      "logo": {
        "@type": "ImageObject",
        "url": "/images/logo.png"
      }
    }
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

async function loadRelatedPosts(categoryId, excludeId) {
  try {
    const posts = await fetchAPI(`/posts?limit=3`);
    const related = posts.posts.filter(p => p.id !== excludeId).slice(0, 3);

    const container = document.getElementById('related-posts');
    if (related.length > 0) {
      container.innerHTML = `
        <h3>Related Articles</h3>
        <div class="related-grid">
          ${related.map(createPostCard).join('')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading related posts:', error);
  }
}

async function loadCategory(slug) {
  try {
    const [category, settings] = await Promise.all([
      fetchAPI(`/categories/${slug}`),
      fetchAPI('/settings')
    ]);

    document.title = `${category.name} - ${settings.site_title}`;
    document.querySelector('meta[name="description"]').content = category.description || '';

    const posts = await fetchAPI(`/posts?limit=20`);
    const categoryPosts = posts.posts.filter(p => p.category_slug === slug);

    document.getElementById('category-title').textContent = category.name;
    document.getElementById('category-description').textContent = category.description || '';

    const grid = document.getElementById('blog-grid');
    grid.innerHTML = categoryPosts.length > 0
      ? categoryPosts.map(createPostCard).join('')
      : '<div class="no-posts">No posts in this category yet.</div>';

  } catch (error) {
    console.error('Error loading category:', error);
  }
}

function setupSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const closeBtn = document.getElementById('search-close');
  const results = document.getElementById('search-results');

  document.getElementById('search-toggle')?.addEventListener('click', () => {
    overlay.classList.add('active');
    input.focus();
  });

  closeBtn?.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });

  let searchTimeout;
  input?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const posts = await fetchAPI(`/search?q=${encodeURIComponent(query)}`);
        if (posts.length > 0) {
          results.innerHTML = posts.map(post => `
            <a href="/post/${post.slug}" class="search-result-item">
              <h4>${post.title}</h4>
              <p>${post.excerpt || post.content?.substring(0, 100)}</p>
            </a>
          `).join('');
        } else {
          results.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No results found</p>';
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();

  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    loadHomepage();
  } else if (path.startsWith('/post/')) {
    const slug = path.split('/post/')[1];
    loadPost(slug);
  } else if (path.startsWith('/category/')) {
    const slug = path.split('/category/')[1];
    loadCategory(slug);
  }
});
