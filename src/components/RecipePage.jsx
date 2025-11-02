// src/components/RecipePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Checkbox,
  Card,
  Typography,
  Divider,
  Space,
  Image,
  List,
} from "antd";
import { getAll, add, pickImage /* printToPDF removed from usage here */ } from "../utils/ipc";

const { Title, Text } = Typography;

export default function RecipePage() {
  const [options, setOptions] = useState(null);
  const [ingredientsDb, setIngredientsDb] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipe, setRecipe] = useState({
    name: "",
    category: "main",
    ingredients: [],
    steps: [],
    image: "",
    rating: 100,
    asIngredient: false,
    youtube: "",
  });
  const [targetWeight, setTargetWeight] = useState(null);

  // Load data from DB
  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setIngredientsDb(all.ingredients || []);
      setRecipes(all.recipes || []);
    })();
  }, []);

  // Helper: Reset form
  function newRecipe() {
    setRecipe({
      name: "",
      category: "main",
      ingredients: [],
      steps: [],
      image: "",
      rating: 100,
      asIngredient: false,
      youtube: "",
    });
    setTargetWeight(null);
  }

  // Helper: Add ingredient row (preserve image and other fields)
  function addIngredientRow() {
    setRecipe((r) => ({
      ...r,
      ingredients: [
        ...(r.ingredients || []),
        {
          name: "",
          qty: 0,
          unit: options?.units?.[0] || "g",
          ingredientLoss: 0,
          prepLoss: 0,
          cookingLoss: 0,
        },
      ],
    }));
  }

  function updateIng(i, field, value) {
    setRecipe((r) => {
      const updated = { ...r };
      updated.ingredients = [...(r.ingredients || [])];
      updated.ingredients[i] = { ...(updated.ingredients[i] || {}), [field]: value };
      return updated;
    });
  }

  function selectIngredient(i, name) {
    const meta = (ingredientsDb || []).find(
      (x) => x.name && x.name.toLowerCase() === (name || "").toLowerCase()
    );
    setRecipe((r) => {
      const updated = { ...r };
      updated.ingredients = [...(r.ingredients || [])];
      updated.ingredients[i] = { ...(updated.ingredients[i] || {}), name };
      if (meta) {
        updated.ingredients[i].unit = meta.unit || "g";
        // keep earlier fields if present
        updated.ingredients[i].ingredientLoss = meta.ingredientLoss || updated.ingredients[i].ingredientLoss || 0;
        updated.ingredients[i].prepLoss = meta.prepLoss || updated.ingredients[i].prepLoss || 0;
      }
      return updated;
    });
  }

  function addStep() {
    setRecipe((r) => ({
      ...r,
      steps: [...(r.steps || []), { text: "", time: 0, temperature: "" }],
    }));
  }

  function updateStep(i, field, value) {
    setRecipe((r) => {
      const updated = { ...r };
      updated.steps = [...(r.steps || [])];
      updated.steps[i] = { ...(updated.steps[i] || {}), [field]: value };
      return updated;
    });
  }

  // Save recipe
  async function saveRecipe() {
    try {
      const name = (recipe.name || "").trim();
      if (!name) return message.error("Recipe name required");

      const copy = JSON.parse(JSON.stringify(recipe));
      if (!copy.rating && copy.rating !== 0) copy.rating = 100;

      await add("recipes", copy);
      message.success("Recipe saved successfully");
      const all = await getAll();
      setRecipes(all.recipes || []);
    } catch (err) {
      message.error(err.message || "Save failed");
    }
  }

  // Image picker
  async function pickImg() {
    try {
      const res = await pickImage();
      if (!res.canceled) {
        setRecipe((r) => ({ ...r, image: res.data }));
        message.success("Image attached");
      }
    } catch (err) {
      message.error("Image pick failed");
    }
  }

  // Weight calculation helpers
  function gramsFromUnit(qty, unit, meta) {
    if (!qty) return 0;
    if (unit === "kg") return qty * 1000;
    if (unit === "l") return qty * (meta?.weightPerLiter || 1000);
    return qty;
  }

  function netYieldFraction(ingLoss, prepLoss, cookLoss) {
    const f1 = 1 - (Number(ingLoss || 0) / 100);
    const f2 = 1 - (Number(prepLoss || 0) / 100);
    const f3 = 1 - (Number(cookLoss || 0) / 100);
    return f1 * f2 * f3;
  }

  // UseMemo to compute scaled ingredients and net weight (no setState inside render)
  const scaled = useMemo(() => {
    const ingredients = recipe.ingredients || [];
    if (ingredients.length === 0) return [];

    let baseNet = 0;
    const metaCache = {};

    for (const i of ingredients) {
      const nameKey = (i.name || "").toLowerCase();
      const meta =
        metaCache[nameKey] ||
        ingredientsDb.find((m) => m.name && m.name.toLowerCase() === nameKey);
      metaCache[nameKey] = meta;
      const grams = gramsFromUnit(i.qty || 0, i.unit, meta);
      const net = grams * netYieldFraction(i.ingredientLoss, i.prepLoss, i.cookingLoss);
      baseNet += net;
    }

    const ratio = targetWeight && baseNet > 0 ? Number(targetWeight) / baseNet : 1;

    return ingredients.map((i) => {
      const meta = metaCache[(i.name || "").toLowerCase()];
      const scaledQty = (Number(i.qty) || 0) * ratio;
      const scaledGrams =
        gramsFromUnit(scaledQty, i.unit, meta) *
        netYieldFraction(i.ingredientLoss, i.prepLoss, i.cookingLoss);
      return { ...i, scaledQty, scaledInGrams: scaledGrams || 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, targetWeight, ingredientsDb, options]);

  const netWeight = useMemo(() => {
    return scaled.reduce((a, b) => a + (b.scaledInGrams || 0), 0);
  }, [scaled]);

  // Print recipe (open print preview instead of save dialog)
  async function onPrint() {
    try {
      const html = `<html><head><meta charset="utf-8"><title>${recipe.name || ""}</title></head><body>
      <h1>${recipe.name || ""}</h1>
      <h3>Ingredients (Scaled)</h3>
      <ul>
      ${scaled
          .map(
            (i) =>
              `<li>${Number(i.scaledQty || 0).toFixed(2)} ${i.unit || ""} ${i.name || ""} — Net: ${Number(
                i.scaledInGrams || 0
              ).toFixed(1)} g</li>`
          )
          .join("")}
      </ul>
      <h4>Total Net Weight: ${Number(netWeight || 0).toFixed(1)} g</h4>
      </body></html>`;

      // Open a new window and trigger browser print dialog (avoids Save dialog from main)
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        // fallback to IPC PDF save if blocked
        message.warning("Popup blocked — falling back to Save PDF");
        const res = await (window.api && window.api.printToPDF ? window.api.printToPDF(html) : null);
        if (res && res.path) message.success("PDF saved at " + res.path);
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      // Allow some time for rendering before print (small delay)
      setTimeout(() => {
        try {
          w.print();
          // optionally close after printing
          // w.close();
        } catch (e) {
          // ignore
        }
      }, 250);
    } catch (err) {
      message.error("Print failed: " + (err.message || ""));
    }
  }

  function loadRecipe(r) {
    setRecipe({ ...r });
    setTargetWeight(null);
  }

  return (
    <div className="page" style={{ padding: 20 }}>
      <Title level={3}>Recipe</Title>

      <Row gutter={16}>
        <Col span={16}>
          <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 12 }}>
            <Space style={{ marginBottom: 12 }}>
              <Button onClick={newRecipe}>New Recipe</Button>
            </Space>

            <Row gutter={12}>
              <Col span={8}>
                <Text strong>Recipe Name</Text>
                <Input
                  value={recipe.name}
                  onChange={(e) => setRecipe((r) => ({ ...r, name: e.target.value }))}
                />
              </Col>
              <Col span={8}>
                <Text strong>Category</Text>
                <Select
                  value={recipe.category}
                  onChange={(v) => setRecipe((r) => ({ ...r, category: v }))}
                  style={{ width: "100%" }}
                >
                  {(options?.categories || []).map((c) => (
                    <Select.Option key={c} value={c}>
                      {c}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <Text strong>YouTube Link</Text>
                <Input
                  value={recipe.youtube}
                  onChange={(e) => setRecipe((r) => ({ ...r, youtube: e.target.value }))}
                />
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Ingredients</Title>

            {recipe.ingredients.length > 0 && (
              <Row gutter={8} style={{ marginBottom: 4 }}>
                <Col span={5}>Name</Col>
                <Col span={3}>Qty</Col>
                <Col span={3}>Unit</Col>
                <Col span={3}>Ingredient Loss</Col>
                <Col span={3}>Prep Loss</Col>
                <Col span={3}>Cooking Loss</Col>
              </Row>
            )}

            {(recipe.ingredients || []).map((ing, idx) => (
              <Row key={idx} gutter={8} style={{ marginBottom: 6 }}>
                <Col span={5}>
                  <Select
                    showSearch
                    value={ing.name || undefined}
                    placeholder="Ingredient"
                    onChange={(v) => selectIngredient(idx, v)}
                    style={{ width: "100%" }}
                    options={(ingredientsDb || []).map((it) => ({
                      label: it.name,
                      value: it.name,
                    }))}
                  />
                </Col>
                <Col span={3}>
                  <InputNumber
                    value={ing.qty}
                    onChange={(v) => updateIng(idx, "qty", v)}
                    style={{ width: "100%" }}
                  />
                </Col>
                <Col span={3}>
                  <Select
                    value={ing.unit}
                    onChange={(v) => updateIng(idx, "unit", v)}
                    style={{ width: "100%" }}
                  >
                    {(options?.units || ["g", "kg"]).map((u) => (
                      <Select.Option key={u} value={u}>
                        {u}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={3}>
                  <InputNumber
                    value={ing.ingredientLoss}
                    onChange={(v) => updateIng(idx, "ingredientLoss", v)}
                    min={0}
                    max={100}
                    style={{ width: "100%" }}
                  />
                </Col>
                <Col span={3}>
                  <InputNumber
                    value={ing.prepLoss}
                    onChange={(v) => updateIng(idx, "prepLoss", v)}
                    min={0}
                    max={100}
                    style={{ width: "100%" }}
                  />
                </Col>
                <Col span={3}>
                  <InputNumber
                    value={ing.cookingLoss}
                    onChange={(v) => updateIng(idx, "cookingLoss", v)}
                    min={0}
                    max={100}
                    style={{ width: "100%" }}
                  />
                </Col>
                <Col span={2}>
                  <Button
                    danger
                    onClick={() =>
                      setRecipe((r) => ({ ...r, ingredients: (r.ingredients || []).filter((_, i) => i !== idx) }))
                    }
                  >
                    X
                  </Button>
                </Col>
              </Row>
            ))}

            <Button onClick={addIngredientRow}>Add Ingredient</Button>

            <Divider />

            <Title level={5}>Preparation Steps</Title>

            {(recipe.steps || []).map((s, i) => (
              <Row key={i} gutter={8} style={{ marginBottom: 8 }}>
                <Col span={16}>
                  <Input.TextArea rows={3} value={s.text} onChange={(e) => updateStep(i, "text", e.target.value)} />
                </Col>
                <Col span={4}>
                  <InputNumber value={s.time} onChange={(v) => updateStep(i, "time", v)} min={0} style={{ width: "100%" }} placeholder="min" />
                </Col>
                <Col span={4}>
                  <InputNumber value={s.temperature} onChange={(v) => updateStep(i, "temperature", v)} min={0} style={{ width: "100%" }} placeholder="°C" />
                </Col>
              </Row>
            ))}

            <Button onClick={addStep}>Add Step</Button>

            <Divider />

            <Space>
              <Button type="primary" onClick={saveRecipe}>
                Save
              </Button>
              <Button onClick={pickImg}>Pick Image</Button>
              <Button onClick={onPrint}>Print</Button>
              <Checkbox
                checked={recipe.asIngredient}
                onChange={(e) => setRecipe((r) => ({ ...r, asIngredient: e.target.checked }))}
              >
                Use as Ingredient
              </Checkbox>
            </Space>

            <Divider />

            <Text strong>Target Output Weight (g)</Text>
            <InputNumber min={0} value={targetWeight} onChange={setTargetWeight} style={{ width: "100%", marginTop: 4 }} />

            {netWeight > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  Total Net Recipe Weight: <b>{netWeight.toFixed(1)} g</b>
                </Text>
              </div>
            )}

            {recipe.image && (
              <div style={{ marginTop: 12 }}>
                <Image src={recipe.image} alt="recipe" width={180} />
              </div>
            )}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={8}>
          <Card title="Saved Recipes" style={{ borderRadius: 12 }}>
            <List
              dataSource={[...(recipes || [])].reverse()}
              renderItem={(item) => (
                <List.Item
                  onClick={() => loadRecipe(item)}
                  style={{
                    cursor: "pointer",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{item.name}</span>
                  <Button size="small">Load</Button>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
