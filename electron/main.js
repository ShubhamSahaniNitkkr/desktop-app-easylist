// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, init, dbFile } = require('./db');

async function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // In dev load vite server; in production load built index
    if (process.env.NODE_ENV === 'production') {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL('http://localhost:5173');
    }
}

app.whenReady().then(async () => {
    await init();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

/* ---------- DB IPC ---------- */
ipcMain.handle('db-getAll', async () => {
    await db.read();
    return db.data;
});

ipcMain.handle('db-get', async (event, key) => {
    await db.read();
    return db.data[key];
});

ipcMain.handle('db-add', async (event, collection, item) => {
    await db.read();
    item.id = item.id || uuidv4();
    if (!Array.isArray(db.data[collection])) db.data[collection] = [];
    db.data[collection].push(item);
    await db.write();
    return item;
});

ipcMain.handle('db-update', async (event, collection, id, patch) => {
    await db.read();
    if (collection === 'options') {
        // direct replace merge
        db.data.options = { ...db.data.options, ...(patch || {}) };
        await db.write();
        return db.data.options;
    }
    const col = db.data[collection] || [];
    const idx = col.findIndex(x => x.id === id);
    if (idx === -1) throw new Error('Not found');
    col[idx] = { ...col[idx], ...(patch || {}) };
    await db.write();
    return col[idx];
});

ipcMain.handle('db-delete', async (event, collection, id) => {
    await db.read();
    db.data[collection] = (db.data[collection] || []).filter(x => x.id !== id);
    await db.write();
    return true;
});

ipcMain.handle('db-queryIngredients', async (event, q) => {
    await db.read();
    q = (q || '').toLowerCase();
    const all = db.data.ingredients || [];
    return all.filter(i => i.name && i.name.toLowerCase().includes(q)).slice(0, 30);
});

/* ---------- Export / Import ---------- */
ipcMain.handle('db-exportJSON', async () => {
    await db.read();
    const content = JSON.stringify(db.data, null, 2);
    const { canceled, filePath } = await dialog.showSaveDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: 'easylist-export.json'
    });
    if (canceled) return { canceled: true };
    fs.writeFileSync(filePath, content, 'utf8');
    return { canceled: false, path: filePath };
});

ipcMain.handle('db-importJSON', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (canceled) return { canceled: true };
    const content = fs.readFileSync(filePaths[0], 'utf8');
    try {
        const obj = JSON.parse(content);
        db.data = obj;
        await db.write();
        return { canceled: false };
    } catch (e) {
        return { canceled: false, error: e.message };
    }
});

/* ---------- pick image ---------- */
ipcMain.handle('file-pickImage', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
        properties: ['openFile']
    });
    if (canceled) return { canceled: true };
    const data = fs.readFileSync(filePaths[0]).toString('base64');
    const ext = path.extname(filePaths[0]).replace('.', '');
    return { canceled: false, data: `data:image/${ext};base64,${data}` };
});

/* ---------- print to PDF simple ---------- */
ipcMain.handle('print-to-pdf', async (event, html) => {
    const win = BrowserWindow.getAllWindows()[0];
    // temporary: create a BrowserWindow to render html
    const tmp = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await tmp.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await tmp.webContents.printToPDF({});
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: 'recipe.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (canceled) { tmp.close(); return { canceled: true }; }
    fs.writeFileSync(filePath, pdf);
    tmp.close();
    return { canceled: false, path: filePath };
});
