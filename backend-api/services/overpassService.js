import axios from 'axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Mapeo de profesiones a queries de Overpass
const PROFESSION_TAGS = {
  'hospitales': 'amenity=hospital',
  'hoteles': 'tourism=hotel',
  'museos': 'tourism=museum',
  'estadios': 'leisure=stadium',
  'constructoras': 'shop=doityourself OR craft=carpenter',
  'polideportivos': 'leisure=sports_centre',
  'naves_industriales': 'building=industrial',
  'comunidades_vecinos': 'amenity=community_centre',
  'bancos': 'amenity=bank',
  'farmacias': 'amenity=pharmacy',
  'restaurantes': 'amenity=restaurant',
  'agencias_inmobiliarias': 'office=real_estate'
};

const overpassService = {
  async searchByProfession(profession, city) {
    try {
      const tag = PROFESSION_TAGS[profession.toLowerCase()] || profession;

      // Construir query Overpass en OverpassQL
      // [bbox] para obtener área de búsqueda de la ciudad
      const query = `
        [out:json];
        (
          node["${tag}"](area.searchArea);
          way["${tag}"](area.searchArea);
          relation["${tag}"](area.searchArea);
        );
        out center;
      `;

      // En Overpass, necesitamos geocodificar la ciudad primero
      // Usamos Nominatim para obtener bbox de la ciudad
      const bbox = await this._getCityBbox(city);

      if (!bbox) {
        console.warn(`[OVERPASS] No se encontró bbox para ciudad: ${city}`);
        return [];
      }

      // Query mejorada con bbox
      const improvedQuery = `
        [out:json];
        (
          node["${tag}"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
          way["${tag}"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
          relation["${tag}"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
        );
        out center;
      `;

      const response = await axios.post(OVERPASS_API, improvedQuery, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.elements.length === 0) {
        console.warn(`[OVERPASS] Sin resultados para ${profession} en ${city}`);
        return [];
      }

      // Parsear resultados
      const results = response.data.elements
        .filter(el => el.tags && el.tags.name)
        .map(el => ({
          id: el.id,
          name: el.tags.name,
          phone: el.tags.phone || null,
          website: el.tags.website || el.tags.url || null,
          address: this._buildAddress(el.tags),
          city: city,
          lat: el.center?.lat || el.lat,
          lon: el.center?.lon || el.lon,
          tags: el.tags
        }));

      console.log(`[OVERPASS] ✅ ${results.length} resultados para ${profession} en ${city}`);
      return results;
    } catch (error) {
      console.error('[OVERPASS_ERROR]', error.message);
      return [];
    }
  },

  async _getCityBbox(city) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          city: city,
          country: 'Spain', // Asumir España por ahora
          format: 'json'
        },
        timeout: 10000
      });

      if (response.data.length === 0) {
        return null;
      }

      const firstResult = response.data[0];
      const bbox = firstResult.boundingbox; // [minLat, maxLat, minLon, maxLon]

      return {
        minLat: parseFloat(bbox[0]),
        maxLat: parseFloat(bbox[1]),
        minLon: parseFloat(bbox[2]),
        maxLon: parseFloat(bbox[3])
      };
    } catch (error) {
      console.error('[NOMINATIM_ERROR]', error.message);
      return null;
    }
  },

  _buildAddress(tags) {
    const parts = [];
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    if (tags['addr:city']) parts.push(tags['addr:city']);

    return parts.length > 0 ? parts.join(', ') : 'Dirección no disponible';
  }
};

export default overpassService;
