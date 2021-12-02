from django.contrib import admin
from django.urls import path, include
from . import views

app_name = "camaras"
urlpatterns = [
    path('', views.index, name="index"),
    path('login', views.login_view, name="login"),
    path('registro', views.registro, name="registro"),
    path('logout', views.logout_view, name='logout'),

]