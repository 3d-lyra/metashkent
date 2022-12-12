import './main.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Map, AttributionControl } from 'mapbox-gl'

const accessToken = import.meta.env.VITE_ACCESS_TOKEN
const mapStyle = import.meta.env.VITE_MAP_STYLE

// Create map
const map = new Map( {
	container: 'container',
	accessToken,
	style: 'mapbox://styles/mapbox/streets-v12',
	zoom: 15.36,
	center: [ 69.248266, 41.316696 ],
	bearing: -174.65,
	pitch: 53.08,
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
