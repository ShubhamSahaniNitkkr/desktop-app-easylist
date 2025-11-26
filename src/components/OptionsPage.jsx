// src/components/OptionsPage.jsx
import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  Card,
  message,
  InputNumber,
  Typography,
  Space,
  Collapse
} from "antd";
import { getAll, update } from "../utils/ipc";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export default function OptionsPage() {
  const [options, setOptions] = useState(null);
  const [newLang, setNewLang] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newAllergen, setNewAllergen] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newProfileName, setNewProfileName] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [sqlInput, setSqlInput] = useState("");
  const [sqlResult, setSqlResult] = useState(null);
  const [days] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  const [meals] = useState(["Breakfast", "Lunch", "Snack", "Dinner"]);
  const [newAgeGroup, setNewAgeGroup] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const all = await getAll();
        const opts = all.options || {};
        if (!opts.standardPortions) opts.standardPortions = [];
        if (!opts.ageGroups) opts.ageGroups = [];
        if (!opts.languages) opts.languages = ["en"];
        if (!opts.units) opts.units = ["g", "kg"];
        if (!opts.categories) opts.categories = [];
        if (!opts.allergens) opts.allergens = [];
        if (!opts.suppliers) opts.suppliers = [];
        if (!opts.profiles) opts.profiles = [];
        if (!opts.unitConversion) {
          opts.unitConversion = {
            g: 1,
            kg: 1000,
            mg: 0.001,
            l: 1000,
            ml: 1,
            tsp: 5,
            tbsp: 15
          };
        }
        setOptions(opts);
        setProfiles(opts.profiles || []);
      } catch (e) {
        message.error("Failed to load options: " + (e.message || e));
      }
    })();
  }, []);

  async function updateOptions(updated) {
    try {
      setOptions(updated);
      await update("options", null, updated);
    } catch (e) {
      message.error("Save failed: " + (e.message || e));
    }
  }

  function addItem(type, value) {
    if (!value || !value.trim()) return message.error("Value required");
    if ((options[type] || []).includes(value.trim()))
      return message.warning("Already exists");
    const newArr = [...(options[type] || []), value.trim()];
    const updated = { ...options, [type]: newArr };
    updateOptions(updated);
    message.success(`${type} added`);
  }

  function removeItem(type, value) {
    const filtered = (options[type] || []).filter((x) => x !== value);
    const updated = { ...options, [type]: filtered };
    updateOptions(updated);
    message.info(`${value} removed`);
  }

  // AGE GROUPS
  async function addAgeGroup() {
    const name = newAgeGroup.trim();
    if (!name) return message.error("Please enter an age group name");
    if ((options.ageGroups || []).includes(name)) {
      return message.warning("This age group already exists");
    }

    const updated = {
      ...options,
      ageGroups: [...(options.ageGroups || []), name]
    };

    try {
      await update("options", null, updated);
      setOptions(updated);
      setNewAgeGroup("");
      message.success(`Age group '${name}' added successfully`);
    } catch (err) {
      console.error(err);
      message.error("Failed to save age group");
    }
  }

  function removeAgeGroup(label) {
    const updated = {
      ...options,
      ageGroups: (options.ageGroups || []).filter((x) => x !== label),
      standardPortions: (options.standardPortions || []).filter(
        (sp) => sp.ageGroup !== label
      )
    };
    updateOptions(updated);
  }

  // PROFILES
  async function addProfile() {
    if (!newProfileName.trim()) return message.error("Profile name required");
    if (profiles.find((p) => p.name === newProfileName))
      return message.warning("Profile already exists");

    const newP = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      table: {}
    };

    const updatedProfiles = [...profiles, newP];
    setProfiles(updatedProfiles);
    const updatedOptions = { ...options, profiles: updatedProfiles };
    await updateOptions(updatedOptions);
    setNewProfileName("");
    message.success("Profile added");
  }

  function selectProfile(name) {
    setActiveProfile(name);
  }

  async function updateProfileCell(profileName, day, meal, label, value) {
    const updatedProfiles = profiles.map((p) => {
      if (p.name !== profileName) return p;
      const table = p.table || {};
      const dayData = table[day] || {};
      const mealData = dayData[meal] || {};
      mealData[label] = value;
      dayData[meal] = mealData;
      table[day] = dayData;
      return { ...p, table };
    });

    setProfiles(updatedProfiles);
    const updatedOptions = { ...options, profiles: updatedProfiles };
    await updateOptions(updatedOptions);
  }

  // STANDARD PORTIONS
  async function updatePortion(ageGroup, category, value) {
    const list = [...(options.standardPortions || [])];
    const idx = list.findIndex(
      (p) => p.ageGroup === ageGroup && p.category === category
    );
    if (idx >= 0) list[idx].grams = value;
    else list.push({ ageGroup, category, grams: value });
    const updated = { ...options, standardPortions: list };
    await updateOptions(updated);
  }

  function renderPortionTable() {
    const ageGroups = options.ageGroups || [];
    const cats = options.categories || [];
    const data = options.standardPortions || [];

    if (ageGroups.length === 0 || cats.length === 0)
      return (
        <Text type="secondary">
          Add some age groups and categories first.
        </Text>
      );

    return (
      <div
        style={{
          maxHeight: 400,
          overflowY: "auto",
          border: "1px solid #eee",
          padding: 8,
          borderRadius: 6,
          marginTop: 8
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
            fontWeight: 600,
            marginBottom: 6
          }}
        >
          <div>Category</div>
          {ageGroups.map((a) => (
            <div key={a} style={{ textAlign: "center" }}>
              {a}
            </div>
          ))}
        </div>

        {cats.map((cat) => (
          <div
            key={cat}
            style={{
              display: "grid",
              gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
              alignItems: "center",
              marginBottom: 6
            }}
          >
            <div>{cat}</div>
            {ageGroups.map((ag) => {
              const found = data.find(
                (p) => p.ageGroup === ag && p.category === cat
              );
              const grams = found ? found.grams : 0;
              return (
                <InputNumber
                  key={`${ag}-${cat}`}
                  min={0}
                  value={grams}
                  onChange={(v) => updatePortion(ag, cat, v)}
                  style={{ width: 80 }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ---------------- SQL CONSOLE ----------------
  async function runSQL() {
    if (!sqlInput.trim()) return message.warning("Enter SQL");

    let query = sqlInput.trim();

    // alias for "show tables"
    if (query.toLowerCase() === "show tables") {
      query = "SELECT name FROM sqlite_master WHERE type='table'";
    }

    try {
      const resp = await window.api.sqlQuery(query);

      if (resp.error) {
        setSqlResult({ error: resp.error });
        message.error(resp.error);
        return;
      }

      if (resp.rows) {
        setSqlResult({ rows: resp.rows });
        message.success("Query executed");
        return;
      }

      setSqlResult({
        message: resp.message,
        changes: resp.changes,
        lastID: resp.lastID
      });
      message.success("Query applied");
    } catch (err) {
      setSqlResult({ error: err.message });
      message.error(err.message);
    }
  }

  // SAVE
  async function saveAll() {
    try {
      await update("options", null, options);
      message.success("All changes saved successfully");
    } catch (e) {
      message.error("Save failed: " + (e.message || e));
    }
  }

  if (!options)
    return <div style={{ padding: 20 }}>Loading configuration...</div>;

  return (
    <div style={{ padding: 20 }}>
      <Title level={3}>Options</Title>

      <Space direction="vertical" style={{ width: "100%" }}>
        {/* ---------- BASIC CONFIG ---------- */}
        <Card title="General Settings">
          <div style={{ marginBottom: 12 }}>
            <Text strong>Default Language</Text>
            <Select
              value={options.defaultLang}
              onChange={(v) => updateOptions({ ...options, defaultLang: v })}
              style={{ marginLeft: 8 }}
            >
              {(options.languages || []).map((l) => (
                <Select.Option key={l} value={l}>
                  {l}
                </Select.Option>
              ))}
            </Select>
          </div>

          <ConfigList
            title="Languages"
            data={options.languages}
            addLabel="Add Language"
            onAdd={() => addItem("languages", newLang)}
            newValue={newLang}
            setNewValue={setNewLang}
            onRemove={(v) => removeItem("languages", v)}
          />

          <ConfigList
            title="Units"
            data={options.units}
            addLabel="Add Unit"
            onAdd={() => addItem("units", newUnit)}
            newValue={newUnit}
            setNewValue={setNewUnit}
            onRemove={(v) => removeItem("units", v)}
          />

          <ConfigList
            title="Categories"
            data={options.categories}
            addLabel="Add Category"
            onAdd={() => addItem("categories", newCategory)}
            newValue={newCategory}
            setNewValue={setNewCategory}
            onRemove={(v) => removeItem("categories", v)}
          />

          <ConfigList
            title="Allergens"
            data={options.allergens}
            addLabel="Add Allergen"
            onAdd={() => addItem("allergens", newAllergen)}
            newValue={newAllergen}
            setNewValue={setNewAllergen}
            onRemove={(v) => removeItem("allergens", v)}
          />

          <ConfigList
            title="Suppliers"
            data={options.suppliers}
            addLabel="Add Supplier"
            onAdd={() => addItem("suppliers", newSupplier)}
            newValue={newSupplier}
            setNewValue={setNewSupplier}
            onRemove={(v) => removeItem("suppliers", v)}
          />
        </Card>

        {/* ---------- AGE GROUPS ---------- */}
        <Card title="Age Groups">
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input
              placeholder="Add new age group (e.g., 3–5 years)"
              value={newAgeGroup}
              onChange={(e) => setNewAgeGroup(e.target.value)}
            />
            <Button type="primary" onClick={addAgeGroup}>
              Add
            </Button>
          </div>

          {(options.ageGroups || []).length === 0 && (
            <Text type="secondary">No age groups defined yet.</Text>
          )}

          {(options.ageGroups || []).map((a) => (
            <div
              key={a}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6
              }}
            >
              <span>{a}</span>
              <Button size="small" danger onClick={() => removeAgeGroup(a)}>
                Remove
              </Button>
            </div>
          ))}
        </Card>

        {/* ---------- STANDARD PORTIONS ---------- */}
        <Card title="Grams (per Age Group & Category)">
          {renderPortionTable()}
        </Card>

        {/* ---------- PROFILES ---------- */}
        <Card
          title="Profiles (People per Meal)"
          extra={
            <Space>
              <Input
                placeholder="Profile name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                style={{ width: 160 }}
              />
              <Button onClick={addProfile}>Add Profile</Button>
            </Space>
          }
        >
          <Select
            placeholder="Select Profile"
            value={activeProfile}
            onChange={selectProfile}
            style={{ width: 200, marginBottom: 10 }}
          >
            {(profiles || []).map((p) => (
              <Select.Option key={p.name} value={p.name}>
                {p.name}
              </Select.Option>
            ))}
          </Select>

          {activeProfile ? (
            <ProfileGrid
              profile={profiles.find((p) => p.name === activeProfile)}
              options={options}
              updateProfileCell={updateProfileCell}
              days={days}
              meals={meals}
              activeProfile={activeProfile}
            />
          ) : (
            <Text type="secondary">Select a profile to edit</Text>
          )}
        </Card>

        {/* ---------- SQL CONSOLE ---------- */}
        <Collapse>
          <Panel header="Advanced: SQL Console (Full SQLite Access)" key="sql">
            <Text type="secondary">
              Supports: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP,
              SHOW TABLES
            </Text>

            <Input.TextArea
              rows={6}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              placeholder="Type SQL, e.g.:
SELECT name FROM sqlite_master WHERE type='table';
show tables;
SELECT * FROM ingredients;"
              style={{ marginTop: 10 }}
            />

            <Button type="primary" onClick={runSQL} style={{ marginTop: 10 }}>
              Run SQL
            </Button>

            {/* ---------- RESULT BOX ---------- */}
            {sqlResult && (
              <div
                style={{
                  background: "#fafafa",
                  padding: 12,
                  marginTop: 15,
                  borderRadius: 6,
                  border: "1px solid #eee"
                }}
              >
                <Title level={5}>Result</Title>

                {sqlResult.error && (
                  <Text type="danger" style={{ whiteSpace: "pre-wrap" }}>
                    {sqlResult.error}
                  </Text>
                )}

                {sqlResult.message && (
                  <Text style={{ whiteSpace: "pre-wrap" }}>
                    {sqlResult.message}
                    {sqlResult.changes !== undefined &&
                      ` | Changes: ${sqlResult.changes}`}
                    {sqlResult.lastID &&
                      ` | Last ID: ${sqlResult.lastID}`}
                  </Text>
                )}

                {/* TABLE RESULT */}
                {sqlResult.rows && sqlResult.rows.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontFamily: "monospace"
                      }}
                    >
                      <thead>
                        <tr>
                          {Object.keys(sqlResult.rows[0]).map((col) => (
                            <th
                              key={col}
                              style={{
                                borderBottom: "1px solid #ccc",
                                textAlign: "left",
                                padding: 4
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td
                                key={j}
                                style={{
                                  borderBottom: "1px solid #eee",
                                  padding: 4
                                }}
                              >
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* No rows */}
                {sqlResult.rows &&
                  sqlResult.rows.length === 0 && (
                    <Text type="secondary">No rows returned.</Text>
                  )}
              </div>
            )}
          </Panel>
        </Collapse>

        {/* ---------- SAVE ---------- */}
        <div style={{ textAlign: "right", marginTop: 20 }}>
          <Button type="primary" size="large" onClick={saveAll}>
            Save Changes
          </Button>
        </div>
      </Space>
    </div>
  );
}

// ------------ HELPERS ------------
function ConfigList({
  title,
  data,
  addLabel,
  onAdd,
  newValue,
  setNewValue,
  onRemove
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <Text strong>{title}</Text>
      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 6 }}>
        <Input
          placeholder={addLabel}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <Button onClick={onAdd}>Add</Button>
      </div>
      {(data || []).map((v) => (
        <div
          key={v}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4
          }}
        >
          <span>{v}</span>
          <Button type="link" danger size="small" onClick={() => onRemove(v)}>
            remove
          </Button>
        </div>
      ))}
    </div>
  );
}

function ProfileGrid({
  profile,
  options,
  updateProfileCell,
  days,
  meals,
  activeProfile
}) {
  const ageGroups = options.ageGroups || [];
  return (
    <div
      style={{
        maxHeight: 400,
        overflowY: "auto",
        border: "1px solid #eee",
        padding: 8,
        borderRadius: 6,
        marginTop: 8
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
          fontWeight: 600,
          marginBottom: 6
        }}
      >
        <div>Day / Meal</div>
        {ageGroups.map((a) => (
          <div key={a} style={{ textAlign: "center" }}>
            {a}
          </div>
        ))}
      </div>

      {days.map((d) => (
        <div key={d} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{d}</div>

          {meals.map((m) => (
            <div
              key={m}
              style={{
                display: "grid",
                gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
                alignItems: "center",
                marginBottom: 6
              }}
            >
              <div>{m}</div>

              {ageGroups.map((lbl) => {
                const value = profile.table?.[d]?.[m]?.[lbl] || 0;
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
  );
}
