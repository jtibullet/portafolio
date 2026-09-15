const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const dbInitCode = `let db;
try {
  db = new Database("portfolios.db");
  db.exec(\`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tickers TEXT,
      riskFreeRate REAL,
      expectedReturn REAL,
      volatility REAL,
      sharpeRatio REAL,
      weights TEXT
    )
  \`);
} catch (err) {
  console.error("Failed to open portfolios.db, recreating it...", err);
  if (fs.existsSync("portfolios.db")) {
    fs.unlinkSync("portfolios.db");
  }
  db = new Database("portfolios.db");
  db.exec(\`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tickers TEXT,
      riskFreeRate REAL,
      expectedReturn REAL,
      volatility REAL,
      sharpeRatio REAL,
      weights TEXT
    )
  \`);
}`;

// Need to find:
// const db = new Database("portfolios.db");
// db.exec(`
//   CREATE TABLE IF NOT EXISTS portfolios (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
//     tickers TEXT,
//     riskFreeRate REAL,
//     expectedReturn REAL,
//     volatility REAL,
//     sharpeRatio REAL,
//     weights TEXT
//   )
// `);

const regex = /const db = new Database\("portfolios\.db"\);\s*db\.exec\(`[\s\S]*?`\);/;
code = code.replace(regex, dbInitCode);
fs.writeFileSync('server.ts', code);
