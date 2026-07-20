import { exportarBancoCompleto, setConfig } from './db.js';
import { baixarArquivo, carimboArquivo } from './util.js';

export async function exportarBackupAgora() {
  const dump = await exportarBancoCompleto();
  baixarArquivo(`BACKUP_BIPABIP_${carimboArquivo()}.json`, JSON.stringify(dump), 'application/json;charset=utf-8');
  await setConfig('ultimoBackupEm', new Date().toISOString());
}
