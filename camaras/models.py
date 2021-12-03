from django.db import models
from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    pass


class Camara(models.Model):
    nombre = models.CharField(max_length=128)
    tipo = models.CharField(max_length=128)
    distancia_focal = models.IntegerField(default=0)


class Mapa(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    camaras = models.ManyToManyField(Camara, related_name="mapa")


class Punto(models.Model):
    mapa = models.ForeignKey(Mapa, on_delete=models.CASCADE)
    x_coord = models.DecimalField(decimal_places=2, max_digits=5)
    y_coord = models.DecimalField(decimal_places=2, max_digits=5)
    es_camara = models.BooleanField()  # Si es camara o si es edificio
