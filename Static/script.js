function usarUbicacion() {
    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            document.getElementById("latitud").value = lat.toFixed(6);
            document.getElementById("longitud").value = lon.toFixed(6);

            map.setView([lat, lon], 10);
        },
        function () {
            alert("No se pudo obtener la ubicación.");
        }
    );
}

// Crear mapa
const map = L.map("map").setView([4.5709, -74.2973], 6);

// Fondo satelital
L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: "© Esri"
    }
).addTo(map);

// Etiquetas
L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: "© Esri"
    }
).addTo(map);

// Variables para resaltar cálculo
let marcadorConsulta = null;
let lineasCalculo = [];
let marcadoresCalculo = [];

// Limpiar cálculo anterior
function limpiarCalculo() {
    if (marcadorConsulta) {
        map.removeLayer(marcadorConsulta);
        marcadorConsulta = null;
    }

    lineasCalculo.forEach(l => map.removeLayer(l));
    marcadoresCalculo.forEach(m => map.removeLayer(m));

    lineasCalculo = [];
    marcadoresCalculo = [];
}

// Iconos
function iconoTrianguloRojo() {
    return L.divIcon({
        className: "icono-magna",
        html: '<div class="triangulo-rojo"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
}

function iconoTrianguloAzul() {
    return L.divIcon({
        className: "icono-sgc",
        html: '<div class="triangulo-azul"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
}

// Cargar MAGNA-ECO
fetch("/static/data/red_magna_eco.geojson")
    .then(response => response.json())
    .then(data => {
        const capaMagna = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: iconoTrianguloRojo() });
            },
            onEachFeature: function (feature, layer) {
                const p = feature.properties || {};

                layer.bindPopup(`
                    <b>MAGNA-ECO</b><br>
                    Código: ${p.MRTNomencl || p.mrtnomencl || p.codigo || "Sin dato"}<br>
                    Municipio: ${p.MDANMNombr || p.mdanmnombr || p.municipio || "Sin dato"}<br>
                    Departamento: ${p.DeNombre || p.denombre || p.departamento || "Sin dato"}<br>
                    Estado: ${(p.MRTEstado ?? p.mrtestado ?? p.estado) == 1 ? "Activa" : ((p.MRTEstado ?? p.mrtestado ?? p.estado) == 0 ? "Inactiva" : (p.estado || "Sin dato"))}
                `);
            }
        }).addTo(map);

        map.fitBounds(capaMagna.getBounds());
    })
    .catch(error => {
        console.error("Error cargando red_magna_eco.geojson:", error);
    });

// Cargar Orden 1 SGC
fetch("/static/data/orden1_sgc.geojson")
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: iconoTrianguloAzul() });
            },
            onEachFeature: function (feature, layer) {
                const p = feature.properties || {};

                layer.bindPopup(`
                    <b>Orden 1 SGC</b><br>
                    Nombre: ${p.Name || p.NAME || p.nombre || p.NOMBRE || "Sin dato"}
                `);
            }
        }).addTo(map);
    })
    .catch(error => {
        console.error("Error cargando orden1_sgc.geojson:", error);
    });

// Leyenda
const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.innerHTML = `
        <div style="background: rgba(10,15,30,0.9); color: white; padding: 10px; border-radius: 8px; font-size: 13px;">
            <div style="margin-bottom: 6px;"><span style="color:#ff3b3b;">▲</span> MAGNA-ECO</div>
            <div style="margin-bottom: 6px;"><span style="color:#2f7dff;">▲</span> Orden 1 SGC</div>
            <div><span style="color:#ffd54a;">●</span> Punto consultado</div>
        </div>
    `;
    return div;
};

legend.addTo(map);

// Selección con clic en mapa
map.on("click", function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    document.getElementById("latitud").value = lat.toFixed(6);
    document.getElementById("longitud").value = lon.toFixed(6);

    if (marcadorConsulta) {
        map.removeLayer(marcadorConsulta);
    }

    marcadorConsulta = L.circleMarker([lat, lon], {
        radius: 8,
        color: "#ffd54a",
        fillColor: "#ffd54a",
        fillOpacity: 1,
        weight: 2
    }).addTo(map).bindPopup("Punto de consulta seleccionado en el mapa").openPopup();
});

// Calcular
async function calcular() {
    const lat = document.getElementById("latitud").value;
    const lon = document.getElementById("longitud").value;

    if (!lat || !lon) {
        alert("Ingresa coordenadas o usa tu ubicación.");
        return;
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    limpiarCalculo();

    map.setView([latNum, lonNum], 10);

    marcadorConsulta = L.circleMarker([latNum, lonNum], {
        radius: 8,
        color: "#ffd54a",
        fillColor: "#ffd54a",
        fillOpacity: 1,
        weight: 2
    }).addTo(map).bindPopup("Punto consultado").openPopup();

    const respuesta = await fetch(`/calcular/${lat}/${lon}`);
    const datos = await respuesta.json();

    let html = "";

    datos.forEach(est => {
        html += `
            <div class="tarjeta">
                <h3>${est.codigo}</h3>
                <p><strong>Red:</strong> ${est.red}</p>
                <p><strong>Municipio:</strong> ${est.municipio || "Sin dato"}${est.departamento ? ", " + est.departamento : ""}</p>
                <p><strong>Orden:</strong> ${est.orden}</p>
                <p><strong>Contribuyente:</strong> ${est.contribuyente}</p>
                <p><strong>RINEX:</strong> ${est.rinex ? "Sí" : "No"}</p>
                <p><strong>Distancia:</strong> ${est.distancia} km</p>
                <p><strong>Tiempo estimado:</strong> ${est.tiempo_min} minutos</p>
            </div>
        `;

        if (est.lat && est.lon) {
            const marcador = L.circleMarker([est.lat, est.lon], {
                radius: 9,
                color: "#00ffcc",
                fillColor: "#00ffcc",
                fillOpacity: 0.9,
                weight: 2
            }).addTo(map).bindPopup(`
                <b>${est.codigo}</b><br>
                Red: ${est.red}<br>
                Distancia: ${est.distancia} km<br>
                Tiempo: ${est.tiempo_min} min
            `);

            marcadoresCalculo.push(marcador);

            const linea = L.polyline(
                [[latNum, lonNum], [est.lat, est.lon]],
                {
                    color: "#00ffcc",
                    weight: 2,
                    opacity: 0.8,
                    dashArray: "6,6"
                }
            ).addTo(map);

            lineasCalculo.push(linea);
        }
    });

    document.getElementById("resultado").innerHTML = html;
}