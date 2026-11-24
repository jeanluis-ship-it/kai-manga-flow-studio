// Customized Crease Carousel. Use with package 0.1.0-prototype.1.
import { configurationContract as contract } from "./src/configuration.js";

// Image slots mapped to local MANGAI Studio editorial assets (/landing/assets/mangai-art-*.svg).
const images = {
  // Left page 1: 1182 × 1330 px. Alt text: imageAlt.0
  "imageUrls.0": "/landing/assets/mangai-art-12.svg",
  // Right page 1: 1182 × 1330 px. Alt text: rightImageAlt.0
  "rightImageUrls.0": "/landing/assets/mangai-art-19.svg",
  // Left page 2: 1182 × 1330 px. Alt text: imageAlt.1
  "imageUrls.1": "/landing/assets/mangai-art-21.svg",
  // Right page 2: 1182 × 1330 px. Alt text: rightImageAlt.1
  "rightImageUrls.1": "/landing/assets/mangai-art-22.svg",
  // Left page 3: 1182 × 1330 px. Alt text: imageAlt.2
  "imageUrls.2": "/landing/assets/mangai-art-14.svg",
  // Right page 3: 1182 × 1330 px. Alt text: rightImageAlt.2
  "rightImageUrls.2": "/landing/assets/mangai-art-20.svg",
  // Left page 4: 1182 × 1330 px. Alt text: imageAlt.3
  "imageUrls.3": "/landing/assets/mangai-art-16.svg",
  // Right page 4: 1182 × 1330 px. Alt text: rightImageAlt.3
  "rightImageUrls.3": "/landing/assets/mangai-art-15.svg",
  // Left page 5: 1600 × 900 px (16:9). Alt text: imageAlt.4
  "imageUrls.4": "/landing/assets/mangai-art-18.svg",
  // Right page 5: 1600 × 900 px (16:9). Alt text: rightImageAlt.4
  "rightImageUrls.4": "/landing/assets/mangai-art-17.svg",
  // Left page 6: 1600 × 900 px (16:9). Alt text: imageAlt.5
  "imageUrls.5": "/landing/assets/mangai-art-13.svg",
  // Right page 6: 1600 × 900 px (16:9). Alt text: rightImageAlt.5
  "rightImageUrls.5": "/landing/assets/mangai-art-11.svg",
  // Left page 7: 1600 × 900 px (16:9). Alt text: imageAlt.6
  "imageUrls.6": "/landing/assets/mangai-art-06.svg",
  // Right page 7: 1600 × 900 px (16:9). Alt text: rightImageAlt.6
  "rightImageUrls.6": "/landing/assets/mangai-art-08.svg",
  // Left page 8: 1600 × 900 px (16:9). Alt text: imageAlt.7
  "imageUrls.7": "/landing/assets/mangai-art-09.svg",
  // Right page 8: 1600 × 900 px (16:9). Alt text: rightImageAlt.7
  "rightImageUrls.7": "/landing/assets/mangai-art-10.svg",
};

const saved = {
  "mediaProvenance": [],
  "assetId": "crease-carousel",
  "assetVersion": "0.1.0-prototype.1",
  "configurationSchemaVersion": 1,
  "values": {
    "schemaVersion": 1,
    "cardCount": 4,
    "cardWidth": 1280,
    "cardHeight": 720,
    "cornerRadius": 12,
    "curl": 60,
    "duration": 0.9,
    "autoplay": false,
    "interval": 4,
    "showDots": true,
    "mediaIds": [
      "crease-tweaky-hello",
      "crease-tweaky-still",
      "crease-tweaky-flamingo",
      "crease-tweaky-dance",
      "crease-spread-tangerine-dunes",
      "crease-spread-jungle-leaves",
      "crease-spread-lemon-kites",
      "crease-spread-crimson-city"
    ],
    "rightMediaIds": [
      "crease-tweaky-giggles",
      "crease-tweaky-owl",
      "crease-tweaky-sorry",
      "crease-tweaky-together",
      "crease-spread-cobalt-wave",
      "crease-spread-magenta-planet",
      "crease-spread-teal-whale",
      "crease-spread-violet-aurora"
    ],
    "rightImageUrls": [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ],
    "rightImageAlt": [
      "Duelo en la Selva — Página derecha 1",
      "Edición Coleccionista Tankōbon — Página derecha 2",
      "La Brújula Astral — Página derecha 3",
      "Frecuencia Desconocida — Página derecha 4",
      "Lámina de Portada Kuro — Página derecha 5",
      " Sello Imperial — Página derecha 6",
      "Señal Nocturna — Página derecha 7",
      "Ruptura del Eclipse — Página derecha 8"
    ],
    "rightFocalX": [
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50
    ],
    "rightFocalY": [
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50
    ],
    "imageUrls": [
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
      "El Despertar de Quisqueya — Página izquierda 1",
      "Settei de Personaje Canon — Página izquierda 2",
      "Archivo de Cartografía Arcana — Página izquierda 3",
      "Transmisión en el Distrito Cero — Página izquierda 4",
      "Los Silencios También Gritan — Página izquierda 5",
      "Cuaderno de Campo — Página izquierda 6",
      "Flor Guerrera — Página izquierda 7",
      "Vigilia del Centinela — Página izquierda 8"
    ],
    "focalX": [
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
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50
    ],
    "ariaLabel": "Visor interactivo Crease Carousel de MANGAI"
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
