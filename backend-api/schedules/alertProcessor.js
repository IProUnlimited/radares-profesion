/**
 * Alert Processor - Procesa alertas automáticas cada 6 horas
 * Se ejecuta en background para monitorear continuamente
 *
 * INSTALACIÓN:
 * 1. npm install node-schedule
 * 2. Importar en server.js y ejecutar startAlertProcessor()
 * 3. El scheduler procesará alertas cada 6 horas automáticamente
 */

import schedule from 'node-schedule';
import alertsService from '../services/alertsService.js';
import bormeService from '../services/bormeService.js';
import boeService from '../services/boeService.js';

let isProcessing = false;

/**
 * Iniciar el procesador de alertas
 * Se ejecuta cada 6 horas automáticamente
 */
export function startAlertProcessor() {
  console.log('[ALERT_PROCESSOR] Iniciando procesador de alertas...');

  // Ejecutar cada 6 horas (a las 0:00, 6:00, 12:00, 18:00 UTC)
  // Patrón cron: minuto hora * * *
  const cronPattern = '0 */6 * * *';

  const job = schedule.scheduleJob(cronPattern, async () => {
    if (isProcessing) {
      console.log('[ALERT_PROCESSOR] ⏳ Proceso anterior aún en ejecución, saltando...');
      return;
    }

    isProcessing = true;
    try {
      await processAllAlerts();
    } catch (error) {
      console.error('[ALERT_PROCESSOR_ERROR]', error.message);
    } finally {
      isProcessing = false;
    }
  });

  console.log(`✅ Alert Processor iniciado - próxima ejecución en: ${job.nextInvocation().toString()}`);
  return job;
}

/**
 * Procesar todas las alertas activas
 */
async function processAllAlerts() {
  const startTime = Date.now();
  console.log(`\n[ALERT_PROCESSOR] 🔄 Iniciando procesamiento de alertas...`);

  try {
    // Obtener alertas activas
    const activeAlerts = await alertsService.getActiveAlerts();
    console.log(`[ALERT_PROCESSOR] 📊 Procesando ${activeAlerts.length} alertas activas`);

    if (activeAlerts.length === 0) {
      console.log('[ALERT_PROCESSOR] ℹ️  No hay alertas activas');
      return;
    }

    // Procesar alertas
    const triggers = await alertsService.processAlerts(bormeService, boeService);
    console.log(`[ALERT_PROCESSOR] 🚨 ${triggers.length} alertas disparadas`);

    // Procesar cada trigger
    for (const trigger of triggers) {
      await processTrigger(trigger);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[ALERT_PROCESSOR] ✅ Procesamiento completado en ${duration}s\n`);
  } catch (error) {
    console.error('[ALERT_PROCESSOR_ERROR]', error.message);
  }
}

/**
 * Procesar un trigger de alerta
 */
async function processTrigger(trigger) {
  try {
    const { alertId, profession, region, results, severity } = trigger;

    console.log(
      `[TRIGGER] ${severity.toUpperCase()} - ${profession} en ${region}: ${results.length} resultados`
    );

    // Enviar notificaciones (email, webhook, etc)
    await sendNotifications(trigger);

    // Guardar en historial
    await saveToHistory(trigger);
  } catch (error) {
    console.error('[TRIGGER_ERROR]', error.message);
  }
}

/**
 * Enviar notificaciones por múltiples canales
 */
async function sendNotifications(trigger) {
  const { alertId, profession, region, results } = trigger;

  // EMAIL
  // En producción: SendGrid, Nodemailer, AWS SES, etc.
  console.log(`  📧 Email: ${results.length} resultados para ${profession}`);

  // WEBHOOK
  // Para integración con CRM o sistemas externos
  // const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  // if (webhookUrl) {
  //   await axios.post(webhookUrl, trigger);
  // }

  // DATABASE
  // Guardar trigger en BD para histórico
  console.log(`  💾 Guardando ${results.length} leads en histórico`);

  return true;
}

/**
 * Guardar trigger en historial (en producción sería en BD)
 */
async function saveToHistory(trigger) {
  // En producción: guardar en PostgreSQL
  // Para ahora: loguear solo
  const timestamp = new Date().toISOString();
  console.log(`  📝 [${timestamp}] Trigger guardado: ${trigger.alertId}`);
}

/**
 * Crear alertas por defecto para profesiones clave
 */
export async function setupDefaultAlerts() {
  console.log('[ALERT_PROCESSOR] 🔧 Configurando alertas por defecto...');

  const keyProfessions = [
    'agente_inmobiliario',
    'inversor_inmobiliario',
    'reformista',
    'abogado',
    'notario',
    'asesor_financiero'
  ];

  const mainRegions = ['Madrid', 'Barcelona', 'Valencia'];

  let totalAlerts = 0;
  for (const profession of keyProfessions) {
    const alerts = await alertsService.createAlerts(profession, mainRegions);
    totalAlerts += alerts.length;
  }

  console.log(`[ALERT_PROCESSOR] ✅ ${totalAlerts} alertas configuradas por defecto`);
}

/**
 * Obtener próxima ejecución del scheduler
 */
export function getNextRun() {
  // Próximas 6 horas automáticamente
  const now = new Date();
  const nextRun = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return nextRun;
}

/**
 * Forzar procesamiento inmediato (para testing)
 */
export async function triggerNow() {
  console.log('[ALERT_PROCESSOR] 🔨 Forzando procesamiento inmediato...');
  isProcessing = true;
  try {
    await processAllAlerts();
  } finally {
    isProcessing = false;
  }
}

export default { startAlertProcessor, setupDefaultAlerts, triggerNow, getNextRun };
