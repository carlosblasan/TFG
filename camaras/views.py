from django.http.response import HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import LoginForm, RegisterForm, CameraForm
from django.contrib.auth import authenticate, login, logout
from .models import Mapa, Punto, Camara
import json
from django.http import JsonResponse
from django.core.serializers import serialize
from django.db.models.query import QuerySet


def index(request):
    return render(request, "camaras/index.html")


def registro(request):
    """
    Función que crea un usuario cuando se registra en la aplicación
    """
    # Si el usuario ya tiene la sesion iniciada no puede acceder aqui
    if request.user.is_authenticated:
        return HttpResponseNotFound()  # TODO: Error explicando que ha pasado

    # Si el metodo es GET, se muestra una pagina con el formulario de registro
    if request.method == 'GET':
        register_form = RegisterForm()
        return render(request, "camaras/registro.html", {
            "register_form": register_form
        })

    # Si el metodo es POST, se crea un nuevo objeto Usuario con
    # los datos que han sido rellenados
    elif request.method == 'POST':
        register_form = RegisterForm(data=request.POST)
        if register_form.is_valid():
            # Se guarda el formulario para crear un usuario
            usuario = register_form.save()
            # Se le guarda la contrasena
            usuario.set_password(usuario.password)
            # Finalmente se almacena el usuario en la base de datos
            usuario.save()
            # Una vez creado el usuario, se redirige a la pagina principal
            return redirect(reverse("camaras:index"))

        else:
            # Si el formulario no es valido
            return HttpResponseNotFound()
            # TODO: mostrar pagina de error explicando que ha pasado


def login_view(request):
    """
    Vista que loguea a un usuario en la aplicacion
    """
    # Si el metodo es GET, se muestra al usuario el formulario de login
    if request.method == 'GET':
        login_form = LoginForm()
        return render(request, "camaras/login.html", {
            "login_form": login_form
        })
    # Si el metodo es POST, se obtienen los datos introducidos mediante
    # el formulario y se procede a autenticar al usuario
    elif request.method == 'POST':
        login_form = LoginForm(data=request.POST)
        # Se obtienen usuario y contrasena introducidos
        username = login_form.data['usuario']
        password = login_form.data['password']
        # Se comprueba que exista en la base de datos
        user = authenticate(username=username, password=password)
        # Si existe y el usuario no ha sido eliminado
        if user:
            if user.is_active:
                # Se inicia sesion
                login(request, user)
                # Se muestra la pagina principal
                return redirect(reverse('camaras:index'))
        else:
            return HttpResponseNotFound()
            # TODO: Error de que el usuario no existe


@login_required
def logout_view(request):
    """
    Vista que finaliza la sesion
    """
    # Se realiza logout
    logout(request)
    # Se redirige a la pantalla principal
    return redirect(reverse('camaras:index'))


@login_required
def nuevacamara(request):
    if not request.user.is_superuser:
        return HttpResponseNotFound()  # TODO Error de acceso prohibido
    if request.method == 'GET':
        camera_form = CameraForm()
        return render(request, "camaras/nuevacamara.html", {
            "form": camera_form,
        })
    elif request.method == 'POST':
        camera_form = CameraForm(data=request.POST)
        if camera_form.is_valid():
            camara = camera_form.save()
            camara.save()
        else:
            return HttpResponseNotFound()  # TODO: Mostrar error
        return redirect(reverse('camaras:index'))
    return HttpResponseNotFound()


@login_required
def nuevo(request):
    """
    Funcion que muestra la plantilla para crear un nuevo mapa
    y lo guarda en la base de datos
    """
    # Si el metodo es GET, se muestra el mapa
    if request.method == 'GET':
        lista_camaras = Camara.objects.all()
        dist = set()
        camaras = dict()
        for c in lista_camaras:
            dist.add(c.distancia_focal)
        for d in dist:
            camaras[d] = list(Camara.objects.filter(distancia_focal=d))
        print(camaras)
        return render(request, "camaras/nuevo.html", {
            "camaras": camaras
        })
    elif request.method == 'POST':
        # TODO: Guardar los puntos y el mapa en la base de datos
        # data = json.loads(request.body)
        print(request.body)
        for e in request.body:
            coordenadas = e['geometry']['coordinates']
            p = Punto()
            p.x_coord = coordenadas[0]
            p.y_coord = coordenadas[1]
            if e['type'] == "Camara":
                p.es_camara = True
            else:
                p.es_camara = False
            # p.mapa = m
            p.save()


@login_required
def mapas(request):
    """
    Funcion que muestra un listado con todos los mapas creados por el usuario
    """
    # Si el metodo es GET se muestra el listado de mapas
    if request.method == 'GET':
        # Se obtienen todos los mapas que ha creado el usuario
        mapas = Mapa.objects.filter(usuario=request.user)
        return render(request, "camaras/mapas.html", {
            "mapas": mapas
        })


def camaras(request, camara_id):
    camara = Camara.objects.get(id=camara_id)
    
    return JsonResponse({"nombre": camara.nombre,
                         "resolucion": camara.resolucion,
                         "distancia_focal": camara.distancia_focal,
                         "sensor": camara.get_sensor_display(),
                         "inclinacion": camara.inclinacion,
                         "altura": camara.altura
                         }, status=201)
