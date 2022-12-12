import './main.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { Map, AttributionControl } from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

const accessToken = import.meta.env.VITE_ACCESS_TOKEN
const mapStyle = import.meta.env.VITE_MAP_STYLE
const minZoom = 16
const routeRadius = 25

// Create map
const map = new Map( {
	container: 'container',
	accessToken,
	style: mapStyle,
	zoom: 16,
	center: [ 69.248387, 41.316971 ],
	minZoom: minZoom,
	bearing: -174.65,
	pitch: 74.08,
	attributionControl: false,
	antialias: true,
} )

// Attribution control 
{
	const control = new AttributionControl( {
		compact: true,
		customAttribution: '<a href="https://github.com/lephn">© Metashkent</>'
	} )
	map.addControl( control )
}

map.on( 'load', e => {

	// Basic buldings
	map.addLayer( {
		'id': '3d-buildings',
		'source': 'composite',
		'source-layer': 'building',
		'filter': [ '==', 'extrude', 'true' ],
		'type': 'fill-extrusion',
		'minzoom': 16,
		'paint': {
			'fill-extrusion-color': '#CDFCF6',
			'fill-extrusion-height': [ 'get', 'height' ],
		},
	} )
} )

// Draw route
const draw = new MapboxDraw( {
	displayControlsDefault: false,
	controls: {
		line_string: true,
		trash: true,
	},
	styles: [
		{
			id: 'gl-draw-line',
			type: 'line',
			filter: [
				'all',
				[ '==', '$type', 'LineString' ],
				[ '!=', 'mode', 'static' ],
			],
			layout: {
				'line-cap': 'round',
				'line-join': 'round',
			},
			paint: {
				'line-color': '#0000ff',
				'line-width': 4,
				'line-opacity': 0.6,
				'line-dasharray': [ 0.1, 2 ],
			}
		},
		{
			id: 'gl-draw-polygon-and-line-vertex-halo-active',
			type: 'circle',
			filter: [
				'all',
				[ '==', 'meta', 'vertex' ],
				[ '==', '$type', 'Point' ],
				[ '!=', 'mode', 'static' ]
			],
			paint: {
				'circle-radius': 6,
				'circle-color': '#0000ff',
				'circle-opacity': 0.5,
			}
		},
	],
} )

map.addControl( draw )
map.on( 'draw.create', updateRoute )
map.on( 'draw.update', updateRoute )

async function updateRoute( e ) {

	const data = draw.getAll()

	const lastFeature = data.features.length - 1

	const coords = data.features[ lastFeature ].geometry.coordinates

	const newCoords = coords.join( ';' )

	const radius = coords.map( () => routeRadius )

	const route = await getMatch( newCoords, radius )

	addRoute( route )
}

// https://docs.mapbox.com/api/navigation/map-matching/
async function getMatch( coordinates, radius, ) {

	const radiuses = radius.join( ';' )

	try {

		const response = await fetch( `https://api.mapbox.com/matching/v5/mapbox/driving/${ coordinates }?geometries=geojson&radiuses=${ radiuses }&steps=true&access_token=${ accessToken }` )
	
		const json = await response.json()

		if ( response.status === 200 ) {

			return json.matchings[ 0 ].geometry
		}
	}
	catch( e ) {
		console.log( e )
	}
}

function addRoute( geometry ) {

	if ( map.getSource( 'route' ) ) {
		map.removeLayer( 'route' )
		map.removeSource( 'route' )
	}
	else {
		map.addLayer( {
			id: 'route',
			type: 'line',
			source: {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: geometry,
				}
			},
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': '#000000',
				'line-width': 5,
				'line-opacity': 0.5,
			},
		} )
	}
}
