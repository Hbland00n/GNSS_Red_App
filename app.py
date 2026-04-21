from flask import Flask, jsonify, render_template
from utils.calculations import encontrar_estaciones_cercanas, tiempo_georreferenciacion
from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


def buscar_archivo(*rutas_posibles):
    for ruta_relativa in rutas_posibles:
        ruta = BASE_DIR / ruta_relativa
        if ruta.exists():
            return ruta
    raise FileNotFoundError(
        "No se encontró ninguno de estos archivos: "
        + ", ".join(str(BASE_DIR / r) for r in rutas_posibles)
    )


def cargar_geojson_magna():
    ruta = buscar_archivo(
        Path("static/data/red_magna_eco.geojson"),
        Path("static/Data/red_magna_eco.geojson"),
        Path("Static/data/red_magna_eco.geojson"),
        Path("Static/Data/red_magna_eco.geojson"),
    )

    with open(ruta, "r", encoding="utf-8") as f:
        datos = json.load(f)

    estaciones = []

    for feat in datos["features"]:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        coords = geom.get("coordinates", [None, None])
        lon = coords[0]
        lat = coords[1]

        if lat is None or lon is None:
            continue

        estado_val = props.get("MRTEstado", props.get("mrtestado", props.get("estado", "Activa")))

        if str(estado_val).strip().lower() in ["1", "activa", "activo", "active"]:
            estado = "Activa"
        elif str(estado_val).strip().lower() in ["0", "inactiva", "inactivo", "inactive"]:
            estado = "Inactiva"
        else:
            estado = "Activa"

        estaciones.append({
            "codigo": props.get("MRTNomencl", props.get("mrtnomencl", "Sin dato")),
            "nombre": props.get("MRTNomencl", props.get("mrtnomencl", "Sin dato")),
            "lat": lat,
            "lon": lon,
            "municipio": props.get("MDANMNombr", props.get("mdanmnombr", "")),
            "departamento": props.get("DeNombre", props.get("denombre", "")),
            "estado": estado,
            "orden": "MAGNA-ECO",
            "contribuyente": props.get("MRTMateria", props.get("mrtmateria", "IGAC")),
            "rinex": True,
            "red": "MAGNA-ECO"
        })

    return estaciones


def cargar_geojson_sgc():
    ruta = buscar_archivo(
        Path("static/data/orden1_sgc.geojson"),
        Path("static/Data/orden1_sgc.geojson"),
        Path("Static/data/orden1_sgc.geojson"),
        Path("Static/Data/orden1_sgc.geojson"),
    )

    with open(ruta, "r", encoding="utf-8") as f:
        datos = json.load(f)

    estaciones = []

    for feat in datos["features"]:
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})

        coords = geom.get("coordinates", [None, None])
        lon = coords[0]
        lat = coords[1]

        if lat is None or lon is None:
            continue

        nombre = (
            props.get("Name")
            or props.get("NAME")
            or props.get("nombre")
            or props.get("NOMBRE")
            or "Sin dato"
        )

        estaciones.append({
            "codigo": nombre,
            "nombre": nombre,
            "lat": lat,
            "lon": lon,
            "municipio": "",
            "departamento": "",
            "estado": "Activa",
            "orden": "Orden 1",
            "contribuyente": "SGC",
            "rinex": False,
            "red": "SGC"
        })

    return estaciones


estaciones = []
estaciones.extend(cargar_geojson_magna())
estaciones.extend(cargar_geojson_sgc())


@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/calcular/<lat>/<lon>")
def calcular(lat, lon):
    lat = float(lat)
    lon = float(lon)

    cercanas = encontrar_estaciones_cercanas(lat, lon, estaciones)

    for est in cercanas:
        est["tiempo_min"] = round(
            tiempo_georreferenciacion(est["distancia"]), 1
        )

    return jsonify(cercanas)


if __name__ == "__main__":
    app.run(debug=True)