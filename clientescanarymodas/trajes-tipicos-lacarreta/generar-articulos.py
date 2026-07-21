# -*- coding: utf-8 -*-
"""Genera los artículos de 'Trajes típicos y accesorios' (La Carreta) para catalogo.json."""
import json, unicodedata, re

# ---------- precio: coste x1.5 -> ,95 más cercano ----------
def pvp(coste):
    if coste is None: return None
    v = coste * 1.5
    k = round(v - 0.95)
    return round(k + 0.95, 2)

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    return re.sub(r"[^A-Z0-9]+","_", s.upper()).strip("_")

# ---------- helpers de tallas ----------
INF_0_16   = ["0","2","4","6","8","10","12","14","16"]
INF_4_16   = ["4","6","8","10","12","14","16"]
INF_0_4    = ["0","2","4"]
INF_6_16   = ["6","8","10","12","14","16"]
AD_S_6XL   = ["S","M","L","XL","2XL","3XL","4XL","5XL","6XL"]
AD_S_5XL   = ["S","M","L","XL","2XL","3XL","4XL","5XL"]
UNICA      = ["Única"]

# Cada entrada: familia(categoria filtro), nombre, composicion, colores, y variantes.
# variante = dict(sufijo, tallas, coste)  -> genera 1 artículo.
P = []
def add(fam, nombre, comp, colores, variantes, nota=""):
    P.append(dict(fam=fam, nombre=nombre, comp=comp, colores=colores, variantes=variantes, nota=nota))

# ===================== HOMBRE · CAMISAS =====================
add("Camisas","Camisa Cuello Mao","55% lino / 45% algodón",["Crudo"],
    [("Infantil (0-4)",INF_0_4,8.25),("Infantil (6-16)",INF_6_16,10.75),("Adulto",AD_S_6XL,12.50)])
add("Camisas","Camisa Listada Rayada","65% poliéster / 35% algodón",["Azul","Marrón"],
    [("Infantil",INF_0_16,8.25),("Adulto",AD_S_6XL,10.15)])
add("Camisas","Camisa Romero Popelín (Crudo/Blanco)","65% poliéster / 35% algodón",["Crudo","Blanco Óptico"],
    [("Infantil",INF_0_16,7.30),("Adulto",AD_S_6XL,9.75)])
add("Camisas","Camisa Romero Popelín (Colores)","65% poliéster / 35% algodón",["Natural","Marino","Negro","Vino","Marrón"],
    [("Infantil",INF_0_16,8.75),("Adulto",AD_S_6XL,10.90)])
add("Camisas","Camisa Romero Lino Eco (Crudo/Blanco)","55% lino / 45% algodón",["Crudo","Blanco Óptico"],
    [("Infantil",INF_0_16,9.95),("Adulto",AD_S_6XL,12.40)])
add("Camisas","Camisa Romero Lino Eco (Colores)","55% lino / 45% algodón",["Natural","Marino","Negro","Vino","Marrón"],
    [("Infantil",INF_0_16,9.15),("Adulto",AD_S_6XL,11.50)])
add("Camisas","Camisa Lino Eco Lisa Cuello Mao","55% lino / 45% algodón",["Crudo"],
    [("Infantil",INF_0_16,10.15),("Adulto",AD_S_6XL,12.15)])
add("Camisas","Camisa Lisa Pinza Cuello Mao","65% poliéster / 35% algodón",["Popelín Crudo","Popelín Blanco"],
    [("Infantil",INF_0_16,6.95),("Adulto",AD_S_6XL,8.15)])
add("Camisas","Camisa Clemente Popelín","65% poliéster / 35% algodón",["Blanco","Crudo"],
    [("Infantil",INF_0_16,9.35),("Adulto",AD_S_6XL,11.15)])
add("Camisas","Camisa Clemente Lino Eco","55% lino / 45% algodón",["Crudo","Blanco"],
    [("Infantil",INF_0_16,13.75),("Adulto",AD_S_6XL,16.50)])
add("Camisas","Camisa Listada Lino Eco","55% lino / 45% algodón",["Beige Rayado","Tierra Rayado","Azul","Gris/Tierra"],
    [("Infantil",INF_0_16,12.50),("Adulto",AD_S_6XL,14.75)])
add("Camisas","Camisa Listada Tapeta Cuadrada","65% poliéster / 35% algodón",["Beige","Gris"],
    [("Infantil",INF_0_16,10.50),("Adulto",AD_S_6XL,12.95)])
add("Camisas","Camisa Listada Tapeta Cuadrada Lino Eco","55% lino / 45% algodón",["Beige","Gris"],
    [("Infantil",INF_0_16,12.15),("Adulto",AD_S_6XL,14.25)])

# ===================== HOMBRE · CHALECOS =====================
add("Chalecos","Chaleco Bordado Santa Cruz","55% lana / 45% viscosa",["Rojo tradicional"],
    [("",AD_S_6XL,22.50)])
add("Chalecos","Chaleco Bordado La Orotava","55% lana / 45% viscosa",["Rojo tradicional"],
    [("",AD_S_6XL,22.75)])
add("Chalecos","Chaleco Artesano Trujillo","65% poliéster / 35% algodón",["Verde con rayas negras"],
    [("",AD_S_6XL,41.52)], nota="Se puede solicitar cualquier rayado/colorido")
add("Chalecos","Chaleco Artesano Marinero","55% lino / 45% algodón",["Listado con ribete rojo"],
    [("",AD_S_6XL,41.52)], nota="Se puede solicitar cualquier rayado/colorido")
add("Chalecos","Chaleco Artesano Duque","65% poliéster / 35% algodón",["Azul marino con rayas amarillas y rojas"],
    [("",AD_S_6XL,41.52)], nota="Se puede solicitar cualquier rayado/colorido")
add("Chalecos","Chaleco Chester","65% poliéster / 35% viscosa",["Gris","Marrón"],
    [("",AD_S_6XL,9.75)])
add("Chalecos","Chaleco Teide Lana Rayas","100% acrílico",["Raya tradicional"],
    [("",AD_S_6XL,17.90)])
add("Chalecos","Chaleco Drill","65% poliéster / 35% viscosa",["Gris"],
    [("",AD_S_6XL,12.25)])
add("Chalecos","Chaleco Lino Grueso (Linotierra)","55% lino / 45% algodón",["Natural","+2 colores"],
    [("",AD_S_6XL,17.75)])
add("Chalecos","Chaleco Mod. Aguaviva","65% poliéster / 35% viscosa",["Rayas tejidas"],
    [("",AD_S_6XL,8.90)])
add("Chalecos","Chaleco Listado Artesano","100% acrílico",["Listado artesanal"],
    [("",AD_S_6XL,17.90)])
add("Chalecos","Chaleco Artesano Lino Eco Listas","55% lino / 45% algodón",["Varios rayados tradicionales"],
    [("",AD_S_6XL,17.50)])
add("Chalecos","Americana Romería Espiga","Espiga",["Granate","Marrón","Tostado","Crudo"],
    [("",["48","50","52","54","56","58","60","62","64"],None)], nota="Bajo pedido: consultar presupuesto")

# ===================== HOMBRE · PANTALONES Y CALZONES =====================
add("Pantalones y calzones","Pantalón Aguaviva","65% poliéster / 35% algodón",["Marrón Tierra Raya","Gris Marengo Raya"],
    [("",AD_S_6XL,13.95)])
add("Pantalones y calzones","Pantalón La Carreta","55% lino / 45% algodón",["Tostado","Crudo"],
    [("",AD_S_6XL,16.75)])
add("Pantalones y calzones","Pantalón Drill","100% algodón drill",["Natural"],
    [("",AD_S_6XL,16.75)])
add("Pantalones y calzones","Pantalón Lino con Cordón","55% lino / 45% algodón",["Natural"],
    [("",AD_S_6XL,16.75)])
add("Pantalones y calzones","Calzón Tradicional de Lino","55% lino / 45% algodón",["Natural"],
    [("",AD_S_6XL,10.30)])
add("Pantalones y calzones","Pantalón Pescador con Cremallera","55% lino / 45% algodón",["Natural"],
    [("",AD_S_6XL,10.50)], nota="Novedad")
add("Pantalones y calzones","Pantalón Bordado Santa Cruz","55% lana / 45% viscosa",["Bordado floral"],
    [("",AD_S_6XL,16.30)])
add("Pantalones y calzones","Pantalón Bordado La Orotava","55% lana / 45% viscosa",["Bordado floral"],
    [("",AD_S_6XL,16.30)])

# ===================== HOMBRE · COMPLEMENTOS =====================
add("Complementos","Fajín Artesano Lana","50% lana merina / 50% algodón",["Rayado tradicional"],
    [("Adulto (6x20 cm)",["6x20 cm"],6.40)])
add("Complementos","Fajín Artesano Canario","50% algodón / 50% acrílico",["Azul","Ocre","Verde","Negro","Crudo","Vino"],
    [("6x24 cm",["6x24 cm"],6.95),("7x28 cm",["7x28 cm"],8.95)])
add("Complementos","Fajín Artesano Rayas Algodón","50% algodón / 50% acrílico",["Crudo·Granate","Marrón","Azulina","Oro","Botella"],
    [("6x12 cm",["6x12 cm"],2.00),("6x24 cm",["6x24 cm"],3.95),("7x28 cm",["7x28 cm"],4.30)])
add("Complementos","Fajín Caballero Liso","50% algodón / 50% acrílico",["Crudo·Marrón","Crudo·Azul","Granate","Azulón","Morado"],
    [("5x12 cm",["5x12 cm"],1.35),("6x24 cm",["6x24 cm"],2.90),("7x28 cm",["7x28 cm"],3.75)])
# Polainas caballero: precio por talla (0..6) distinto -> desdoblo por bloques de precio
add("Complementos","Polainas Caballero","100% algodón",["Natural"],
    [("Talla 0-2",["0","1","2"],7.90),("Talla 3",["3"],8.15),("Talla 4",["4"],8.45),("Talla 5",["5"],9.05),("Talla 6",["6"],9.15)])
add("Complementos","Polainas Artesanas Trenzas","50% algodón / 50% acrílico",["Natural"],
    [("Talla 4",["4"],8.50),("Talla 5",["5"],8.90),("Talla 6",["6"],9.25)])
add("Complementos","Cachorro Caballero Lana Forrado","100% paño de lana (forro piel)",["Negro","Marrón","Gris Marengo"],
    [("Infantil (49-54)",["49","50","51","52","53","54"],8.15),("Adulto (55-60)",["55","56","57","58","59","60"],9.20)])
add("Complementos","Sombrero Hombre Pescador","100% paja natural",["Paja Natural"],
    [("Infantil (48-52)",["48","49","50","51","52"],3.30),("Adulto (54-62)",["54","55","56","57","58","59","60","61","62"],3.75)])

# ===================== MUJER · BLUSAS =====================
BLUSA_MARIA_COL=["Blanco","Crudo","Negro","Azul Floral (est.)","Rosa Floral (est.)"]
def blusa_maria(nombre):
    add("Blusas",nombre,"65% poliéster / 35% algodón",BLUSA_MARIA_COL,
        [("Lisos Infantil",INF_0_16,7.85),("Lisos Adulto",AD_S_5XL,8.90),
         ("Especiales Infantil",INF_0_16,8.85),("Especiales Adulto",AD_S_5XL,9.50),
         ("Estampados Infantil",INF_0_16,8.95),("Estampados Adulto",AD_S_5XL,9.75)],
        nota="Precio según acabado: liso / color especial / estampado")
blusa_maria("Blusa María (Manga Larga)")
blusa_maria("Blusa María (Manga Corta)")
blusa_maria("Blusa María (Manga Larga Volante)")
add("Blusas","Blusa Yaiza","65% poliéster / 35% algodón",["Rojo","Blanco","Negro"],
    [("Infantil",INF_0_16,7.45),("Adulto",AD_S_5XL,8.15)])
add("Blusas","Blusa Drago","55% lino / 45% algodón",["Crudo Natural"],
    [("Infantil",INF_0_16,10.40),("Adulto",AD_S_5XL,11.95)])
add("Blusas","Blusa Calada La Orotava","65% poliéster / 35% algodón",["Blanco/Crudo"],
    [("Infantil",INF_0_16,14.60),("Adulto",AD_S_5XL,15.90)])
add("Blusas","Blusa Vanjar","65% poliéster / 35% algodón",
    ["Ocre","Tabaco","Vino","Marino","Crudo","Blanco","Negro","Verde Botella","Azul (est.)","Rosa (est.)","Granate (est.)","Morado (est.)"],
    [("Infantil",INF_0_16,7.85),("Adulto",AD_S_5XL,7.95)])
add("Blusas","Blusa Nayara","50% lino / 50% algodón",["Natural"],
    [("Infantil",INF_0_16,10.75),("Adulto",AD_S_5XL,12.60)])
add("Blusas","Blusa Delia Lino Eco","50% lino / 50% algodón",["Negro","Crudo Natural","Blanco"],
    [("Infantil",INF_0_16,8.45),("Adulto",AD_S_5XL,9.35)])
add("Blusas","Blusa Delia Popelín","65% poliéster / 35% algodón",["Crudo","Blanco","Natural","Negro Óptico"],
    [("Infantil",INF_0_16,8.45),("Adulto",AD_S_5XL,9.35)])
add("Blusas","Blusa Iballa","65% poliéster / 35% algodón",["Blanco Óptico","Crudo Natural","Negro","Gris Marengo","Vino"],
    [("Infantil",INF_0_16,10.15),("Adulto",AD_S_5XL,11.85)])
add("Blusas","Blusa Tais","65% poliéster / 35% algodón",["Azul (est.)","Granate (est.)","Rosa (est.)","Morado (est.)"],
    [("Infantil",INF_0_16,9.45),("Adulto",AD_S_5XL,11.60)], nota="Precio a confirmar (bloque ambiguo en el PDF)")
add("Blusas","Blusa Elisa","65% poliéster / 35% algodón",["Bordado inglés"],
    [("Adulto",AD_S_5XL,15.50)])
add("Blusas","Blusa Azucena Lino Eco","55% lino / 45% algodón",["Blanco Óptico","Negro","Gris Marengo","Vino","Índigo","Tabaco"],
    [("Adulto",AD_S_5XL,11.50)])
add("Blusas","Blusa Azucena Popelín","65% poliéster / 35% algodón",["Blanco Óptico","Crudo Natural"],
    [("Infantil",INF_0_16,7.95),("Adulto",AD_S_5XL,8.75)])
add("Blusas","Blusa Tradicional","55% lino / 45% algodón",["Crudo Natural"],
    [("Adulto",AD_S_5XL,19.75)])
add("Blusas","Blusa Mar","65% poliéster / 35% algodón",["Blanco Óptico","Crudo Natural"],
    [("Infantil",INF_0_16,9.85),("Adulto",AD_S_5XL,11.50)])
add("Blusas","Blusa Angie","65% poliéster / 35% algodón",["Blanco Óptico","Crudo Natural","Negro","Marino","Gris Marengo","Vino"],
    [("Infantil",INF_0_16,7.20),("Adulto",AD_S_5XL,7.95)])
add("Blusas","Blusa Taira","65% poliéster / 35% algodón",["Blanco Óptico","Crudo Natural"],
    [("Adulto",AD_S_5XL,13.50)])
add("Blusas","Blusa Jenyfer","65% poliéster / 35% algodón",["Crudo Natural"],
    [("Adulto",AD_S_5XL,17.85)])

# ===================== MUJER · FALDAS =====================
FALDA_COL=["Negro","Marrón","Verde Esmeralda","Marino","Gris Marengo","Granate","Morado","Caldero"]
add("Faldas","Falda Gala","65% poliéster / 35% viscosa",FALDA_COL,
    [("",UNICA,32.00)])
add("Faldas","Falda Lujo","65% poliéster / 35% viscosa",FALDA_COL,
    [("",UNICA,26.75)])
add("Faldas","Falda Morella","100% algodón",FALDA_COL,
    [("Infantil",INF_4_16,8.50),("Adulto",AD_S_5XL,10.40)])
add("Faldas","Falda Cuadros","80% poliéster / 20% viscosa",["Cuadros tradicionales"],
    [("Infantil",INF_4_16,12.70),("Adulto",AD_S_5XL,17.50)])

# ---------- construir artículos ----------
# Estructura: PROGRAMACIONES (sección) › TÍPICO CANARIO (categoría) › prenda (tipo)
SECCION_ID=607; SECCION="PROGRAMACIONES"
CATEGORIA_ID=820; CATEGORIA="TÍPICO CANARIO"
TIPO_ID={"Camisas":821,"Chalecos":822,"Pantalones y calzones":823,"Complementos":824,"Blusas":825,"Faldas":826}
arts=[]; filas=[]
for p in P:
    for suf,tallas,coste in p["variantes"]:
        nombre = p["nombre"] + (f" · {suf}" if suf else "")
        precio = pvp(coste)
        codigo = "LACARRETA_"+slug(nombre)
        art = {
            "codigo": codigo, "nombre": nombre,
            "precio": precio if precio is not None else 0,
            "portes": 0, "seccionId": SECCION_ID, "seccion": SECCION,
            "categoriaId": CATEGORIA_ID, "categoria": CATEGORIA,
            "tipoId": TIPO_ID[p["fam"]], "tipo": p["fam"],
            "colores": p["colores"], "tallas": [{"t":t} for t in tallas],
            "tiposSujetador": [],
            "fichaTecnica": {"composicion": p["comp"], "packing": "",
                             "fabricante": "La Carreta", "lavado": p["nota"],
                             "origen": "España", "refProveedor": "La Carreta"},
            "agotadas": [], "novedad": False, "activo": True,
            "pendienteRevision": (precio is None), "carpetaId": None, "codigoA3": None,
            "copas": [], "minUnidadesPorColor": 0, "udsPorPack": 1, "fotos": [],
            "creado": "2026-07-21T09:00:00.000Z", "modificado": "2026-07-21T09:00:00.000Z",
        }
        arts.append(art)
        filas.append((p["fam"], p["nombre"], suf, "/".join(str(t) for t in tallas),
                      ", ".join(p["colores"]), coste, precio))

json.dump(arts, open("articulos_lacarreta.json","w"), ensure_ascii=False, indent=1)
print("ARTÍCULOS GENERADOS:", len(arts))
from collections import Counter
c=Counter(a["categoria"] for a in arts)
for k in ["Camisas","Chalecos","Pantalones y calzones","Complementos","Blusas","Faldas"]:
    print(f"  {k}: {c[k]}")
# guardar filas para el preview
json.dump(filas, open("filas.json","w"), ensure_ascii=False)
print("OK filas:", len(filas))
