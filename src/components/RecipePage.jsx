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
import { getAll, add, pickImage } from "../utils/ipc";

const { Title, Text } = Typography;

export default function RecipePage() {
  const [options, setOptions] = useState(null);
  const [ingredientsDb, setIngredientsDb] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState("");
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
      const opts = all.options || {};
      let ing = all.ingredients || [];

      // Add a test ingredient if DB empty
      if (ing.length === 0) {
        ing = [
          {
            name: "Carrot",
            unit: "g",
            category: "vegetable",
            protein: 0.9,
            carbs: 10,
            fat: 0.2,
            kcal: 41,
          },
        ];
      }

      setOptions(opts);
      setIngredientsDb(ing);
      setRecipes(all.recipes || []);
    })();
  }, []);

  function newRecipe() {
    setRecipe({
      name: "",
      category: "main",
      ingredients: [],
      steps: [],
      image: recipe.image, // preserve image
      rating: 100,
      asIngredient: false,
      youtube: "",
    });
    setTargetWeight(null);
  }

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
        const n = meta.nutrition || {};

        updated.ingredients[i].unit = meta.unit || "g";
        updated.ingredients[i].category = meta.category;

        // Losses
        updated.ingredients[i].ingredientLoss = meta.ingredientLoss || 0;
        updated.ingredients[i].prepLoss = meta.prepLoss || 0;
        updated.ingredients[i].cookingLoss = meta.cookingLoss || 0;

        // Nutrition
        updated.ingredients[i].protein = n.protein || 0;
        updated.ingredients[i].carbs = n.carbs || 0;
        updated.ingredients[i].fat = n.fats || 0;
        updated.ingredients[i].kcal = n.calories || 0;

        // ✅ ADD THESE TWO LINES
        updated.ingredients[i].supplier = meta.supplier || "";
        updated.ingredients[i].itemNumber = meta.article || "";
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

  async function saveRecipe() {
    try {
      const name = (recipe.name || "").trim();
      if (!name) return message.error("Recipe name required");

      const copy = JSON.parse(JSON.stringify(recipe));
      if (!copy.rating && copy.rating !== 0) copy.rating = 100;

      // 1️⃣ Save recipe normally
      await add("recipes", copy);

      // 2️⃣ If recipe should be used as ingredient → save into ingredients table
      if (copy.asIngredient) {
        const ingredientData = {
          name: copy.name,
          supplier: "Recipe",
          article: "",
          category: copy.category || "prepared",
          unit: "g",
          ingredientLoss: 0,
          prepLoss: 0,
          cookingLoss: 0,
          price: 0,
          weightPiece: netWeight || 0,
          weightPerLiter: null,
          tspWeight: null,
          tbspWeight: null,
          allergens: [],
          nutrition: {
            protein: Number(totals.protein) || 0,
            carbs: Number(totals.carbs) || 0,
            fats: Number(totals.fat) || 0,
            calories: Number(totals.kcal) || 0,
          },
          _fromRecipeIngredients: copy.ingredients || [],
        };

        // Save or update ingredient
        await add("ingredients", ingredientData);
      }

      message.success("Recipe saved successfully");

      const all = await getAll();
      setRecipes(all.recipes || []);
      setIngredientsDb(all.ingredients || []);

    } catch (err) {
      message.error(err.message || "Save failed");
    }
  }


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

  // ---------- Nutrient & Weight Calculations ----------
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

  const scaled = useMemo(() => {
    const ingredients = recipe.ingredients || [];
    if (ingredients.length === 0) return [];

    let baseNet = 0;
    const metaCache = {};

    // 1️⃣ First pass: compute base net weight
    for (const i of ingredients) {
      const nameKey = (i.name || "").toLowerCase();
      const meta =
        metaCache[nameKey] ||
        ingredientsDb.find((m) => m.name && m.name.toLowerCase() === nameKey);

      metaCache[nameKey] = meta;

      const gramsRaw = gramsFromUnit(i.qty || 0, i.unit, meta);
      const net = gramsRaw * netYieldFraction(i.ingredientLoss, i.prepLoss, i.cookingLoss);
      baseNet += net;
    }

    // 2️⃣ Scaling ratio (target weight)
    const ratio = targetWeight && baseNet > 0 ? Number(targetWeight) / baseNet : 1;

    // 3️⃣ Second pass: return all scaled values
    return ingredients.map((i) => {
      const meta = metaCache[(i.name || "").toLowerCase()];
      const scaledQty = (Number(i.qty) || 0) * ratio;

      // RAW weight before losses
      const rawGrams = gramsFromUnit(scaledQty, i.unit, meta);

      // Losses
      const yieldFactor = netYieldFraction(i.ingredientLoss, i.prepLoss, i.cookingLoss);

      // FINAL usable grams
      const netGrams = rawGrams * yieldFactor;

      // Nutrition per 100g RAW ingredient
      const rawProtein = meta?.nutrition?.protein || meta?.protein || 0;
      const rawCarbs = meta?.nutrition?.carbs || meta?.carbs || 0;
      const rawFat = meta?.nutrition?.fats || meta?.fat || 0;
      const rawKcal = meta?.nutrition?.calories || meta?.kcal || 0;

      // 4️⃣ Nutrients AFTER losses (correct)
      const protein = rawProtein * (netGrams / 100);
      const carbs = rawCarbs * (netGrams / 100);
      const fat = rawFat * (netGrams / 100);
      const kcal = rawKcal * (netGrams / 100);

      return {
        ...i,
        scaledQty,
        scaledInGrams: netGrams,
        protein,
        carbs,
        fat,
        kcal,
      };
    });
  }, [recipe, targetWeight, ingredientsDb, options]);


  const netWeight = useMemo(
    () => scaled.reduce((a, b) => a + (b.scaledInGrams || 0), 0),
    [scaled]
  );

  const totals = useMemo(() => {
    const p = scaled.reduce((a, b) => a + (b.protein || 0), 0);
    const c = scaled.reduce((a, b) => a + (b.carbs || 0), 0);
    const f = scaled.reduce((a, b) => a + (b.fat || 0), 0);
    const k = scaled.reduce((a, b) => a + (b.kcal || 0), 0);
    const per100 = netWeight > 0 ? 100 / netWeight : 0;
    return {
      protein: (p * per100).toFixed(1),
      carbs: (c * per100).toFixed(1),
      fat: (f * per100).toFixed(1),
      kcal: (k * per100).toFixed(1),
    };
  }, [scaled, netWeight]);

  // ---------- Printing ----------
  async function onPrint() {
    try {
      const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>${recipe.name || "Recipe"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 10px; }
          h2 { margin-top: 30px; }
          ul { line-height: 1.6; padding-left: 20px; }
          .step { margin-bottom: 10px; }
        </style>
      </head>
      <body>

        <!-- Title -->
        <h1>${recipe.name || ""}</h1>

        <!-- Ingredients -->
        <h2>Ingredients</h2>
        <ul>
          ${scaled
          .map(
            (i) =>
              `<li>${Number(i.scaledQty || 0).toFixed(2)} ${i.unit || ""} ${i.name || ""}</li>`
          )
          .join("")}
        </ul>

        <!-- Steps -->
        <!-- Steps -->
        <h2>Preparation Steps</h2>
        <div>
          ${(recipe.steps || [])
          .map(
            (s, index) =>
              `<div class="step">
                  <b>Step ${index + 1}:</b> ${s.text || ""}
                  ${s.time ? `<br><i>Time:</i> ${s.time} min` : ""}
                  ${s.temperature ? `<br><i>Temp:</i> ${s.temperature}°C` : ""}
                </div>`
          )
          .join("")}
        </div>
        <!-- Nutrition Table -->
        <h2>Nutritional Values (per 100 g)</h2>
        <p>
          Protein: ${totals.protein} g<br>
          Carbs: ${totals.carbs} g<br>
          Fat: ${totals.fat} g<br>
          Kcal: ${totals.kcal}
        </p>

      </body>
      </html>
    `;

      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
      } else {
        await printToPDF(html);
      }

      message.success("Print ready");
    } catch (err) {
      message.error("Print failed: " + (err.message || ""));
    }
  }


  function loadRecipe(r) {
    setRecipe({
      ...r,
      ...JSON.parse(r.data || "{}")
    });
    setTargetWeight(null);
  }

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

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
              <Col span={8}>
                <Text strong>Rating (%)</Text>
                <InputNumber
                  min={0}
                  max={100}
                  value={recipe.rating}
                  onChange={(v) => setRecipe((r) => ({ ...r, rating: v }))}
                  style={{ width: "100%" }}
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
                      setRecipe((r) => ({
                        ...r,
                        ingredients: (r.ingredients || []).filter((_, i) => i !== idx),
                      }))
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
              <Row key={i} gutter={8} style={{ marginBottom: 12 }}>

                {/* Description */}
                <Col span={16}>
                  <Text strong>Description</Text>
                  <Input.TextArea
                    rows={3}
                    value={s.text}
                    onChange={(e) => updateStep(i, "text", e.target.value)}
                    style={{ marginTop: 4 }}
                  />
                </Col>

                {/* Time */}
                <Col span={4}>
                  <Text strong>Time (min)</Text>
                  <InputNumber
                    value={s.time}
                    onChange={(v) => updateStep(i, "time", v)}
                    min={0}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </Col>

                {/* Temperature */}
                <Col span={4}>
                  <Text strong>Temp (°C)</Text>
                  <InputNumber
                    value={s.temperature}
                    onChange={(v) => updateStep(i, "temperature", v)}
                    min={0}
                    style={{ width: "100%", marginTop: 4 }}
                  />
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
                onChange={(e) =>
                  setRecipe((r) => ({ ...r, asIngredient: e.target.checked }))
                }
              >
                Use as Ingredient
              </Checkbox>
            </Space>

            <Divider />

            <Text strong>Target Output Weight (g)</Text>
            <InputNumber
              min={0}
              value={targetWeight}
              onChange={setTargetWeight}
              style={{ width: "100%", marginTop: 4 }}
            />

            {netWeight > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  Total Net Recipe Weight: <b>{netWeight.toFixed(1)} g</b>
                </Text>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Nutrients per 100 g → Protein: {totals.protein} g, Carbs: {totals.carbs} g,
                Fat: {totals.fat}  g, Kcal: {totals.kcal}
              </Text>
            </div>

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
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <List
              dataSource={[...(filteredRecipes || [])].reverse()}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span onClick={() => loadRecipe(item)}>{item.name}</span>

                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="small" onClick={() => loadRecipe(item)}>Load</Button>

                    <Button
                      danger
                      size="small"
                      onClick={async () => {
                        await window.api.remove("recipes", item.name);
                        const all = await window.api.getAll();
                        setRecipes(all.recipes || []);
                        message.success("Recipe deleted");
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </List.Item>

              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
