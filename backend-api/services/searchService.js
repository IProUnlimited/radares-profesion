import overpassService from './overpassService.js';
import gmapsService from './gmapsService.js';
import cacheService from './cacheService.js';

const searchService = {
  // Búsqueda básica sin reviews (más rápida)
  async searchLeads({ profession, city, category }) {
    // Verificar cache
    const cacheKey = `search:${profession}:${city}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] Hit: ${cacheKey}`);
      return cached;
    }

    try {
      // 1. Buscar en Overpass/OSM
      const osmResults = await overpassService.searchByProfession(profession, city);

      if (osmResults.length === 0) {
        return [];
      }

      // 2. Enriquecer con datos básicos
      const enriched = osmResults.map(item => ({
        id: item.id,
        name: item.name,
        address: item.address,
        phone: item.phone,
        website: item.website,
        city: item.city,
        category: profession,
        source: 'OpenStreetMap',
        addedAt: new Date().toISOString()
      }));

      // Cachear resultado
      cacheService.set(cacheKey, enriched, 3600); // 1 hora

      return enriched;
    } catch (error) {
      console.error('[SEARCH_ERROR]', error.message);
      throw error;
    }
  },

  // Búsqueda completa con reviews de Google Maps
  async searchLeadsWithReviews({ profession, city }) {
    // Verificar cache (cache más corto para reviews)
    const cacheKey = `search-reviews:${profession}:${city}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] Hit: ${cacheKey}`);
      return cached;
    }

    try {
      // 1. Buscar en Overpass/OSM
      const osmResults = await overpassService.searchByProfession(profession, city);

      if (osmResults.length === 0) {
        return [];
      }

      // 2. Enriquecer con reviews de Google Maps (con delays responsables)
      const withReviews = [];

      for (let i = 0; i < osmResults.length; i++) {
        const item = osmResults[i];

        // Scrape de Google Maps con delay responsable
        const reviews = await gmapsService.fetchGoogleReviews(
          item.name,
          city,
          2000 // delay 2 segundos entre requests
        );

        withReviews.push({
          id: item.id,
          name: item.name,
          address: item.address,
          phone: item.phone,
          website: item.website,
          city: item.city,
          category: profession,
          source: 'OpenStreetMap + Google Maps',
          rating: reviews.rating || null,
          reviewCount: reviews.count || 0,
          recentReviews: reviews.recent || [],
          addedAt: new Date().toISOString()
        });

        // Delay responsable cada 3 items
        if ((i + 1) % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Cachear resultado (10 minutos para reviews, cambian más)
      cacheService.set(cacheKey, withReviews, 600);

      return withReviews;
    } catch (error) {
      console.error('[SEARCH_REVIEWS_ERROR]', error.message);
      throw error;
    }
  }
};

export default searchService;
