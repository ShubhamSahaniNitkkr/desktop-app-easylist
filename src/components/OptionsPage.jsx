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

  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [newAllergen, setNewAllergen] = useState("");

  const [newAgeGroup, setNewAgeGroup] = useState("");
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

      // ✅ New structure:
      opts.ageGroups = opts.ageGroups || ["3–5 years", "6–10 years", "Adults"];
      opts.portions = opts.portions || {};

      opts.profiles = opts.profiles || [];
      setOptions(opts);
      setProfiles(opts.profiles);
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

  // ✅ Age Groups
  function addAgeGroup() {
    if (!newAgeGroup.trim()) return;
    const label = newAgeGroup.trim();
    if ((options.ageGroups || []).includes(label)) {
      message.warning("Age group exists");
      setNewAgeGroup("");
      return;
    }
    setOptions((o) => ({
      ...o,
      ageGroups: [...(o.ageGroups || []), label],
      portions: { ...o.portions, [label]: {} },
    }));
    setNewAgeGroup("");
  }
  function removeAgeGroup(label) {
    const { [label]: _, ...rest } = options.portions;
    setOptions((o) => ({
      ...o,
      ageGroups: (o.ageGroups || []).filter((x) => x !== label),
      portions: rest,
    }));
  }

  // ✅ Update portion gram value
  function updatePortion(label, category, grams) {
    setOptions((o) => ({
      ...o,
      portions: {
        ...o.portions,
        [label]: {
          ...(o.portions[label] || {}),
          [category]: Number(grams || 0),
        },
      },
    }));
  }

  // Profiles remain same
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
    const labels = options.ageGroups || [];
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
      cp.table[day][meal][label] = Number(val || 0);
      return cp;
    });
    setProfiles(next);
    setOptions((o) => ({ ...o, profiles: next }));
  }

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
          {/* Categories */}
          <div style={{ marginTop: 12 }}>
            <h4>Categories</h4>
            {(options.categories || []).map((c, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
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
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
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
            {(options.suppliers || []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>{s}</div>
                <Popconfirm
                  title={`Remove supplier "${s}"?`}
                  onConfirm={() => removeSupplier(s)}
                >
                  <a style={{ color: "red" }}>Remove</a>
                </Popconfirm>
              </div>
            ))}
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newSup}
                  onChange={(e) => setNewSup(e.target.value)}
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
            {(options.allergens || []).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <div>{a}</div>
                <Popconfirm
                  title="Remove allergen?"
                  onConfirm={() => removeAllergen(a)}
                >
                  <a style={{ color: "red" }}>Remove</a>
                </Popconfirm>
              </div>
            ))}
            <Row gutter={8} style={{ marginTop: 8 }}>
              <Col>
                <Input
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                />
              </Col>
              <Col>
                <Button onClick={addAllergen}>Add</Button>
              </Col>
            </Row>
          </div>

          {/* ✅ Age Groups + Portions */}
          <div style={{ marginTop: 12 }}>
            <h4>Age Groups & Portions</h4>

            <Row gutter={8}>
              <Col>
                <Input
                  placeholder="Age group label"
                  value={newAgeGroup}
                  onChange={(e) => setNewAgeGroup(e.target.value)}
                />
              </Col>
              <Col>
                <Button onClick={addAgeGroup}>Add</Button>
              </Col>
            </Row>

            {(options.ageGroups || []).map((ag) => (
              <div
                key={ag}
                style={{
                  marginTop: 12,
                  padding: 8,
                  border: "1px solid #eee",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <b>{ag}</b>
                  <Popconfirm
                    title="Delete age group?"
                    onConfirm={() => removeAgeGroup(ag)}
                  >
                    <a style={{ color: "red" }}>Remove</a>
                  </Popconfirm>
                </div>

                {(options.categories || []).map((cat) => (
                  <div
                    key={cat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 8,
                    }}
                  >
                    <div style={{ width: 140 }}>{cat}</div>
                    <InputNumber
                      min={0}
                      value={options.portions?.[ag]?.[cat] || 0}
                      onChange={(v) => updatePortion(ag, cat, v)}
                      style={{ width: 100 }}
                    />
                    g
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Profiles */}
          <div style={{ marginTop: 18 }}>
            <h4>Profiles (people per meal / age group)</h4>

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

            {activeProfile && (
              <div
                style={{
                  maxHeight: 360,
                  overflow: "auto",
                  border: "1px solid #f0f0f0",
                  padding: 8,
                  borderRadius: 6,
                  marginTop: 8,
                }}
              >
                {/* ✅ HEADER ROW (Fixed) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `160px repeat(${
                      (options.ageGroups || []).length
                    }, 1fr)`,
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div />
                  {(options.ageGroups || []).map((lbl) => (
                    <div key={lbl} style={{ fontWeight: 600 }}>
                      {lbl}
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
                        {(options.ageGroups || []).map((lbl) => {
                          const profile = profiles.find(
                            (p) => p.name === activeProfile
                          );
                          const value = profile?.table?.[d]?.[m]?.[lbl] || 0;
                          return (
                            <InputNumber
                              key={lbl}
                              min={0}
                              value={value}
                              onChange={(v) =>
                                updateProfileCell(activeProfile, d, m, lbl, v)
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
            )}
          </div>

          <div style={{ marginTop: 12 }}>
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
            Allergens, age groups, and scaling logic now work together smoothly.
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
          placeholder="Profile name"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
        />
      </Modal>
    </div>
  );
}
