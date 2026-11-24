// Customized Pinwheel Gallery. Use with package 0.1.0-prototype.1.
import { configurationContract as contract } from "./src/configuration.js";

// Image slots mapped to local MANGAI Studio editorial covers (/landing/assets/mangai-art-*.svg).
const images = {
  // Image 1: AnaCaona: Flor Guerrera
  "imageUrls.0": "/landing/assets/mangai-art-06.svg",
  // Image 2: Atlas: Mapas del Olvido
  "imageUrls.1": "/landing/assets/mangai-art-07.svg",
  // Image 3: Nox / Signal
  "imageUrls.2": "/landing/assets/mangai-art-08.svg",
  // Image 4: Kuro: Peso del Silencio
  "imageUrls.3": "/landing/assets/mangai-art-09.svg",
  // Image 5: Crónicas del Eclipse
  "imageUrls.4": "/landing/assets/mangai-art-10.svg",
  // Image 6: Akai: Filo Carmesí
  "imageUrls.5": "/landing/assets/mangai-art-01.svg",
  // Image 7: Kaze: Órbita Cero
  "imageUrls.6": "/landing/assets/mangai-art-02.svg",
  // Image 8: Yōkai: Archivo Nocturno
  "imageUrls.7": "/landing/assets/mangai-art-03.svg",
  // Image 9: Sensei: Tinta Viva
  "imageUrls.8": "/landing/assets/mangai-art-04.svg",
  // Image 10: Hijos del Huracán
  "imageUrls.9": "/landing/assets/mangai-art-05.svg",
};

const saved = {
  "mediaProvenance": [],
  "assetId": "pinwheel-gallery",
  "assetVersion": "0.1.0-prototype.1",
  "configurationSchemaVersion": 1,
  "values": {
    "imageCount": 10,
    "panels": 10,
    "panelWidth": 340,
    "panelHeight": 280,
    "hub": 24,
    "bend": 30,
    "corners": 12,
    "shade": 35,
    "perspective": 50,
    "entranceTime": 3.6,
    "scrollResponse": 100,
    "pull": 70,
    "lean": 50,
    "pointerSpin": 6,
    "mediaIds": [
      "chrome-blue-profile",
      "tangerine-signal",
      "chrome-silver-still",
      "sport-boxing",
      "citrus-rings",
      "chrome-black-portrait",
      "studio-blue-knot",
      "orbe-amber",
      "frequency-artist-static",
      "sport-basketball-detail"
    ],
    "imageUrls": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "imageAlt": [
      "Portada conceptual: AnaCaona: Flor Guerrera",
      "Portada conceptual: Atlas: Mapas del Olvido",
      "Portada conceptual: Nox / Signal",
      "Portada conceptual: Kuro: Peso del Silencio",
      "Portada conceptual: Crónicas del Eclipse",
      "Portada conceptual: Akai: Filo Carmesí",
      "Portada conceptual: Kaze: Órbita Cero",
      "Portada conceptual: Yōkai: Archivo Nocturno",
      "Portada conceptual: Sensei: Tinta Viva",
      "Portada conceptual: Hijos del Huracán"
    ],
    "focalX": [
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50
    ],
    "focalY": [
      40,
      40,
      40,
      40,
      40,
      40,
      40,
      40,
      40,
      40
    ],
    "ariaLabel": "Pinwheel gallery de tomos MANGAI"
  }
};
if (saved.assetId !== contract.templateId || saved.configurationSchemaVersion !== contract.schemaVersion) throw new Error("Settings do not match this asset configuration contract.");
const values = contract.normalize(saved.values);
if (JSON.stringify(values) !== JSON.stringify(saved.values)) throw new Error("Settings are invalid for this package. Export them again.");
for (const [key, path] of Object.entries(images)) {
  const parts = key.split(".");
  parts.slice(0, -1).reduce((owner, part) => owner[part], values)[parts.at(-1)] = path;
}
const configured = contract.normalize(values);
// A path this package does not accept leaves the slot on its built-in placeholder.
if (typeof document !== "undefined") for (const key of Object.keys(images)) {
  if (!key.split(".").reduce((value, part) => value?.[part], configured)) console.warn(`${key}: this image path is not supported, so the slot shows its built-in placeholder. Use a path such as "/images/hero.jpg" or an http(s) URL.`);
}
export default contract.toRuntimeOptions(configured);
