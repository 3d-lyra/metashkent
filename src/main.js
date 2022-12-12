import './main.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { Map, AttributionControl } from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { Camera, Scene, HemisphereLight, WebGLRenderer, Matrix4, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader'
import { MercatorCoordinate } from 'mapbox-gl'

const accessToken = import.meta.env.VITE_ACCESS_TOKEN
const mapStyle = import.meta.env.VITE_MAP_STYLE
const minZoom = 16
const routeRadius = 25

// Create map
const map = new Map( {
	container: 'container',
	accessToken,
	style: mapStyle,
	zoom: 22,
	center: [ 69.243469, 41.318780 ],
	minZoom: minZoom,
	bearing: 122,
	pitch: 57,
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


// Load THREE.JS Scene & .glb model
const modelAsMercatorCoordinate = MercatorCoordinate.fromLngLat( [ 69.243463, 41.318787 ], 0 )

const modelTransform = {
	translateX: modelAsMercatorCoordinate.x,
	translateY: modelAsMercatorCoordinate.y,
	translateZ: modelAsMercatorCoordinate.z,
	rotateX: Math.PI / 2,
	rotateY: - Math.PI / 1.9,
	rotateZ: 0,
	scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
}

const threeLayer = {
	id: '3d-model',
	type: 'custom',
	renderingMode: '3d',
	onAdd( map, gl ) {
		this.camera = new Camera()
		this.scene = new Scene()

		{
			const light = new HemisphereLight( 0xffffff, 0xeeeeff, 1 )
			this.scene.add( light )
		}

		const loader = new GLTFLoader()

		// Model by https://sketchfab.com/LePointBAT
		loader.load( 'models/stylized_f40.glb', gltf => {
			gltf.scene.scale.set( 0.25, 0.25, 0.25 )
			this.scene.add( gltf.scene )
		} )

		this.map = map

		this.renderer = new WebGLRenderer( {
			canvas: map.getCanvas(),
			context: gl,
			alpha: true,
			antialias: true,
		} )
 
		this.renderer.autoClear = false
	},
	render( gl, matrix ) {

		const rotationX = new Matrix4().makeRotationAxis( new Vector3( 1, 0, 0 ), modelTransform.rotateX )
		const rotationY = new Matrix4().makeRotationAxis( new Vector3( 0, 1, 0 ), modelTransform.rotateY )
		const rotationZ = new Matrix4().makeRotationAxis( new Vector3( 0, 0, 1 ), modelTransform.rotateZ )

		const m = new Matrix4().fromArray( matrix )
		const l = new Matrix4().makeTranslation( modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ )
		.scale( new Vector3( modelTransform.scale, -modelTransform.scale, modelTransform.scale ) )
		.multiply( rotationX )
		.multiply( rotationY )
		.multiply( rotationZ )
 
		this.camera.projectionMatrix = m.multiply(l)
		this.renderer.resetState()
		this.renderer.render(this.scene, this.camera)
		this.map.triggerRepaint()
	}
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

	map.addLayer( threeLayer )
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

			console.info( 'Distance:', json.matchings[ 0 ].legs[ 0 ].distance )
			console.info( 'Steps:', json.matchings[ 0 ].legs[ 0 ].steps )

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
