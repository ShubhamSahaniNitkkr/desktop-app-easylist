// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { init, db } = require('./db');
const { initDatabase } = require("./db");
const { registerIpcHandlers } = require("./ipcHandlers");

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
        initDatabase();
        registerIpcHandlers();

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
