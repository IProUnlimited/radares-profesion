import axios from 'axios';

/**
 * Directory Scraper Service - Web scraping responsable de directorios públicos
 * Fuentes: Páginas Amarillas, Kompass, Cámaras de Comercio
 * ROI: Medio-Alto - cobertura de empresas con presencia online
 */

// Fuentes de directorios disponibles
const DIRECTORY_SOURCES = {
  yellowpages: {
    name: 'Páginas Amarillas',
    baseUrl: 'https://www.paginasamarillas.es',
    delay: 2000, // 2 segundos entre requests (responsable)
    respectsRobots: true
  },
  kompass: {
    name: 'Kompass (Directorio Europeo)',
    baseUrl: 'https://es.kompass.com',
    delay: 2000,
    respectsRobots: true
  },
  google_business: {
    name: 'Google Business',
    baseUrl: 'https://business.google.com',
    delay: 1000,
    respectsRobots: true
  }
};

// Mapeo de profesiones a palabras clave en directorios
const DIRECTORY_KEYWORDS = {
  'agente_inmobiliario': ['agente inmobiliario', 'inmobiliario'],
  'reformista': ['reformas', 'reforma integral', 'obras'],
  'arquitecto': ['arquitecto', 'estudio arquitectura'],
  'carpinteria': ['carpintería', 'carpintero'],
  'electricista': ['electricista', 'instalaciones eléctricas'],
  'fontaneria': ['fontanería', 'fontanero'],
  'jardineria': ['jardinería', 'jardinero', 'paisajismo'],
  'abogado': ['abogado', 'asesoramiento legal'],
  'limpieza': ['limpieza', 'empresa limpieza'],
  'mudanzas': ['mudanzas', 'empresa mudanzas'],
  'veterinario': ['veterinario', 'clínica veterinaria'],
  'peluqueria': ['peluquería', 'peluquero'],
  'logistica': ['logística', 'transporte logístico'],
  'decorador': ['decoración', 'decorador', 'interiorismo'],
};

const directoryScraperService = {
  /**
   * Buscar profesionales por profesión, ciudad y directorio
   */
  async searchByProfession(profession, city, source = 'yellowpages') {
    try {
      const sourceConfig = DIRECTORY_SOURCES[source];

      if (!sourceConfig) {
        console.warn(`[DIRECTORY] Fuente "${source}" no soportada`);
        return [];
      }

      const keywords = DIRECTORY_KEYWORDS[profession.toLowerCase()] || [profession];

      console.log(`[DIRECTORY] Buscando "${profession}" en ${city} desde ${sourceConfig.name}`);

      // Búsqueda simultánea con múltiples keywords
      const allResults = [];
      const seenIds = new Set();

      for (const keyword of keywords) {
        const results = await this._searchDirectory(
          sourceConfig,
          keyword,
          city
        );

        // Evitar duplicados
        for (const result of results) {
          const id = `${result.name}-${result.city}`;
          if (!seenIds.has(id)) {
            allResults.push(result);
            seenIds.add(id);
          }
        }

        // Delay responsable entre requests
        await this._delay(sourceConfig.delay);
      }

      console.log(`[DIRECTORY] ✅ ${allResults.length} resultados encontrados`);
      return allResults;
    } catch (error) {
      console.error('[DIRECTORY_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Búsqueda interna en un directorio específico
   */
  async _searchDirectory(sourceConfig, keyword, city) {
    try {
      // Construcción de URL de búsqueda
      const searchUrl = this._buildSearchUrl(sourceConfig.baseUrl, keyword, city);

      // En producción, aquí iría el código de web scraping con cheerio
      // Por ahora generamos resultados mock que seguirán la estructura correcta
      const mockResults = this._generateMockResults(keyword, city, sourceConfig.name);

      return mockResults;
    } catch (error) {
      console.error('[DIRECTORY_SEARCH_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Construir URL de búsqueda
   */
  _buildSearchUrl(baseUrl, keyword, city) {
    // Ejemplo para Páginas Amarillas
    // https://www.paginasamarillas.es/search/reformas/Madrid
    const encodedKeyword = encodeURIComponent(keyword);
    const encodedCity = encodeURIComponent(city);
    return `${baseUrl}/search/${encodedKeyword}/${encodedCity}`;
  },

  /**
   * Delay responsable entre requests
   */
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Normalizar resultado de directorio
   */
  normalizeResult(item) {
    return {
      id: item.id || `dir-${item.name}`,
      name: item.name || 'Sin nombre',
      address: item.address || null,
      city: item.city || null,
      phone: item.phone || null,
      website: item.website || null,
      email: item.email || null,
      businessType: item.businessType || null,
      rating: item.rating || null,
      reviewCount: item.reviewCount || 0,
      source: 'Directory',
      directorySource: item.directorySource || 'Público',
      verificationStatus: 'no_verificado', // Los directorios públicos no siempre están verificados
      addedAt: new Date().toISOString()
    };
  },

  /**
   * Generar resultados mock para demostración
   * En producción, estos vendrían de web scraping real
   */
  _generateMockResults(keyword, city, sourceName) {
    const results = [];
    const mockNames = [
      `${keyword} ${city}`,
      `Empresa ${keyword}`,
      `Profesional ${keyword}`,
      `Servicios ${keyword}`,
      `Centro ${keyword}`
    ];

    const mockAddresses = [
      `Calle Mayor, 123, ${city}`,
      `Avenida Principal, 456, ${city}`,
      `Plaza Central, 789, ${city}`,
      `Paseo de la Paz, 321, ${city}`
    ];

    // Generar 2-5 resultados mock
    const count = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < count; i++) {
      const item = {
        id: `${sourceName}-${keyword}-${i}`,
        name: mockNames[Math.floor(Math.random() * mockNames.length)],
        address: mockAddresses[Math.floor(Math.random() * mockAddresses.length)],
        city: city,
        phone: `+34${Math.floor(Math.random() * 900000000)}`,
        website: null,
        businessType: keyword,
        directorySource: sourceName,
        rating: Math.floor(Math.random() * 5) + 1
      };

      results.push(this.normalizeResult(item));
    }

    return results;
  },

  /**
   * Obtener listado de fuentes disponibles
   */
  getAvailableSources() {
    return Object.keys(DIRECTORY_SOURCES).map(key => ({
      id: key,
      name: DIRECTORY_SOURCES[key].name,
      baseUrl: DIRECTORY_SOURCES[key].baseUrl
    }));
  }
};

export default directoryScraperService;
