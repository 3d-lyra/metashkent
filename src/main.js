import './main.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { Map, AttributionControl } from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

const accessToken = import.meta.env.VITE_ACCESS_TOKEN
const mapStyle = import.meta.env.VITE_MAP_STYLE
const minZoom = 16

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
				'line-color': '#000000',
				'line-width': 10,
				'line-opacity': 0.5,
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
				'circle-radius': 10,
				'circle-color': '#000000',
			}
		},
		{
			id: 'gl-draw-polygon-and-line-vertex-active',
			type: 'circle',
			filter: [
				'all',
				[ '==', 'meta', 'vertex' ],
				[ '==', '$type', 'Point' ],
				[ '!=', 'mode', 'static' ],
			],
			paint: {
				'circle-radius': 6,
				'circle-color': '#ffffff',
			}
		}
	],
} )

map.addControl( draw )
map.on( 'draw.create', updateRoute )
map.on( 'draw.update', updateRoute )

function updateRoute( e ) {

	console.log( e.features[ 0 ].geometry.coordinates )
}
