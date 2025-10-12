// src/components/RecipePage.jsx
import React, { useEffect, useState } from "react";
import {
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Form,
  Row,
  Col,
  Checkbox,
  Upload,
} from "antd";
import {
  getAll,
  add,
  queryIngredients,
  pickImage,
  printToPDF,
  update,
} from "../utils/ipc";

const { TextArea } = Input;

export default function RecipePage() {
  const [form] = Form.useForm();
  const [options, setOptions] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [recipe, setRecipe] = useState({
    ingredients: [],
    steps: [],
    image: "",
    rating: 50,
    asIngredient: false,
  });
  const [ageCounts, setAgeCounts] = useState({}); // {label:count}
  const [referenceTotals, setReferenceTotals] = useState(0);

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setIngredients(all.ingredients || []);
    })();
  }, []);

  function addIngredientRow() {
    setRecipe((r) => ({
      ...r,
      ingredients: [
        ...(r.ingredients || []),
        {
          name: "",
          qty: 0,
          unit: options?.units?.[0] || "g",
          prepLoss: 0,
          cookingLoss: 0,
        },
      ],
    }));
  }
  function updateIng(i, field, v) {
    setRecipe((r) => {
      const cp = JSON.parse(JSON.stringify(r));
      cp.ingredients[i][field] = v;
      return cp;
    });
  }

  function addStep() {
    setRecipe((r) => ({
      ...r,
      steps: [...(r.steps || []), { text: "", time: 0 }],
    }));
  }
  function updateStep(i, field, v) {
    setRecipe((r) => {
      const cp = JSON.parse(JSON.stringify(r));
      cp.steps[i][field] = v;
      return cp;
    });
  }

  async function saveRecipe() {
    try {
      const name = recipe.name?.trim();
      if (!name) return message.error("Recipe name required");
      // Save to DB
      await add("recipes", recipe);
      message.success("Recipe saved");
    } catch (e) {
      message.error(e.message || "Error");
    }
  }

  async function pickImg() {
    const res = await pickImage();
    if (!res.canceled) setRecipe((r) => ({ ...r, image: res.data }));
  }

  function setAgeCount(label, count) {
    setAgeCounts((ac) => ({ ...ac, [label]: Number(count) }));
  }

  // Compute scaling: find reference ingredient = first ingredient in list that has a category mapped in options
  function computeScaledIngredients() {
    const std = options?.standardPortions || [];
    const ingredientsList = recipe.ingredients || [];
    if (ingredientsList.length === 0) return [];

    // first ingredient is reference:
    const ref = ingredientsList[0];
    // find category of ref by searching ingredients DB by name
    const refIngredientMeta = (ingredients || []).find(
      (i) => i.name.toLowerCase() === (ref.name || "").toLowerCase()
    );
    const refCategory = refIngredientMeta?.category || options?.categories?.[0];

    // compute total people per age group
    let totalRefGrams = 0;
    // for each standardPortion matching refCategory, multiply by count
    (std || []).forEach((s) => {
      if (s.category === refCategory) {
        const cnt = Number(ageCounts[s.label] || 0);
        totalRefGrams += (s.grams || 0) * cnt;
      }
    });
    if (totalRefGrams === 0) {
      // fallback: sum all counts and multiply by default adult portion if exists, else use base qty
      const totalPeople = Object.values(ageCounts).reduce(
        (a, b) => a + Number(b || 0),
        0
      );
      const adultPortion =
        (std.find((s) => s.label.toLowerCase().includes("adult")) || {})
          .grams || 150;
      totalRefGrams = totalPeople * adultPortion;
    }

    // determine base reference in recipe: if recipe's first ingredient qty is in g or kg - compute in grams
    const refQty = Number(ref.qty) || 0;
    const unit = ref.unit || "g";
    const refQtyInGrams =
      unit === "kg"
        ? refQty * 1000
        : unit === "l"
        ? refQty * (refIngredientMeta?.weightPerLiter || 1000)
        : refQty;

    // ratio = totalRefGrams / refQtyInGrams
    const ratio = refQtyInGrams > 0 ? totalRefGrams / refQtyInGrams : 1;

    // scale all ingredients
    return ingredientsList.map((i) => {
      const qty = Number(i.qty || 0);
      const unit = i.unit || "g";
      const qtyInGrams =
        unit === "kg"
          ? qty * 1000
          : unit === "l"
          ? qty *
            (ingredients.find(
              (ii) => ii.name.toLowerCase() === i.name?.toLowerCase()
            )?.weightPerLiter || 1000)
          : qty;
      const scaledInGrams = qtyInGrams * ratio;
      // convert back to original unit
      let scaledQty = scaledInGrams;
      if (unit === "kg") scaledQty = scaledInGrams / 1000;
      if (unit === "l")
        scaledQty =
          scaledInGrams /
          (ingredients.find(
            (ii) => ii.name.toLowerCase() === i.name?.toLowerCase()
          )?.weightPerLiter || 1000);
      return { ...i, scaledQty, scaledInGrams };
    });
  }

  const scaled = computeScaledIngredients();

  return (
    <div className="page">
      <h2>Recipe</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }} className="list">
          <Row gutter={12}>
            <Col span={16}>
              <Input
                placeholder="Recipe name"
                value={recipe.name || ""}
                onChange={(e) =>
                  setRecipe((r) => ({ ...r, name: e.target.value }))
                }
              />
            </Col>
            <Col span={8}>
              <Select
                style={{ width: "100%" }}
                value={recipe.category || "main"}
                onChange={(v) => setRecipe((r) => ({ ...r, category: v }))}
              >
                <Select.Option value="starter">Starter</Select.Option>
                <Select.Option value="main">Main</Select.Option>
                <Select.Option value="dessert">Dessert</Select.Option>
                <Select.Option value="vegetable">Vegetable</Select.Option>
                <Select.Option value="protein">Protein</Select.Option>
                <Select.Option value="starch">Starch</Select.Option>
              </Select>
            </Col>
          </Row>

          <h4 style={{ marginTop: 12 }}>Ingredients</h4>
          {(recipe.ingredients || []).map((ing, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input
                style={{ width: 260 }}
                value={ing.name}
                onChange={(e) => updateIng(idx, "name", e.target.value)}
                placeholder="Ingredient"
              />
              <InputNumber
                style={{ width: 100 }}
                value={ing.qty}
                onChange={(v) => updateIng(idx, "qty", v)}
              />
              <Select
                style={{ width: 120 }}
                value={ing.unit}
                onChange={(v) => updateIng(idx, "unit", v)}
              >
                {(options?.units || ["g", "kg"]).map((u) => (
                  <Select.Option key={u} value={u}>
                    {u}
                  </Select.Option>
                ))}
              </Select>
              <InputNumber
                style={{ width: 120 }}
                value={ing.prepLoss}
                onChange={(v) => updateIng(idx, "prepLoss", v)}
                min={0}
                max={100}
              />
              <InputNumber
                style={{ width: 120 }}
                value={ing.cookingLoss}
                onChange={(v) => updateIng(idx, "cookingLoss", v)}
                min={0}
                max={100}
              />
              <Button
                onClick={() =>
                  setRecipe((r) => ({
                    ...r,
                    ingredients: r.ingredients.filter((_, i) => i !== idx),
                  }))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button onClick={addIngredientRow}>Add ingredient</Button>

          <h4 style={{ marginTop: 12 }}>Preparation steps</h4>
          {(recipe.steps || []).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input
                value={s.text}
                onChange={(e) => {
                  const cp = [...recipe.steps];
                  cp[i].text = e.target.value;
                  setRecipe({ ...recipe, steps: cp });
                }}
                placeholder="Step text"
              />
              <InputNumber
                value={s.time}
                onChange={(v) => {
                  const cp = [...recipe.steps];
                  cp[i].time = v;
                  setRecipe({ ...recipe, steps: cp });
                }}
                placeholder="min"
              />
            </div>
          ))}
          <Button onClick={addStep}>Add step</Button>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Button type="primary" onClick={saveRecipe}>
              Save
            </Button>
            <Button onClick={pickImg}>Pick image</Button>
            <Button
              onClick={() => {
                const html = `<html><body><h1>${
                  recipe.name || ""
                }</h1><h3>Ingredients</h3><ul>${(recipe.ingredients || [])
                  .map((i) => `<li>${i.qty} ${i.unit} ${i.name}</li>`)
                  .join("")}</ul></body></html>`;
                printToPDF(html);
              }}
            >
              Print
            </Button>
            <Checkbox
              checked={recipe.asIngredient}
              onChange={(e) =>
                setRecipe((r) => ({ ...r, asIngredient: e.target.checked }))
              }
            >
              Recipe can be used as ingredient
            </Checkbox>
          </div>
        </div>

        <div style={{ width: 360 }} className="list">
          <h4>Scaling & metadata</h4>
          <div>
            <b>Age group counts</b>
            <div style={{ marginTop: 8 }}>
              {(options?.standardPortions || []).map((sp) => (
                <div
                  key={sp.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ width: 140 }}>
                    {sp.label} ({sp.grams} g)
                  </div>
                  <InputNumber
                    min={0}
                    value={ageCounts[sp.label] || 0}
                    onChange={(v) => setAgeCount(sp.label, v)}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <b>Scaled ingredients</b>
              <div style={{ maxHeight: 300, overflow: "auto", marginTop: 8 }}>
                {scaled.length === 0 && (
                  <div style={{ opacity: 0.7 }}>
                    Add ingredients and age counts to see scaled quantities
                  </div>
                )}
                {scaled.map((s, idx) => (
                  <div
                    key={idx}
                    style={{ padding: 6, borderBottom: "1px solid #eee" }}
                  >
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ opacity: 0.75 }}>
                      {(s.scaledQty || 0).toFixed(2)} {s.unit} —{" "}
                      {(s.scaledInGrams || 0).toFixed(1)} g
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <b>Rating</b>
              <InputNumber
                min={0}
                max={100}
                value={recipe.rating || 50}
                onChange={(v) => setRecipe((r) => ({ ...r, rating: v }))}
              />{" "}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
