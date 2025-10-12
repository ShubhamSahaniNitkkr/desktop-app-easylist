// src/components/HomePage.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Row, Col, Card } from "antd";

export default function HomePage({ navigate }) {
  const { t } = useTranslation();
  return (
    <div className="page">
      <h2 style={{ textAlign: "center" }}>{t("Home")}</h2>
      <div className="card-grid">
        <div
          className="big-tile tile-ingredient"
          onClick={() => navigate("ingredient")}
        >
          Ingrédient
          <br />
          Ingredient
        </div>
        <div
          className="big-tile tile-recipe"
          onClick={() => navigate("recipe")}
        >
          Recette
          <br />
          Recipe
        </div>
        <div className="big-tile tile-menu" onClick={() => navigate("menu")}>
          Menu
        </div>
        <div
          className="big-tile tile-options"
          onClick={() => navigate("options")}
        >
          Options
        </div>
      </div>
    </div>
  );
}
