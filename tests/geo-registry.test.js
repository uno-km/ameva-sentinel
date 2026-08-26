import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ISO_COUNTRIES,
  REGION_VIEWPORTS,
  resolveCountry,
  resolveGeoCoordinates,
  parseEdgeGeoHeaders
} from '../packages/risk-core/dist/index.js';
import { getSentinelDashboardHtml } from '../packages/sentinel/dist/adapters/dashboard.js';

test('GeoRegistry: Comprehensive ISO Country and Gabon (GA) Resolution', () => {
  const gabon = resolveCountry('GA');
  assert.ok(gabon, 'Gabon (GA) must be present in registry');
  assert.equal(gabon.code, 'GA');
  assert.equal(gabon.name, 'Gabon');
  assert.equal(gabon.continent, 'AF');
  assert.equal(gabon.continentName, 'Africa');
  assert.equal(gabon.capital, 'Libreville');
  assert.equal(gabon.lat, -0.8037);
  assert.equal(gabon.lng, 11.6094);

  // Case insensitivity
  assert.equal(resolveCountry('ga')?.name, 'Gabon');
  assert.equal(resolveCountry('kr')?.name, 'South Korea');
  assert.equal(resolveCountry('us')?.name, 'United States');
  assert.equal(resolveCountry('br')?.name, 'Brazil');
  assert.equal(resolveCountry('kz')?.name, 'Kazakhstan');
});

test('GeoRegistry: Major City and Country Pinpoint Coordinates', () => {
  const libreville = resolveGeoCoordinates('GA', 'Libreville');
  assert.deepEqual(libreville, [0.4162, 9.4673]);

  const seoul = resolveGeoCoordinates('KR', 'Seoul');
  assert.deepEqual(seoul, [37.5665, 126.9780]);

  const dubai = resolveGeoCoordinates('AE', 'Dubai');
  assert.deepEqual(dubai, [25.2048, 55.2708]);

  const almaty = resolveGeoCoordinates('KZ', 'Almaty');
  assert.deepEqual(almaty, [43.2220, 76.8512]);

  // Fallback to Country centroid when city is unknown
  const countryFallback = resolveGeoCoordinates('GA', 'UnknownCity');
  assert.deepEqual(countryFallback, [-0.8037, 11.6094]);
});

test('GeoRegistry: 9 English Region Viewports Integrity', () => {
  const expectedRegions = [
    'global',
    'africa',
    'south_america',
    'oceania',
    'central_asia',
    'middle_east',
    'europe',
    'north_america',
    'east_asia'
  ];

  for (const r of expectedRegions) {
    assert.ok(REGION_VIEWPORTS[r], `Region viewport ${r} must exist`);
    assert.ok(typeof REGION_VIEWPORTS[r].label === 'string');
    assert.equal(REGION_VIEWPORTS[r].center.length, 2);
    assert.ok(REGION_VIEWPORTS[r].zoom >= 2);
  }
});

test('GeoRegistry: Edge & CDN Geo Header Parsers', () => {
  const cloudflareHeaders = {
    'cf-ipcountry': 'ga',
    'cf-ipcity': 'Libreville',
    'cf-connecting-asn': '37100',
    'cf-iplatitude': '0.4162',
    'cf-iplongitude': '9.4673'
  };

  const parsed = parseEdgeGeoHeaders(cloudflareHeaders);
  assert.equal(parsed.country, 'GA');
  assert.equal(parsed.city, 'Libreville');
  assert.equal(parsed.asn, 37100);
  assert.equal(parsed.latitude, 0.4162);
  assert.equal(parsed.longitude, 9.4673);
});

test('Dashboard: Embedded HTML contains OpenStreetMap and 9 English Region Viewports', () => {
  const html = getSentinelDashboardHtml();
  assert.ok(html.includes('tile.openstreetmap.org'), 'Must use OpenStreetMap tiles');
  assert.ok(html.includes('data-region="africa"'), 'Must include Africa region button');
  assert.ok(html.includes('data-region="south_america"'), 'Must include South America region button');
  assert.ok(html.includes('data-region="central_asia"'), 'Must include Central Asia region button');
  assert.ok(html.includes('data-region="middle_east"'), 'Must include Middle East region button');
  assert.ok(html.includes('btn-sim-gabon'), 'Must include Gabon simulation control');
});
