from django import forms
from django.forms.widgets import PasswordInput
from .models import *

class RegisterForm(forms.ModelForm):
    first_name = forms.CharField(label="Nombre", max_length=128)
    last_name = forms.CharField(label="Apellidos", max_length=128)
    email = forms.EmailField(label="Email")
    username = forms.CharField(label="Nombre de usuario", max_length=128)
    password = forms.CharField(widget=PasswordInput, label="Contraseña")
    confirm_password = forms.CharField(widget=PasswordInput,label="Confirma tu contraseña")

    class Meta:
        model = Usuario
        fields = ('first_name', 'last_name', 'email', 'username', 'password', 'confirm_password')

class LoginForm(forms.Form):
    usuario = forms.CharField(label="Usuario", max_length=128)
    password = forms.CharField(widget=PasswordInput, label="Contraseña", max_length=128)

