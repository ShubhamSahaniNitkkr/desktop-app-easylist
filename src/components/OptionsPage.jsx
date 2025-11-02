import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  Card,
  message,
  InputNumber,
  Divider,
  List,
  Typography,
  Space,
  Checkbox,
} from "antd";
import { getAll, add, update } from "../utils/ipc";

const { Title, Text } = Typography;

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
  const [days] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [meals] = useState(["Breakfast", "Lunch", "Snack", "Dinner"]);

  // ⚙️ Load options from DB
  useEffect(() => {
    (async () => {
      const all = await getAll();
      const opts = all.options || {};
      setOptions(opts);
      setProfiles(opts.profiles || []);
    })();
  }, []);

  // 🔹 Add language/unit/category/allergen/supplier dynamically
  function addItem(type, value) {
    if (!value.trim()) return message.error("Value required");
    if (options[type]?.includes(value))
      return message.warning("Already exists");
    const newArr = [...(options[type] || []), value];
    const updated = { ...options, [type]: newArr };
    setOptions(updated);
    updateOptions(updated);
    message.success(`${type} added`);
  }

  async function updateOptions(updated) {
    setOptions(updated);
    await update("options", null, updated);
  }

  // 🔹 Remove option item
  function removeItem(type, value) {
    const filtered = (options[type] || []).filter((x) => x !== value);
    const updated = { ...options, [type]: filtered };
    setOptions(updated);
    updateOptions(updated);
    message.info(`${value} removed`);
  }

  // 🔹 Add new age group (client requested dynamic)
  function addAgeGroup() {
    const name = prompt("Enter age group label (e.g., 3–5 years):");
    if (!name) return;
    const updated = {
      ...options,
      ageGroups: [...(options.ageGroups || []), name],
    };
    setOptions(updated);
    updateOptions(updated);
  }

  // 🔹 Remove age group
  function removeAgeGroup(label) {
    const updated = {
      ...options,
      ageGroups: (options.ageGroups || []).filter((x) => x !== label),
    };
    setOptions(updated);
    updateOptions(updated);
  }

  // 🔹 Create or switch profile
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

  // 🔹 Update cell in profile (people per meal)
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

  // 🔹 Render grid per selected profile
  function renderProfileGrid() {
    if (!activeProfile) return <Text>Select a profile to view/edit</Text>;
    const profile = profiles.find((p) => p.name === activeProfile);
    if (!profile) return null;

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

  if (!options)
    return <div style={{ padding: 20 }}>Loading configuration...</div>;

  return (
    <div style={{ padding: 20 }}>
      <Title level={3}>Options</Title>

      <Space direction="vertical" style={{ width: "100%" }}>
        {/* ---------- Basic Config ---------- */}
        <Card title="General Settings">
          <RowItem
            label="Default Language"
            content={
              <Select
                value={options.defaultLang}
                onChange={(v) =>
                  updateOptions({ ...options, defaultLang: v })
                }
              >
                {(options.languages || []).map((l) => (
                  <Select.Option key={l} value={l}>
                    {l}
                  </Select.Option>
                ))}
              </Select>
            }
          />
          <Divider />

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

        {/* ---------- Age Groups ---------- */}
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
              <Button
                size="small"
                danger
                onClick={() => removeAgeGroup(a)}
              >
                Remove
              </Button>
            </div>
          ))}
        </Card>

        {/* ---------- Profiles (people per meal) ---------- */}
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

          {renderProfileGrid()}
        </Card>
      </Space>
    </div>
  );
}

// ---------- Helper Components ----------
function RowItem({ label, content }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <Text strong>{label}</Text>
      {content}
    </div>
  );
}

function ConfigList({ title, data, addLabel, onAdd, newValue, setNewValue, onRemove }) {
  return (
    <div style={{ marginTop: 16 }}>
      <Text strong>{title}</Text>
      <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 6 }}>
        <Input
          placeholder={addLabel}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <Button onClick={onAdd}>Add</Button>
      </div>
      <div>
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
            <Button
              type="link"
              danger
              size="small"
              onClick={() => onRemove(v)}
            >
              remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
