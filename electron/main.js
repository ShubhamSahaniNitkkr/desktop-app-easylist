// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // ✅ Works with uuid@8 (CommonJS)
const { init, db } = require('./db');

// Force NODE_ENV for packaged app
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
    console.log('[ENV] NODE_ENV set to', process.env.NODE_ENV);
}

/* ---------- Helper: wait for Vite dev server ---------- */
async function waitForVite(url, retries = 30, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch {
            console.log(`[Electron] Waiting for Vite dev server... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    return false;
}

/* ---------- Main window creation ---------- */
async function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        backgroundColor: '#ffffff',
        show: false, // hide until ready to avoid flicker
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Show window only when fully ready
    win.once('ready-to-show', () => win.show());

    if (process.env.NODE_ENV === 'production') {
        // ✅ Correct absolute path for packaged app
        const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
        console.log('[Electron] Loading production index from:', indexPath);

        if (fs.existsSync(indexPath)) {
            await win.loadFile(indexPath);
        } else {
            console.error('[Electron] dist/index.html not found:', indexPath);
            win.loadURL('data:text/html,<h1>dist/index.html missing</h1>');
        }
    } else {
        const devServerURL = 'http://localhost:5173';
        const ready = await waitForVite(devServerURL);

        if (ready) {
            console.log('[Electron] Vite dev server ready — loading app...');
            await win.loadURL(devServerURL);
        } else {
            console.error('[Electron] Failed to connect to Vite dev server.');
            win.loadURL('data:text/html,<h1>Failed to connect to Vite dev server</h1>');
        }

        // Uncomment if you want to auto-open DevTools in dev mode
        // win.webContents.openDevTools({ mode: 'detach' });
    }
}

/* ---------- App lifecycle ---------- */
app.whenReady().then(async () => {
    try {
        await init();
        const win = await createWindow();

        // ✅ Keep File, Edit, View (zoom), Help (empty)
        const { Menu } = require("electron");
        const template = [
            {
                label: "File",
                submenu: [
                    { role: "quit" }
                ]
            },
            {
                label: "Edit",
                submenu: [
                    { role: "undo" },
                    { role: "redo" },
                    { type: "separator" },
                    { role: "cut" },
                    { role: "copy" },
                    { role: "paste" }
                ]
            },
            {
                label: "View", // ✅ Keep zoom features
                submenu: [
                    { role: "reload" },
                    { role: "forceReload" },
                    { role: "toggleDevTools" },
                    { type: "separator" },
                    { role: "resetZoom" },
                    { role: "zoomIn" },
                    { role: "zoomOut" },
                    { type: "separator" },
                    { role: "togglefullscreen" }
                ]
            },
            {
                label: "Help", // ✅ Show but empty
                submenu: []
            }
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    } catch (err) {
        console.error('App startup error:', err);
        dialog.showErrorBox('Startup Error', err.message);
    }
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

/* ---------- IPC: Database handlers ---------- */
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
    db.data[collection] = db.data[collection] || [];
    db.data[collection].push(item);
    await db.write();
    return item;
});

ipcMain.handle('db-update', async (event, collection, id, patch) => {
    await db.read();
    if (collection === 'options') {
        db.data.options = { ...db.data.options, ...(patch || {}) };
        await db.write();
        return db.data.options;
    }
    const col = db.data[collection] || [];
    const idx = col.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Not found');
    col[idx] = { ...col[idx], ...(patch || {}) };
    await db.write();
    return col[idx];
});

ipcMain.handle('db-delete', async (event, collection, id) => {
    await db.read();
    db.data[collection] = (db.data[collection] || []).filter((x) => x.id !== id);
    await db.write();
    return true;
});

ipcMain.handle('db-queryIngredients', async (event, q) => {
    await db.read();
    q = (q || '').toLowerCase();
    const all = db.data.ingredients || [];
    return all.filter((i) => i.name && i.name.toLowerCase().includes(q)).slice(0, 50);
});

/* ---------- Export / Import JSON ---------- */
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

/* ---------- Pick Image ---------- */
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

/* ---------- Print to PDF ---------- */
ipcMain.handle('print-to-pdf', async (event, html) => {
    const tmp = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await tmp.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await tmp.webContents.printToPDF({});
    const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: 'recipe.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled) {
        tmp.close();
        return { canceled: true };
    }
    fs.writeFileSync(filePath, pdf);
    tmp.close();
    return { canceled: false, path: filePath };
});
