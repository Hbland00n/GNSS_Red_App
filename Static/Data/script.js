function usarUbicacion() {
    navigator.geolocation.getCurrentPosition(
        function (position) {
            document.getElementById("latitud").value = position.coords.latitude.toFixed(6);
            document.getElementById("longitud").value = position.coords.longitude.toFixed(6);

            map.setView([position.coords.latitude, position.coords.longitude], 10);
        },
        function () {
            alert("No se pudo obtener la ubicación.");
        }
    );
}

// Crear mapa
const map = L.map('map').setView([4.5709, -74.2973], 6);

// Fondo satelital
L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: '© Esri'
    }
).addTo(map);

// Etiquetas encima
L.tileLayer(
    'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: '© Esri'
    }
).addTo(map);

// Cargar estaciones MAGNA ECO
fetch('/static/data/red_magna_eco.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 7,
                    color: 'red',
                    fillColor: 'red',
                    fillOpacity: 0.9,
                    weight: 1
                });
            },
            onEachFeature: function (feature, layer) {
                const p = feature.properties;

                layer.bindPopup(`
                    <b>MAGNA ECO</b><br>
                    Código: ${p.MRTNomencl || p.mrtnomencl || "Sin dato"}<br>
                    Municipio: ${p.MDANMNombr || p.mdanmnombr || "Sin dato"}<br>
                    Departamento: ${p.DeNombre || p.denombre || "Sin dato"}<br>
                    Estado: ${(p.MRTEstado ?? p.mrtestado) == 1 ? "Activa" : "Inactiva"}
                `);
            }
        }).addTo(map);
    })
    .catch(error => {
        console.error("Error cargando red_magna_eco.geojson:", error);
    });

// Cargar estaciones Orden 1 SGC
fetch('/static/data/orden1_sgc.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.9,
                    weight: 1
                });
            },
            onEachFeature: function (feature, layer) {
                const p = feature.properties;

                layer.bindPopup(`
                    <b>Orden 1 SGC</b><br>
                    Nombre: ${p.Name || p.NAME || p.nombre || "Sin dato"}
                `);
            }
        }).addTo(map);
    })
    .catch(error => {
        console.error("Error cargando orden1_sgc.geojson:", error);
    });

async function calcular() {
    const lat = document.getElementById("latitud").value;
    const lon = document.getElementById("longitud").value;

    if (!lat || !lon) {
        alert("Ingresa coordenadas o usa tu ubicación.");
        return;
    }

    map.setView([parseFloat(lat), parseFloat(lon)], 10);

    L.marker([parseFloat(lat), parseFloat(lon)])
        .addTo(map)
        .bindPopup("Punto consultado")
        .openPopup();

    const respuesta = await fetch(`/calcular/${lat}/${lon}`);
    const datos = await respuesta.json();

    let html = "";

    datos.forEach(est => {
        html += `
            <div class="tarjeta">
                <h3>${est.codigo}</h3>
                <p><strong>Municipio:</strong> ${est.municipio}, ${est.departamento}</p>
                <p><strong>Orden:</strong> ${est.orden}</p>
                <p><strong>Contribuyente:</strong> ${est.contribuyente}</p>
                <p><strong>RINEX:</strong> ${est.rinex ? "Sí" : "No"}</p>
                <p><strong>Distancia:</strong> ${est.distancia} km</p>
                <p><strong>Tiempo estimado:</strong> ${est.tiempo_min} minutos</p>
            </div>
        `;
    });

    document.getElementById("resultado").innerHTML = html;
}