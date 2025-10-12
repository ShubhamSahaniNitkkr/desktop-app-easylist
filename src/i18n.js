// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "Home": "Home",
            "Ingredient": "Ingredient",
            "Recipe": "Recipe",
            "Menu": "Menu",
            "Options": "Options",
            "Save": "Save",
            "New": "New",
            "Load": "Load",
            "Delete": "Delete",
            "Export": "Export",
            "Import": "Import",
            "Name": "Name",
            "Supplier": "Supplier",
            "Category": "Category",
            "Unit": "Unit",
            "Preparation loss": "Preparation loss",
            "Price per kg": "Price per kg",
            "Weight per piece (g)": "Weight per piece (g)",
            "Allergen": "Allergen",
            "Nutrition (per 100g)": "Nutrition (per 100g)",
            "Save successful": "Save successful",
            "Pick image": "Pick image"
        }
    },
    fr: {
        translation: {
            "Home": "Accueil",
            "Ingredient": "Ingrédient",
            "Recipe": "Recette",
            "Menu": "Menu",
            "Options": "Options",
            "Save": "Enregistrer",
            "New": "Nouveau",
            "Load": "Charger",
            "Delete": "Supprimer",
            "Export": "Exporter",
            "Import": "Importer",
            "Name": "Nom",
            "Supplier": "Fournisseur",
            "Category": "Catégorie",
            "Unit": "Unité",
            "Preparation loss": "Perte préparation",
            "Price per kg": "Prix / kg",
            "Weight per piece (g)": "Poids / pièce (g)",
            "Allergen": "Allergène",
            "Nutrition (per 100g)": "Valeur nutritionnelle (pour 100g)",
            "Save successful": "Enregistré avec succès",
            "Pick image": "Choisir une image"
        }
    }
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
});

export default i18n;
