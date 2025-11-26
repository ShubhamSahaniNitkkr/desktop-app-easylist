// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getAll: () => ipcRenderer.invoke('db-getAll'),
    getKey: (k) => ipcRenderer.invoke('db-get', k),
    add: (collection, item) => ipcRenderer.invoke('db-add', collection, item),
    update: (collection, id, patch) => ipcRenderer.invoke('db-update', collection, id, patch),
    remove: (collection, id) => ipcRenderer.invoke('db-delete', collection, id),
    queryIngredients: (q) => ipcRenderer.invoke('db-queryIngredients', q),
    exportJSON: () => ipcRenderer.invoke('db-exportJSON'),
    importJSON: () => ipcRenderer.invoke('db-importJSON'),
    pickImage: () => ipcRenderer.invoke('file-pickImage'),
    printToPDF: (html) => ipcRenderer.invoke('print-to-pdf', html),
    sqlQuery: (query) => ipcRenderer.invoke("db-sql", query),
});
