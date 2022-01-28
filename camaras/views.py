import json
from django.http.response import HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import LoginForm, RegisterForm, CameraForm
from django.contrib.auth import authenticate, login, logout
from .models import Colocada, Mapa, Camara
from django.http import JsonResponse


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
        return render(request, "camaras/nuevo.html", {
            "camaras": camaras
        })
    elif request.method == 'POST':
        coordenadas = {}
        posiciones_camaras_id = []
        data = json.loads(request.body)
        puntos = data['content']
        print(puntos)
        try:
            map = Mapa.objects.get(nombre=data['nombre'], usuario=request.user)
        except Mapa.DoesNotExist:
            map = Mapa(nombre=data['nombre'], usuario=request.user)
            map.save()
        for e in puntos.keys():
            info = json.loads(puntos[e])
            if 'posicion' in info.keys():
                posiciones_camaras_id.append(e.split('_')[1])
                coordenadas[e.split('_')[1]] = info['posicion']
            else:
                pos = posiciones_camaras_id.pop()
                camara_id = int(pos.split('-')[0])
                cam = Camara.objects.get(id=camara_id)
                info = json.loads(puntos[e])
                angulo = info['angulo']
                altura = info['altura']
                inclinacion = info['inclinacion']
                rotacion = info['rotacion']
                dmax = info['dmax']
                dmuerta = info['dmuerta']
                c = Colocada(camara=cam, angulo=angulo, altura=altura,
                             inclinacion=inclinacion, rotacion=rotacion,
                             dmax=dmax, dmuerta=dmuerta,
                             x_coord=coordenadas[e]['lng'],
                             y_coord=coordenadas[e]['lat'], mapa=map)
                print(c)
                c.save()
        return redirect(reverse('camaras:mapas'))


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
            "lista_mapas": mapas
        })


def camaras(request, camara_id):
    camara = Camara.objects.get(id=camara_id)
    return JsonResponse({
        "id": camara.id,
        "nombre": camara.nombre,
        "resolucion": camara.resolucion,
        "distancia_focal": camara.distancia_focal,
        "sensor": camara.get_sensor_display(),
        "inclinacion": 70,
        "altura": 4,
        "rotacion": 0
    }, status=201)


def editarmapa(request, mapa_id):
    if request.method == 'GET':
        lista_camaras = Camara.objects.all()
        dist = set()
        camaras = dict()
        for c in lista_camaras:
            dist.add(c.distancia_focal)
        for d in dist:
            camaras[d] = list(Camara.objects.filter(distancia_focal=d))
        return render(request, "camaras/nuevo.html", {
            "nombre": Mapa.objects.get(id=mapa_id).nombre,
            "mapa": mapa_id,
            "camaras": camaras
        })


def editar(request, mapa_id):
    if request.method == 'GET':
        camaras = []
        mapa = Mapa.objects.get(id=mapa_id)
        c = Colocada.objects.filter(mapa=mapa)
        centro = [sum(punto.x_coord for punto in c)/c.count(),
                  sum(punto.y_coord for punto in c)/c.count()]
        for e in c:
            cam = Camara.objects.get(id=e.camara.id)
            camaras.append({
                "posicion": {"lng": e.x_coord, "lat": e.y_coord},
                "camara_id": cam.id,
                "colocada": e.id,
                "distancia_focal": cam.distancia_focal,
                "nombre_camara": cam.nombre,
                "angulo": e.angulo,
                "inclinacion": e.inclinacion,
                "rotacion": e.rotacion,
                "altura": e.altura,
                "dmax": e.dmax,
                "dmuerta": e.dmuerta
                })
        return JsonResponse({
            "centro": centro,
            "camaras": camaras
        }, status=200)
