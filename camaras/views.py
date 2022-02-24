import json
import os
from django.http.response import HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from TFG.settings import FILES_URL, STATIC_DIR
from .forms import LoginForm, RegisterForm, CameraForm
from django.contrib.auth import authenticate, login, logout
from .models import Colocada, Mapa, Camara
from django.http import JsonResponse


def mostrarCamarasPorFocal():
    lista_camaras = Camara.objects.all()
    dist = set()
    camaras = dict()
    for c in lista_camaras:
        dist.add(c.distancia_focal)
    for d in dist:
        camaras[d] = list(Camara.objects.filter(distancia_focal=d))
    return camaras


def index(request):
    """
    Funcion que muestra la vista principal de la aplicacion
    """
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
            if (register_form.cleaned_data["password"] !=
                    register_form.cleaned_data["repeat_password"]):
                return HttpResponseNotFound()
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
    if request.user.is_authenticated:
        return render(request, "camaras/error.html", {
            "error_title": "Error",
            "error_body": "Ya has iniciado sesión en la aplicación. \
                        Si quieres iniciar sesión con otro usuario \
                        primero cierra la sesión actual",
        })
    context = dict()
    context['login_form'] = LoginForm()
    # Si el metodo es GET, se muestra al usuario el formulario de login
    if request.method == "GET" and request.GET.get('login_redirect', None):
        context["error"] = "Debes iniciar sesión para acceder a esa página."
        context["redirect_url"] = request.GET.get('login_redirect', None)

    # Si el metodo es POST, se obtienen los datos introducidos mediante
    # el formulario y se procede a autenticar al usuario
    if request.method == 'POST':
        redirect_url = request.POST.get('redirect')
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
                if redirect_url:
                    return redirect(redirect_url)
                else:
                    # Se muestra la pagina principal
                    return redirect(reverse('camaras:index'))
        else:
            return HttpResponseNotFound()
            # TODO: Error de que el usuario no existe

    return render(request, "camaras/login.html", context)


@login_required(redirect_field_name='login_redirect')
def logout_view(request):
    """
    Vista que finaliza la sesion
    """
    # Se realiza logout
    logout(request)
    # Se redirige a la pantalla principal
    return redirect(reverse('camaras:index'))


@login_required(redirect_field_name='login_redirect')
def nuevacamara(request):
    """
    Vista que crea una nueva camara en la aplicacion
    """
    # Error si el usuario que ha accedido no es el administrador
    if not request.user.is_superuser:
        return HttpResponseNotFound()  # TODO Error de acceso prohibido
    # Si el metodo es GET, se muestra el formulario de creacion de una
    # nueva camara
    if request.method == 'GET':
        camera_form = CameraForm()
        return render(request, "camaras/nuevacamara.html", {
            "form": camera_form,
        })
    # Si el metodo es POST, se comprueban los campos y se guarda la nueva
    # camara en la base de datos. Si no, se muestra un error
    elif request.method == 'POST':
        camera_form = CameraForm(data=request.POST)

        if not camera_form.is_valid():
            return render(request, "camaras/nuevacamara.html", {
                          "form": camera_form,
                          })
        else:
            distancia_focal = camera_form.cleaned_data['distancia_focal']
            nombre = camera_form.cleaned_data['nombre']
            resolcion = camera_form.cleaned_data['resolucion']
            sensor = camera_form.cleaned_data['sensor']
            precio = camera_form.cleaned_data['precio']
            camara = Camara(
                    nombre=nombre,
                    distancia_focal=distancia_focal,
                    resolucion=resolcion,
                    sensor=sensor,
                    precio=precio
                    )
            camara.save()
            return redirect(reverse('camaras:index'))
    return HttpResponseNotFound()


@login_required(redirect_field_name='login_redirect')
def nuevo(request):
    """
    Funcion que muestra la plantilla para crear un nuevo mapa
    y lo guarda en la base de datos
    """
    # Si el metodo es GET, se muestra el mapa
    if request.method == 'GET':
        # Lista de todas las camaras de la aplicacion
        camaras = mostrarCamarasPorFocal()
        # Se muestra la pagina
        return render(request, "camaras/nuevo.html", {
            "camaras": camaras
        })
    # Si el metodo es POST
    elif request.method == 'POST':
        coordenadas = {}
        posiciones_camaras_id = []
        # Cargamos el cuerpo de la peticion que contiene el nombre del mapa y
        # el objeto de JavaScript de los puntos donde se encuentran las camaras
        data = json.loads(request.body)
        puntos = data['content']
        # Obtenemos el mapa de la base de datos a partir de su nombre,
        # si existe
        try:
            map = Mapa.objects.get(
                    nombre=data['nombre'],
                    usuario=request.user)
            map.delete()
        # Si el mapa no existia previamente, lo creamos
        except Mapa.DoesNotExist:
            map = Mapa()
        map = Mapa(nombre=data['nombre'], usuario=request.user)
        # Guardamos la miniatura del mapa en la base de datos y guardamos
        # todo el mapa
        map.imagen = data['imagen']
        map.save()
        del data["imagen"]
        # Por cada camara colocada en el mapa leido
        for e in puntos.keys():
            # Cargamos toda su informacion
            info = json.loads(puntos[e])
            # Si contiene la palabra "posicion"
            if 'posicion' in info.keys():
                # Guardamos el identificador del punto en el mapa (compuesto
                # por el id de la camara y por el numero de camara colocada)

                posiciones_camaras_id.append(
                        {e.split('_')[1]: puntos[e.split('_')[1]]}
                    )
                # Guardamos las coordenadas de la camara
                coordenadas[e.split('_')[1]] = info['posicion']
            # Si no contiene "posicion" es que contiene toda la informacion
            # restante
        for e in puntos.keys():
            datos = json.loads(puntos[e])
            # print(datos)
            # print(posiciones_camaras_id)
            if 'posicion' not in datos.keys():
                # Eliminamos de la lista auxiliar el id del punto del que vamos
                # a guardar su informacion
                pos = posiciones_camaras_id.pop()
                # Guardamos el id de la camara para obtener la camara de la
                # base de datos
                camara_id = int(list(pos.keys())[0].split('-')[0])
                cam = Camara.objects.get(id=camara_id)
                info = json.loads(list(pos.values())[0])
                # Guardamos los datos leidos que se han calculado previamente
                angulo = info['angulo']
                altura = info['altura']
                inclinacion = info['inclinacion']
                rotacion = info['rotacion']
                dmax = info['dmax']
                dmuerta = info['dmuerta']
                # Se crea un objeto de tipo colocada con toda la informacion
                # de la camara y se guarda en el objeto mapa asociado
                c = Colocada.objects.get_or_create(
                    camara=cam,
                    angulo=angulo,
                    altura=altura,
                    inclinacion=inclinacion,
                    rotacion=rotacion,
                    dmax=dmax,
                    dmuerta=dmuerta,
                    x_coord=coordenadas[list(pos.keys())[0]]['lng'],
                    y_coord=coordenadas[list(pos.keys())[0]]['lat'],
                    mapa=map)[0]
                c.save()
        # Se guardan los json de los mapas para que se puedan descargar si
        # el usuario quiere
        with open(os.path.join(STATIC_DIR, FILES_URL, "mapa_" + map.nombre
                  + "_" + str(request.user) + ".json"), "w") as f:
            f.write(json.dumps(data))
        return redirect(reverse('camaras:mapas'))


@login_required(redirect_field_name='login_redirect')
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


@login_required(redirect_field_name='login_redirect')
def camaras(request, camara_id):
    """
    Funcion que es llamada mediante una peticion GET desde el navegador para
    obtener la informacion relacionada con una camara. Por defecto tiene
    altura=4, inclinacion=70º y rotacion=0º
    """
    # Se obtiene la camara y se devuelve un objeto JSON con toda la informacion
    camara = Camara.objects.get(id=camara_id)
    return JsonResponse({
        "id": camara.id,
        "nombre_camara": camara.nombre,
        "resolucion": camara.resolucion,
        "distancia_focal": camara.distancia_focal,
        "sensor": camara.get_sensor_display(),
        "precio": camara.precio,
        "inclinacion": 70,
        "altura": 4,
        "rotacion": 0
    }, status=201)


@login_required(redirect_field_name='login_redirect')
def editarmapa(request, mapa_id):
    """
    Funcion que edita un mapa ya creado previamente
    """
    # Si el metodo es GET
    if request.method == 'GET':
        # Se muestran las camaras ordenadas por distancia focal
        camaras = mostrarCamarasPorFocal()
        # Se muestra la misma pagina que para un mapa nuevo pero se envia
        # una variable con el nombre del mapa, lo que hara que se muestren
        # las camaras automaticamente
        return render(request, "camaras/nuevo.html", {
            "nombre": Mapa.objects.get(id=mapa_id).nombre,
            "mapa": mapa_id,
            "camaras": camaras
        })


def editar(request, mapa_id):
    """
    Funcion que devuelve todas las camaras con sus coordenadas e informacion
    completa cuando se realiza una peticion GET del mapa a editar
    """
    if request.method == 'GET':
        camaras = []
        centro = None
        # Obtenemos el mapa por su id
        try:
            mapa = Mapa.objects.get(id=mapa_id)
        # Si el mapa no existe, la pagina a la que se accede tampoco
        except Mapa.DoesNotExist():
            return HttpResponseNotFound()
        # Se obtienen todas las camaras colocadas en dicho mapa
        c = Colocada.objects.filter(mapa=mapa)
        # Si el mapa no tiene camaras colocadas, el centro se mantiene en None,
        # en caso contrario, se calcula la media de sus coordenadas para
        # centrar el mapa
        if c.count() != 0:
            centro = [sum(punto.x_coord for punto in c)/c.count(),
                      sum(punto.y_coord for punto in c)/c.count()]
        for e in c:
            cam = Camara.objects.get(id=e.camara.id)
            camaras.append({
                "posicion": {"lng": e.x_coord, "lat": e.y_coord},
                "camara_id": cam.id,
                "colocada": e.id,
                "distancia_focal": cam.distancia_focal,
                "sensor": cam.get_sensor_display(),
                "nombre_camara": cam.nombre,
                "precio": cam.precio,
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


@login_required(redirect_field_name='login_redirect')
def importar(request):
    if request.method == 'GET':
        return render(request, "camaras/importar.html")


@login_required(redirect_field_name="login_redirect")
def editarimportado(request, nombre_mapa):
    try:
        mapa = Mapa.objects.get(nombre=nombre_mapa, usuario=request.user)
    except Mapa.DoesNotExist:
        return HttpResponseNotFound()
        # m = Mapa(nombre=nombre_mapa, usuario=request.user)
        # m.save()
    if request.method == 'GET':
        try:
            camaras = Colocada.objects.filter(mapa=mapa)
        except Colocada.DoesNotExist:
            return HttpResponseNotFound()
        return redirect(reverse('camaras:nuevo'), {
            "nombre": nombre_mapa,
            "mapa": mapa.id,
            "camaras": camaras,
        })


@login_required(redirect_field_name='login_redirect')
def eliminar(request):
    if request.method == 'GET':
        return HttpResponseNotFound()  # TODO: mostrar error
    elif request.method == 'POST':
        data = json.loads(request.body)
        try:
            Mapa.objects.get(id=data['eliminar']).delete()
        except(Mapa.DoesNotExist):
            pass
        return redirect(reverse('camaras:mapas'))


@login_required(redirect_field_name='login_redirect')
def miscamaras(request):
    if request.user.is_superuser:
        if request.method == 'GET':
            return render(request, "camaras/miscamaras.html", {
                "camaras": mostrarCamarasPorFocal()
            })
        elif request.method == 'POST':
            data = json.loads(request.body)
            try:
                Camara.objects.get(id=data['eliminar']).delete()
            except(Camara.DoesNotExist):
                pass
            return redirect(reverse('camaras:miscamaras'))
    else:
        # TODO: error de acceso prohibido
        return HttpResponseNotFound()
