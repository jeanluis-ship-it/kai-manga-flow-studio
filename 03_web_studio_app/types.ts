// Versión Mejorada y Auditada del código React/TSX de tu referencia en Google Flow
// Corrige:
// 1. Persistencia en localStorage (el original perdía todo al recargar por usar solo useState).
// 2. Validación física de encuadernación (<48 págs = Grapa Caballete; >=48 págs = Rústica/KDP con lomo).
// 3. Paso 5 de Cierre Físico (Fulfillment): Cotización en vivo por material de papel, portada y tirada + envío de Job Ticket a imprenta.

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';

export type PaperType = 'ahuesado_90g' | 'bond_blanco_90g' | 'couche_mate_115g';
export type CoverFinish = 'sulfatada_mate' | 'sulfatada_brillo' | 'kanzenban_sobrecubierta';
export type StudioView = 'project' | 'characters' | 'cover' | 'pages' | 'fulfillment';

export interface Character {
  id: string;
  name: string;
  prompt: string;
  referenceMediaId?: string;
  base64?: string;
}

export interface MangaPage {
  id: string;
  base64: string;
  prompt: string;
  artStyle: string;
  castIds: string[];
  dialogues: string[];
}

export interface Project {
  name: string;
  author: string;
  pageCount: number;
  paperType: PaperType;
  coverFinish: CoverFinish;
  copies: number;
  characters: Character[];
  pages: MangaPage[];
  cover: {
    frontBase64: string;
    backBase64: string;
    fullWrapBase64?: string;
    prompt: string;
    spineWidthInches: number;
    spineWidthMm: number;
  };
}
