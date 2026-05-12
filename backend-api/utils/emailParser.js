/**
 * Email Parser - Procesar emails de Google Alerts y extraer leads
 * Transforma notificaciones de email en registros estructurados
 */

const emailParser = {
  /**
   * Parsear email de Google Alerts y extraer información
   */
  parseGoogleAlert(emailContent, subject) {
    try {
      const alert = {
        source: 'google_alerts',
        subject,
        timestamp: new Date().toISOString(),
        keywords: this._extractKeywords(subject),
        articles: this._extractArticles(emailContent),
        links: this._extractLinks(emailContent)
      };

      return alert;
    } catch (error) {
      console.error('[EMAIL_PARSE_ERROR]', error.message);
      return null;
    }
  },

  /**
   * Extraer palabras clave del asunto del email
   */
  _extractKeywords(subject) {
    // Patrón típico: Google Alerts: "palabra clave" (n new results)
    const match = subject.match(/"([^"]+)"/);
    return match ? [match[1]] : [];
  },

  /**
   * Extraer artículos/resultados del cuerpo del email
   */
  _extractArticles(content) {
    const articles = [];

    // Buscar patrones de enlaces típicos de Google Alerts
    // Patrón: [Título](URL) - Fuente
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)[^-]*-\s*([^\n]+)/g;
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      articles.push({
        title: match[1].trim(),
        url: match[2].trim(),
        source: match[3].trim(),
        extractedAt: new Date().toISOString()
      });
    }

    return articles;
  },

  /**
   * Extraer todos los enlaces del email
   */
  _extractLinks(content) {
    const links = [];
    const urlPattern = /https?:\/\/[^\s)]+/g;
    let match;

    while ((match = urlPattern.exec(content)) !== null) {
      const url = match[0];
      if (!links.includes(url)) {
        links.push(url);
      }
    }

    return links;
  },

  /**
   * Convertir articulo de email a lead estructurado
   */
  articleToLead(article, profession, region) {
    return {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: article.title,
      source: 'Google Alerts',
      profession,
      region,
      url: article.url,
      newsSource: article.source,
      description: `Encontrado en: ${article.source}`,
      discoveredAt: article.extractedAt,
      verified: false,
      relevanceScore: this._calculateRelevance(article.title, profession)
    };
  },

  /**
   * Calcular puntuación de relevancia del artículo
   */
  _calculateRelevance(title, profession) {
    let score = 0.5; // Puntuación base

    // Palabras clave de alta relevancia
    const highRelevance = ['contacto', 'nuevo', 'proyecto', 'empresa', 'servicios', 'solicita'];
    const mediumRelevance = ['anuncio', 'noticia', 'publicación'];

    const titleLower = title.toLowerCase();

    // Aumentar score por palabras clave
    highRelevance.forEach(word => {
      if (titleLower.includes(word)) score += 0.2;
    });

    mediumRelevance.forEach(word => {
      if (titleLower.includes(word)) score += 0.1;
    });

    // Aumentar score si contiene profesión
    if (titleLower.includes(profession.replace(/_/g, ' '))) {
      score += 0.3;
    }

    return Math.min(score, 1.0); // Capped a 1.0
  },

  /**
   * Agrupar múltiples emails por palabra clave
   */
  groupAlertsByKeyword(emails) {
    const grouped = {};

    emails.forEach(email => {
      const keywords = email.keywords || [];
      keywords.forEach(keyword => {
        if (!grouped[keyword]) {
          grouped[keyword] = [];
        }
        grouped[keyword].push(email);
      });
    });

    return grouped;
  },

  /**
   * Detectar duplicados entre alertas
   */
  detectDuplicates(articles) {
    const seen = new Set();
    const duplicates = [];

    articles.forEach((article, index) => {
      const key = `${article.url}`;
      if (seen.has(key)) {
        duplicates.push(index);
      }
      seen.add(key);
    });

    return duplicates;
  },

  /**
   * Validar que un email sea de Google Alerts
   */
  isGoogleAlert(subject, from) {
    return (
      subject && subject.includes('Google Alerts') &&
      from && (from.includes('noreply@google.com') || from.includes('googlealerts'))
    );
  }
};

export default emailParser;
