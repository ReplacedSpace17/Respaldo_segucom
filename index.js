const { NodeSSH } = require('node-ssh');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');

// Configuración del servidor remoto
const remoteUser = 'sermex-segu2';
const remoteHost = 'segubackend.com';
const remotePort = 4040;
const remoteBackupDir = '/home/sermex-segu2/RESPALDOS';
const remotePassword = 'S3rs6uc0'; // Contraseña para la conexión SSH

// Array de rutas de carpetas de origen (donde están las imágenes)
const sourceDirs = [
    '/home/sermex-segu/BackendSegucom/uploads',
    '/home/sermex-segu/Segucom_Comunication/MediaContent',
    // Puedes agregar más rutas aquí
];

// Ruta de la carpeta de destino para las imágenes
const backupDir = '/home/sermex-segu2/RESPALDOS/MEDIA';
// Ruta de la carpeta de destino para la base de datos
const backupDirsql = '/home/sermex-segu2/RESPALDOS/DATABASE';

// Función para conectarse al servidor remoto y preparar la carpeta de respaldo
const prepareRemoteBackupDir = async () => {
    const ssh = new NodeSSH();
    
    try {
        await ssh.connect({
            host: remoteHost,
            username: remoteUser,
            port: remotePort,
            password: remotePassword // Asegúrate de manejar las contraseñas de manera segura
        });
        console.log('Conexión SSH establecida con éxito.');

        // Verificar si la carpeta de respaldo existe
        const backupDirCommand = `if [ ! -d "${remoteBackupDir}" ]; then mkdir -p ${remoteBackupDir}; fi`;
        await ssh.execCommand(backupDirCommand);
        console.log(`Carpeta de respaldo '${remoteBackupDir}' verificada o creada con éxito.`);

        // Borrar el contenido de la carpeta de respaldo si existe
        await ssh.execCommand(`rm -rf ${remoteBackupDir}/*`);
        console.log(`Contenido de la carpeta '${remoteBackupDir}' eliminado con éxito.`);
        
    } catch (error) {
        console.error('Error al conectarse a SSH o manejar la carpeta de respaldo:', error);
    } finally {
        ssh.dispose(); // Cerrar la conexión
    }
};

// Función para realizar el respaldo de imágenes
const backupImages = async () => {
    try {
        // Asegurarse de que la carpeta de respaldo existe
        await fs.ensureDir(backupDir);

        // Eliminar el respaldo anterior
        await fs.emptyDir(backupDir);

        // Copiar los archivos de cada carpeta de origen a la carpeta de destino
        for (const sourceDir of sourceDirs) {
            await fs.copy(sourceDir, backupDir);
            console.log(`Respaldo de ${sourceDir} realizado en: ${backupDir}`);
        }
    } catch (err) {
        console.error('Error al realizar el respaldo de imágenes:', err);
    }
};

// Función para realizar el respaldo de la base de datos segucomm_db
const backupDatabase = async () => {
    const dbName = 'segucomm_db';
    const user = 'API_User';
    const password = 'VJQy9lCOUWsB3wZ'; // Cambia esta línea si necesitas proteger tu contraseña

    // Asegúrate de que el directorio de respaldo exista
    await fs.ensureDir(backupDirsql);

    const backupFile = path.join(backupDirsql, `${dbName}-${new Date().toISOString().slice(0, 10)}.sql`);

    const command = `mysqldump -u ${user} -p${password} ${dbName} > ${backupFile}`;

    exec(command, (error) => {
        if (error) {
            console.error('Error al realizar el respaldo de la base de datos:', error);
            return;
        }
        console.log(`Respaldo de la base de datos ${dbName} realizado en: ${backupFile}`);
        transferBackup(backupFile);
    });
};

// Función para realizar el respaldo de la base de datos segucomm_mms
const backupCommunicationDatabase = async () => {
    const dbName = 'segucomm_mms';
    const user = 'API_User';
    const password = 'VJQy9lCOUWsB3wZ'; // Cambia esta línea si necesitas proteger tu contraseña

    // Asegúrate de que el directorio de respaldo exista
    await fs.ensureDir(backupDirsql);

    const backupFile = path.join(backupDirsql, `${dbName}-${new Date().toISOString().slice(0, 10)}.sql`);

    const command = `mysqldump -u ${user} -p${password} ${dbName} > ${backupFile}`;

    exec(command, (error) => {
        if (error) {
            console.error('Error al realizar el respaldo de la base de datos:', error);
            return;
        }
        console.log(`Respaldo de la base de datos ${dbName} realizado en: ${backupFile}`);
        transferBackup(backupFile);
    });
};

// Función para transferir respaldos al servidor remoto
const transferBackup = (backupFile) => {
    const command = `sshpass -p ${remotePassword} scp -P ${remotePort} ${backupFile} ${remoteUser}@${remoteHost}:${remoteBackupDir}`;

    exec(command, (error) => {
        if (error) {
            console.error('Error al transferir el respaldo al servidor remoto:', error);
            return;
        }
        console.log(`Respaldo transferido a: ${remoteUser}@${remoteHost}:${remoteBackupDir}`);
    });
};

// Función para transferir la carpeta de imágenes al servidor remoto
const transferImages = () => {
    const command = `sshpass -p ${remotePassword} scp -r -P ${remotePort} ${backupDir} ${remoteUser}@${remoteHost}:${remoteBackupDir}`;

    exec(command, (error) => {
        if (error) {
            console.error('Error al transferir las imágenes al servidor remoto:', error);
            return;
        }
        console.log(`Imágenes transferidas a: ${remoteUser}@${remoteHost}:${remoteBackupDir}`);
    });
};

// Programar la tarea para que se ejecute diariamente a las 11:18 PM
cron.schedule('29 15 * * *', async () => {
    console.log('Iniciando respaldo de imágenes y bases de datos...');
    await prepareRemoteBackupDir(); // Preparar la carpeta de respaldo en el servidor remoto
    await backupImages(); // Realizar el respaldo de imágenes
    await backupDatabase(); // Realizar el respaldo de la base de datos
    await backupCommunicationDatabase(); // Realizar el respaldo de la base de datos de comunicación
    await transferImages(); // Llamar a la función para transferir las imágenes al servidor remoto
});

console.log('El servicio de respaldo está activo.');
console.log(`Usuario que ejecuta el script: ${process.env.USER}`);
