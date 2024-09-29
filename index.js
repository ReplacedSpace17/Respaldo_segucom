const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');

// Configuración del servidor remoto (servidor 1)
const remoteUser = 'sermex-segu';
//const remoteHost = '189.162.181.25';
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
const logFile = path.join(backupDir, 'logsBackup.txt'); // Ruta del archivo de logs

const moment = require('moment-timezone');

// Función para registrar la fecha y hora en el archivo de logs
const logBackupTime = (operation) => {
    const timestamp = moment().tz('America/Mexico_City'); // Cambia a tu zona horaria
    const date = timestamp.format('YYYY-MM-DD'); // Fecha en formato YYYY-MM-DD
    const time = timestamp.format('HH:mm:ss'); // Hora en formato HH:MM:SS
    const logMessage = `${date}, ${time}, ${operation}\n`;
    fs.appendFile(logFile, logMessage, (err) => {
        if (err) {
            console.error('Error al escribir en el archivo de logs:', err);
        }
    });
};

// Función para copiar las carpetas del servidor remoto
const copyRemoteDirectories = async () => {
    try {
        // Asegurarse de que la carpeta de respaldo existe
        await fs.ensureDir(backupDir);
        logBackupTime('Copia de seguridad iniciada');

        // Copiar los archivos de cada carpeta de origen desde el servidor remoto
        for (const sourceDir of sourceDirs) {
            const targetDir = path.join(backupDir, path.basename(sourceDir)); // Crear un subdirectorio para cada origen

            // Comando para copiar usando rsync y sobrescribir
            const command = `sshpass -p ${remotePassword} rsync -avz --delete --progress -e "ssh -p ${remotePort}" ${remoteUser}@${remoteHost}:${sourceDir}/ ${targetDir}/`;

            console.log(`Iniciando copia de ${sourceDir}...`);

            await new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error al copiar ${sourceDir}:`, error);
                        reject(error);
                        return;
                    }

                    // Mostrar la salida estándar
                    console.log(stdout);

                    // Mostrar errores si los hay
                    if (stderr) {
                        console.error(stderr);
                    }

                    console.log(`Copia de ${sourceDir} realizada en: ${targetDir}`);
                    resolve(); // Indica que esta copia ha terminado
                });
            });
        }
        console.log('Todas las copias de directorios han finalizado.'); // Mensaje de finalización
        logBackupTime('Respaldo de directorios completado'); // Log de finalización
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

        // Comando para respaldar la base de datos usando mysqldump
        // Agregando la opción -p para mostrar el progreso
        const backupCommand = `mysqldump -u segucomm_admin -p'${dbPassword}' -h ${remoteHost} --column-statistics=0 ${name} | pv -p -t -e -s $(mysqldump --no-data -u segucomm_admin -p'${dbPassword}' -h ${remoteHost} ${name} | wc -c) > ${localBackupFile}`;

        console.log(`Iniciando respaldo de la base de datos ${name}...`);

        await new Promise((resolve, reject) => {
            exec(backupCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error al realizar el respaldo de la base de datos ${name}:`, error);
                    reject(error);
                    return;
                }

                // Mostrar la salida estándar
                console.log(stdout);

                // Mostrar errores si los hay
                if (stderr) {
                    console.error(stderr);
                }

                console.log(`Respaldo de la base de datos ${name} realizado en: ${localBackupFile}`);
                resolve(); // Indica que este respaldo ha terminado
            });
        });

        // Registrar el respaldo completado en el log
        logBackupTime(`Respaldo de BD_${name} completado`);
    }

    console.log('Todos los respaldos de bases de datos han finalizado.'); // Mensaje de finalización
    logBackupTime('Finalizados todos los respaldos de bases de datos'); // Log de finalización general
};

// Función principal que combina la copia de directorios y el respaldo de bases de datos
const performBackup = async () => {


    console.log('Iniciando respaldo de bases de datos...');
    await backupDatabases();

  //  console.log('Iniciando copia de directorios desde el servidor remoto...');
//    await copyRemoteDirectories();

    console.log('Copia de seguridad completada.'); // Mensaje de finalización general
    logBackupTime('Copia de seguridad completada'); // Log de finalización general
};

// Programar la tarea para que se ejecute cada minuto
// Programar la tarea para que se ejecute a las 3 a.m. todos los días
/*
cron.schedule('0 3 * * *', async () => {
    await performBackup();
});
*/
// Programar la tarea para que se ejecute cada 2 minutos test
cron.schedule('*/3 * * * *', async () => {
    await performBackup();
});



console.log('El servicio de copia y respaldo de bases de datos está activo.');
console.log(`Usuario que ejecuta el script: ${process.env.USER}`);
