// src/components/OptionsPage.jsx
import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  InputNumber,
  Modal,
} from "antd";
import { getAll, update, exportJSON, importJSON } from "../utils/ipc";

export default function OptionsPage({ refreshOptions }) {
  const [options, setOptions] = useState(null);

  // quick add fields
  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [newAllergen, setNewAllergen] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [agePortion, setAgePortion] = useState("");

  // profiles
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [showAddProfile, setShowAddProfile] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const meals = ["Breakfast", "Lunch", "Snack", "Dinner"];

  useEffect(() => {
    (async () => {
      const all = await getAll();
      const opts = all.options || {};
      opts.categories = opts.categories || [];
      opts.suppliers = opts.suppliers || [];
      opts.allergens = opts.allergens || [];
      opts.standardPortions = opts.standardPortions || [];
      opts.profiles = opts.profiles || [];
      setOptions(opts);
      setProfiles(opts.profiles || []);
      setActiveProfile(
        (opts.profiles && opts.profiles[0] && opts.profiles[0].name) || ""
      );
    })();
  }, []);

  function addCategory() {
    if (!newCat.trim()) return;
    const cat = newCat.trim();
    if ((options.categories || []).includes(cat)) {
      message.warning("Category exists");
      setNewCat("");
      return;
    }
    setOptions((o) => ({ ...o, categories: [...(o.categories || []), cat] }));
    setNewCat("");
  }
  function removeCategory(cat) {
    setOptions((o) => ({
      ...o,
      categories: (o.categories || []).filter((c) => c !== cat),
    }));
  }

  function addSupplier() {
    if (!newSup.trim()) return;
    const s = newSup.trim();
    if ((options.suppliers || []).includes(s)) {
      message.warning("Supplier exists");
      setNewSup("");
      return;
    }
    setOptions((o) => ({ ...o, suppliers: [...(o.suppliers || []), s] }));
    setNewSup("");
  }
  function removeSupplier(sup) {
    setOptions((o) => ({
      ...o,
      suppliers: (o.suppliers || []).filter((s) => s !== sup),
    }));
  }

  function addAllergen() {
    if (!newAllergen.trim()) return;
    const a = newAllergen.trim();
    if ((options.allergens || []).includes(a)) {
      message.warning("Allergen exists");
      setNewAllergen("");
      return;
    }
    setOptions((o) => ({ ...o, allergens: [...(o.allergens || []), a] }));
    setNewAllergen("");
  }
  function removeAllergen(a) {
    setOptions((o) => ({
      ...o,
      allergens: (o.allergens || []).filter((x) => x !== a),
    }));
  }

  function addStandardPortion() {
    if (!ageLabel || !ageCategory || !agePortion)
      return message.error("Please fill all fields");
    const id = Date.now().toString();
    const newRow = {
      id,
      label: ageLabel,
      category: ageCategory,
      grams: Number(agePortion),
    };
    setOptions((o) => ({
      ...o,
      standardPortions: [...(o.standardPortions || []), newRow],
    }));
    setAgeLabel("");
    setAgeCategory("");
    setAgePortion("");
  }
  function removeStandardPortion(id) {
    setOptions((o) => ({
      ...o,
      standardPortions: (o.standardPortions || []).filter((p) => p.id !== id),
    }));
  }

  // profiles
  function makeEmptyTable(labels) {
    const table = {};
    days.forEach((d) => {
      table[d] = {};
      meals.forEach((m) => {
        table[d][m] = {};
        (labels || []).forEach((lbl) => {
          table[d][m][lbl] = 0;
        });
      });
    });
    return table;
  }

  function openAddProfile() {
    setNewProfileName("");
    setShowAddProfile(true);
  }

  function confirmAddProfile() {
    if (!newProfileName.trim()) return message.error("Enter profile name");
    const name = newProfileName.trim();
    if ((profiles || []).some((p) => p.name === name))
      return message.warning("Profile exists");
    const labels = (options.standardPortions || []).map((s) => s.label);
    const profile = { name, table: makeEmptyTable(labels) };
    const next = [...profiles, profile];
    setProfiles(next);
    setOptions((o) => ({ ...o, profiles: next }));
    setActiveProfile(name);
    setShowAddProfile(false);
    message.success("Profile added");
  }

  function deleteProfile(name) {
    const next = (profiles || []).filter((p) => p.name !== name);
    setProfiles(next);
    setOptions((o) => ({ ...o, profiles: next }));
    setActiveProfile(next[0] ? next[0].name : "");
  }

  function updateProfileCell(profileName, day, meal, label, val) {
    const next = profiles.map((p) => {
      if (p.name !== profileName) return p;
      const cp = JSON.parse(JSON.stringify(p));
      cp.table[day] = cp.table[day] || {};
      cp.table[day][meal] = cp.table[day][meal] || {};
      cp.table[day][meal][label] = Number(val || 0);
      return cp;
    });
    setProfiles(next);
    setOptions((o) => ({ ...o, profiles: next }));
  }

  // SQL (placeholder)
  function setSQLQuery(value) {
    setOptions((o) => ({ ...o, sqlQuery: value }));
  }

  async function onExport() {
    const res = await exportJSON();
    if (!res.canceled) message.success("Exported to " + res.path);
  }
  async function onImport() {
    const res = await importJSON();
    if (res.error) message.error(res.error);
    else {
      message.success("Imported");
      window.location.reload();
    }
  }

  async function save() {
    try {
      await update("options", null, options);
      if (options) {
        options.profiles = profiles;
        await update("options", null, options);
      }
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
          {/* Language & Currency */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontWeight: 700 }}>
              Default Language
            </label>
            <Select
              value={options.defaultLang || "fr"}
              onChange={(v) => setOptions((o) => ({ ...o, defaultLang: v }))}
              style={{ width: 160 }}
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
              style={{ width: 160 }}
            />
          </div>

          {/* Categories */}
          <div style={{ marginTop: 12 }}>
            <h4>Categories</h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {(options.categories || []).map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  <div>{c}</div>
                  <Popconfirm
                    title={`Remove category "${c}"?`}
                    onConfirm={() => removeCategory(c)}
                  >
                    <a style={{ color: "red" }}>Remove</a>
                  </Popconfirm>
                </div>
              ))}
            </div>
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="New category"
                />
              </Col>
              <Col>
                <Button onClick={addCategory}>Add</Button>
              </Col>
            </Row>
          </div>

          {/* Suppliers */}
          <div style={{ marginTop: 12 }}>
            <h4>Suppliers</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(options.suppliers || []).map((s, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div style={{ flex: 1 }}>{s}</div>
                  <Popconfirm
                    title={`Remove supplier "${s}"?`}
                    onConfirm={() => removeSupplier(s)}
                  >
                    <a style={{ color: "red" }}>Remove</a>
                  </Popconfirm>
                </div>
              ))}
            </div>
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newSup}
                  onChange={(e) => setNewSup(e.target.value)}
                  placeholder="New supplier"
                />
              </Col>
              <Col>
                <Button onClick={addSupplier}>Add</Button>
              </Col>
            </Row>
          </div>

          {/* Allergens */}
          <div style={{ marginTop: 12 }}>
            <h4>Allergens</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(options.allergens || []).map((a, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div>{a}</div>
                  <Popconfirm
                    title={`Remove allergen "${a}"?`}
                    onConfirm={() => removeAllergen(a)}
                  >
                    <a style={{ color: "red" }}>Remove</a>
                  </Popconfirm>
                </div>
              ))}
            </div>
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  placeholder="New allergen"
                />
              </Col>
              <Col>
                <Button onClick={addAllergen}>Add</Button>
              </Col>
            </Row>
          </div>

          {/* Standard Portions */}
          <div style={{ marginTop: 12 }}>
            <h4>Standard portions (label → category → grams)</h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input
                placeholder="Label (e.g. 3–5 years)"
                value={ageLabel}
                onChange={(e) => setAgeLabel(e.target.value)}
              />
              <Select
                placeholder="Category"
                value={ageCategory}
                onChange={(v) => setAgeCategory(v)}
                style={{ width: 180 }}
              >
                {(options.categories || []).map((c) => (
                  <Select.Option key={c} value={c}>
                    {c}
                  </Select.Option>
                ))}
              </Select>
              <Input
                placeholder="grams"
                value={agePortion}
                onChange={(e) => setAgePortion(e.target.value)}
                style={{ width: 120 }}
              />
              <Button onClick={addStandardPortion}>Add</Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(options.standardPortions || []).map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 100px 60px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div>{p.label}</div>
                  <div>{p.category}</div>
                  <div>{p.grams} g</div>
                  <Popconfirm
                    title="Delete?"
                    onConfirm={() => removeStandardPortion(p.id)}
                  >
                    <a style={{ color: "red" }}>Delete</a>
                  </Popconfirm>
                </div>
              ))}
            </div>
          </div>

          {/* Profiles */}
          <div style={{ marginTop: 18 }}>
            <h4>Profiles (people per meal / age group)</h4>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Select
                value={activeProfile}
                onChange={(v) => setActiveProfile(v)}
                style={{ width: 200 }}
              >
                {(profiles || []).map((p) => (
                  <Select.Option key={p.name} value={p.name}>
                    {p.name}
                  </Select.Option>
                ))}
              </Select>
              <Button onClick={openAddProfile}>+ Add profile</Button>
              <Popconfirm
                title="Delete profile?"
                onConfirm={() => deleteProfile(activeProfile)}
              >
                <Button danger disabled={!activeProfile}>
                  Delete
                </Button>
              </Popconfirm>
            </div>

            {activeProfile ? (
              <div
                style={{
                  maxHeight: 360,
                  overflow: "auto",
                  border: "1px solid #f0f0f0",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Enter number of people per day/meal/age-group
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `160px repeat(${
                      (options.standardPortions || []).length
                    }, 1fr)`,
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div />
                  {(options.standardPortions || []).map((sp) => (
                    <div key={sp.id} style={{ fontWeight: 600 }}>
                      {sp.label}
                    </div>
                  ))}
                </div>

                {days.map((d) => (
                  <div key={d} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{d}</div>
                    {meals.map((m) => (
                      <div
                        key={m}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ width: 160 }}>{m}</div>
                        {(options.standardPortions || []).map((sp) => {
                          const profile = profiles.find(
                            (p) => p.name === activeProfile
                          );
                          const value =
                            (profile &&
                              profile.table &&
                              profile.table[d] &&
                              profile.table[d][m] &&
                              profile.table[d][m][sp.label]) ||
                            0;
                          return (
                            <InputNumber
                              key={sp.id}
                              min={0}
                              value={value}
                              onChange={(v) =>
                                updateProfileCell(
                                  activeProfile,
                                  d,
                                  m,
                                  sp.label,
                                  v
                                )
                              }
                              style={{ width: 80 }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#666" }}>
                Create or select a profile to edit people counts.
              </div>
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            <h4>SQL Query</h4>
            <small style={{ color: "#666" }}>
              Paste or edit the SQL query used by import/export/advanced
              processing (you mentioned this in the image).
            </small>
            <Input.TextArea
              rows={4}
              value={options.sqlQuery || ""}
              onChange={(e) => setSQLQuery(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>

          {/* Actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button type="primary" onClick={save}>
              Apply
            </Button>
            <Button onClick={onExport}>Export DB</Button>
            <Button onClick={onImport}>Import DB</Button>
          </div>
        </div>

        <div style={{ width: 360 }} className="list">
          <h4>Advanced / Notes</h4>
          <p>
            Allergens and categories can be extended here. Standard portions are
            used by recipe scaling.
          </p>
        </div>
      </div>

      <Modal
        title="Add Profile"
        open={showAddProfile}
        onCancel={() => setShowAddProfile(false)}
        onOk={confirmAddProfile}
      >
        <Input
          placeholder="Profile name (e.g., 'Normal week')"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
        />
        <div style={{ marginTop: 8, color: "#666" }}>
          New profile will have columns for your defined standard portions (age
          labels).
        </div>
      </Modal>
    </div>
  );
}
