import axios from 'axios';

/**
 * BOE Service - Búsqueda en el Boletín Oficial del Estado
 * Subastas públicas, licitaciones, herencias
 * ROI: Alto - oportunidades de inversión y adjudicaciones
 */

const BOE_API = 'https://www.boe.es/cgi-bin/';

// Mapeo de categorías BOE a profesiones
const BOE_CATEGORY_MAPPING = {
  'subastas_inmuebles': ['inversor_inmobiliario', 'promotor', 'agente_inmobiliario'],
  'subastas_negocios': ['inversor_inmobiliario', 'emprendedor'],
  'licitaciones_construccion': ['reformista', 'arquitecto', 'trabajos_verticales'],
  'licitaciones_servicios': ['consultoría', 'logistica', 'limpieza'],
  'herencias': ['notario', 'abogado'],
  'concursos_acreedores': ['asesor_financiero', 'abogado'],
};

const boeService = {
  /**
   * Buscar subastas públicas por tipo y región
   */
  async searchAuctions(auctionType, region, category = 'subastas_inmuebles') {
    try {
      // Tipos de subastas: inmuebles, negocios, vehículos, etc.
      const results = await this._searchBOEPublications(category, region, auctionType);

      console.log(`[BOE] ✅ ${results.length} subastas encontradas para "${auctionType}" en ${region}`);
      return results;
    } catch (error) {
      console.error('[BOE_AUCTIONS_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Buscar licitaciones públicas por tipo y región
   */
  async searchTenders(tenderType, region) {
    try {
      const results = await this._searchBOEPublications('licitaciones', region, tenderType);

      console.log(`[BOE] ✅ ${results.length} licitaciones encontradas para "${tenderType}" en ${region}`);
      return results;
    } catch (error) {
      console.error('[BOE_TENDERS_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Buscar por profesión en BOE
   * Mapea profesiones a categorías relevantes
   */
  async searchByProfession(profession, region) {
    try {
      const profession_lower = profession.toLowerCase();
      const allResults = [];
      const seenIds = new Set();

      // Determinar categorías BOE relevantes para esta profesión
      const relevantCategories = this._getRelevantCategories(profession_lower);

      if (relevantCategories.length === 0) {
        console.warn(`[BOE] Profesión "${profession}" no tiene categorías mapeadas`);
        return [];
      }

      // Buscar en cada categoría
      for (const category of relevantCategories) {
        const results = await this._searchBOEPublications(category, region);

        for (const result of results) {
          if (!seenIds.has(result.id)) {
            allResults.push(result);
            seenIds.add(result.id);
          }
        }

        // Delay responsable
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[BOE] ✅ ${allResults.length} oportunidades encontradas para "${profession}" en ${region}`);
      return allResults;
    } catch (error) {
      console.error('[BOE_PROFESSION_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Búsqueda interna en publicaciones BOE
   */
  async _searchBOEPublications(category, region, keyword = '') {
    try {
      // Construcción de búsqueda en BOE
      // El BOE tiene datos públicos accesibles sin autenticación
      // en: https://www.boe.es/cgi-bin/

      const searchParams = {
        p: keyword || category,
        l: region || 'es',
        d: 'DOUE|BOE', // Diarios Oficiales
        s: 'q',
        avanzada: 's'
      };

      // Mock de resultados (en producción usaría web scraping de BOE)
      const mockResults = this._generateMockAuctions(category, region, keyword);

      return mockResults;
    } catch (error) {
      console.error('[BOE_SEARCH_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Obtener categorías BOE relevantes para una profesión
   */
  _getRelevantCategories(profession) {
    const categories = [];

    // Mapear profesión a categorías BOE
    if (profession.includes('inmobiliario') || profession.includes('inversor') || profession.includes('promotor')) {
      categories.push('subastas_inmuebles', 'subastas_negocios');
    }
    if (profession.includes('reforma') || profession.includes('arquitecto') || profession.includes('construcción')) {
      categories.push('licitaciones_construccion');
    }
    if (profession.includes('abogado') || profession.includes('notario')) {
      categories.push('herencias', 'concursos_acreedores');
    }
    if (profession.includes('asesor') || profession.includes('gestor')) {
      categories.push('concursos_acreedores', 'licitaciones_servicios');
    }
    if (profession.includes('limpieza') || profession.includes('logistica')) {
      categories.push('licitaciones_servicios');
    }

    return [...new Set(categories)]; // Eliminar duplicados
  },

  /**
   * Normalizar resultado de BOE
   */
  normalizeResult(item) {
    return {
      id: item.boe_id || `boe-${item.title}`,
      title: item.title || 'Sin título',
      description: item.description || '',
      category: item.category || 'Subasta/Licitación',
      type: item.type || 'Pública',
      region: item.region || null,
      publicationDate: item.publicationDate || new Date().toISOString().split('T')[0],
      deadline: item.deadline || null,
      estimatedValue: item.estimatedValue || null,
      currency: 'EUR',
      url: item.url || null,
      contactInfo: item.contactInfo || null,
      source: 'BOE',
      relevance: item.relevance || 'media',
      addedAt: new Date().toISOString()
    };
  },

  /**
   * Generar resultados mock para demostración
   * En producción, vendrían del BOE real
   */
  _generateMockAuctions(category, region, keyword) {
    const auctions = [];
    const today = new Date();
    const deadline = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

    const mockTitles = [
      `Subasta de inmueble en ${region}`,
      `Licitación pública: ${keyword || category}`,
      `Oportunidad de negocio en ${region}`,
      `Subasta judicial - ${keyword || 'bienes'}`,
      `Concurso público - ${region}`
    ];

    const mockTypes = ['Subasta', 'Licitación', 'Concurso público'];
    const mockValues = [50000, 100000, 250000, 500000, 1000000];

    for (let i = 0; i < 3; i++) {
      const auction = {
        boe_id: `boe-${Date.now()}-${i}`,
        title: mockTitles[Math.floor(Math.random() * mockTitles.length)],
        category: category,
        type: mockTypes[Math.floor(Math.random() * mockTypes.length)],
        region: region,
        publicationDate: new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        deadline: deadline.toISOString().split('T')[0],
        estimatedValue: mockValues[Math.floor(Math.random() * mockValues.length)],
        url: `https://www.boe.es/buscar/resultados.php?id=BOE-${Math.random().toString().slice(2, 8)}`
      };

      auctions.push(this.normalizeResult(auction));
    }

    return auctions;
  }
};

export default boeService;
