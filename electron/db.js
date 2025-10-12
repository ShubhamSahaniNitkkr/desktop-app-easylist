// electron/db.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Wait until Electron app is ready before resolving path
function getDBPath() {
    const userData = app.getPath('userData');
    const dbFile = path.join(userData, 'easylist-db.json');

    // If file doesn't exist, create it with default structure
    if (!fs.existsSync(dbFile)) {
        const defaultData = {
            ingredients: [],
            recipes: [],
            menus: [],
            options: {
                defaultLang: 'fr',
                languages: ['en', 'fr'],
                units: ['g', 'kg', 'l', 'tbsp', 'tsp'],
                categories: [
                    'meat', 'fish', 'egg', 'tofu', 'quorn', 'seitan',
                    'legume', 'hard cheese', 'soft cheese', 'fresh cheese',
                    'vegetable', 'bread', 'starch', 'potato', 'fruit'
                ],
                allergens: [
                    'Cereals with gluten', 'Crustaceans', 'Eggs', 'Fish',
                    'Peanuts', 'Soybeans', 'Milk', 'Nuts', 'Celery', 'Mustard',
                    'Sesame', 'Sulphur dioxide and sulphites', 'Lupin',
                    'Molluscs', 'House cricket powder'
                ],
                suppliers: [],
                currency: '₹',
                profiles: []
            }
        };

        fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2));
    }

    return dbFile;
}

let db;
async function init() {
    const dbFile = getDBPath();
    const adapter = new JSONFile(dbFile);
    db = new Low(adapter, {
        ingredients: [],
        recipes: [],
        menus: [],
        options: {}
    });

    await db.read();
    db.data = db.data || {
        ingredients: [],
        recipes: [],
        menus: [],
        options: {
            defaultLang: 'fr',
            languages: ['en', 'fr'],
            units: ['g', 'kg', 'l', 'tbsp', 'tsp'],
            categories: [
                'meat', 'fish', 'egg', 'tofu', 'quorn', 'seitan',
                'legume', 'hard cheese', 'soft cheese', 'fresh cheese',
                'vegetable', 'bread', 'starch', 'potato', 'fruit'
            ],
            allergens: [
                'Cereals with gluten', 'Crustaceans', 'Eggs', 'Fish',
                'Peanuts', 'Soybeans', 'Milk', 'Nuts', 'Celery', 'Mustard',
                'Sesame', 'Sulphur dioxide and sulphites', 'Lupin',
                'Molluscs', 'House cricket powder'
            ],
            suppliers: [],
            currency: '₹',
            profiles: []
        }
    };
    await db.write();
    return db;
}

module.exports = { db, init };
