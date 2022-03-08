"""
TFG
 urls.py
 Autor: Carlos Blanco Santero
 Tutor: Eduardo Cermeño
"""
from django.urls import path
from . import views
from django.contrib.staticfiles.storage import staticfiles_storage
from django.views.generic.base import RedirectView

app_name = "camaras"
urlpatterns = [
    path('', views.index, name="index"),
    path('login', views.login_view, name="login"),
    path('registro', views.registro, name="registro"),
    path('logout', views.logout_view, name='logout'),
    path('nuevo', views.nuevo, name="nuevo"),
    path('mapas', views.mapas, name="mapas"),
    path('nuevacamara', views.nuevacamara, name="nuevacamara"),
    path('camaras/<int:camara_id>', views.camaras, name="camaras"),
    path('editarmapa/<int:mapa_id>', views.editarmapa, name="editarmapa"),
    path('editar/<int:mapa_id>', views.editar, name="editar"),
    path('editarimportado/<str:nombre_mapa>', views.editarimportado,
         name="editarimportado"),
    path("importar", views.importar, name="importar"),
    path('eliminar', views.eliminar, name='eliminar'),
    path('miscamaras', views.miscamaras, name="miscamaras"),
    path('favicon.ico', RedirectView.as_view(url=staticfiles_storage.url(
                                             'images/favicon.ico')))
]
