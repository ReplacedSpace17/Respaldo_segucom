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

// Array de bases de datos a respaldar
const databases = [
    { name: 'segucomm_mms', fileName: 'backup_segucomm_mms.sql' },
    { name: 'segucomm_db', fileName: 'backup_segucomm_db.sql' }
];

// Ruta de la carpeta de destino en el servidor local para los respaldos
const backupDir = '/home/sermex-segu2/RESPALDOS';

// Función para copiar las carpetas del servidor remoto
const copyRemoteDirectories = async () => {
    try {
        // Asegurarse de que la carpeta de respaldo existe
        await fs.ensureDir(backupDir);

        // Copiar los archivos de cada carpeta de origen desde el servidor remoto
        for (const sourceDir of sourceDirs) {
            const targetDir = path.join(backupDir, path.basename(sourceDir)); // Crear un subdirectorio para cada origen

            // Comando para copiar usando rsync y sobrescribir
            const command = `sshpass -p ${remotePassword} rsync -avz --delete --progress -e "ssh -p ${remotePort}" ${remoteUser}@${remoteHost}:${sourceDir}/ ${targetDir}/`;

            console.log(`Iniciando copia de ${sourceDir}...`);

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error al copiar ${sourceDir}:`, error);
                    return;
                }

                // Mostrar la salida estándar
                console.log(stdout);

                // Mostrar errores si los hay
                if (stderr) {
                    console.error(stderr);
                }

                console.log(`Copia de ${sourceDir} realizada en: ${targetDir}`);
            });
        }
    } catch (err) {
        console.error('Error al realizar la copia de directorios remotos:', err);
    }
};

// Función para realizar el respaldo de las bases de datos
const backupDatabases = async () => {
    // Asegurarse de que la carpeta de respaldo existe
    await fs.ensureDir(backupDir);

    // Cambiar la contraseña de la base de datos
    const dbPassword = 's3guC0m@7am'; // Nueva contraseña para las bases de datos

    // Respaldar cada base de datos
    for (const db of databases) {
        const { name, fileName } = db;
        const localBackupFile = path.join(backupDir, fileName);

        // Comando para respaldar la base de datos
        const backupCommand = `mysqldump -u ${remoteUser} -p${dbPassword} ${name} > ${localBackupFile}`;

        console.log(`Iniciando respaldo de la base de datos ${name}...`);

        exec(backupCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al realizar el respaldo de la base de datos ${name}:`, error);
                return;
            }

            // Mostrar la salida estándar
            console.log(stdout);

            // Mostrar errores si los hay
            if (stderr) {
                console.error(stderr);
            }

            console.log(`Respaldo de la base de datos ${name} realizado en: ${localBackupFile}`);
        });
    }
};

// Función principal que combina la copia de directorios y el respaldo de bases de datos
const performBackup = async () => {
    console.log('Iniciando copia de directorios desde el servidor remoto...');
    await copyRemoteDirectories();

    console.log('Iniciando respaldo de bases de datos...');
    await backupDatabases();
};

// Programar la tarea para que se ejecute diariamente a las 11:18 PM
cron.schedule('00 03 * * *', async () => {
    await performBackup();
});

console.log('El servicio de copia y respaldo de bases de datos está activo.');
console.log(`Usuario que ejecuta el script: ${process.env.USER}`);
