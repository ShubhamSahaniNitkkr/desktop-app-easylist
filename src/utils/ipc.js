// src/utils/ipc.js
const api = window.api;

export async function getAll() { return api.getAll(); }
export async function getKey(k) { return api.getKey(k); }
export async function add(collection, item) { return api.add(collection, item); }
export async function update(collection, id, patch) { return api.update(collection, id, patch); }
export async function remove(collection, id) { return api.remove(collection, id); }
export async function queryIngredients(q) { return api.queryIngredients(q); }
export async function exportJSON() { return api.exportJSON(); }
export async function importJSON() { return api.importJSON(); }
export async function pickImage() { return api.pickImage(); }
export async function printToPDF(html) { return api.printToPDF(html); }
