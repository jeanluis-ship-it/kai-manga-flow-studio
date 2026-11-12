/**
 * MOTOR DE CIERRE E INTEGRACIÓN CON IMPRENTA (PRINT-ON-DEMAND FULFILLMENT RD)
 * Calcula costos exactos según material de papel, tipo de encuadernación, acabado de cubierta,
 * páginas y tirada, y genera la Orden de Producción (Job Ticket JSON + WhatsApp/Webhook para Imprenta).
 */

window.KAIPrintFulfillment = {
  materials: {
    interior_paper: {
      ahuesado_90g: {
        id: 'ahuesado_90g',
        name: 'Papel Ahuesado / Crema Manga 90g (Estándar Japonés)',
        caliper_mm: 0.115,
        cost_per_sheet_dop: 3.2,
        desc: 'Tacto poroso auténtico de Tankōbon, evita reflejos y resalta la tinta negra.'
      },
      bond_blanco_90g: {
        id: 'bond_blanco_90g',
        name: 'Bond Blanco Alta Blancura 90g',
        caliper_mm: 0.105,
        cost_per_sheet_dop: 2.6,
        desc: 'Económico y de alto contraste para cómics escolares o corporativos.'
      },
      couche_mate_115g: {
        id: 'couche_mate_115g',
        name: 'Satinado / Couché Mate 115g (Edición Especial / Color)',
        caliper_mm: 0.100,
        cost_per_sheet_dop: 4.8,
        desc: 'Ideal para páginas con tramas densas o ediciones de lujo.'
      }
    },
    cover_finish: {
      sulfatada_mate: {
        id: 'sulfatada_mate',
        name: 'Cartulina Sulfatada 300g + Laminado Mate Sedoso',
        base_cost_dop: 145,
        desc: 'Acabado editorial moderno resistente a huellas.'
      },
      sulfatada_brillo: {
        id: 'sulfatada_brillo',
        name: 'Cartulina Sulfatada 300g + Laminado Brillante UV',
        base_cost_dop: 135,
        desc: 'Colores vibrantes de alto impacto estilo Shonen clásico.'
      },
      kanzenban_sobrecubierta: {
        id: 'kanzenban_sobrecubierta',
        name: 'Edición Coleccionista con Solapas / Sobrecubierta',
        base_cost_dop: 290,
        desc: 'Incluye sobrecubierta removible impresa a todo color.'
      }
    }
  },

  /**
   * Cotiza en tiempo real el costo de fabricación en imprenta, margen de plataforma y precio final al cliente
   */
  calculateQuote({ pages = 64, copies = 1, paperId = 'ahuesado_90g', coverId = 'sulfatada_mate', shippingZone = 'sd_dn' }) {
    const validPages = Math.max(16, Math.ceil(pages / 4) * 4);
    const sheets = validPages / 2;
    const paper = this.materials.interior_paper[paperId] || this.materials.interior_paper.ahuesado_90g;
    const cover = this.materials.cover_finish[coverId] || this.materials.cover_finish.sulfatada_mate;

    // Regla física de encuadernación: <48 págs = Grapa Caballete; >=48 págs = Rústica Fresada (Lomo Cuadrado)
    const isTankobon = validPages >= 48;
    const bindingName = isTankobon
      ? 'Rústica Fresada (Pegado Térmico PUR/EVA con Lomo Cuadrado)'
      : 'Grapa a Caballete (2 Grapas Metálicas al Centro)';
    const bindingCostPerUnit = isTankobon ? 160 : 55;
    const spineMm = isTankobon ? Number((sheets * paper.caliper_mm + 0.5).toFixed(2)) : 0;

    // Descuento por volumen en imprenta digital (1, 10, 25, 50, 100 copias)
    const volumeDiscount =
      copies >= 100 ? 0.52 :
      copies >= 50  ? 0.58 :
      copies >= 25  ? 0.65 :
      copies >= 10  ? 0.75 : 1.0;

    const rawUnitManufacturingDop = Math.round(
      (sheets * paper.cost_per_sheet_dop + cover.base_cost_dop + bindingCostPerUnit) * volumeDiscount
    );

    // Precio de venta con margen decreciente por volumen para que sea atractivo para autores de Artist Alley
    const platformMultiplier =
      copies >= 50 ? 1.55 :
      copies >= 10 ? 1.75 : 2.35;

    const unitClientPriceDop = Math.round((rawUnitManufacturingDop * platformMultiplier) / 10) * 10;
    const shippingDop = shippingZone === 'sd_dn' ? 250 : shippingZone === 'interior_rd' ? 380 : 0;
    const totalOrderDop = unitClientPriceDop * copies + shippingDop;

    return {
      validPages,
      sheets,
      isTankobon,
      bindingName,
      spineMm,
      paper,
      cover,
      copies,
      rawUnitManufacturingDop,
      unitClientPriceDop,
      shippingDop,
      totalOrderDop,
      spreadWidthMm: Number((3 + 127 + spineMm + 127 + 3).toFixed(2)),
      spreadHeightMm: 196
    };
  },

  /**
   * Genera el Job Ticket técnico listo para enviar por Webhook o WhatsApp directo a la Imprenta Aliada en RD
   */
  generatePrinterJobTicket(projectData, quote, customerInfo) {
    const orderId = 'KAI-RD-' + Date.now().toString().slice(-6);
    const ticket = {
      order_id: orderId,
      created_at: new Date().toISOString(),
      customer: customerInfo,
      book_title: projectData?.project_title || 'PROYECTO SIN TÍTULO',
      technical_specs: {
        trim_size_mm: '127 x 190 mm',
        bleed_mm: '3 mm perimetral',
        spread_size_mm: `${quote.spreadWidthMm} x ${quote.spreadHeightMm} mm`,
        spine_width_mm: `${quote.spineMm} mm`,
        page_count: quote.validPages,
        binding_method: quote.bindingName,
        interior_paper: quote.paper.name,
        cover_finish: quote.cover.name,
        reading_direction: 'RTL (Oriental) / LTR seleccionable'
      },
      financials_dop: {
        copies: quote.copies,
        unit_price_dop: quote.unitClientPriceDop,
        shipping_dop: quote.shippingDop,
        total_charged_dop: quote.totalOrderDop,
        estimated_printer_payout_dop: quote.rawUnitManufacturingDop * quote.copies
      }
    };

    const whatsappText =
      `*ORDEN DE PRODUCCIÓN IMPRENTA — ${orderId}*\n` +
      `• *Obra:* ${ticket.book_title}\n` +
      `• *Cantidad:* ${quote.copies} ejemplar(es)\n` +
      `• *Formato:* 12.7 x 19.0 cm (${quote.validPages} págs)\n` +
      `• *Encuadernación:* ${quote.bindingName}\n` +
      `• *Medida de Lomo:* ${quote.spineMm} mm (Pliego cubierta: ${quote.spreadWidthMm} x 196 mm)\n` +
      `• *Papel Interior:* ${quote.paper.name}\n` +
      `• *Portada:* ${quote.cover.name}\n` +
      `• *Total Orden Cliente:* RD$ ${quote.totalOrderDop.toLocaleString('es-DO')}`;

    return {
      ticket,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
    };
  }
};
