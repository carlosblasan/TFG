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
let error = false
// Funcion que dado un punto (centro), un angulo en radianes, una distancia en km
// y un numero de puntos (este ultimo parametro es opcional), dibuja el area sombreada
// con centro la ubicacion de la camara
// Referencia: TODO: URL
var createGeoJSONCircle = function(center, angulo, radiusInKm, points) {
    // Si no se especifican puntos, se ponen 64 por defecto
    if(!points) points = 64;

    // Se guardan las coordenadas del centro
    var coords = {
        latitude: center[1],
        longitude: center[0]
    };

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
        x = distanceX*Math.cos(theta);
        y = distanceY*Math.sin(theta);
        // Se guardan los puntos en ret
        ret.push([coords.longitude+x, coords.latitude+y]);
    }

    // Se recorre el arco de circunferencia desde el 0 hasta el menos angulo mitad al original
    for(var j=0; j<puntos;j++) {
        theta = (j/puntos)*(angulo/2);
        x = distanceX*Math.cos(-theta);
        y = distanceY*Math.sin(-theta);
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
function enviaVariable() {  
    fetch('/nuevo', {
        method:'POST',
        // TODO: Ver como mandar todo
        body: JSON.stringify(JSON.stringify(puntoscamara)+","+draw.getAll()),
        headers: { "X-CSRFToken": getCookie('csrftoken'), 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
           },
    });
    
}

function get_data(inclinacion, dist, altura, h) {
    dmuerta = altura*Math.tan(inclinacion*Math.PI/180)
    angulo = 2*Math.atan(h/(2*dist))  //Angulo del campo de vision
    angulo = angulo*180/Math.PI
    angulototal = (angulo/2)+inclinacion
    if(angulototal==90) {
        if(altura==0){
            dmax = Math.tan(89*Math.PI/180)
        } else {
            dmax = altura*Math.tan(89*Math.PI/180)
        }
    } else {
        if(angulototal>90){
            angulototal = 180-angulototal
        }
        dmax = altura*Math.tan(angulototal*Math.PI/180)
    }
    angulo = angulo*Math.PI/180
}


// Inicializa el mapa que se va a mostrar en la web
const map_init = ubicacion => {
    
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/streets-v11', // style URL
        center: [-3.7031068, 40.4166275], // starting position [lng, lat]
        zoom: 16 // starting zoom
        
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
    
    map.on('mousemove', (e) => {
        
        document.getElementById('map').onclick = function() {
            if(camara){
                colocada++
                longlat=e.lngLat.wrap()
                // Create a new marker.
                                
                el = document.createElement('div')
                el.className = 'marker';
                el.id = camara_id.toString().concat("-").concat(colocada)
                el.style.backgroundImage = 'url(static/images/cam_icon.svg)'
                el.style.backgroundRepeat = "no-repeat";
                el.style.textAlign = 'center'
                el.style.width = '20px';
                el.style.height = '20px'
                 
                m=new mapboxgl.Marker(el)
                m.setDraggable(true)
                puntoscamara.push({type:"Camara",geometry:{type:"Point",coordinates:[longlat.lng,longlat.lat]}})
                camara=false
                //m.setPopup(new mapboxgl.Popup().setHTML("Incluir info y pulse <a onclick=\"editar()\">aqui</a> para editar."))
                m.setLngLat([longlat.lng,longlat.lat]).addTo(map);
                m.getElement().addEventListener('click', (e) => {
                    datos=solicita_info(e.target._element.id.split('-')[0])
                    get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                    editar(datos)
                })
                m.on('dragstart', function(e){
                    datos=solicita_info(e.target._element.id.split('-')[0])
                    get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                    editar(datos)
                    map.removeLayer('circle'.concat(e.target._element.id))
                    map.removeSource('circle'.concat(e.target._element.id))
                    map.removeLayer('dead_circle'.concat(e.target._element.id))
                    map.removeSource('dead_circle'.concat(e.target._element.id))
                })
                datos=solicita_info(camara_id)
                get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                editar(datos)
                console.log(dmax)
                console.log(dmuerta)
                console.log(angulo)
                m.on('dragend', function(e) {
                    camara_id = e.target._element.id.toString().split('-')[0]
                    datos=solicita_info(camara_id)
                    get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                    longlat = e.target._lngLat
                    map.addSource("circle".concat(e.target._element.id), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmax/1000));
                    map.addLayer({
                        "id": "circle".concat(e.target._element.id),
                        "type": "fill",
                        "source": "circle".concat(e.target._element.id),
                        "layout": {},
                        "paint": {
                            "fill-color": "#FFAB03",
                            "fill-opacity": 0.3
                        }
                    });
                    map.addSource("dead_circle".concat(e.target._element.id), createGeoJSONCircle([longlat.lng, longlat.lat], angulo, dmuerta/1000))
                    map.addLayer({
                        "id": "dead_circle".concat(e.target._element.id),
                        "type": "fill",
                        "source": "dead_circle".concat(e.target._element.id),
                        "layout": {},
                        "paint": {
                            "fill-color": "#F5F9FF",
                            "fill-opacity": 0.3
                        }
                    });
                });
            
                map.addSource("circle".concat(camara_id).concat("-").concat(colocada), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmax/1000));
                map.addLayer({
                    "id": "circle".concat(camara_id).concat("-").concat(colocada),
                    "type": "fill",
                    "source": "circle".concat(camara_id).concat("-").concat(colocada),
                    "layout": {},
                    "paint": {
                        "fill-color": "#FFAB03",
                        "fill-opacity": 0.3
                    }
                });
                map.addSource("dead_circle".concat(camara_id).concat("-").concat(colocada), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmuerta/1000));
                map.addLayer({
                    "id": "dead_circle".concat(camara_id).concat("-").concat(colocada),
                    "type": "fill",
                    "source": "dead_circle".concat(camara_id).concat("-").concat(colocada),
                    "layout": {},
                    "paint": {
                        "fill-color": "#F5F9FF",
                        "fill-opacity": 0.3
                    }
                });
                
            }  
        };
        
        
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
    
}


if ("geolocation" in navigator) {
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
    
} else {
    onErrorDeUbicacion()
}


// Referencias: https://parzibyte.me/blog/2019/08/09/acceder-ubicacion-javascript/
function editar(datos) {
    console.log(document.getElementById("editar"))
    document.getElementById("editar").style.display = 'block'
    let lateral = document.getElementById("lateral");
    let nombre = document.getElementById("nombre_camara")
    let dist = document.getElementById("dist_focal")
    let angl = document.getElementById("angulo")
    let alt = document.getElementById("altura")
    nombre.innerHTML = datos.nombre
    dist.innerHTML= datos.distancia_focal;
    angl.innerHTML = Math.floor(angulo*180/Math.PI)
    alt.setAttribute("min", Math.floor(dmuerta))
    alt.setAttribute("max", Math.floor(dmax))
    
    
    // Mejor setstyle y le pongo display para que este oculto y lo haga desde python
}

function slide(e){
        get_data(datos.inclinacion, datos.distancia_focal, e.value[0], datos.sensor.split("x")[0])
        map.removeLayer('dead_circle'.concat(datos.id).concat("-").concat(datos.colocada))
        map.removeSource('dead_circle'.concat(datos.id).concat("-").concat(datos.colocada))
        map.addSource("circle".concat(datos.id).concat("-").concat(datos.colocada), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmax/1000));
        map.addLayer({
            "id": "circle".concat(datos.id).concat("-").concat(datos.colocada),
            "type": "fill",
            "source": "circle".concat(datos.id).concat("-").concat(datos.colocada),
            "layout": {},
            "paint": {
                "fill-color": "#FFAB03",
                "fill-opacity": 0.3
            }
        });
        map.addSource("dead_circle".concat(datos.id).concat("-").concat(datos.colocada), createGeoJSONCircle([longlat.lng,longlat.lat], angulo, dmuerta/1000));
        map.addLayer({
            "id": "dead_circle".concat(datos.id).concat("-").concat(datos.colocada),
            "type": "fill",
            "source": "dead_circle".concat(datos.id).concat("-").concat(datos.colocada),
            "layout": {},
            "paint": {
                "fill-color": "#F5F9FF",
                "fill-opacity": 0.3
            }
        });
    }