from geopy.distance import geodesic


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    return geodesic((lat1, lon1), (lat2, lon2)).kilometers


def tiempo_georreferenciacion(dist_km):
    return 15 + (5 * dist_km)


def encontrar_estaciones_cercanas(lat_usuario, lon_usuario, estaciones, n=5):
    resultados = []

    for estacion in estaciones:
        distancia = calcular_distancia_km(
            lat_usuario,
            lon_usuario,
            estacion["lat"],
            estacion["lon"]
        )

        resultados.append({
            "codigo": estacion["codigo"],
            "nombre": estacion["nombre"],
            "municipio": estacion.get("municipio", ""),
            "departamento": estacion.get("departamento", ""),
            "orden": estacion.get("orden", ""),
            "contribuyente": estacion.get("contribuyente", ""),
            "rinex": estacion.get("rinex", False),
            "red": estacion.get("red", ""),
            "lat": estacion["lat"],
            "lon": estacion["lon"],
            "distancia": round(distancia, 2)
        })

    resultados.sort(key=lambda x: x["distancia"])
    return resultados[:n]