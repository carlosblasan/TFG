from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import (MinValueValidator,
                                    MaxValueValidator,
                                    DecimalValidator)


class Usuario(AbstractUser):
    pass


class Camara(models.Model):
    RESOLUCIONES = (
        ("SD", "640x480"),
        ("QHD", "960x540"),
        ("HD", "1280x720"),
        ("FHD", "1920x1080"),
        ("2K", "2560x1440"),
        ("UHD 4K", "3840x2160"),
        ("UHD 8K", "7680x4320"),

    )
    SENSOR = (
        ("1/4", "3.6x2.7"),
        ("1/3", "4.8x3.6"),
        ("1/2.8", "4.82x3.55"),
        ("1/2.7", "5.37x4.29"),
        ("1/2", "6.4x4.8"),
        ("1/1.6", "8.08x6.01"),
    )
    nombre = models.CharField(max_length=128)
    # tipo = models.CharField(max_length=128)
    distancia_focal = models.IntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(10)])
    resolucion = models.CharField(max_length=20,
                                  choices=RESOLUCIONES,
                                  default="HD")
    sensor = models.CharField(max_length=20, choices=SENSOR, default="1/3")
    precio = models.DecimalField(decimal_places=2, max_digits=10)

    def __str__(self):
        return f"Cámara {self.nombre}. Dist. focal {self.distancia_focal} mm."


class Mapa(models.Model):
    nombre = models.CharField(max_length=128)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    imagen = models.ImageField(null=True, blank=True)

    class Meta:
        unique_together = ('nombre', 'usuario',)


class Colocada(models.Model):
    mapa = models.ForeignKey(Mapa, on_delete=models.CASCADE)
    camara = models.ForeignKey(Camara, on_delete=models.CASCADE)
    angulo = models.IntegerField(default=45)
    inclinacion = models.IntegerField(default=70)
    altura = models.IntegerField(default=4)
    rotacion = models.IntegerField(default=0)
    dmax = models.IntegerField(default=10)
    dmuerta = models.IntegerField(default=0)
    x_coord = models.DecimalField(decimal_places=10, max_digits=15)
    y_coord = models.DecimalField(decimal_places=10, max_digits=15)
