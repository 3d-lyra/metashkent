import './main.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Map, AttributionControl } from 'mapbox-gl'

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
