
#----------------------------------------------------------------Server de respaldo
Configurar normal
##Instalar sshpass y ufw si no están instalados
sudo apt-get install -y sshpass ssh ufw

## Abrir el puerto 22 para SSH
sudo ufw allow 22

# Crear un directorio en el home llamado RESPALDOS_REGUCOM
mkdir ~/RESPALDOS_REGUCOM

# Crear un usuario del sistema
sudo useradd -m c5

# Establecer la contraseña para el usuario
echo "c5:UsuarioRespaldo135#" | sudo chpasswd

# Restringir el acceso del usuario a la carpeta RESPALDOS_REGUCOM
sudo chown c5:c5 ~/RESPALDOS_REGUCOM
sudo chmod 700 ~/RESPALDOS_REGUCOM

# Configurar el acceso SSH para que el usuario solo pueda ver esta carpeta
echo "Match User c5" | sudo tee -a /etc/ssh/sshd_config
echo "  ChrootDirectory /home/c5/RESPALDOS_REGUCOM" | sudo tee -a /etc/ssh/sshd_config
echo "  ForceCommand internal-sftp" | sudo tee -a /etc/ssh/sshd_config
echo "  AllowTcpForwarding no" | sudo tee -a /etc/ssh/sshd_config

# Reiniciar el servicio SSH para aplicar los cambios
sudo systemctl restart ssh


#----------------------------------------------------------------Server principal
Configurar el acceso ssh en el repositorio
Hacer commit y push
Clonar el repositorio en el server principal

Script para hacer un service:

sudo nano /etc/systemd/system/respaldoSegucom.service

-----------------------------------------
[Unit]
Description=Backend Segucom Node.js Application
After=network.target

[Service]
ExecStart=/usr/bin/node /home/sermex-segu/BackendSegucom/index.js
WorkingDirectory=/home/sermex-segu/BackendSegucom
Restart=always
User=sermex-segu
Group=sermex-segu
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
# Si estás usando pm2, el comando sería algo como:
# ExecStart=/usr/bin/pm2 start /home/sermex-segu/BackendSegucom/index.js --name backendsegucom

[Install]
WantedBy=multi-user.target
-----------------------------------------

sudo systemctl daemon-reload
sudo systemctl enable respaldoSegucom
sudo systemctl start respaldoSegucom
sudo systemctl status respaldoSegucom
