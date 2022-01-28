from django.contrib import admin
from .models import Usuario, Mapa, Camara, Colocada

# Register your models here.
admin.site.register(Usuario)
admin.site.register(Mapa)
admin.site.register(Camara)
admin.site.register(Colocada)
