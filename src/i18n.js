// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "Home": "Home", "Ingredient": "Ingredient", "Recipe": "Recipe", "Menu": "Menu", "Options": "Options",
            "Name": "Name", "Supplier": "Supplier", "Category": "Category", "Unit": "Unit", "Preparation loss": "Preparation loss",
            "Price per kg": "Price per kg", "Weight per piece (g)": "Weight per piece (g)", "Allergen": "Allergen",
            "Save successful": "Saved", "Pick image": "Pick image", "Save": "Save", "New": "New", "Load": "Load",
            "Default Language": "Default Language", "Currency symbol": "Currency symbol", "Categories": "Categories", "Suppliers": "Suppliers",
            "Apply": "Apply"
        }
    },
    fr: {
        translation: {
            "Home": "Accueil", "Ingredient": "Ingrédient", "Recipe": "Recette", "Menu": "Menu", "Options": "Options",
            "Name": "Nom", "Supplier": "Fournisseur", "Category": "Catégorie", "Unit": "Unité", "Preparation loss": "Perte préparation",
            "Price per kg": "Prix / kg", "Weight per piece (g)": "Poids / pièce (g)", "Allergen": "Allergène",
            "Save successful": "Enregistré", "Pick image": "Choisir une image", "Save": "Enregistrer", "New": "Nouveau", "Load": "Charger",
            "Default Language": "Langue par défaut", "Currency symbol": "Symbole devise", "Categories": "Catégories", "Suppliers": "Fournisseurs",
            "Apply": "Appliquer"
        }
    }
};

i18n.use(initReactI18next).init({ resources, lng: 'fr', fallbackLng: 'fr', interpolation: { escapeValue: false } });
export default i18n;
