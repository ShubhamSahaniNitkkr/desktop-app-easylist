// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/app.css";
import "antd/dist/reset.css";
import "./i18n";

createRoot(document.getElementById("root")).render(<App />);
