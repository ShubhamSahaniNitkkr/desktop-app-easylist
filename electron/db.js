// electron/db.js
// Minimal, robust JSON file DB for Electron (synchronous file writes, simple API).
// Exported API matches what main.js expects: { init, db } where db has read(), write(), data.

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const ENCODING = 'utf8';

function ensureUserDataDir() {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
    return userData;
}

function getDbFilePath() {
    const userData = ensureUserDataDir();
    return path.join(userData, 'easylist-db.json');
}

function getDefaultData() {
    return {
        ingredients: [],
        recipes: [],
        menus: [],
        options: {
            defaultLang: 'fr',
            languages: ['en', 'fr'],
            units: ['g', 'kg', 'l', 'tbsp', 'tsp'],
            categories: [
                'meat', 'fish', 'egg', 'tofu', 'quorn', 'seitan', 'legume',
                'hard cheese', 'soft cheese', 'fresh cheese', 'vegetable',
                'bread', 'starch', 'potato', 'fruit'
            ],
            allergens: [
                'Cereals with gluten', 'Crustaceans', 'Eggs', 'Fish', 'Peanuts',
                'Soybeans', 'Milk', 'Nuts', 'Celery', 'Mustard', 'Sesame',
                'Sulphur dioxide and sulphites', 'Lupin', 'Molluscs', 'House cricket powder'
            ],
            suppliers: [],
            currency: '₹',
            profiles: [],
            standardPortions: []
        }
    };
}

// Minimal wrapper object similar enough to lowdb for your main.js to use
const db = {
    data: null,
    file: getDbFilePath(),

    // read: loads file into db.data (async signature to match previous usage)
    async read() {
        try {
            if (!fs.existsSync(this.file)) {
                // create default file
                const def = getDefaultData();
                fs.writeFileSync(this.file, JSON.stringify(def, null, 2), ENCODING);
                this.data = def;
                return;
            }
            const content = fs.readFileSync(this.file, ENCODING);
            // If file empty, set default
            if (!content || content.trim() === '') {
                const def = getDefaultData();
                fs.writeFileSync(this.file, JSON.stringify(def, null, 2), ENCODING);
                this.data = def;
                return;
            }
            this.data = JSON.parse(content);
            // Ensure top-level keys exist
            this.data.ingredients = this.data.ingredients || [];
            this.data.recipes = this.data.recipes || [];
            this.data.menus = this.data.menus || [];
            this.data.options = this.data.options || getDefaultData().options;
        } catch (err) {
            // If file corrupted, back it up and reset
            try {
                const bak = this.file + '.bak.' + Date.now();
                fs.renameSync(this.file, bak);
                console.error('DB: corrupted file saved to', bak);
            } catch (e) { /* ignore */ }
            const def = getDefaultData();
            fs.writeFileSync(this.file, JSON.stringify(def, null, 2), ENCODING);
            this.data = def;
        }
    },

    // write: persist db.data to disk
    async write() {
        try {
            if (!this.data) this.data = getDefaultData();
            fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), ENCODING);
        } catch (err) {
            console.error('DB write error:', err);
            throw err;
        }
    },

    // convenience: reset to defaults (useful in dev)
    async reset() {
        const def = getDefaultData();
        this.data = def;
        await this.write();
        return this.data;
    }
};

async function init() {
    // Ensure folder and file exist and load into db.data
    await db.read();
    // Ensure options keys present (safe)
    db.data.options = Object.assign(getDefaultData().options, db.data.options || {});
    await db.write();
    return db;
}

module.exports = { db, init };
