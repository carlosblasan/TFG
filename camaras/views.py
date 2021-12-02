from django.http.response import HttpResponse, HttpResponseNotFound
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from .forms import *
from django.contrib.auth import authenticate, login, logout


def index(request):
    
    return render(request,"camaras/index.html")

def registro(request):
    if request.method == 'GET':
        register_form = RegisterForm()
        return render(request,"camaras/registro.html", {
            "register_form": register_form
        })
    elif request.method == 'POST':
        register_form = RegisterForm(data=request.POST)
        if register_form.is_valid():
            usuario = register_form.save()
            usuario.set_password(usuario.password)
            usuario.save()
            return redirect(reverse("camaras:index"))

        else:
            return HttpResponseNotFound()

def login_view(request):
    if request.method == 'GET':
        login_form = LoginForm()
        return render(request, "camaras/login.html", {
            "login_form": login_form
        })
    elif request.method == 'POST':
        login_form = LoginForm(data=request.POST)

        username = login_form.data['usuario']
        password = login_form.data['password']
        user = authenticate(username=username, password=password)
        
        if user:
            if user.is_active:
                login(request, user)
                return redirect(reverse('camaras:index'))
        return HttpResponseNotFound()

@login_required
def logout_view(request):
    logout(request)
    return redirect(reverse('camaras:index'))
