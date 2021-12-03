from django.http.response import HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import LoginForm, RegisterForm
from django.contrib.auth import authenticate, login, logout
from .models import Mapa


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
def nuevo(request):
    """
    Funcion que muestra la plantilla para crear un nuevo mapa
    y lo guarda en la base de datos
    """
    # Si el metodo es GET, se muestra el mapa
    if request.method == 'GET':
        
        """
        shp_dir = os.path.join(os.getcwd(), 'media', 'shp')
    # folium
    m = folium.Map(location=[-16.22, -71.59], zoom_start=10)
    # style
    style_basin = {'fillColor': '#228B22', 'color': '#228B22'}
    style_rivers = {'color': 'blue'}
    # adding to view
    folium.GeoJson(os.path.join(shp_dir, 'basin.geojson'), name='basin', style_function=lambda x: style_basin).add_to(m)
    folium.GeoJson(os.path.join(shp_dir, 'rivers.geojson'), name='rivers', style_function=lambda x: style_rivers).add_to(m)
    folium.LayerControl().add_to(m)
    # exporting
    m = m._repr_html_()
    context = {'my_map': m}
    # rendering
    """
        return render(request, "camaras/nuevo.html")


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
