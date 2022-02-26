from django import forms
from django.forms.widgets import PasswordInput
from .models import Camara, Usuario


class RegisterForm(forms.ModelForm):
    first_name = forms.CharField(label="Nombre", max_length=128)
    last_name = forms.CharField(label="Apellidos", max_length=128)
    email = forms.EmailField(label="Email")
    username = forms.CharField(label="Nombre de usuario", max_length=128)
    password = forms.CharField(widget=PasswordInput, label="Contraseña")
    repeat_password = forms.CharField(widget=PasswordInput,
                                      label="Confirma tu contraseña")

    class Meta:
        model = Usuario
        fields = ('first_name', 'last_name', 'email',
                  'username', 'password', 'repeat_password')


class LoginForm(forms.Form):
    usuario = forms.CharField(max_length=128)
    password = forms.CharField(widget=PasswordInput,
                               max_length=128)


class CameraForm(forms.ModelForm):
    tup_res = []
    tup_sen = []
    for res in Camara.RESOLUCIONES:
        tup_res.append((res[0], res[1]+" (" + res[0] + ") "))
    for sen in Camara.SENSOR:
        tup_sen.append((sen[0], sen[1]+" (" + sen[0] + "\") "))
    nombre = forms.CharField(label="Nombre cámara", max_length=128)
    distancia_focal = forms.IntegerField(min_value=1, max_value=10)
    resolucion = forms.ChoiceField(
                widget=forms.Select(attrs={'class': "form-select"}),
                choices=tup_res)
    sensor = forms.ChoiceField(widget=forms.Select(
                                            attrs={'class': "form-select"}),
                               choices=tup_sen)
    precio = forms.DecimalField(min_value=0, max_digits=10)

    class Meta:
        model = Camara
        fields = ('nombre', 'precio')
