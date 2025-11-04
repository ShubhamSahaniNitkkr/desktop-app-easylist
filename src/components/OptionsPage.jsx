import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  Card,
  message,
  InputNumber,
  Divider,
  Typography,
  Space,
  Collapse,
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
  const [sqlResponse, setSqlResponse] = useState("");
  const [days] = useState([
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ]);
  const [meals] = useState(["Breakfast", "Lunch", "Snack", "Dinner"]);

  useEffect(() => {
    (async () => {
      const all = await getAll();
      const opts = all.options || {};
      if (!opts.standardPortions) opts.standardPortions = [];
      if (!opts.ageGroups) opts.ageGroups = [];
      setOptions(opts);
      setProfiles(opts.profiles || []);
    })();
  }, []);

  async function updateOptions(updated) {
    setOptions(updated);
    await update("options", null, updated);
  }

  function addItem(type, value) {
    if (!value.trim()) return message.error("Value required");
    if (options[type]?.includes(value)) return message.warning("Already exists");
    const newArr = [...(options[type] || []), value];
    const updated = { ...options, [type]: newArr };
    setOptions(updated);
    updateOptions(updated);
    message.success(`${type} added`);
  }

  function removeItem(type, value) {
    const filtered = (options[type] || []).filter((x) => x !== value);
    const updated = { ...options, [type]: filtered };
    setOptions(updated);
    updateOptions(updated);
    message.info(`${value} removed`);
  }

  // ---------- AGE GROUPS ----------
  function addAgeGroup() {
    const name = prompt("Enter age group label (e.g., 3–5 years):");
    if (!name) return;
    if ((options.ageGroups || []).includes(name))
      return message.warning("This age group already exists");

    const updated = {
      ...options,
      ageGroups: [...(options.ageGroups || []), name],
    };
    setOptions(updated);
    updateOptions(updated);
    message.success(`Age group '${name}' added`);
  }

  function removeAgeGroup(label) {
    const updated = {
      ...options,
      ageGroups: (options.ageGroups || []).filter((x) => x !== label),
      standardPortions: (options.standardPortions || []).filter(
        (sp) => sp.ageGroup !== label
      ),
    };
    setOptions(updated);
    updateOptions(updated);
  }

  // ---------- PROFILES ----------
  function addProfile() {
    if (!newProfileName.trim()) return message.error("Profile name required");
    if (profiles.find((p) => p.name === newProfileName))
      return message.warning("Profile already exists");

    const newP = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      table: {},
    };

    const updatedProfiles = [...profiles, newP];
    setProfiles(updatedProfiles);
    const updatedOptions = { ...options, profiles: updatedProfiles };
    updateOptions(updatedOptions);
    setNewProfileName("");
    message.success("Profile added");
  }

  function selectProfile(name) {
    setActiveProfile(name);
  }

  function updateProfileCell(profileName, day, meal, label, value) {
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
    updateOptions(updatedOptions);
  }

  // ---------- STANDARD PORTIONS ----------
  function updatePortion(ageGroup, category, value) {
    const list = [...(options.standardPortions || [])];
    const idx = list.findIndex(
      (p) => p.ageGroup === ageGroup && p.category === category
    );
    if (idx >= 0) list[idx].grams = value;
    else list.push({ ageGroup, category, grams: value });
    const updated = { ...options, standardPortions: list };
    setOptions(updated);
    updateOptions(updated);
  }

  function renderPortionTable() {
    const ageGroups = options.ageGroups || [];
    const cats = options.categories || [];
    const data = options.standardPortions || [];
    if (ageGroups.length === 0 || cats.length === 0)
      return <Text type="secondary">Add some age groups and categories first.</Text>;

    return (
      <div
        style={{
          maxHeight: 400,
          overflowY: "auto",
          border: "1px solid #eee",
          padding: 8,
          borderRadius: 6,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
            fontWeight: 600,
            marginBottom: 6,
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
              marginBottom: 6,
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

  // ---------- SQL INJECTION ----------
  async function injectSqlData() {
    try {
      if (!sqlInput.trim()) return message.warning("No SQL entered");

      const lower = sqlInput.toLowerCase();
      let resp = "";
      if (lower.includes("insert into ingredients")) {
        resp = "SQL parsed and injected into Ingredients table (simulated).";
        message.success("SQL parsed — ingredients injected");
      } else if (lower.includes("insert into recipes")) {
        resp = "SQL parsed and injected into Recipes table (simulated).";
        message.success("SQL parsed — recipes injected");
      } else {
        resp = "SQL accepted but no known table found (demo mode).";
        message.info("SQL accepted (no change).");
      }

      setSqlResponse(resp);
      setSqlInput("");
    } catch (e) {
      const errMsg = "Invalid SQL format or parse error.";
      setSqlResponse(errMsg);
      message.error(errMsg);
    }
  }

  if (!options) return <div style={{ padding: 20 }}>Loading configuration...</div>;

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
        <Card
          title="Age Groups"
          extra={<Button onClick={addAgeGroup}>+ Add Age Group</Button>}
        >
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
                marginBottom: 6,
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

        {/* ---------- SQL INJECTION ---------- */}
        <Collapse>
          <Panel header="Advanced: SQL Data Injection (for import)" key="1">
            <Text type="secondary">
              Paste raw SQL INSERT commands here (ingredients/recipes). Example:
              <br />
              <code>
                INSERT INTO ingredients (name, unit, category) VALUES
                ('Rice','g','starch');
              </code>
            </Text>
            <Input.TextArea
              rows={6}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              style={{ marginTop: 10 }}
              placeholder="Paste SQL here..."
            />
            <Button
              onClick={injectSqlData}
              type="primary"
              style={{ marginTop: 8 }}
            >
              Inject SQL
            </Button>
            {sqlResponse && (
              <div
                style={{
                  background: "#f6f6f6",
                  padding: 10,
                  borderRadius: 6,
                  marginTop: 10,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {sqlResponse}
              </div>
            )}
          </Panel>
        </Collapse>
      </Space>
    </div>
  );
}

// ---------- HELPER COMPONENTS ----------
function ConfigList({ title, data, addLabel, onAdd, newValue, setNewValue, onRemove }) {
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
            marginBottom: 4,
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

function ProfileGrid({ profile, options, updateProfileCell, days, meals, activeProfile }) {
  const ageGroups = options.ageGroups || [];
  return (
    <div
      style={{
        maxHeight: 400,
        overflowY: "auto",
        border: "1px solid #eee",
        padding: 8,
        borderRadius: 6,
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `160px repeat(${ageGroups.length}, 100px)`,
          fontWeight: 600,
          marginBottom: 6,
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
                marginBottom: 6,
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
