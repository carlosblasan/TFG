from django.urls import path
from . import views

app_name = "camaras"
urlpatterns = [
    path('', views.index, name="index"),
    path('login', views.login_view, name="login"),
    path('registro', views.registro, name="registro"),
    path('logout', views.logout_view, name='logout'),
    path('nuevo', views.nuevo, name="nuevo"),
    path('mapas', views.mapas, name="mapas"),

]
