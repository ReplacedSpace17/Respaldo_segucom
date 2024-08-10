const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');

// Configuración del servidor remoto (servidor 1)
const remoteUser = 'sermex-segu';
const remoteHost = 'segubackend.com';
const remotePort = 22;
const remotePassword = 'S3rs6uc0'; // Contraseña para la conexión SSH

// Array de rutas de carpetas de origen en el servidor remoto
const sourceDirs = [
    '/home/sermex-segu/BackendSegucom/uploads',
    '/home/sermex-segu/Segucom_Comunication/MediaContent',
];

// Ruta de la carpeta de destino en el servidor de respaldo
const backupDir = '/home/sermex-segu2/RESPALDOS';

// Función para copiar las carpetas del servidor remoto
const copyRemoteDirectories = async () => {
    try {
        // Asegurarse de que la carpeta de respaldo existe
        await fs.ensureDir(backupDir);

        // Copiar los archivos de cada carpeta de origen desde el servidor remoto
        for (const sourceDir of sourceDirs) {
            const targetDir = path.join(backupDir, path.basename(sourceDir));
            const command = `sshpass -p ${remotePassword} scp -r -P ${remotePort} ${remoteUser}@${remoteHost}:${sourceDir} ${targetDir}`;
            
            exec(command, (error) => {
                if (error) {
                    console.error(`Error al copiar ${sourceDir}:`, error);
                    return;
                }
                console.log(`Copia de ${sourceDir} realizada en: ${targetDir}`);
            });
        }
    } catch (err) {
        console.error('Error al realizar la copia de directorios remotos:', err);
    }
};

// Programar la tarea para que se ejecute diariamente a las 11:18 PM
cron.schedule('08 16 * * *', async () => {
    console.log('Iniciando copia de directorios desde el servidor remoto...');
    await copyRemoteDirectories();
});

console.log('El servicio de copia está activo.');
console.log(`Usuario que ejecuta el script: ${process.env.USER}`);
