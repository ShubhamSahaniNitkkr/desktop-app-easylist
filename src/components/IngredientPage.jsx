// src/components/IngredientPage.jsx
import React, { useEffect, useState } from "react";
import {
  Input,
  Select,
  Button,
  Row,
  Col,
  Form,
  InputNumber,
  message,
} from "antd";
import { useTranslation } from "react-i18next";
import { getAll, add, update, queryIngredients, pickImage } from "../utils/ipc";

const { Option } = Select;

export default function IngredientPage() {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [form] = Form.useForm();
  const [imageData, setImageData] = useState("");

  useEffect(() => {
    (async () => {
      const all = await getAll();
      setOptions(all.options || {});
      setIngredients(all.ingredients || []);
    })();
  }, []);

  async function onSave() {
    try {
      const values = await form.validateFields();
      // name validation
      if (!values.name) return message.error("Name required");
      const obj = {
        name: values.name,
        supplier: values.supplier || "",
        article: values.article || "",
        category: values.category || options?.categories?.[0] || "",
        unit: values.unit || options?.units?.[0] || "g",
        prepLoss: values.prepLoss || 0,
        price: Number(values.price || 0),
        weightPiece: Number(values.weightPiece || 0),
        allergen: values.allergen || "",
        image: imageData || "",
      };
      // check duplicate
      const existing = (await getAll()).ingredients.find(
        (i) => i.name.toLowerCase() === obj.name.toLowerCase()
      );
      if (existing) {
        await update("ingredients", existing.id, obj);
        message.success(t("Save successful"));
      } else {
        await add("ingredients", obj);
        message.success(t("Save successful"));
      }
      const all = await getAll();
      setIngredients(all.ingredients || []);
    } catch (e) {
      message.error(e.message || "Error");
    }
  }

  async function onPickImage() {
    const res = await pickImage();
    if (!res.canceled) {
      setImageData(res.data);
      message.success("Image attached");
    }
  }

  async function onQuery(q) {
    const list = await queryIngredients(q);
    setIngredients(list);
  }

  return (
    <div className="page">
      <h2>{t("Ingredient")}</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 540 }} className="list">
          <Form form={form} layout="vertical">
            <Form.Item
              label={t("Name")}
              name="name"
              rules={[{ required: true }]}
            >
              <Input onChange={(e) => onQuery(e.target.value)} />
            </Form.Item>

            <Form.Item label={t("Supplier")} name="supplier">
              <Input list="suppliers" />
            </Form.Item>

            <datalist id="suppliers">
              {(options?.suppliers || []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={t("Category")} name="category">
                  <Select>
                    {(options?.categories || []).map((c) => (
                      <Option key={c} value={c}>
                        {c}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={t("Unit")} name="unit">
                  <Select>
                    {(options?.units || []).map((u) => (
                      <Option key={u} value={u}>
                        {u}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label={t("Preparation loss")} name="prepLoss">
                  <InputNumber min={0} max={100} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Price per kg")} name="price">
                  <InputNumber min={0} step={0.01} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={t("Weight per piece (g)")} name="weightPiece">
                  <InputNumber min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label={t("Allergen")} name="allergen">
              <Select>
                {(options?.allergens || []).map((a) => (
                  <Option key={a} value={a}>
                    {a}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                onClick={() => {
                  form.resetFields();
                  setImageData("");
                }}
              >
                {t("New")}
              </Button>
              <Button type="primary" onClick={onSave}>
                {t("Save")}
              </Button>
              <Button onClick={onPickImage}>{t("Pick image")}</Button>
            </div>
          </Form>
        </div>

        <div style={{ flex: 1 }} className="list">
          <h4>Ingredients</h4>
          <Input.Search
            placeholder="Search ingredients"
            onChange={(e) => onQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div>
            {(ingredients || []).map((i) => (
              <div
                key={i.id}
                style={{
                  padding: "8px 6px",
                  borderBottom: "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <div style={{ opacity: 0.7 }}>
                    {i.category} • {i.unit} • {i.supplier}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    onClick={() =>
                      form.setFieldsValue({
                        name: i.name,
                        supplier: i.supplier,
                        article: i.article,
                        category: i.category,
                        unit: i.unit,
                        prepLoss: i.prepLoss,
                        price: i.price,
                        weightPiece: i.weightPiece,
                        allergen: i.allergen,
                      })
                    }
                  >
                    Load
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
