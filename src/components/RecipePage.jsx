// src/components/RecipePage.jsx
import React, { useEffect, useState } from "react";
import { Input, Button, Select, InputNumber, List, Card, message } from "antd";
import { useTranslation } from "react-i18next";
import {
  getAll,
  add,
  queryIngredients,
  pickImage,
  printToPDF,
} from "../utils/ipc";

const { TextArea } = Input;
const { Option } = Select;

export default function RecipePage() {
  const { t } = useTranslation();
  const [data, setData] = useState({ ingredients: [], steps: [] });
  const [allOptions, setAllOptions] = useState(null);
  const [ingQueryResults, setIngQueryResults] = useState([]);

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setAllOptions(all.options);
    })();
  }, []);

  function addIngredientRow() {
    setData((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients,
        { name: "", qty: "", unit: allOptions?.units?.[0] || "g", prepLoss: 0 },
      ],
    }));
  }
  function removeIng(idx) {
    setData((d) => ({
      ...d,
      ingredients: d.ingredients.filter((_, i) => i !== idx),
    }));
  }
  function setIng(idx, field, val) {
    setData((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.ingredients[idx][field] = val;
      return copy;
    });
  }

  function addStep() {
    setData((d) => ({ ...d, steps: [...d.steps, { text: "", time: 0 }] }));
  }
  function setStep(i, field, v) {
    setData((d) => {
      const copy = JSON.parse(JSON.stringify(d));
      copy.steps[i][field] = v;
      return copy;
    });
  }

  async function searchIngredient(q, idx) {
    if (!q) return setIngQueryResults([]);
    const list = await queryIngredients(q);
    setIngQueryResults(list.map((x) => ({ ...x, _row: idx })));
  }

  async function saveRecipe() {
    if (!data.name) return message.error("Recipe name required");
    // create recipe object
    const recipe = { ...data };
    await add("recipes", recipe);
    message.success("Recipe saved");
  }

  async function pickImg() {
    const res = await pickImage();
    if (!res.canceled) {
      setData((d) => ({ ...d, image: res.data }));
      message.success("Image attached");
    }
  }

  async function onPrint() {
    // quick print: generate HTML from recipe
    const html = `<html><body><h1>${
      data.name || ""
    }</h1><h3>Ingredients</h3><ul>${(data.ingredients || [])
      .map((i) => `<li>${i.qty} ${i.unit} ${i.name}</li>`)
      .join("")}</ul></body></html>`;
    const res = await printToPDF(html);
    if (!res.canceled) message.success("Saved PDF: " + res.path);
  }

  return (
    <div className="page">
      <h2>Recipe</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }} className="list">
          <div style={{ display: "flex", gap: 12 }}>
            <Input
              placeholder="Recipe name"
              value={data.name || ""}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
            <Select
              style={{ width: 160 }}
              value={data.category || "main"}
              onChange={(v) => setData({ ...data, category: v })}
            >
              <Option value="starter">Starter</Option>
              <Option value="main">Main</Option>
              <Option value="dessert">Dessert</Option>
              <Option value="vegetable">Vegetable</Option>
              <Option value="protein">Protein</Option>
              <Option value="starch">Starch</Option>
            </Select>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Ingredients</h4>
            <div>
              {(data.ingredients || []).map((ing, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: 8, marginBottom: 8 }}
                >
                  <Input
                    style={{ width: 260 }}
                    value={ing.name}
                    onChange={(e) => {
                      setIng(idx, "name", e.target.value);
                      searchIngredient(e.target.value, idx);
                    }}
                    placeholder="Ingredient"
                  />
                  <InputNumber
                    style={{ width: 100 }}
                    value={ing.qty}
                    onChange={(v) => setIng(idx, "qty", v)}
                  />
                  <Select
                    style={{ width: 120 }}
                    value={ing.unit}
                    onChange={(v) => setIng(idx, "unit", v)}
                  >
                    {(allOptions?.units || ["g", "kg"]).map((u) => (
                      <Option key={u} value={u}>
                        {u}
                      </Option>
                    ))}
                  </Select>
                  <InputNumber
                    style={{ width: 120 }}
                    value={ing.prepLoss}
                    onChange={(v) => setIng(idx, "prepLoss", v)}
                    min={0}
                    max={100}
                  />
                  <Button onClick={() => removeIng(idx)}>Remove</Button>
                </div>
              ))}
              <Button onClick={addIngredientRow} style={{ marginTop: 6 }}>
                Add ingredient
              </Button>
              <div>
                {ingQueryResults.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 6,
                      border: "1px dashed #ddd",
                      marginTop: 6,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setIng(r._row, "name", r.name);
                      setIngQueryResults([]);
                    }}
                  >
                    {r.name}{" "}
                    <small style={{ opacity: 0.6 }}>{r.category}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Preparation steps</h4>
            {(data.steps || []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Input
                  value={s.text}
                  onChange={(e) => setStep(i, "text", e.target.value)}
                  placeholder="Step text"
                />
                <InputNumber
                  value={s.time}
                  onChange={(v) => setStep(i, "time", v)}
                  placeholder="min"
                />
              </div>
            ))}
            <Button onClick={addStep}>Add step</Button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button type="primary" onClick={saveRecipe}>
              Save
            </Button>
            <Button onClick={pickImg}>Pick image</Button>
            <Button onClick={onPrint}>Print (PDF)</Button>
          </div>
        </div>

        <div style={{ width: 360 }} className="list">
          <h4>Metadata</h4>
          <div>
            <b>Image:</b> {data.image ? "attached" : "none"}
          </div>
          <div style={{ marginTop: 12 }}>
            <b>Nutrition / Allergens</b>
            <p style={{ opacity: 0.7 }}>
              Nutrition is calculated from ingredient values (you can extend
              later).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
