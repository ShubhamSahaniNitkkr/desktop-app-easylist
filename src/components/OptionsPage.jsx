// src/components/OptionsPage.jsx
import React, { useEffect, useState } from "react";
import { Input, Button, Select, message, Table, Popconfirm } from "antd";
import { getAll, update, exportJSON, importJSON } from "../utils/ipc";

export default function OptionsPage({ refreshOptions }) {
  const [options, setOptions] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [agePortion, setAgePortion] = useState("");

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
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

  function addStandardPortion() {
    if (!ageLabel || !ageCategory || !agePortion)
      return message.error("Please fill fields");
    setOptions((o) => ({
      ...o,
      standardPortions: [
        ...(o.standardPortions || []),
        {
          id: Date.now().toString(),
          label: ageLabel,
          category: ageCategory,
          grams: Number(agePortion),
        },
      ],
    }));
    setAgeLabel("");
    setAgeCategory("");
    setAgePortion("");
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

  if (!options) return null;

  const columns = [
    { title: "Label", dataIndex: "label", key: "label" },
    { title: "Category", dataIndex: "category", key: "category" },
    { title: "Grams", dataIndex: "grams", key: "grams" },
    {
      title: "",
      key: "action",
      render: (_, rec) => (
        <Popconfirm
          title="Delete?"
          onConfirm={() => {
            setOptions((o) => ({
              ...o,
              standardPortions: (o.standardPortions || []).filter(
                (p) => p.id !== rec.id
              ),
            }));
          }}
        >
          <a>Delete</a>
        </Popconfirm>
      ),
    },
  ];

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
              value={options.defaultLang || "fr"}
              onChange={(v) => setOptions((o) => ({ ...o, defaultLang: v }))}
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
            <h4>Standard portions (by age / category)</h4>
            <div style={{ display: "flex", gap: 8 }}>
              <Input
                placeholder="Label (e.g. 0-3 yrs)"
                value={ageLabel}
                onChange={(e) => setAgeLabel(e.target.value)}
              />
              <Select
                placeholder="Category"
                value={ageCategory}
                onChange={(v) => setAgeCategory(v)}
                style={{ width: 200 }}
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

            <Table
              columns={columns}
              dataSource={options.standardPortions || []}
              rowKey="id"
              pagination={false}
              style={{ marginTop: 12 }}
            />
          </div>

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
            Allergens and categories can be extended. The standard portions
            table is used by the recipe scaling system: the first ingredient in
            a recipe is used as the reference (category + portions) to calculate
            the total amount to prepare for a group of people.
          </p>
        </div>
      </div>
    </div>
  );
}
