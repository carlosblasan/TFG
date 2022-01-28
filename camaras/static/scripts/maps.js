// Token de acceso a la API de mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiY2FybG9zYnMiLCJhIjoiY2t3cW56bTA1MG9kNDJ0cW9mYTAyYTluaiJ9.Cf2bC7z5GSVWVZ-Ka7Ji4A'
// Variable booleana que vale true si se esta colocando la camara
let camara = false
// Identificador de la camara
let camara_id = 0
// Identificador del area sombreada de cada camara
let circulo = 0
// Identificador de la camara que se ha colocado en el mapa para asignarle un area sombreada
let colocada = 0
// Array de puntos donde se han colocado las camaras
let puntoscamara = []
// Array de marcadores para el mapa, donde se colocan las camaras
let marker = []
// Variable que almacena la distancia focal de una camara
let dist = 0
// Variable que almacena un valor true si no se permite la ubicacion en el navegador
let error = false
let rot = 0
let inclinacion = 70
let altura = 4
let cameramarker = null
let datos_mapa = null
// Funcion que dado un punto (centro), un angulo en radianes, una distancia en km
// y un numero de puntos (este ultimo parametro es opcional), dibuja el area sombreada
// con centro la ubicacion de la camara
// Referencia: TODO: URL
var createGeoJSONCircle = function(center, angulo, radiusInKm, rotacion, points) {
    // Si no se especifican puntos, se ponen 64 por defecto
    if(!points) points = 64;

    // Se guardan las coordenadas del centro
    var coords = {
        latitude: parseFloat(center[1]),
        longitude: parseFloat(center[0])
    };
    var rot = rotacion*Math.PI/180
    // Se almacena el radio del circulo en km
    var km = radiusInKm;

    // Array que almacenara los puntos que se van a dibujar
    var ret = [];
    
    // Se guarda la distancia horizontal y vertical maxima desde el centro,
    // ajustando segun las coordenadas geograficas
    var distanceX = km/(111.320*Math.cos(coords.latitude*Math.PI/180));
    var distanceY = km/110.574;
    
    // La variable puntos es la mitad de la original para que en total se dibujen los puntos especificados
    var theta, x, y, puntos=points/2;
    // Comenzamos guardando el centro
    ret.push(center)
    
    // Se recorre el arco de circunferencia desde el angulo mitad al original hasta el 0
    for(var i=puntos; i!=0; i--) {
        theta = (i/puntos)*(angulo/2);
        x = distanceX*Math.cos(theta+rot);
        y = distanceY*Math.sin(theta+rot);
        // Se guardan los puntos en ret
        ret.push([coords.longitude+x, coords.latitude+y]);
    }

    // Se recorre el arco de circunferencia desde el 0 hasta el menos angulo mitad al original
    for(var j=0; j<puntos;j++) {
        theta = (j/puntos)*(angulo/2);
        x = distanceX*Math.cos(-theta+rot);
        y = distanceY*Math.sin(-theta+rot);
        // Se guardan los puntos en ret
        ret.push([coords.longitude+x, coords.latitude+y]);
    }
    // Se vuelve a guardar el centro para cerrar el area
    ret.push(ret[0]);
    // Se devuelve el geojson para dibujar el area
    return {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [ret]
                }
            }]
        }
    };
};


// Funcion que pone la variable camara a true si lo que se ha añadido es una camara al mapa
function colocaCamara(cam){
    camara = true
    camara_id = cam
}


function solicita_info(camara_id){
    var result = null;
    $.ajax({
        url: `/camaras/${camara_id}`,
        type: 'get',
        dataType: 'JSON',
        async: false,
        contentType: "application/json",
        success: function(response) {
            result = response
        }
    })
    return result
}

function cargamapa(mapa_id){
    window.localStorage.clear()
    $.ajax({
        url: `/editar/${mapa_id}`,
        type: 'get',
        dataType: 'JSON',
        async: false,
        contentType: "application/json",
        success: function(response) {
            window.localStorage.setItem("mapa_".concat(mapa_id), JSON.stringify(response))
        }
    })
    
}

const draw = new MapboxDraw({
    displayControlsDefault: false,
    // Select which mapbox-gl-draw control buttons to add to the map.
    controls: {
        polygon: true,
        trash: true
    },
    
});
// Funcion que obtiene el valor de la cookie dada por su nombre
// Referencia: https://docs.djangoproject.com/en/dev/ref/csrf/#:~:text=function%20getCookie(name)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
function enviaVariable(nombre_mapa) {
    let respuesta = window.prompt("Introduce un nombre para el mapa. Si ya existe, se reemplazará.",nombre_mapa)
    console.log(window.sessionStorage)
    fetch('/nuevo', {
        method:'POST',
        redirect: 'follow',
        headers: { 
            "X-CSRFToken": getCookie('csrftoken'), 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
           },
        body: JSON.stringify({"nombre":respuesta, "content": window.sessionStorage}),
        
    }).then(response=> {
        if (response.redirected) {
            window.location.href = response.url;
       }
    });

}


function get_data(inclinacion, dist, altura, h) {
    // Angulo del campo de vision
    angulo = 2*Math.atan(h/(2*dist))
    // Angulo a grados
    angulo = angulo*180/Math.PI       
    // Se calcula la distancia muerta
    dmuerta = altura*Math.tan((inclinacion-(angulo/2))*Math.PI/180)
    // Se calcula el angulo total, incluyendo inclinacion de la camara y angulo de apertura
    angulototal = (angulo/2)+inclinacion
    if(angulototal==90) {
        // Para evitar calcular la tangente de 90
        if(altura==0){
            // Para evitar que salga 0
            dmax = Math.tan(89*Math.PI/180)
        } else {
            dmax = altura*Math.tan(89*Math.PI/180)
        }
    } else {
        if(angulototal>90){
            // Para que no salgan valores negativos
            angulototal = 180-angulototal
        }
        // Se calcula la distancia maxima
        dmax = altura*Math.tan(angulototal*Math.PI/180)
    }
    // Se deja el angulo en radianes para dibujar el area posteriormente
    if(dmuerta<0){
        dmuerta=0
    }
    if(dmax<0){
        dmax=0
    }
    angulo = angulo*Math.PI/180

}
function borraCirculos(map,id) {
    map.removeLayer('circle'.concat(id))
    map.removeSource('circle'.concat(id))
    map.removeLayer('dead_circle'.concat(id))
    map.removeSource('dead_circle'.concat(id))
}

function dibujaCirculos(map, id, longlat, angulo, dmax, dmuerta, rot) {
    map.addSource("circle".concat(id), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmax/1000, rot));
    map.addLayer({
        "id": "circle".concat(id),
        "type": "fill",
        "source": "circle".concat(id),
        "layout": {},
        "paint": {
            "fill-color": "#FFAB03",
            "fill-opacity": 0.3
        }
    });
    map.addSource("dead_circle".concat(id), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmuerta/1000, rot));
    map.addLayer({
        "id": "dead_circle".concat(id),
        "type": "fill",
        "source": "dead_circle".concat(id),
        "layout": {},
        "paint": {
            "fill-color": "#F5F9FF",
            "fill-opacity": 0.3
        }
    });
    //console.log(map.getCanvas().toDataURL())
}

function crea_camara(map,longlat, carga_mapa) {
    if(!carga_mapa){
        rot=0
        colocada++                               
    }
    el = document.createElement('div')
    el.className = 'marker';
    el.id = camara_id.toString().concat("-").concat(colocada)
    el.style.backgroundImage = 'url(/static/images/cam_icon.svg)'
    el.style.backgroundRepeat = "no-repeat";
    el.style.textAlign = 'center'
    el.style.width = '20px';
    el.style.height = '20px'
    m=new mapboxgl.Marker(el)
    m.setDraggable(true)
    position_id = ''.concat(camara_id).concat('-').concat(colocada)
    puntoscamara.push({type:"Camara",geometry:{type:"Point",coordinates:[longlat.lng,longlat.lat]}})
    camara=false
    window.sessionStorage.setItem("posicion_".concat(position_id), JSON.stringify({"posicion":longlat}))
    m.setLngLat([longlat.lng,longlat.lat]).addTo(map);
    marker.push({"position_id": position_id, "marker":m})
    m.getElement().addEventListener('click', (e) => {
        longlat = JSON.parse(window.sessionStorage.getItem("posicion_".concat(e.target.id))).posicion
        camara_id = parseInt(e.target.id.split('-')[0])
        colocada = parseInt(e.target.id.split('-')[1])
        datos=solicita_info(camara_id)
        get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        editar(datos, e.target.id)
        
    })
    m.on('dragstart', function(e){
        camara_id = e.target._element.id.split('-')[0]
        colocada = e.target._element.id.split('-')[1]
        datos=solicita_info(camara_id)
        get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        editar(datos, e.target._element.id)
        borraCirculos(map, e.target._element.id)
    })
    m.on('dragend', function(e) {
        camara_id = e.target._element.id.toString().split('-')[0]
        colocada = e.target._element.id.toString().split('-')[1]
        datos=solicita_info(camara_id)
        let altura = parseInt(document.getElementById("altura_camara").innerHTML)
        let inclinacion = parseInt(document.getElementById("inclinacion_camara").innerHTML)
        let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
        get_data(inclinacion, datos.distancia_focal, altura, datos.sensor.split("x")[0])
        longlat = e.target._lngLat
        position_id = ''.concat(camara_id).concat('-').concat(colocada)
        window.sessionStorage.setItem("posicion_".concat(position_id), JSON.stringify({"posicion":longlat}))
        editar(datos, e.target._element.id)
        dibujaCirculos(map, e.target._element.id, longlat, angulo, dmax, dmuerta,rotacion)
    }) 

    if(carga_mapa){
        m.setRotation(-rot)
        dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta,rot) 
    }
}


function cargar_mapa(map, info_mapa) {
    map.setCenter(info_mapa.centro)
    let lista_camaras = info_mapa.camaras
    console.log(lista_camaras)
    for(i=0;i<lista_camaras.length;i++){
        camara_actual = lista_camaras[i]
        camara_id = camara_actual.camara_id
        colocada = camara_actual.colocada
        angulo = camara_actual.angulo
        dmax = camara_actual.dmax
        dmuerta = camara_actual.dmuerta 
        rot = parseInt(camara_actual.rotacion)
        crea_camara(map, lista_camaras[i].posicion,true)
    }
}

// Inicializa el mapa que se va a mostrar en la web
const map_init = ubicacion => {
    window.sessionStorage.clear();
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/streets-v11', // style URL
        center: [-3.7031068, 40.4166275], // starting position [lng, lat]
        zoom: 16, // starting zoom
        preserveDrawingBuffer: true
        
    });
    if(!error){
        map.setCenter([ubicacion.coords.longitude, ubicacion.coords.latitude])
        map.setZoom(18)
    }
    document.getElementById("estilo_mapa").onclick = function(){   
        text = document.getElementById("estilo_mapa").innerHTML
        if(text.search("sat")>=0) {
            document.getElementById("estilo_mapa").innerHTML = "Vista de mapa"
            map.setStyle('mapbox://styles/mapbox/satellite-v9');
            
        } else {
            document.getElementById("estilo_mapa").innerHTML = "Vista de satélite"
            map.setStyle('mapbox://styles/mapbox/streets-v11');
        }
    }
    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken
    }));
    map.addControl(new mapboxgl.NavigationControl());
    map.on('load', ()=>{
        let map_id = document.getElementById("edit_mapa_id").innerHTML
        if(window.localStorage.getItem("mapa_".concat(map_id))){
            cargar_mapa(map, JSON.parse(window.localStorage.getItem("mapa_".concat(map_id))))
        }
    })
    map.on('mousemove', (e) => {
        
        document.getElementById('map').onclick = function() {
            if(camara){
                longlat = e.lngLat.wrap()
                crea_camara(map,longlat,false)
                
                datos=solicita_info(camara_id)
                get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                info = {
                    "angulo": angulo,
                    "altura": datos.altura,
                    "inclinacion": datos.inclinacion,
                    "rotacion": datos.rotacion,
                    "dmax": Math.floor(dmax),
                    "dmuerta": Math.floor(dmuerta)
                }
                
                window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))                
                editar(datos, ''.concat(camara_id).concat("-").concat(colocada))
                rot = datos.rotacion
                document.getElementById("altura").oninput=function(e){
                    let inclinacion = parseInt(document.getElementById("inclinacion_camara").innerHTML)
                    let alt = document.getElementById("altura_camara")
                    let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
                    alt.innerHTML = e.srcElement.value
                    //datos=solicita_info(camara_id)
                    get_data(inclinacion, datos.distancia_focal, parseInt(e.srcElement.value), datos.sensor.split("x")[0])
                    borraCirculos(map, ''.concat(camara_id).concat("-").concat(colocada))
                    dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, rotacion)
                    info = {
                        "angulo": angulo,
                        "altura": parseInt(e.srcElement.value),
                        "inclinacion": inclinacion,
                        "rotacion": rot,
                        "dmax": Math.floor(dmax),
                        "dmuerta": Math.floor(dmuerta)
                    }
                    
                    window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                    document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                    document.getElementById("dmax").innerHTML = Math.floor(dmax)
                    document.getElementById("rotacion_camara").innerHTML = rot
                }
                editar(datos,''.concat(camara_id).concat("-").concat(colocada))
                document.getElementById("inclinacion").oninput=function(e){
                    
                    let inc = document.getElementById("inclinacion_camara")
                    inc.innerHTML = e.srcElement.value
                    let altura = parseInt(document.getElementById("altura_camara").innerHTML)
                    let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
                    get_data(parseInt(e.srcElement.value), datos.distancia_focal, altura, datos.sensor.split("x")[0])
                    borraCirculos(map,''.concat(camara_id).concat("-").concat(colocada))            
                    dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, rotacion)
                    info = {
                        "angulo": angulo,
                        "altura": altura,
                        "inclinacion": parseInt(e.srcElement.value),
                        "rotacion": rot,
                        "dmax": Math.floor(dmax),
                        "dmuerta": Math.floor(dmuerta)
                    }
                    
                    window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                    document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                    document.getElementById("dmax").innerHTML = Math.floor(dmax)
                    document.getElementById("rotacion_camara").innerHTML = rot
                }
                editar(datos,''.concat(camara_id).concat("-").concat(colocada))
                document.getElementById("rotacion").oninput=function(e){
                    rot = parseInt(e.srcElement.value)
                    for(i=0;i<marker.length;i++){
                        if(marker[i].position_id==''.concat(camara_id).concat("-").concat(colocada)){
                            marker[i].marker.setRotation(-parseInt(e.srcElement.value))
                        }
                    }
                                       
                    let inc = document.getElementById("rotacion_camara")
                    inc.innerHTML = e.srcElement.value
                    let altura = parseInt(document.getElementById("altura_camara").innerHTML)
                    let inclinacion = parseInt(document.getElementById("inclinacion_camara").innerHTML)
                    get_data(inclinacion, datos.distancia_focal, altura, datos.sensor.split("x")[0])
                    borraCirculos(map,''.concat(camara_id).concat("-").concat(colocada))            
                    dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, parseInt(e.srcElement.value))
                    info = {
                        "angulo": angulo,
                        "altura": altura,
                        "inclinacion": inclinacion,
                        "rotacion": parseInt(e.srcElement.value),
                        "dmax": Math.floor(dmax),
                        "dmuerta": Math.floor(dmuerta)
                    }
                    
                    window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                    document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                    document.getElementById("dmax").innerHTML = Math.floor(dmax)
                    document.getElementById("rotacion").value = parseInt(e.srcElement.value)
                }
                
                dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta,rot) 
            }
        }
    });
    map.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: true,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            showUserHeading: true
        })
    );
    map.addControl(draw);
    console.log(window.localStorage)
}


if ("geolocation" in navigator) {
    if(document.getElementById('map')){
        const onErrorDeUbicacion = err => {
            error = true
            map_init()        
        }

        const opcionesDeSolicitud = {
            enableHighAccuracy: true, // Alta precisión
            maximumAge: 0, // No queremos caché
            timeout: 5000 // Esperar solo 5 segundos
        };
        // Solicitar
        navigator.geolocation.getCurrentPosition(map_init, onErrorDeUbicacion, opcionesDeSolicitud);
    }        
} else {
    onErrorDeUbicacion()
}


// Referencias: https://parzibyte.me/blog/2019/08/09/acceder-ubicacion-javascript/
function editar(datos, id) {
    document.getElementById("editar").style.display = 'block'
    let lateral = document.getElementById("lateral");
    let nombre = document.getElementById("nombre_camara")
    let dist = document.getElementById("dist_focal")
    let angl = document.getElementById("angulo")
    document.getElementById("rotacion").value = datos.rotacion
    document.getElementById("rotacion_camara").innerHTML = datos.rotacion
    document.getElementById("altura").value = datos.altura
    document.getElementById("altura_camara").innerHTML = datos.altura
    document.getElementById("inclinacion").value = datos.inclinacion
    document.getElementById("inclinacion_camara").innerHTML = datos.inclinacion
    document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
    document.getElementById("dmax").innerHTML = Math.floor(dmax)
    nombre.innerHTML = datos.nombre
    dist.innerHTML= datos.distancia_focal;
    angl.innerHTML = Math.floor(angulo*180/Math.PI)
    if(window.sessionStorage.getItem(id)){
        let j = JSON.parse(window.sessionStorage.getItem(id))
        document.getElementById("inclinacion").value = j.inclinacion
        document.getElementById("inclinacion_camara").innerHTML = j.inclinacion
        document.getElementById("altura").value = j.altura
        document.getElementById("altura_camara").innerHTML = j.altura
        document.getElementById("rotacion").value = j.rotacion
        document.getElementById("rotacion_camara").innerHTML = j.rotacion
        document.getElementById("dmuerta").innerHTML = j.dmuerta
        document.getElementById("dmax").innerHTML = j.dmax
    }

    

    //alt.setAttribute("min", Math.floor(dmuerta))
    //alt.setAttribute("max", Math.floor(dmax))
    
    
    // Mejor setstyle y le pongo display para que este oculto y lo haga desde python
}

