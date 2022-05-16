# TFG

## Aplicación para diseño y representación de instalaciones de seguridad perimetral

Este es el repositorio de la aplicación web creada para el TFG "Aplicación para diseño y representación de instalaciones de seguridad perimetral".

* Autor: Carlos Blanco Santero
* Tutor: Eduardo Cermeño Mediavilla


Para ejecutar la aplicación se deben ejecutar tres comandos:
* python manage.py makemigrations
* python manage.py migrate camaras
* python manage.py runserver

Y para acceder a la aplicación, basta entrar en la dirección 127.0.0.1:8000 desde el navegador.

El superusuario viene creado por defecto al hacer la migración de la base de datos que está en el repositorio. 
Pero para crearlo habría que ejecutar el comando python manage.py createsuperuser e introducir la información necesaria.

