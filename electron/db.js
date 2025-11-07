// electron/db.js
const sqlite3 = require("sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

const dbPath = path.join(app.getPath("userData"), "easylist.sqlite");
const exists = fs.existsSync(dbPath);
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      supplier TEXT,
      article TEXT,
      category TEXT,
      unit TEXT,
      ingredientLoss REAL,
      prepLoss REAL,
      cookingLoss REAL,
      price REAL,
      weightPiece REAL,
      weightPerLiter REAL,
      tspWeight REAL,
      tbspWeight REAL,
      allergens TEXT,
      nutrition TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      data TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      data TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY,
      data TEXT
    )`);
  });

  if (!exists) {
    console.log("[DB] Created new SQLite database:", dbPath);
  } else {
    console.log("[DB] Using existing SQLite database:", dbPath);
  }
}

module.exports = { db, initDatabase };
