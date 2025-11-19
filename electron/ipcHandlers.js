const { ipcMain, dialog } = require("electron");
const { db } = require("./db");
const fs = require("fs");

ipcMain.handle("file-pickImage", async () => {
    const result = await dialog.showOpenDialog({
        title: "Pick Image",
        properties: ["openFile"],
        filters: [
            { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }
        ]
    });

    if (result.canceled) {
        return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const ext = filePath.split(".").pop().toLowerCase();
    const base64 = fs.readFileSync(filePath, { encoding: "base64" });

    return {
        canceled: false,
        data: `data:image/${ext};base64,${base64}`
    };
});


function registerIpcHandlers() {
    const runAll = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
        );

    const runGet = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
        );

    const runExec = (sql, params = []) =>
        new Promise((resolve, reject) =>
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ changes: this.changes, id: this.lastID });
            })
        );

    // ---------- GET ALL ----------
    ipcMain.handle("db-getAll", async () => {
        const result = {};
        const ingredients = await runAll("SELECT * FROM ingredients");
        result.ingredients = ingredients.map((i) => ({
            ...i,
            allergens: JSON.parse(i.allergens || "[]"),
            nutrition: JSON.parse(i.nutrition || "{}"),
        }));

        const recipes = await runAll("SELECT * FROM recipes");
        result.recipes = recipes.map((r) => ({
            id: r.id,
            name: r.name,
            ...JSON.parse(r.data || "{}"),
        }));

        const menus = await runAll("SELECT * FROM menus");
        result.menus = menus.map((m) => ({
            id: m.id,
            name: m.name,
            ...JSON.parse(m.data || "{}"),
        }));

        let opt = await runGet("SELECT data FROM options WHERE id=1");
        if (!opt) {
            // if options table empty, create default
            await runExec(`INSERT INTO options (id, data) VALUES (1, '{}')`);
            opt = { data: "{}" };
        }
        result.options = JSON.parse(opt.data || "{}");
        return result;
    });

    ipcMain.handle("db-get", async (event, key) => {
        const row = await runGet(`SELECT data FROM ${key} WHERE id=1`);
        return row ? JSON.parse(row.data || "{}") : null;
    });


    // ---------- ADD ----------
    ipcMain.handle("db-add", async (event, table, data) => {
        if (table === "ingredients") {
            return runExec(
                `INSERT OR REPLACE INTO ingredients 
                (name, supplier, article, category, unit, ingredientLoss, prepLoss, cookingLoss, price, weightPiece, weightPerLiter, tspWeight, tbspWeight, allergens, nutrition)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
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
                ]
            );
        } else if (["recipes", "menus"].includes(table)) {
            return runExec(
                `INSERT OR REPLACE INTO ${table} (name, data) VALUES (?, ?)`,
                [data.name, JSON.stringify(data)]
            );
        } else if (table === "options") {
            return runExec(
                `INSERT OR REPLACE INTO options (id, data) VALUES (1, ?)`,
                [JSON.stringify(data)]
            );
        } else throw new Error("Unknown table: " + table);
    });

    // ---------- UPDATE ----------
    ipcMain.handle("db-update", async (event, table, id, data) => {
        if (table === "ingredients") {
            return runExec(
                `UPDATE ingredients SET 
                    supplier=?, article=?, category=?, unit=?, ingredientLoss=?, prepLoss=?, cookingLoss=?, price=?, 
                    weightPiece=?, weightPerLiter=?, tspWeight=?, tbspWeight=?, allergens=?, nutrition=? 
                 WHERE name=?`,
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
                ]
            );
        } else if (["recipes", "menus"].includes(table)) {
            return runExec(
                `UPDATE ${table} SET data=? WHERE name=?`,
                [JSON.stringify(data), data.name]
            );
        } else if (table === "options") {
            // ensure at least one row exists
            const existing = await runGet("SELECT id FROM options WHERE id=1");
            if (existing) {
                return runExec(`UPDATE options SET data=? WHERE id=1`, [
                    JSON.stringify(data),
                ]);
            } else {
                return runExec(
                    `INSERT INTO options (id, data) VALUES (1, ?)`,
                    [JSON.stringify(data)]
                );
            }
        } else throw new Error("Unknown table: " + table);
    });

    // ---------- DELETE ----------
    ipcMain.handle("db-delete", async (event, table, idOrName) => {
        // auto-detect if numeric (id) or string (name)
        const field = isNaN(Number(idOrName)) ? "name" : "id";
        return runExec(`DELETE FROM ${table} WHERE ${field}=?`, [idOrName]);
    });

    // ---------- QUERY INGREDIENTS ----------
    ipcMain.handle("db-queryIngredients", async (event, q) => {
        q = `%${(q || "").toLowerCase()}%`;
        const rows = await runAll(
            `SELECT * FROM ingredients WHERE lower(name) LIKE ? LIMIT 50`,
            [q]
        );
        return rows.map((r) => ({
            ...r,
            allergens: JSON.parse(r.allergens || "[]"),
            nutrition: JSON.parse(r.nutrition || "{}"),
        }));
    });

    console.log("✅ SQLite IPC handlers registered successfully");
}

module.exports = { registerIpcHandlers };
