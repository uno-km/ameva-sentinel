"""
Unit tests for Python Geo-Registry, ISO countries, region viewports, and dashboard HTML.
"""

from ameva_sentinel import (
    resolve_country,
    resolve_geo_coordinates,
    ISO_COUNTRIES,
    REGION_VIEWPORTS,
    get_sentinel_dashboard_html,
)


def test_gabon_and_iso_country_resolution():
    gabon = resolve_country("GA")
    assert gabon is not None
    assert gabon.code == "GA"
    assert gabon.name == "Gabon"
    assert gabon.continent == "AF"
    assert gabon.capital == "Libreville"
    assert gabon.lat == -0.8037
    assert gabon.lng == 11.6094

    assert resolve_country("ga").name == "Gabon"
    assert resolve_country("kr").name == "South Korea"
    assert resolve_country("us").name == "United States"


def test_major_city_coordinates():
    libreville = resolve_geo_coordinates("GA", "Libreville")
    assert libreville == (0.4162, 9.4673)

    seoul = resolve_geo_coordinates("KR", "Seoul")
    assert seoul == (37.5665, 126.9780)

    dubai = resolve_geo_coordinates("AE", "Dubai")
    assert dubai == (25.2048, 55.2708)

    fallback = resolve_geo_coordinates("GA", "UnknownCity")
    assert fallback == (-0.8037, 11.6094)


def test_9_region_viewports():
    expected_regions = [
        "global",
        "africa",
        "south_america",
        "oceania",
        "central_asia",
        "middle_east",
        "europe",
        "north_america",
        "east_asia",
    ]

    for reg in expected_regions:
        assert reg in REGION_VIEWPORTS
        vp = REGION_VIEWPORTS[reg]
        assert isinstance(vp.label, str)
        assert len(vp.center) == 2
        assert vp.zoom >= 2


def test_dashboard_osm_and_controls():
    html = get_sentinel_dashboard_html()
    assert "tile.openstreetmap.org" in html
    assert 'data-region="africa"' in html
    assert 'data-region="south_america"' in html
    assert 'data-region="middle_east"' in html
    assert 'data-region="central_asia"' in html
    assert "btn-sim-gabon" in html
