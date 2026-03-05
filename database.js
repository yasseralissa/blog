const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'blog.db');
let db = null;

async function initDatabase() {
  console.log('Loading sql.js...');
  const SQL = await initSqlJs();
  console.log('sql.js loaded');
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (err) {
    console.error('Failed to load database, creating new one:', err);
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      excerpt TEXT,
      featured_image TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
      category_id INTEGER,
      author_id INTEGER,
      meta_title TEXT,
      meta_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    )
  `);

  const userCount = db.exec("SELECT COUNT(*) as count FROM users")[0]?.values[0][0] || 0;
  if (userCount === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', passwordHash]);
  }

  const categoryCount = db.exec("SELECT COUNT(*) as count FROM categories")[0]?.values[0][0] || 0;
  if (categoryCount === 0) {
    const categories = [
      { name: 'Azure', slug: 'azure', description: 'Azure cloud computing and services' },
      { name: 'Integrations', slug: 'integrations', description: 'API integrations and automation' },
      { name: '.Net', slug: 'dotnet', description: '.NET development and frameworks' },
      { name: 'AI', slug: 'ai', description: 'Artificial Intelligence and machine learning' },
      { name: 'General', slug: 'general', description: 'General tech insights and news' }
    ];
    categories.forEach(c => {
      db.run('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)', [c.name, c.slug, c.description]);
    });
  }

  const settingsCount = db.exec("SELECT COUNT(*) as count FROM settings")[0]?.values[0][0] || 0;
  if (settingsCount === 0) {
    const defaultSettings = [
      { key: 'site_title', value: 'Azureful.Net' },
      { key: 'site_description', value: 'Insights on Azure, Integrations, .NET, AI, and more' },
      { key: 'ai_provider', value: 'openai' },
      { key: 'ai_api_key', value: '' },
      { key: 'ai_model', value: 'gpt-4' },
      { key: 'ai_temperature', value: '0.7' }
    ];
    defaultSettings.forEach(s => {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    });
  }

  // Ensure google_analytics_id setting exists
  const hasGA = db.exec("SELECT 1 FROM settings WHERE key = 'google_analytics_id'")[0]?.values[0]?.[0];
  if (!hasGA) {
    db.run("INSERT INTO settings (key, value) VALUES ('google_analytics_id', '')");
  }

  saveDatabaseSync();
  return db;
}

let saveTimeout = null;
const SAVE_DELAY = 1000; // 1 second delay for batching writes

async function saveDatabase() {
  if (!db) return;
  
  clearTimeout(saveTimeout);
  
  return new Promise((resolve, reject) => {
    saveTimeout = setTimeout(async () => {
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        await fs.promises.writeFile(DB_PATH, buffer);
        resolve();
      } catch (err) {
        console.error('Database save failed:', err);
        reject(err);
      }
    }, SAVE_DELAY);
  });
}

function saveDatabaseSync() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Database save failed:', err);
    }
  }
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDatabase, saveDatabaseSync };
