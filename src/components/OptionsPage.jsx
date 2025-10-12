// src/components/OptionsPage.jsx
import React, { useEffect, useState } from "react";
import { Input, Button, Select, message } from "antd";
import { getAll, update } from "../utils/ipc";

export default function OptionsPage({ refreshOptions }) {
  const [options, setOptions] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [lang, setLang] = useState("fr");

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setLang(all.options?.defaultLang || "fr");
    })();
  }, []);

  function addCategory() {
    if (!newCat) return;
    setOptions((o) => ({
      ...o,
      categories: [...(o.categories || []), newCat],
    }));
    setNewCat("");
  }
  function addSupplier() {
    if (!newSup) return;
    setOptions((o) => ({ ...o, suppliers: [...(o.suppliers || []), newSup] }));
    setNewSup("");
  }

  async function save() {
    try {
      await update("options", null, options);
      message.success("Options saved");
      if (refreshOptions) refreshOptions(options);
    } catch (e) {
      message.error(e.message || "Error");
    }
  }

  if (!options) return null;

  return (
    <div className="page">
      <h2>Options</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }} className="list">
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 700 }}>
              Default Language
            </label>
            <Select
              value={lang}
              onChange={(v) => {
                setLang(v);
                setOptions((o) => ({ ...o, defaultLang: v }));
              }}
            >
              <Select.Option value="fr">Français</Select.Option>
              <Select.Option value="en">English</Select.Option>
            </Select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontWeight: 700 }}>
              Currency symbol
            </label>
            <Input
              value={options.currency || "₹"}
              onChange={(e) =>
                setOptions((o) => ({ ...o, currency: e.target.value }))
              }
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Categories</h4>
            <div>
              {(options.categories || []).map((c, i) => (
                <div key={i}>{c}</div>
              ))}
            </div>
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category"
              style={{ marginTop: 6 }}
            />
            <Button onClick={addCategory} style={{ marginTop: 6 }}>
              Add
            </Button>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Suppliers</h4>
            <div>
              {(options.suppliers || []).map((s, i) => (
                <div key={i}>{s}</div>
              ))}
            </div>
            <Input
              value={newSup}
              onChange={(e) => setNewSup(e.target.value)}
              placeholder="New supplier"
              style={{ marginTop: 6 }}
            />
            <Button onClick={addSupplier} style={{ marginTop: 6 }}>
              Add
            </Button>
          </div>

          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={save}>
              Apply
            </Button>
          </div>
        </div>

        <div style={{ width: 360 }} className="list">
          <h4>Advanced</h4>
          <p>
            Allergen & category lists can be extended here. You can
            import/export full DB via the top app controls (Home screen or
            header).
          </p>
        </div>
      </div>
    </div>
  );
}
