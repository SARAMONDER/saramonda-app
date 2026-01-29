/**
 * Backup Service
 * Automated database backup and recovery
 */
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./shared/logger');

const BACKUP_DIR = path.resolve('./backups');

/**
 * Initialize backup service
 */
function initBackupService() {
    if (!config.backup.enabled) {
        logger.info('Backup service disabled');
        return;
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Schedule daily backup
    cron.schedule(config.backup.cron, () => {
        performBackup();
    });

    logger.info('Backup service initialized', { cron: config.backup.cron });
}

/**
 * Perform database backup
 */
function performBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `saramonda_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    try {
        // Copy database file
        const dbPath = path.resolve(config.database.path);
        fs.copyFileSync(dbPath, backupPath);

        logger.info('Database backup completed', { filename: backupFilename });

        // Cleanup old backups
        cleanupOldBackups();

        return { success: true, filename: backupFilename };
    } catch (error) {
        logger.error('Backup failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cleanup backups older than retention period
 */
function cleanupOldBackups() {
    const retentionMs = config.backup.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;

    try {
        const files = fs.readdirSync(BACKUP_DIR);

        for (const file of files) {
            if (!file.startsWith('saramonda_backup_')) continue;

            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);

            if (stats.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                logger.info('Old backup deleted', { filename: file });
            }
        }
    } catch (error) {
        logger.error('Backup cleanup error:', error);
    }
}

/**
 * List available backups
 */
function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('saramonda_backup_'))
        .map(f => {
            const stats = fs.statSync(path.join(BACKUP_DIR, f));
            return {
                filename: f,
                size: stats.size,
                created: stats.mtime
            };
        })
        .sort((a, b) => b.created - a.created);

    return files;
}

/**
 * Restore from backup
 */
function restoreFromBackup(backupFilename) {
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
    }

    const dbPath = path.resolve(config.database.path);

    try {
        // Create backup of current database before restore
        const preRestoreBackup = `pre_restore_${Date.now()}.db`;
        fs.copyFileSync(dbPath, path.join(BACKUP_DIR, preRestoreBackup));

        // Restore from backup
        fs.copyFileSync(backupPath, dbPath);

        logger.info('Database restored from backup', {
            backupFile: backupFilename,
            preRestoreBackup
        });

        return { success: true };
    } catch (error) {
        logger.error('Restore failed:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initBackupService,
    performBackup,
    listBackups,
    restoreFromBackup
};
