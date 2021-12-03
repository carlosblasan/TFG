
mapboxgl.accessToken = 'pk.eyJ1IjoiY2FybG9zYnMiLCJhIjoiY2t3cW56bTA1MG9kNDJ0cW9mYTAyYTluaiJ9.Cf2bC7z5GSVWVZ-Ka7Ji4A'
let camara = null
function colocaCamara(){
    camara = true
}

function colocaEdificio(){
    camara = false
}
const map_init = ubicacion =>{
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        style: 'mapbox://styles/mapbox/streets-v11', // style URL
        center: [ubicacion.coords.longitude, ubicacion.coords.latitude], // starting position [lng, lat]
        zoom: 15 // starting zoom
        
    });
    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken
    }));
    map.addControl(new mapboxgl.NavigationControl());
    
    let puntos = []
    map.on('mousemove', (e) => {
        
        document.getElementById('map').onclick = function() {
            if(camara == true || camara == false){
                puntos.push(JSON.stringify(e.lngLat.wrap()))
            }
            if(camara && puntos.length > 1){
                puntos.shift()
            }
            console.log(camara)
            console.log(puntos)
            
        };
        
        // `e.point` is the x, y coordinates of the `mousemove` event
        // relative to the top-left corner of the map.
        // `e.lngLat` is the longitude, latitude geographical position of the event.
        
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
}
if ("geolocation" in navigator) {
    const onErrorDeUbicacion = err => {
        const map = new mapboxgl.Map({
            container: 'map', // container ID
            style: 'mapbox://styles/mapbox/streets-v11', // style URL
            center: [-3.7031068, 40.4166275], // starting position [lng, lat]
            zoom: 15 // starting zoom
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
    }

    const opcionesDeSolicitud = {
        enableHighAccuracy: true, // Alta precisión
        maximumAge: 0, // No queremos caché
        timeout: 5000 // Esperar solo 5 segundos
    };
    // Solicitar
    navigator.geolocation.getCurrentPosition(map_init, onErrorDeUbicacion, opcionesDeSolicitud);
    
}


// Referencias: https://parzibyte.me/blog/2019/08/09/acceder-ubicacion-javascript/
