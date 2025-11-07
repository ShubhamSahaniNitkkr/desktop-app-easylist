// electron/ipcHandlers.js
const { ipcMain } = require("electron");
const { db } = require("./db");

function registerIpcHandlers() {
    const runAll = (sql) =>
        new Promise((resolve, reject) =>
            db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)))
        );

    const runGet = (sql) =>
        new Promise((resolve, reject) =>
            db.get(sql, (err, row) => (err ? reject(err) : resolve(row)))
        );

    // ---------- GET ALL ----------
    ipcMain.handle("db-getAll", async () => {
        const result = {};
        result.ingredients = (
            await runAll("SELECT * FROM ingredients")
        ).map((i) => ({
            ...i,
            allergens: JSON.parse(i.allergens || "[]"),
            nutrition: JSON.parse(i.nutrition || "{}"),
        }));

        result.recipes = (await runAll("SELECT * FROM recipes")).map((r) =>
            JSON.parse(r.data)
        );
        result.menus = (await runAll("SELECT * FROM menus")).map((m) =>
            JSON.parse(m.data)
        );

        const opt = await runGet("SELECT data FROM options LIMIT 1");
        result.options = opt ? JSON.parse(opt.data) : {};
        return result;
    });

    // ---------- ADD ----------
    ipcMain.handle("db-add", async (event, table, data) => {
        return new Promise((resolve, reject) => {
            let sql, params;
            if (table === "ingredients") {
                sql = `INSERT OR REPLACE INTO ingredients 
          (name, supplier, article, category, unit, ingredientLoss, prepLoss, cookingLoss, price, weightPiece, weightPerLiter, tspWeight, tbspWeight, allergens, nutrition)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                params = [
                    data.name,
                    data.supplier,
                    data.article,
                    data.category,
                    data.unit,
                    data.ingredientLoss,
                    data.prepLoss,
                    data.cookingLoss,
                    data.price,
                    data.weightPiece,
                    data.weightPerLiter,
                    data.tspWeight,
                    data.tbspWeight,
                    JSON.stringify(data.allergens || []),
                    JSON.stringify(data.nutrition || {}),
                ];
            } else if (["recipes", "menus"].includes(table)) {
                sql = `INSERT OR REPLACE INTO ${table} (name, data) VALUES (?, ?)`;
                params = [data.name, JSON.stringify(data)];
            } else if (table === "options") {
                sql = `INSERT OR REPLACE INTO options (id, data) VALUES (1, ?)`;
                params = [JSON.stringify(data)];
            } else return reject("Unknown table: " + table);

            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    });

    // ---------- UPDATE ----------
    ipcMain.handle("db-update", async (event, table, id, data) => {
        return new Promise((resolve, reject) => {
            if (table === "options") {
                db.run(
                    `UPDATE options SET data=? WHERE id=1`,
                    [JSON.stringify(data)],
                    (err) => (err ? reject(err) : resolve(true))
                );
            } else if (table === "ingredients") {
                db.run(
                    `UPDATE ingredients SET supplier=?, article=?, category=?, unit=?, ingredientLoss=?, prepLoss=?, cookingLoss=?, price=?, weightPiece=?, weightPerLiter=?, tspWeight=?, tbspWeight=?, allergens=?, nutrition=? WHERE name=?`,
                    [
                        data.supplier,
                        data.article,
                        data.category,
                        data.unit,
                        data.ingredientLoss,
                        data.prepLoss,
                        data.cookingLoss,
                        data.price,
                        data.weightPiece,
                        data.weightPerLiter,
                        data.tspWeight,
                        data.tbspWeight,
                        JSON.stringify(data.allergens || []),
                        JSON.stringify(data.nutrition || {}),
                        data.name,
                    ],
                    (err) => (err ? reject(err) : resolve(true))
                );
            } else if (["recipes", "menus"].includes(table)) {
                db.run(
                    `UPDATE ${table} SET data=? WHERE name=?`,
                    [JSON.stringify(data), data.name],
                    (err) => (err ? reject(err) : resolve(true))
                );
            } else reject("Unknown table: " + table);
        });
    });

    // ---------- DELETE ----------
    ipcMain.handle("db-delete", async (event, table, id) => {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${table} WHERE id=?`, [id], (err) =>
                err ? reject(err) : resolve(true)
            );
        });
    });

    // ---------- QUERY INGREDIENTS ----------
    ipcMain.handle("db-queryIngredients", async (event, q) => {
        q = `%${(q || "").toLowerCase()}%`;
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM ingredients WHERE lower(name) LIKE ? LIMIT 50`,
                [q],
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });
    });

    console.log("SQLite IPC handlers registered ✅");
}

module.exports = { registerIpcHandlers };
