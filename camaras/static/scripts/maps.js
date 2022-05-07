// TFG
// Autor: Carlos Blanco Santero
// Tutor: Eduardo Cermeño

//import { default as html2canvas } from "../../node_modules/html2canvas/dist/html2canvas.min.js"

//const { default: html2canvas } = require("html2canvas")

//canvas2html = require("canvas2html")
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
// Variable que indica la rotacion del dibujo del area de la camara
let rot = 0
// Variable que indica la inclinacion de la camara
let inclinacion = 70
// Variable que indica la altura de la camara
let altura = 4
// Variable que indica si se puede cambiar el estilo del mapa o no de street a satellite
let estilo = true
// Vista previa del mapa
let imagen = null
// Objeto json que carga el mapa cuando se importa desde un fichero
let mapaDesdeJSON = false
let sensor = null;
let precio = null;
let nombre_camara = null;
let distancia_focal = null;
let poligono = false
let colocada_prev = 0
let no_entrar = false

/** Funcion que dado un punto (centro), un angulo en radianes, una distancia en km
 * y un numero de puntos (este ultimo parametro es opcional), dibuja el area sombreada
 * con centro la ubicacion de la camara
 *  Referencia: TODO: URL
 */
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
function colocaCamara(cam_id){

    camara = true
    camara_id = cam_id
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


// var modes = MapboxDraw.modes;
// modes.static = this.setActionableState(); // default actionable state is false for all actions

const modes = MapboxDraw.modes;
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
    // window.localStorage.removeItem("token")
    html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
    let respuesta = window.prompt("Introduce un nombre para el mapa. Si ya existe, se reemplazará.",nombre_mapa)
    if(!respuesta){
        return
    }

    let p = parseFloat(document.getElementById("precio_mapa").innerHTML)
    // html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas=>{
    //     document.getElementById("descargar_".concat(nombre_mapa)).href = JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}).replace("image/png", "image/octet-stream"); 
    //     //document.getElementById()
    // })
    imagen = JSON.parse(window.localStorage.getItem("token")).imagen

    // imagen = null
    fetch('/nuevo', {
        method:'POST',
        redirect: 'follow',
        headers: { 
            "X-CSRFToken": getCookie('csrftoken'), 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
           },
        body: JSON.stringify({"nombre":respuesta, "content": window.sessionStorage, "imagen":imagen, "precio": p}),
    }).then(response=> {
        if (response.redirected) {
            window.location.href = response.url;
       }
    });

}


function get_data(inclinacion, dist, altura, h) {
    sensor = h
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
        "layout": {'visibility': 'visible'},
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
        "layout": {'visibility': 'visible'},
        "paint": {
            "fill-color": "#9C1C00",
            "fill-opacity": 0.3
        }
    });
}

function eliminarMapa(map_id) {
    fetch(`/eliminar`, {
        method:'POST',
        redirect: 'follow',
        headers: { 
            "X-CSRFToken": getCookie('csrftoken'), 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
        body: JSON.stringify({"eliminar": map_id}),
    }).then(response=> {
        window.location.href = response.url;
    })
}

function eliminarCamara(cam_id) {
    fetch(`/miscamaras`, {
        method:'POST',
        redirect: 'follow',
        headers: { 
            "X-CSRFToken": getCookie('csrftoken'), 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
        body: JSON.stringify({"eliminar": cam_id}),
    }).then(response=> {
        window.location.href = response.url;
    })
}


function cargaInfo() {
    return info = {
        "angulo": angulo,
        "altura": altura,
        "inclinacion": inclinacion,
        "rotacion": rotacion,
        "dmax": Math.floor(dmax),
        "dmuerta": Math.floor(dmuerta),
        "sensor": sensor,
        "distancia_focal": distancia_focal,
        "nombre_camara": nombre_camara,
        "precio": precio
    }
}


function crea_camara(map,longlat, carga_mapa, camara_actual, trae_rotacion) {  
    estilo = false
    document.getElementById("estilo_mapa").onclick = function(){void(0)}
    document.getElementById("estilo_mapa").style.color = "#E5E6FF"
    if(!carga_mapa){
        rot=0
        colocada = colocada_prev
        colocada++  
        colocada_prev = colocada                             
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
    window.sessionStorage.setItem("posicion_".concat(position_id), JSON.stringify({"posicion":longlat}))
    if(!carga_mapa){
        datos=solicita_info(camara_id)
        sensor = datos.sensor
        get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        angulo = angulo
        altura = datos.altura
        inclinacion = datos.inclinacion
        rotacion = datos.rotacion
        dmax = Math.floor(dmax)
        dmuerta = Math.floor(dmuerta)
        precio = datos.precio
        nombre_camara = datos.nombre_camara
        distancia_focal = datos.distancia_focal
    } else {
        sensor = camara_actual.sensor
        get_data(camara_actual.inclinacion, camara_actual.distancia_focal, camara_actual.altura, camara_actual.sensor.split("x")[0])
        angulo = angulo
        altura = camara_actual.altura
        inclinacion = camara_actual.inclinacion
        rotacion = camara_actual.rotacion
        dmax = Math.floor(dmax)
        dmuerta = Math.floor(dmuerta)
        precio = camara_actual.precio
        nombre_camara = camara_actual.nombre_camara
        distancia_focal = camara_actual.distancia_focal
    }
    if(trae_rotacion){
        rotacion=trae_rotacion
        rot = trae_rotacion
    }

    
    info = cargaInfo()
    window.sessionStorage.setItem(position_id, JSON.stringify(info))
    prec = parseFloat(document.getElementById("precio_mapa").innerHTML)
    if(!prec){
        prec = 0
    }
    document.getElementById("precio_mapa").innerHTML = prec + parseFloat(info.precio)
    m.setLngLat([longlat.lng,longlat.lat]).addTo(map);
    marker.push({"position_id": position_id, "marker":m})
    var ul = document.getElementById("lista_anadidas")
    if(ul.getElementsByTagName('h5').length>0){
        ul.removeChild(document.getElementById("nocamaras"))
    }
    var li = document.createElement("li")
    li.setAttribute("class", "list-group-item camaras_lista_anadidas")
    li.setAttribute("cursor", "pointer")
    li.id = "lista_".concat(position_id)
    li.innerHTML = info.nombre_camara
    li.onclick = function(){
        pos_id = li.id
        camara_id = pos_id.split("_")[1].split("-")[0]
        colocada = pos_id.split("_")[1].split("-")[1]
        datos=solicita_info(camara_id)
        get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        precio = datos.precio
        editar(datos, pos_id)
    }
    ul.appendChild(li)

    m.getElement().addEventListener('click', (e) => {
        longlat = JSON.parse(window.sessionStorage.getItem("posicion_".concat(e.target.id))).posicion
        camara_id = parseInt(e.target.id.split('-')[0])
        colocada_prev = colocada
        colocada = parseInt(e.target.id.split('-')[1])
        datos=solicita_info(camara_id)
        if(datos){
            nombre_camara = datos.nombre_camara
            distancia_focal = datos.distancia_focal
            sensor = datos.sensor
            precio = datos.precio
        }
        

        if(carga_mapa){
            datos = cargaInfo()
        }   
        get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        
        editar(datos, e.target.id)
        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
    })
    m.on('dragstart', function(e){
        colocada_prev = colocada
        camara_id = e.target._element.id.split('-')[0]
        colocada = e.target._element.id.split('-')[1]
        if(!carga_mapa){
            datos=solicita_info(camara_id)
            get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
            if(datos){
                nombre_camara = datos.nombre_camara
                distancia_focal = datos.distancia_focal
                sensor = datos.sensor
                precio = datos.precio
            }
        } else{
            get_data(camara_actual.inclinacion, camara_actual.distancia_focal, camara_actual.altura, camara_actual.sensor.split("x")[0])
            nombre_camara = camara_actual.nombre_camara
            distancia_focal= camara_actual.distancia_focal
            sensor = camara_actual.sensor
            precio = camara_actual.precio
            datos = cargaInfo()
        } 
        
        
        editar(datos, e.target._element.id)
        borraCirculos(map, e.target._element.id)
    })
    m.on('dragend', function(e) {
        colocada_prev = colocada
        camara_id = e.target._element.id.toString().split('-')[0]
        colocada = e.target._element.id.toString().split('-')[1]
        if(!carga_mapa){
            datos=solicita_info(camara_id)
            if(datos){
                nombre_camara = datos.nombre_camara
                distancia_focal = datos.distancia_focal
                sensor = datos.sensor
                precio = datos.precio
            }
            get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
        } else{
            get_data(camara_actual.inclinacion, camara_actual.distancia_focal, camara_actual.altura, camara_actual.sensor.split("x")[0])
            nombre_camara = camara_actual.nombre_camara
            distancia_focal= camara_actual.distancia_focal
            sensor = camara_actual.sensor
            precio = camara_actual.precio
            datos = cargaInfo()
        } 
        let altura = parseInt(document.getElementById("altura_camara").innerHTML)
        let inclinacion = parseInt(document.getElementById("inclinacion_camara").innerHTML)
        let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
        //get_data(inclinacion, datos.distancia_focal, altura, datos.sensor.split("x")[0])
        longlat = e.target._lngLat
        position_id = ''.concat(camara_id).concat('-').concat(colocada)
        window.sessionStorage.setItem("posicion_".concat(position_id), JSON.stringify({"posicion":longlat}))     
        editar(datos, e.target._element.id)
        dibujaCirculos(map, e.target._element.id, longlat, angulo, dmax, dmuerta,rotacion)
        imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})

    }) 

    if(carga_mapa || poligono){
        poligono = false
        m.setRotation(-rot)
        dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta,rot) 
        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})

    }
    document.getElementById("eliminar_camara_mapa").addEventListener("click", ()=>{

        position_id = ''.concat(camara_id).concat('-').concat(colocada)
        if(marker.filter((i)=>i.position_id === position_id).length>0){ 
            borraCirculos(map, position_id)
            //m.remove()
            
            prec = parseFloat(document.getElementById("precio_mapa").innerHTML)
            document.getElementById("precio_mapa").innerHTML = prec - precio
            document.getElementById(position_id).remove()
            document.getElementById("editar").style.display = "none"
            marker=marker.filter((item) => item.position_id !== position_id)
            var ul = document.getElementById("lista_anadidas")
            ul.removeChild(document.getElementById("lista_".concat(position_id)))
            if(ul.getElementsByTagName('li').length == 0){
                h5 = document.createElement("h5")
                h5.id = "nocamaras"
                h5.innerHTML = "Ninguna cámara añadida"
                ul.append(h5)
            }
        }
        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
                            // This code will run once the promise has completed
                            window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));
                            })
    
    })
}


function handleFiles() {
    var fileToLoad = document.getElementById("inputfile").files[0];
    var fileReader = new FileReader();
    var contiene = false;
    camaras = []
    fileReader.readAsText(fileToLoad, "UTF-8");
    
    fileReader.onload = function(fileLoadedEvent){
        var content = JSON.parse(fileLoadedEvent.target.result);
        // Si el conjunto de claves solo contiene "posicion_" entonces se hace una llamada a 
        // la API para obtener datos adicionales sobre cada camara
        for(i=0;i<Object.keys(content.content).length;i++){
            if(Object.keys(content.content)[i].includes("posicion")){
                contiene = true;
            }
        }

        if(contiene) {
            numCamaras = 0
            c1 = 0
            c2 = 0
            for(i=0;i<Object.keys(content.content).length;i++){
                if(!Object.keys(content.content)[i].includes("posicion")){
                    numCamaras++
                    pos = "posicion_".concat(Object.keys(content.content)[i])
                    posicion = content.content[pos]
                    info_cam = solicita_info(parseInt(Object.keys(content.content)[i].split('-')[0]))
                    c1 += parseFloat(JSON.parse(posicion).posicion.lng)
                    c2 += parseFloat(JSON.parse(posicion).posicion.lat)
                    datos_camara = JSON.parse(content.content[Object.keys(content.content)[i]])
                    camaras.push({
                        "posicion": JSON.parse(posicion).posicion,
                        "camara_id": info_cam.id,
                        "colocada": Object.keys(content.content)[i].split('-')[1],
                        "distancia_focal": info_cam.distancia_focal,
                        "precio": info_cam.precio,
                        "sensor": info_cam.sensor,
                        "nombre_camara": info_cam.nombre_camara,
                        "angulo": datos_camara.angulo,
                        "inclinacion": datos_camara.inclinacion,
                        "rotacion": datos_camara.rotacion,
                        "altura": datos_camara.altura,
                        "dmax": datos_camara.dmax,
                        "dmuerta": datos_camara.dmuerta
                    })
                }
            }
            centro = {"lng":c1/numCamaras, "lat": c2/numCamaras}
            info = {
                "centro": centro,
                "camaras": camaras
            }
            window.localStorage.setItem("mapa_JSON", JSON.stringify(info))
            window.localStorage.setItem("desde_JSON", true)
            window.location.href = "/nuevo";

        }
    }; 
          
}


function cargar_mapa(map, info_mapa) {
    if(info_mapa.centro){
        map.setCenter(info_mapa.centro)
    }
    let lista_camaras = info_mapa.camaras
    for(i=0;i<lista_camaras.length;i++){
        camara_actual = lista_camaras[i]
        camara_id = camara_actual.camara_id
        colocada = camara_actual.colocada
        angulo = camara_actual.angulo
        dmax = camara_actual.dmax
        dmuerta = camara_actual.dmuerta 
        rot = parseInt(camara_actual.rotacion)
        sensor = camara_actual.sensor
        precio = camara_actual.precio
        nombre_camara = camara_actual.nombre_camara
        distancia_focal = camara_actual.distancia_focal 
        crea_camara(map, lista_camaras[i].posicion,true, lista_camaras[i], null)
    }
    // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
    html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
            // This code will run once the promise has completed
            window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")})) 
        })
        
}



// Inicializa el mapa que se va a mostrar en la web
const map_init = ubicacion => {
    window.sessionStorage.clear();

    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/streets-v11', // style URL
        center: [-3.7031068, 40.4166275], // starting position [lng, lat]
        zoom: 16, // starting zoom
        preserveDrawingBuffer: true,
        preferCanvas: true
        
    });
    if(!error){
        map.setCenter([ubicacion.coords.longitude, ubicacion.coords.latitude])
        map.setZoom(18)
    }
    // Canvas2Image.saveAsPNG(imagen)

    if(estilo) {
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
    }

    /**
     * Si se introducen las coordenadas para centrar el mapa
     */
    document.getElementById("boton_coords_centro").onclick = function(){
        let long = document.getElementById("long_centro").value
        let lat = document.getElementById("lat_centro").value
        if(long && lat) {
            if(Math.abs(long) <= 180 && Math.abs(lat) <= 90){
                document.getElementById("error").style.display = "none"
                document.getElementById("long_centro").value = null
                document.getElementById("lat_centro").value = null
                map.setCenter([long, lat])
                map.setZoom(18)
            } else {
                document.getElementById("error").style.display = "block"
                document.getElementById("error_message").innerHTML = "Debes introducir un valor correcto."
                return
            }
        } else {
            document.getElementById("error").style.display = "block"
            document.getElementById("error_message").innerHTML = "Debes rellenar los dos campos."
            return
        }
    }
    /**
     * Si se introducen las coordenadas de las camaras por medio del formulario
    */
    document.getElementById("boton_coords").onclick = function() {
        let long = document.getElementById("long").value
        let lat = document.getElementById("lat").value
        if(!camara_id) {
            document.getElementById("error").style.display = "block"
            document.getElementById("error_message").innerHTML = "Debes seleccionar primero una cámara."
            return
        }
        if(long && lat) {
            if(Math.abs(long) <= 180 && Math.abs(lat) <= 90){
                colocada++
                document.getElementById("error").style.display = "none"
                document.getElementById("long").value = null
                document.getElementById("lat").value = null
                map.setCenter([long, lat])
                longlat = {"lng": long, "lat": lat}
                estilo = false
                document.getElementById("estilo_mapa").onclick = function(){void(0)}
                document.getElementById("estilo_mapa").style.color = "#E5E6FF"
                crea_camara(map,longlat,false, null, null)
                
                datos=solicita_info(camara_id)
                
                get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                info = {
                    "angulo": angulo,
                    "altura": datos.altura,
                    "inclinacion": datos.inclinacion,
                    "rotacion": datos.rotacion,
                    "dmax": Math.floor(dmax),
                    "dmuerta": Math.floor(dmuerta),
                    "sensor": sensor,
                    "distancia_focal": distancia_focal,
                    "nombre_camara": nombre_camara,
                    "precio": precio
                }
                
                window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))                
                editar(datos, ''.concat(camara_id).concat("-").concat(colocada))
                rot = datos.rotacion
                dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta,rot)
                // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
                html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
                            // This code will run once the promise has completed
                            window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")})) }
                )

            } else {
                document.getElementById("error").style.display = "block"
                document.getElementById("error_message").innerHTML = "Debes introducir un valor correcto."
                return
            }
        }
    }

    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken
    }));
    map.addControl(new mapboxgl.NavigationControl());
    map.on('load', ()=>{
        
        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
        
        // Cargar el mapa
        let map_id = document.getElementById("edit_mapa_id").innerHTML
        if(map_id>0 && window.localStorage.getItem("mapa_".concat(map_id))){
            cargar_mapa(map, JSON.parse(window.localStorage.getItem("mapa_".concat(map_id))))

        } else if(window.localStorage.getItem("desde_JSON") == 'true'){

            window.localStorage.setItem("desde_JSON", false)
            cargar_mapa(map, JSON.parse(window.localStorage.getItem("mapa_JSON")))
            window.localStorage.removeItem("mapa_JSON")
        }
        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}) )})
    })
    map.on('load', (e) => {
        for(i=0;i<document.getElementsByClassName('colocacamara').length;i++){
            document.getElementsByClassName('colocacamara')[i].onclick = function() {
                boton = document.getElementsByClassName("mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_polygon")[0]
                if(boton.classList.contains("active")){
                    no_entrar = true
                    return
                }

                if(no_entrar){
                    no_entrar=false
                    return
                }
                if(camara){
                    camara=false
                    estilo = false
                    document.getElementById("estilo_mapa").onclick = function(){void(0)}
                    document.getElementById("estilo_mapa").style.color = "#E5E6FF"
                    longlat = map.getCenter()
                    crea_camara(map,longlat,false, null, null)
                
                    datos=solicita_info(camara_id)
                    get_data(datos.inclinacion, datos.distancia_focal, datos.altura, datos.sensor.split("x")[0])
                    info = {
                        "angulo": angulo,
                        "altura": datos.altura,
                        "inclinacion": datos.inclinacion,
                        "rotacion": datos.rotacion,
                        "dmax": Math.floor(dmax),
                        "dmuerta": Math.floor(dmuerta),
                        "sensor": sensor,
                        "distancia_focal": distancia_focal,
                        "nombre_camara": nombre_camara,
                        "precio": precio
                    }
                    
                    window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))                
                    editar(datos, ''.concat(camara_id).concat("-").concat(colocada))
                    rot = datos.rotacion

                    // Si se cambia la altura de la camara
                    document.getElementById("altura").oninput=function(e){
                        let inclinacion = parseInt(document.getElementById("inclinacion_camara").innerHTML)
                        let alt = document.getElementById("altura_camara")
                        let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
                        alt.innerHTML = e.srcElement.value
                        datos=solicita_info(camara_id)
                        //datos = cargaInfo()
                        get_data(inclinacion, datos.distancia_focal, parseInt(e.srcElement.value), datos.sensor.split("x")[0])
                        borraCirculos(map, ''.concat(camara_id).concat("-").concat(colocada))
                        longlat = JSON.parse(window.sessionStorage.getItem("posicion_".concat(camara_id).concat('-').concat(colocada))).posicion
                        dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, rotacion)
                        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
                        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
                                    // This code will run once the promise has completed
                                    window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
                        info = {
                            "angulo": angulo,
                            "altura": parseInt(e.srcElement.value),
                            "inclinacion": inclinacion,
                            "rotacion": rot,
                            "dmax": Math.floor(dmax),
                            "dmuerta": Math.floor(dmuerta),
                            "sensor": sensor,
                            "distancia_focal": distancia_focal,
                            "nombre_camara": nombre_camara,
                            "precio": precio
                        }
                        
                        window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                        document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                        document.getElementById("dmax").innerHTML = Math.floor(dmax)
                        document.getElementById("rotacion_camara").innerHTML = parseInt(rot)
                    }
                    editar(datos,''.concat(camara_id).concat("-").concat(colocada))

                    // Si cambia la inclinacion de la camara
                    document.getElementById("inclinacion").oninput=function(e){
                        
                        let inc = document.getElementById("inclinacion_camara")
                        inc.innerHTML = e.srcElement.value
                        let altura = parseInt(document.getElementById("altura_camara").innerHTML)
                        let rotacion = parseInt(document.getElementById("rotacion_camara").innerHTML)
                        datos = solicita_info(camara_id)
                        get_data(parseInt(e.srcElement.value), datos.distancia_focal, altura, datos.sensor.split("x")[0])
                        borraCirculos(map,''.concat(camara_id).concat("-").concat(colocada))          
                        longlat = JSON.parse(window.sessionStorage.getItem("posicion_".concat(camara_id).concat('-').concat(colocada))).posicion

                        dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, rotacion)
                        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
                        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
                        info = {
                            "angulo": angulo,
                            "altura": altura,
                            "inclinacion": parseInt(e.srcElement.value),
                            "rotacion": rot,
                            "dmax": Math.floor(dmax),
                            "dmuerta": Math.floor(dmuerta),
                            "sensor": sensor,
                            "distancia_focal": distancia_focal,
                            "nombre_camara": nombre_camara,
                            "precio": precio
                        }
                        
                        window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                        document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                        document.getElementById("dmax").innerHTML = Math.floor(dmax)
                        document.getElementById("rotacion_camara").innerHTML = parseInt(rot)
                    }
                    editar(datos,''.concat(camara_id).concat("-").concat(colocada))

                    // Si cambia la rotacion de la camara
                    document.getElementById("rotacion").oninput = function(e) {

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
                        datos = solicita_info(camara_id)
                        get_data(inclinacion, datos.distancia_focal, altura, datos.sensor.split("x")[0])
                        borraCirculos(map,''.concat(camara_id).concat("-").concat(colocada))       
                        longlat = JSON.parse(window.sessionStorage.getItem("posicion_".concat(camara_id).concat('-').concat(colocada))).posicion

                        dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta, parseInt(e.srcElement.value))
                        // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
                        html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
                        info = {
                            "angulo": angulo,
                            "altura": altura,
                            "inclinacion": inclinacion,
                            "rotacion": parseInt(e.srcElement.value),
                            "dmax": Math.floor(dmax),
                            "dmuerta": Math.floor(dmuerta),
                            "sensor": sensor,
                            "distancia_focal": distancia_focal,
                            "nombre_camara": nombre_camara,
                            "precio": precio
                        }
                        
                        window.sessionStorage.setItem(''.concat(camara_id).concat("-").concat(colocada), JSON.stringify(info))
                        document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
                        document.getElementById("dmax").innerHTML = Math.floor(dmax)
                        document.getElementById("rotacion").value = parseInt(e.srcElement.value)
                    }

                    dibujaCirculos(map, ''.concat(camara_id).concat("-").concat(colocada), longlat, angulo, dmax, dmuerta,rot) 
                    // imagen = map.getCanvas().toDataURL("image/png").replace("image/png", "image/octet-stream")
                    html2canvas( document.getElementById("map"), attributes={useCORS: true,logging: true, letterRendering: 1, crossOrigin: 'Anonymous' }).then(canvas => {
        // This code will run once the promise has completed
        window.localStorage.setItem("token", JSON.stringify({"imagen":canvas.toDataURL("image/octet-stream")}));})
                }
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
    modes.simple_select.onClick = function (state, e) {
        return
    };
    modes.simple_select.onDrag = function (state, e) {
        return
    };

    map.on('draw.create', camarasArea);
    map.on('draw.delete', borraArea);
    
    function borraArea(e){
        vertices = e.target._markers
        j=0
        for(i=0; vertices[j] && i<e.features[0].geometry.coordinates[0].length;i++){
            while(vertices[j] && !(e.features[0].geometry.coordinates[0][i][0] == vertices[j]._lngLat.lng &&
                e.features[0].geometry.coordinates[0][i][1] == vertices[j]._lngLat.lat)){
                    j++
                }
            if(!vertices[j]){
                continue
            }
            borraCirculos(map,vertices[j]._element.id)
            datos=solicita_info(vertices[j]._element.id.split('-')[0])
            prec = parseFloat(document.getElementById("precio_mapa").innerHTML)
            document.getElementById("precio_mapa").innerHTML = prec-datos.precio
            document.getElementById(vertices[j]._element.id).remove()
            document.getElementById("editar").style.display = "none"
            marker=marker.filter((item) => item.position_id !== vertices[j]._element.id)
        }
        e.target._markers=[]

    }

    function camarasArea(e) {
        
        
        if(!camara_id){
            document.getElementById("error").style.display = "block"
            document.getElementById("error_message").innerHTML = "Debes seleccionar primero una cámara."
            draw.trash()
            return
        }
        data = draw.getAll()
        if(data.features.length==1){
            puntos = data.features[0].geometry.coordinates[0]
            if(puntos.length>1){
                
                for(i=0;i<puntos.length-1;i++){
                    poligono = true
                    longlat = {"lng": puntos[i][0], "lat": puntos[i][1]}
                    vector1 = puntos[i][0]-puntos[(i+1)%puntos.length][0]
                    vector2 = puntos[i][1]-puntos[(i+1)%puntos.length][1]
                    mas180=false
                    if(vector1>0){
                        mas180 = true
                    }
                    pte = vector2/vector1
                    ang = Math.atan(pte)
                    trae_rot = ang*180/Math.PI
                    if(mas180){
                        trae_rot+=180
                        mas180=false
                    }
                    crea_camara(map, longlat, false, null, trae_rot)
                }


            }
            camara=false
            estilo = false
            document.getElementById("estilo_mapa").onclick = function(){void(0)}
            document.getElementById("estilo_mapa").style.color = "#E5E6FF"
        } else {
            document.getElementById("editar").style.display = "none"
            document.getElementById("error").style.display = "block"
            document.getElementById("error_message").innerHTML = "Solo puedes dibujar un área por mapa."
            draw.trash()
        }
        
    }
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
    let _nombre_camara = document.getElementById("nombre_camara")
    let dist = document.getElementById("dist_focal")
    let _precio = document.getElementById("precio_camara")
    let angl = document.getElementById("angulo")
    document.getElementById("camara_id_eliminar").innerHTML=id
    document.getElementById("rotacion").value = parseInt(datos.rotacion)
    document.getElementById("rotacion_camara").innerHTML = parseInt(datos.rotacion)
    document.getElementById("altura").value = datos.altura
    document.getElementById("altura_camara").innerHTML = datos.altura
    document.getElementById("inclinacion").value = datos.inclinacion
    document.getElementById("inclinacion_camara").innerHTML = datos.inclinacion
    document.getElementById("dmuerta").innerHTML = Math.floor(dmuerta)
    document.getElementById("dmax").innerHTML = Math.floor(dmax)
    _nombre_camara.innerHTML = datos.nombre_camara
    dist.innerHTML= datos.distancia_focal;
    _precio.innerHTML = datos.precio
    angl.innerHTML = Math.floor(angulo*180/Math.PI)
    if(window.sessionStorage.getItem(id)){
        let j = JSON.parse(window.sessionStorage.getItem(id))
        document.getElementById("inclinacion").value = j.inclinacion
        document.getElementById("inclinacion_camara").innerHTML = j.inclinacion
        document.getElementById("altura").value = j.altura
        document.getElementById("altura_camara").innerHTML = j.altura
        document.getElementById("rotacion").value = parseInt(j.rotacion)
        document.getElementById("rotacion_camara").innerHTML = parseInt(j.rotacion)
        document.getElementById("dmuerta").innerHTML = j.dmuerta
        document.getElementById("dmax").innerHTML = j.dmax
    }
}

