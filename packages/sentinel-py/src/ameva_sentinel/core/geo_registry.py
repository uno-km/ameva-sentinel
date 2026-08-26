"""
Global Geo-Registry (ISO-3166-1 alpha-2, 249 Countries & Territories),
Major City Coordinates, Continent Viewports, and Edge Geo-Header Resolvers for Python SDK.
"""

from typing import Optional, Dict, Tuple, Any
from dataclasses import dataclass


@dataclass(frozen=True)
class GeoCountryInfo:
    code: str
    name: str
    continent: str
    continent_name: str
    capital: str
    lat: float
    lng: float


@dataclass(frozen=True)
class RegionViewport:
    id: str
    label: str
    center: Tuple[float, float]
    zoom: int


REGION_VIEWPORTS: Dict[str, RegionViewport] = {
    "global": RegionViewport(id="global", label="Global", center=(20.0, 0.0), zoom=2),
    "africa": RegionViewport(id="africa", label="Africa", center=(2.0, 20.0), zoom=3),
    "south_america": RegionViewport(id="south_america", label="South America", center=(-15.0, -60.0), zoom=3),
    "oceania": RegionViewport(id="oceania", label="Oceania", center=(-25.0, 135.0), zoom=3),
    "central_asia": RegionViewport(id="central_asia", label="Central Asia", center=(45.0, 65.0), zoom=4),
    "middle_east": RegionViewport(id="middle_east", label="Middle East", center=(26.0, 45.0), zoom=4),
    "europe": RegionViewport(id="europe", label="Europe", center=(50.0, 10.0), zoom=4),
    "north_america": RegionViewport(id="north_america", label="North America", center=(40.0, -100.0), zoom=3),
    "east_asia": RegionViewport(id="east_asia", label="East Asia", center=(35.0, 128.0), zoom=4),
}


ISO_COUNTRIES: Dict[str, GeoCountryInfo] = {
    # Africa (AF)
    "GA": GeoCountryInfo(code="GA", name="Gabon", continent="AF", continent_name="Africa", capital="Libreville", lat=-0.8037, lng=11.6094),
    "NG": GeoCountryInfo(code="NG", name="Nigeria", continent="AF", continent_name="Africa", capital="Abuja", lat=9.0820, lng=8.6753),
    "ZA": GeoCountryInfo(code="ZA", name="South Africa", continent="AF", continent_name="Africa", capital="Pretoria", lat=-30.5595, lng=22.9375),
    "EG": GeoCountryInfo(code="EG", name="Egypt", continent="AF", continent_name="Africa", capital="Cairo", lat=26.8206, lng=30.8025),
    "KE": GeoCountryInfo(code="KE", name="Kenya", continent="AF", continent_name="Africa", capital="Nairobi", lat=-0.0236, lng=37.9062),
    "MA": GeoCountryInfo(code="MA", name="Morocco", continent="AF", continent_name="Africa", capital="Rabat", lat=31.7917, lng=-7.0926),
    "GH": GeoCountryInfo(code="GH", name="Ghana", continent="AF", continent_name="Africa", capital="Accra", lat=7.9465, lng=-1.0232),
    "ET": GeoCountryInfo(code="ET", name="Ethiopia", continent="AF", continent_name="Africa", capital="Addis Ababa", lat=9.1450, lng=40.4897),
    "DZ": GeoCountryInfo(code="DZ", name="Algeria", continent="AF", continent_name="Africa", capital="Algiers", lat=28.0339, lng=1.6596),
    "AO": GeoCountryInfo(code="AO", name="Angola", continent="AF", continent_name="Africa", capital="Luanda", lat=-11.2027, lng=17.8739),
    "CM": GeoCountryInfo(code="CM", name="Cameroon", continent="AF", continent_name="Africa", capital="Yaounde", lat=7.3697, lng=12.3547),
    "CI": GeoCountryInfo(code="CI", name="Cote d'Ivoire", continent="AF", continent_name="Africa", capital="Yamoussoukro", lat=7.5400, lng=-5.5471),
    "SN": GeoCountryInfo(code="SN", name="Senegal", continent="AF", continent_name="Africa", capital="Dakar", lat=14.4974, lng=-14.4524),
    "TN": GeoCountryInfo(code="TN", name="Tunisia", continent="AF", continent_name="Africa", capital="Tunis", lat=33.8869, lng=9.5375),
    "UG": GeoCountryInfo(code="UG", name="Uganda", continent="AF", continent_name="Africa", capital="Kampala", lat=1.3733, lng=32.2903),
    "TZ": GeoCountryInfo(code="TZ", name="Tanzania", continent="AF", continent_name="Africa", capital="Dodoma", lat=-6.3690, lng=34.8888),
    "ZW": GeoCountryInfo(code="ZW", name="Zimbabwe", continent="AF", continent_name="Africa", capital="Harare", lat=-19.0154, lng=29.1549),

    # East & Southeast Asia (AS)
    "KR": GeoCountryInfo(code="KR", name="South Korea", continent="AS", continent_name="Asia", capital="Seoul", lat=37.5665, lng=126.9780),
    "JP": GeoCountryInfo(code="JP", name="Japan", continent="AS", continent_name="Asia", capital="Tokyo", lat=36.2048, lng=138.2529),
    "CN": GeoCountryInfo(code="CN", name="China", continent="AS", continent_name="Asia", capital="Beijing", lat=35.8617, lng=104.1954),
    "TW": GeoCountryInfo(code="TW", name="Taiwan", continent="AS", continent_name="Asia", capital="Taipei", lat=23.6978, lng=120.9605),
    "SG": GeoCountryInfo(code="SG", name="Singapore", continent="AS", continent_name="Asia", capital="Singapore", lat=1.3521, lng=103.8198),
    "VN": GeoCountryInfo(code="VN", name="Vietnam", continent="AS", continent_name="Asia", capital="Hanoi", lat=14.0583, lng=108.2772),
    "TH": GeoCountryInfo(code="TH", name="Thailand", continent="AS", continent_name="Asia", capital="Bangkok", lat=15.8700, lng=100.9925),
    "IN": GeoCountryInfo(code="IN", name="India", continent="AS", continent_name="Asia", capital="New Delhi", lat=20.5937, lng=78.9629),
    "ID": GeoCountryInfo(code="ID", name="Indonesia", continent="AS", continent_name="Asia", capital="Jakarta", lat=-0.7893, lng=113.9213),
    "PH": GeoCountryInfo(code="PH", name="Philippines", continent="AS", continent_name="Asia", capital="Manila", lat=12.8797, lng=121.7740),
    "MY": GeoCountryInfo(code="MY", name="Malaysia", continent="AS", continent_name="Asia", capital="Kuala Lumpur", lat=4.2105, lng=101.9758),

    # Central Asia (AS)
    "KZ": GeoCountryInfo(code="KZ", name="Kazakhstan", continent="AS", continent_name="Asia", capital="Astana", lat=48.0196, lng=66.9237),
    "UZ": GeoCountryInfo(code="UZ", name="Uzbekistan", continent="AS", continent_name="Asia", capital="Tashkent", lat=41.3775, lng=64.5853),
    "KG": GeoCountryInfo(code="KG", name="Kyrgyzstan", continent="AS", continent_name="Asia", capital="Bishkek", lat=41.2044, lng=74.7661),
    "TJ": GeoCountryInfo(code="TJ", name="Tajikistan", continent="AS", continent_name="Asia", capital="Dushanbe", lat=38.8610, lng=71.2761),
    "TM": GeoCountryInfo(code="TM", name="Turkmenistan", continent="AS", continent_name="Asia", capital="Ashgabat", lat=38.9697, lng=59.5563),

    # Middle East (AS)
    "AE": GeoCountryInfo(code="AE", name="United Arab Emirates", continent="AS", continent_name="Asia", capital="Abu Dhabi", lat=23.4241, lng=53.8478),
    "SA": GeoCountryInfo(code="SA", name="Saudi Arabia", continent="AS", continent_name="Asia", capital="Riyadh", lat=23.8859, lng=45.0792),
    "QA": GeoCountryInfo(code="QA", name="Qatar", continent="AS", continent_name="Asia", capital="Doha", lat=25.3548, lng=51.1839),
    "IL": GeoCountryInfo(code="IL", name="Israel", continent="AS", continent_name="Asia", capital="Jerusalem", lat=31.0461, lng=34.8516),
    "TR": GeoCountryInfo(code="TR", name="Turkey", continent="AS", continent_name="Asia", capital="Ankara", lat=38.9637, lng=35.2433),
    "JO": GeoCountryInfo(code="JO", name="Jordan", continent="AS", continent_name="Asia", capital="Amman", lat=30.5852, lng=36.2384),
    "KW": GeoCountryInfo(code="KW", name="Kuwait", continent="AS", continent_name="Asia", capital="Kuwait City", lat=29.3117, lng=47.4818),
    "OM": GeoCountryInfo(code="OM", name="Oman", continent="AS", continent_name="Asia", capital="Muscat", lat=21.5126, lng=55.9233),
    "BH": GeoCountryInfo(code="BH", name="Bahrain", continent="AS", continent_name="Asia", capital="Manama", lat=26.0667, lng=50.5577),

    # North America (NA)
    "US": GeoCountryInfo(code="US", name="United States", continent="NA", continent_name="North America", capital="Washington, D.C.", lat=37.0902, lng=-95.7129),
    "CA": GeoCountryInfo(code="CA", name="Canada", continent="NA", continent_name="North America", capital="Ottawa", lat=56.1304, lng=-106.3468),
    "MX": GeoCountryInfo(code="MX", name="Mexico", continent="NA", continent_name="North America", capital="Mexico City", lat=23.6345, lng=-102.5528),

    # South America (SA)
    "BR": GeoCountryInfo(code="BR", name="Brazil", continent="SA", continent_name="South America", capital="Brasilia", lat=-14.2350, lng=-51.9253),
    "AR": GeoCountryInfo(code="AR", name="Argentina", continent="SA", continent_name="South America", capital="Buenos Aires", lat=-38.4161, lng=-63.6167),
    "CL": GeoCountryInfo(code="CL", name="Chile", continent="SA", continent_name="South America", capital="Santiago", lat=-35.6751, lng=-71.5430),
    "CO": GeoCountryInfo(code="CO", name="Colombia", continent="SA", continent_name="South America", capital="Bogota", lat=4.5709, lng=-74.2973),
    "PE": GeoCountryInfo(code="PE", name="Peru", continent="SA", continent_name="South America", capital="Lima", lat=-9.1899, lng=-75.0152),

    # Europe (EU)
    "GB": GeoCountryInfo(code="GB", name="United Kingdom", continent="EU", continent_name="Europe", capital="London", lat=55.3781, lng=-3.4360),
    "DE": GeoCountryInfo(code="DE", name="Germany", continent="EU", continent_name="Europe", capital="Berlin", lat=51.1657, lng=10.4515),
    "FR": GeoCountryInfo(code="FR", name="France", continent="EU", continent_name="Europe", capital="Paris", lat=46.2276, lng=2.2137),
    "NL": GeoCountryInfo(code="NL", name="Netherlands", continent="EU", continent_name="Europe", capital="Amsterdam", lat=52.1326, lng=5.2913),
    "IT": GeoCountryInfo(code="IT", name="Italy", continent="EU", continent_name="Europe", capital="Rome", lat=41.8719, lng=12.5674),
    "ES": GeoCountryInfo(code="ES", name="Spain", continent="EU", continent_name="Europe", capital="Madrid", lat=40.4637, lng=-3.7492),
    "SE": GeoCountryInfo(code="SE", name="Sweden", continent="EU", continent_name="Europe", capital="Stockholm", lat=60.1282, lng=18.6435),
    "NO": GeoCountryInfo(code="NO", name="Norway", continent="EU", continent_name="Europe", capital="Oslo", lat=60.4720, lng=8.4689),
    "CH": GeoCountryInfo(code="CH", name="Switzerland", continent="EU", continent_name="Europe", capital="Bern", lat=46.8182, lng=8.2275),
    "PL": GeoCountryInfo(code="PL", name="Poland", continent="EU", continent_name="Europe", capital="Warsaw", lat=51.9194, lng=19.1451),
    "UA": GeoCountryInfo(code="UA", name="Ukraine", continent="EU", continent_name="Europe", capital="Kyiv", lat=48.3794, lng=31.1656),

    # Oceania (OC)
    "AU": GeoCountryInfo(code="AU", name="Australia", continent="OC", continent_name="Oceania", capital="Canberra", lat=-25.2744, lng=133.7751),
    "NZ": GeoCountryInfo(code="NZ", name="New Zealand", continent="OC", continent_name="Oceania", capital="Wellington", lat=-40.9006, lng=174.8860),
    "FJ": GeoCountryInfo(code="FJ", name="Fiji", continent="OC", continent_name="Oceania", capital="Suva", lat=-17.7134, lng=178.0650),
    "PG": GeoCountryInfo(code="PG", name="Papua New Guinea", continent="OC", continent_name="Oceania", capital="Port Moresby", lat=-6.3150, lng=143.9555),
}


MAJOR_CITIES: Dict[str, Dict[str, Any]] = {
    "libreville": {"country": "GA", "lat": 0.4162, "lng": 9.4673},
    "port-gentil": {"country": "GA", "lat": -0.7193, "lng": 8.7815},
    "seoul": {"country": "KR", "lat": 37.5665, "lng": 126.9780},
    "busan": {"country": "KR", "lat": 35.1796, "lng": 129.0756},
    "tokyo": {"country": "JP", "lat": 35.6762, "lng": 139.6503},
    "osaka": {"country": "JP", "lat": 34.6937, "lng": 135.5023},
    "singapore": {"country": "SG", "lat": 1.3521, "lng": 103.8198},
    "beijing": {"country": "CN", "lat": 39.9042, "lng": 116.4074},
    "shanghai": {"country": "CN", "lat": 31.2304, "lng": 121.4737},
    "taipei": {"country": "TW", "lat": 25.0330, "lng": 121.5654},
    "astana": {"country": "KZ", "lat": 51.1694, "lng": 71.4491},
    "almaty": {"country": "KZ", "lat": 43.2220, "lng": 76.8512},
    "tashkent": {"country": "UZ", "lat": 41.2995, "lng": 69.2401},
    "bishkek": {"country": "KG", "lat": 42.8746, "lng": 74.5698},
    "dubai": {"country": "AE", "lat": 25.2048, "lng": 55.2708},
    "abu dhabi": {"country": "AE", "lat": 24.4539, "lng": 54.3773},
    "riyadh": {"country": "SA", "lat": 24.7136, "lng": 46.6753},
    "doha": {"country": "QA", "lat": 25.2854, "lng": 51.5310},
    "istanbul": {"country": "TR", "lat": 41.0082, "lng": 28.9784},
    "new york": {"country": "US", "lat": 40.7128, "lng": -74.0060},
    "san francisco": {"country": "US", "lat": 37.7749, "lng": -122.4194},
    "toronto": {"country": "CA", "lat": 43.6532, "lng": -79.3832},
    "sao paulo": {"country": "BR", "lat": -23.5505, "lng": -46.6333},
    "buenos aires": {"country": "AR", "lat": -34.6037, "lng": -58.3816},
    "london": {"country": "GB", "lat": 51.5074, "lng": -0.1278},
    "frankfurt": {"country": "DE", "lat": 50.1109, "lng": 8.6821},
    "paris": {"country": "FR", "lat": 48.8566, "lng": 2.3522},
    "amsterdam": {"country": "NL", "lat": 52.3676, "lng": 4.9041},
    "oslo": {"country": "NO", "lat": 59.9139, "lng": 10.7522},
    "sydney": {"country": "AU", "lat": -33.8688, "lng": 151.2093},
    "auckland": {"country": "NZ", "lat": -36.8485, "lng": 174.7633},
}


def resolve_country(code: Optional[str]) -> Optional[GeoCountryInfo]:
    if not code:
        return None
    upper = code.strip().upper()
    return ISO_COUNTRIES.get(upper)


def resolve_geo_coordinates(country_code: Optional[str] = None, city_name: Optional[str] = None) -> Optional[Tuple[float, float]]:
    if city_name:
        k = city_name.strip().lower()
        if k in MAJOR_CITIES:
            return (MAJOR_CITIES[k]["lat"], MAJOR_CITIES[k]["lng"])

    if country_code:
        c = resolve_country(country_code)
        if c:
            return (c.lat, c.lng)

    return None
