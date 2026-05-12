import axios from 'axios';
import NodeCache from 'node-cache';

/**
 * Alerts Service - Automatización de alertas continuas
 * Monitorea cambios en BORME, BOE y genera alertas por email
 * ROI: Medio-Alto - detección automática de oportunidades
 */

const alertsCache = new NodeCache({ stdTTL: 86400 }); // Cache de 24 horas

// Mapeo de profesiones a palabras clave para alertas
const ALERT_KEYWORDS = {
  'agente_inmobiliario': ['inmobiliario', 'agencia inmobiliaria', 'venta inmueble', 'alquiler'],
  'inversor_inmobiliario': ['subasta inmueble', 'embargo inmobiliario', 'oportunidad inversión'],
  'reformista': ['reforma integral', 'obra nueva', 'construcción'],
  'arquitecto': ['proyecto arquitectónico', 'dirección obra', 'licencia obra'],
  'abogado': ['litigio', 'sentencia', 'concurso acreedores', 'herencia'],
  'asesor_financiero': ['asesoría tributaria', 'planificación financiera', 'subastas financieras'],
  'notario': ['escrituras', 'hipoteca', 'testamento'],
  'promotor': ['promoción inmobiliaria', 'licencia obra nueva', 'suelo disponible'],
  'limpieza': ['licitación limpieza', 'servicios limpieza', 'contrato limpieza'],
  'mudanzas': ['mudanza empresa', 'transporte logístico'],
  'logistica': ['licitación logística', 'transporte público', 'contrato logística']
};

// Configuración de alertas por profesión
const ALERT_CONFIG = {
  frequency: 'daily', // daily, weekly
  channels: ['email', 'webhook'], // email, webhook, sms
  minScore: 0.6, // Puntuación mínima para generar alerta
  retentionDays: 30 // Guardar alertas por 30 días
};

const alertsService = {
  /**
   * Crear alertas automáticas para una profesión
   */
  async createAlerts(profession, regions = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla']) {
    try {
      const alerts = [];
      const keywords = ALERT_KEYWORDS[profession.toLowerCase()] || [profession];

      // Crear una alerta por región y palabra clave
      for (const region of regions) {
        for (const keyword of keywords) {
          const alert = {
            id: `alert-${profession}-${region}-${keyword}`.replace(/\s+/g, '-').toLowerCase(),
            profession,
            region,
            keyword,
            enabled: true,
            createdAt: new Date().toISOString(),
            lastTriggeredAt: null,
            frequency: ALERT_CONFIG.frequency,
            channels: ALERT_CONFIG.channels
          };

          alerts.push(alert);
          alertsCache.set(alert.id, alert);
        }
      }

      console.log(`[ALERTS] ✅ ${alerts.length} alertas creadas para ${profession}`);
      return alerts;
    } catch (error) {
      console.error('[ALERTS_CREATE_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Buscar alertas activas
   */
  async getActiveAlerts() {
    try {
      const allKeys = alertsCache.keys();
      const alerts = allKeys
        .map(key => alertsCache.get(key))
        .filter(alert => alert && alert.enabled);

      return alerts;
    } catch (error) {
      console.error('[ALERTS_GET_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Procesar alertas y buscar nuevas oportunidades
   */
  async processAlerts(bormeService, boeService) {
    try {
      const activeAlerts = await this.getActiveAlerts();
      const triggers = [];

      console.log(`[ALERTS_PROCESSOR] Procesando ${activeAlerts.length} alertas...`);

      for (const alert of activeAlerts) {
        // Buscar en BORME
        const bormeResults = await bormeService.searchByProfession(alert.profession, alert.region);

        // Buscar en BOE
        const boeResults = await boeService.searchByProfession(alert.profession, alert.region);

        // Combinar resultados
        const allResults = [...bormeResults, ...boeResults];

        if (allResults.length > 0) {
          const trigger = {
            alertId: alert.id,
            profession: alert.profession,
            region: alert.region,
            timestamp: new Date().toISOString(),
            resultCount: allResults.length,
            results: allResults,
            severity: this._calculateSeverity(allResults.length)
          };

          triggers.push(trigger);

          // Actualizar tiempo de última trigger
          alert.lastTriggeredAt = new Date().toISOString();
          alertsCache.set(alert.id, alert);
        }

        // Delay responsable
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[ALERTS_PROCESSOR] ✅ ${triggers.length} alertas disparadas`);
      return triggers;
    } catch (error) {
      console.error('[ALERTS_PROCESS_ERROR]', error.message);
      return [];
    }
  },

  /**
   * Enviar alerta por email
   */
  async sendAlertEmail(alert, results, recipientEmail) {
    try {
      // En producción, aquí iría integración con servicio de email (SendGrid, Nodemailer, etc)
      // Por ahora generamos un objeto que sería enviado

      const emailContent = {
        to: recipientEmail,
        subject: `🚨 Alerta: ${results.length} oportunidades nuevas para ${alert.profession} en ${alert.region}`,
        html: this._generateEmailHTML(alert, results),
        timestamp: new Date().toISOString()
      };

      console.log(`[EMAIL] 📧 Alerta generada para ${recipientEmail}`);
      return emailContent;
    } catch (error) {
      console.error('[EMAIL_ERROR]', error.message);
      return null;
    }
  },

  /**
   * Calcular severidad basada en cantidad de resultados
   */
  _calculateSeverity(count) {
    if (count >= 10) return 'critical';
    if (count >= 5) return 'high';
    if (count >= 2) return 'medium';
    return 'low';
  },

  /**
   * Generar HTML para email de alerta
   */
  _generateEmailHTML(alert, results) {
    const resultsHTML = results
      .slice(0, 10) // Top 10 resultados
      .map(result => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px 8px; font-size: 13px;"><strong>${result.name || 'Sin nombre'}</strong></td>
          <td style="padding: 12px 8px; font-size: 13px;">${result.address || 'Sin dirección'}</td>
          <td style="padding: 12px 8px; font-size: 12px; color: #666;">${result.source || 'Fuente desconocida'}</td>
        </tr>
      `)
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0 0 8px 0; font-size: 20px;">🚨 Alerta de Oportunidades</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Se encontraron ${results.length} oportunidades nuevas</p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px;">📊 Profesión: <strong>${alert.profession.replace(/_/g, ' ')}</strong></h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">
            <strong>Región:</strong> ${alert.region}<br>
            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead style="background: #f0f4f8;">
              <tr>
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #475569;">Nombre</th>
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #475569;">Dirección</th>
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #475569;">Fuente</th>
              </tr>
            </thead>
            <tbody>
              ${resultsHTML}
            </tbody>
          </table>

          ${results.length > 10 ? `
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #666; font-style: italic;">
              ... y ${results.length - 10} oportunidades más disponibles en la plataforma
            </p>
          ` : ''}

          <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #333;">💡 Próximos pasos:</p>
            <ul style="margin: 4px 0 0 0; padding-left: 20px; font-size: 12px; color: #666;">
              <li>Contacta a los leads de forma inmediata</li>
              <li>Verifica la información en BORME/BOE</li>
              <li>Registra el contacto en tu CRM</li>
            </ul>
          </div>
        </div>

        <div style="text-align: center; padding: 16px; font-size: 11px; color: #999;">
          <p style="margin: 0;">Nexo Leads • Sistema de Alertas Automáticas</p>
          <p style="margin: 4px 0 0 0;">Esta es una alerta automática. Puedes desactivarla en tu panel de control.</p>
        </div>
      </div>
    `;
  },

  /**
   * Habilitar/deshabilitar alerta
   */
  async toggleAlert(alertId, enabled) {
    try {
      const alert = alertsCache.get(alertId);
      if (!alert) {
        console.warn(`[ALERTS] Alerta ${alertId} no encontrada`);
        return null;
      }

      alert.enabled = enabled;
      alertsCache.set(alertId, alert);

      console.log(`[ALERTS] Alert ${alertId} is now ${enabled ? 'enabled' : 'disabled'}`);
      return alert;
    } catch (error) {
      console.error('[ALERTS_TOGGLE_ERROR]', error.message);
      return null;
    }
  },

  /**
   * Obtener historial de alertas disparadas
   */
  async getAlertHistory(alertId, limit = 10) {
    try {
      // En una BD real, esto consultaría el historial
      // Por ahora retornamos estructura vacía
      const history = {
        alertId,
        history: []
      };

      return history;
    } catch (error) {
      console.error('[ALERTS_HISTORY_ERROR]', error.message);
      return { alertId, history: [] };
    }
  }
};

export default alertsService;
