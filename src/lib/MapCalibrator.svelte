<script lang="ts">
	import Pin from './Pin.svelte';
	import { type MapMouseEvent } from 'maplibre-gl';
	import { CoordinatesConverter } from '@orienteering-js/map';
	import {
		MapLibre,
		Marker,
		NavigationControl,
		RasterLayer,
		type LngLatBoundsLike,
		type Map,
		type LngLatLike,
		ImageSource
	} from 'svelte-maplibre';
	import CallibrationPointAction from './CallibrationPointAction.svelte';
	import { lonLat2Tile, tile2LonLat } from './utils.js';
	import LoadImageWidget from './LoadImageWidget.svelte';
	import type { Style } from './style.model.js';
	import StyleSelector from './StyleSelector.svelte';

	const INITIAL_MAP_OPACITY = 0.3;

	type LonLatPoint = {
		lat: number;
		lng: number;
	};

	type FourCornersCoordinates = [
		[number, number],
		[number, number],
		[number, number],
		[number, number]
	];

	interface Props {
		point1Longitude?: number;
		point1Latitude?: number;
		point1X?: number;
		point1Y?: number;
		point2Longitude?: number;
		point2Latitude?: number;
		point2X?: number;
		point2Y?: number;
		point3Longitude?: number;
		point3Latitude?: number;
		point3X?: number;
		point3Y?: number;
		topLeftLongitude?: number;
		topLeftLatitude?: number;
		topRightLongitude?: number;
		topRightLatitude?: number;
		bottomRightLongitude?: number;
		bottomRightLatitude?: number;
		bottomLeftLongitude?: number;
		bottomLeftLatitude?: number;
		mapWidth?: number;
		mapHeight?: number;
		formId?: string;
		imageInputName?: string;
		mapUrl?: string;
		styles: [Style, ...Style[]];
	}

	let {
		point1Longitude = $bindable(),
		point1Latitude = $bindable(),
		point1X = $bindable(),
		point1Y = $bindable(),
		point2Longitude = $bindable(),
		point2Latitude = $bindable(),
		point2X = $bindable(),
		point2Y = $bindable(),
		point3Longitude = $bindable(),
		point3Latitude = $bindable(),
		point3X = $bindable(),
		point3Y = $bindable(),
		topLeftLongitude = $bindable(),
		topLeftLatitude = $bindable(),
		topRightLongitude = $bindable(),
		topRightLatitude = $bindable(),
		bottomRightLongitude = $bindable(),
		bottomRightLatitude = $bindable(),
		bottomLeftLongitude = $bindable(),
		bottomLeftLatitude = $bindable(),
		mapWidth = $bindable(),
		mapHeight = $bindable(),
		formId,
		imageInputName,
		mapUrl = $bindable(),
		styles
	}: Props = $props();

	let point1LonLat: LonLatPoint | undefined = $state();
	let point2LonLat: LonLatPoint | undefined = $state();
	let point3LonLat: LonLatPoint | undefined = $state();

	if (point1Longitude !== undefined && point1Latitude !== undefined) {
		point1LonLat = { lng: point1Longitude, lat: point1Latitude };
	}

	if (point2Longitude !== undefined && point2Latitude !== undefined) {
		point2LonLat = { lng: point2Longitude, lat: point2Latitude };
	}

	if (point3Longitude !== undefined && point3Latitude !== undefined) {
		point3LonLat = { lng: point3Longitude, lat: point3Latitude };
	}

	let coordinates: FourCornersCoordinates | undefined = $state();
	let imageMapZoom: number | undefined = $state(15);
	let imageMapBounds: LngLatBoundsLike | undefined = $state(undefined);
	let imageCoordinatesConverter: CoordinatesConverter | undefined = $state();

	if (mapWidth !== undefined && mapHeight !== undefined) {
		coordinates = getCoordinates(mapWidth, mapHeight);
		imageCoordinatesConverter = getCoordinateConverter(coordinates, mapWidth, mapHeight);
		imageMapZoom = undefined;
		imageMapBounds = getImageBoundsFromCoordinates(coordinates);
	}

	let coordinatesOnRealMap: FourCornersCoordinates | undefined = $state(undefined);
	let realMapZoom: number | undefined = $state(4);
	let realMapCenter: LngLatLike | undefined = $state([2.43028, 46.53972]);
	let realMapBounds: LngLatBoundsLike | undefined = $state(undefined);

	let realMapInit = $state(true);

	function getImageBoundsFromCoordinates(
		imageCoordinates: FourCornersCoordinates
	): LngLatBoundsLike {
		const lngs = imageCoordinates.map((p) => p[0]);
		const lats = imageCoordinates.map((p) => p[1]);

		return [
			{ lng: Math.min(...lngs), lat: Math.min(...lats) },
			{ lng: Math.max(...lngs), lat: Math.max(...lats) }
		];
	}

	let isDrawingCallibrationPointOnImage: 1 | 2 | 3 | null = $state(null);
	let isDrawingCallibrationPointOnMap: 1 | 2 | 3 | null = $state(null);
	let mapOpacity = $state(INITIAL_MAP_OPACITY);

	let selectedStyle: Style = $state(styles[0]);

	function onImageMapClick(e: MapMouseEvent & Object) {
		if (isDrawingCallibrationPointOnImage === null || imageCoordinatesConverter === undefined)
			return;

		const [x, y] = imageCoordinatesConverter.latLongToXY([e.lngLat.lat, e.lngLat.lng]);

		if (isDrawingCallibrationPointOnImage === 1) {
			point1X = x;
			point1Y = y;
		}

		if (isDrawingCallibrationPointOnImage === 2) {
			point2X = x;
			point2Y = y;
		}

		if (isDrawingCallibrationPointOnImage === 3) {
			point3X = x;
			point3Y = y;
		}

		isDrawingCallibrationPointOnMap = isDrawingCallibrationPointOnImage;
		isDrawingCallibrationPointOnImage = null;
	}

	function handleImageMapLoad(map: Map) {
		map.on('click', onImageMapClick);
		map.on('remove', () => map.off('click', onImageMapClick));
	}

	function handleRealMapClick(e: MapMouseEvent & Object) {
		if (isDrawingCallibrationPointOnMap === null || imageCoordinatesConverter === undefined) {
			return;
		}

		if (isDrawingCallibrationPointOnMap === 1) point1LonLat = e.lngLat;
		if (isDrawingCallibrationPointOnMap === 2) point2LonLat = e.lngLat;
		if (isDrawingCallibrationPointOnMap === 3) point3LonLat = e.lngLat;

		isDrawingCallibrationPointOnMap = null;
	}

	function getCoordinates(mapWidth: number, mapHeight: number): FourCornersCoordinates {
		const yFactor = mapHeight / mapWidth;
		const ZOOM = 15;
		const [centerX, centerY] = lonLat2Tile(0, 0, ZOOM);

		const topLeft = tile2LonLat(centerX - 1, centerY - yFactor, ZOOM);
		const topRight = tile2LonLat(centerX + 1, centerY - yFactor, ZOOM);
		const bottomRight = tile2LonLat(centerX + 1, centerY + yFactor, ZOOM);
		const bottomLeft = tile2LonLat(centerX - 1, centerY + yFactor, ZOOM);

		return [topLeft, topRight, bottomRight, bottomLeft];
	}

	function getCoordinateConverter(
		fourCornersCoordinates: FourCornersCoordinates,
		mapWidth: number,
		mapHeight: number
	): CoordinatesConverter {
		return new CoordinatesConverter([
			{
				gps: { lon: fourCornersCoordinates[0][0], lat: fourCornersCoordinates[0][1] },
				point: { x: 0, y: 0 }
			},
			{
				gps: { lon: fourCornersCoordinates[1][0], lat: fourCornersCoordinates[1][1] },
				point: { x: mapWidth - 1, y: 0 }
			},
			{
				gps: { lon: fourCornersCoordinates[3][0], lat: fourCornersCoordinates[3][1] },
				point: { x: 0, y: mapHeight - 1 }
			}
		]);
	}

	function handleMapFileLoading(
		event: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) {
		const file = event.currentTarget.files![0];
		if (!file) return;

		if (file.size > 10485760) {
			alert('Le fichier dépasse 10MB. Veuillez le compresser.');
			return;
		}

		const reader = new FileReader();
		reader.readAsDataURL(file);

		reader.onload = function (e) {
			const image = new Image();
			image.src = e.target!.result as string;
			mapUrl = e.target!.result as string;

			image.onload = function () {
				mapWidth = image.width;
				mapHeight = image.height;
				coordinates = getCoordinates(mapWidth, mapHeight);
				imageCoordinatesConverter = getCoordinateConverter(coordinates, mapWidth, mapHeight);
			};
		};
	}

	$effect(() => {
		if (point1LonLat !== undefined) point1Longitude = point1LonLat.lng;
	});

	$effect(() => {
		if (point1LonLat !== undefined) point1Latitude = point1LonLat.lat;
	});

	$effect(() => {
		if (point2LonLat !== undefined) point2Longitude = point2LonLat.lng;
	});

	$effect(() => {
		if (point2LonLat !== undefined) point2Latitude = point2LonLat.lat;
	});

	$effect(() => {
		if (point3LonLat !== undefined) point3Longitude = point3LonLat.lng;
	});

	$effect(() => {
		if (point3LonLat !== undefined) point3Latitude = point3LonLat.lat;
	});

	$effect(() => {
		if (
			mapUrl !== undefined &&
			mapWidth !== undefined &&
			mapHeight !== undefined &&
			point1LonLat !== undefined &&
			point1X !== undefined &&
			point1Y !== undefined &&
			point2LonLat !== undefined &&
			point2X !== undefined &&
			point2Y !== undefined &&
			point3LonLat !== undefined &&
			point3X !== undefined &&
			point3Y !== undefined
		) {
			const coordinatesConverter = new CoordinatesConverter([
				{
					gps: { lat: point1LonLat.lat, lon: point1LonLat.lng },
					point: { x: point1X, y: point1Y }
				},
				{
					gps: { lat: point2LonLat.lat, lon: point2LonLat.lng },
					point: { x: point2X, y: point2Y }
				},
				{ gps: { lat: point3LonLat.lat, lon: point3LonLat.lng }, point: { x: point3X, y: point3Y } }
			]);

			[topLeftLatitude, topLeftLongitude] = coordinatesConverter.xYToLatLong([0, 0]);
			[topRightLatitude, topRightLongitude] = coordinatesConverter.xYToLatLong([mapWidth - 1, 0]);
			[bottomRightLatitude, bottomRightLongitude] = coordinatesConverter.xYToLatLong([
				mapWidth - 1,
				mapHeight - 1
			]);
			[bottomLeftLatitude, bottomLeftLongitude] = coordinatesConverter.xYToLatLong([
				0,
				mapHeight - 1
			]);

			coordinatesOnRealMap = [
				[topLeftLongitude, topLeftLatitude],
				[topRightLongitude, topRightLatitude],
				[bottomRightLongitude, bottomRightLatitude],
				[bottomLeftLongitude, bottomLeftLatitude]
			];

			if (realMapInit) {
				realMapBounds = getImageBoundsFromCoordinates(coordinatesOnRealMap);
				realMapZoom = undefined;
				realMapCenter = undefined;
				realMapInit = false;
			}
		}
	});

	let paint = $derived({
		'raster-fade-duration': 0,
		'raster-opacity': mapOpacity
	});
</script>

<div class="main-container">
	<div class="left-pannel" class:drawing={isDrawingCallibrationPointOnImage}>
		<MapLibre
			style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
			class="left-map"
			zoom={imageMapZoom}
			bounds={imageMapBounds}
			zoomOnDoubleClick
			onload={handleImageMapLoad}
		>
			<NavigationControl position="bottom-left" />

			{#if mapUrl !== undefined && mapWidth !== undefined && mapHeight !== undefined && coordinates !== undefined}
				<ImageSource url={mapUrl} {coordinates}>
					<RasterLayer
						paint={{
							'raster-fade-duration': 0,
							'raster-opacity': 1
						}}
					/>
				</ImageSource>
			{/if}

			{#if point1X !== undefined && point1Y !== undefined && imageCoordinatesConverter !== undefined}
				{@const lngLat = imageCoordinatesConverter.xYToLatLong([point1X, point1Y])}

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }} offset={[0, -20]}>
					<Pin color="red" text="1" />
				</Marker>
			{/if}

			{#if point2X !== undefined && point2Y !== undefined && imageCoordinatesConverter !== undefined}
				{@const lngLat = imageCoordinatesConverter.xYToLatLong([point2X, point2Y])}

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }} offset={[0, -20]}>
					<Pin color="green" text="2" />
				</Marker>
			{/if}

			{#if point3X !== undefined && point3Y !== undefined && imageCoordinatesConverter !== undefined}
				{@const lngLat = imageCoordinatesConverter.xYToLatLong([point3X, point3Y])}

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }} offset={[0, -20]}>
					<Pin color="blue" text="3" />
				</Marker>
			{/if}
		</MapLibre>

		<LoadImageWidget {formId} {handleMapFileLoading} {imageInputName} {mapUrl} />

		{#if isDrawingCallibrationPointOnImage !== null}
			<article class="image-help-message">Cliquez sur l'image</article>
		{/if}
	</div>

	<div class="right-pannel" class:drawing={isDrawingCallibrationPointOnMap}>
		<MapLibre
			style={selectedStyle.url}
			class="right-map"
			center={realMapCenter}
			zoom={realMapZoom}
			bounds={realMapBounds}
			zoomOnDoubleClick
			onclick={handleRealMapClick}
		>
			<NavigationControl position="bottom-right" />

			{#if mapUrl !== undefined && coordinatesOnRealMap !== undefined}
				<ImageSource url={mapUrl} coordinates={coordinatesOnRealMap}>
					<RasterLayer {paint} />
				</ImageSource>
			{/if}

			{#if point1LonLat !== undefined}
				<Marker bind:lngLat={point1LonLat} draggable offset={[0, -20]}>
					<Pin color="red" text="1" />
				</Marker>
			{/if}

			{#if point2LonLat !== undefined}
				<Marker bind:lngLat={point2LonLat} draggable offset={[0, -20]}>
					<Pin color="green" text="2" />
				</Marker>
			{/if}

			{#if point3LonLat !== undefined}
				<Marker bind:lngLat={point3LonLat} draggable offset={[0, -20]}>
					<Pin color="blue" text="3" />
				</Marker>
			{/if}
		</MapLibre>

		{#if styles.length > 1}
			<StyleSelector {styles} {selectedStyle} setStyle={(newStyle) => (selectedStyle = newStyle)} />
		{/if}

		{#if isDrawingCallibrationPointOnMap !== null}
			<article class="map-help-message">Cliquez sur la carte</article>
		{/if}
	</div>

	{#if mapUrl !== undefined}
		{@const isPreviewDisabled =
			point1LonLat === undefined ||
			point1X === undefined ||
			point1Y === undefined ||
			point2LonLat === undefined ||
			point2X === undefined ||
			point2Y === undefined ||
			point3LonLat === undefined ||
			point3X === undefined ||
			point3Y === undefined}

		<article class="calibration-section">
			<p>Ajoutez des points de callibration</p>

			<ul>
				<CallibrationPointAction
					canDraw={point1LonLat === undefined || point1X === undefined || point1Y === undefined}
					isDrawingDisabled={isDrawingCallibrationPointOnImage !== null ||
						isDrawingCallibrationPointOnMap !== null}
					onDraw={() => (isDrawingCallibrationPointOnImage = 1)}
					onDelete={() => {
						point1LonLat = undefined;
						point1Longitude = undefined;
						point1Latitude = undefined;
						point1X = undefined;
						point1Y = undefined;
						coordinatesOnRealMap = undefined;
					}}
				>
					<Pin color="red" text="1" />
				</CallibrationPointAction>

				<CallibrationPointAction
					canDraw={point2LonLat === undefined || point2X === undefined || point2Y === undefined}
					isDrawingDisabled={isDrawingCallibrationPointOnImage !== null ||
						isDrawingCallibrationPointOnMap !== null}
					onDraw={() => (isDrawingCallibrationPointOnImage = 2)}
					onDelete={() => {
						point2LonLat = undefined;
						point2Longitude = undefined;
						point2Latitude = undefined;
						point2X = undefined;
						point2Y = undefined;
						coordinatesOnRealMap = undefined;
					}}
				>
					<Pin color="green" text="2" />
				</CallibrationPointAction>

				<CallibrationPointAction
					canDraw={point3LonLat === undefined || point3X === undefined || point3Y === undefined}
					isDrawingDisabled={isDrawingCallibrationPointOnImage !== null ||
						isDrawingCallibrationPointOnMap !== null}
					onDraw={() => (isDrawingCallibrationPointOnImage = 3)}
					onDelete={() => {
						point3LonLat = undefined;
						point3Longitude = undefined;
						point3Latitude = undefined;
						point3X = undefined;
						point3Y = undefined;
						coordinatesOnRealMap = undefined;
					}}
				>
					<Pin color="blue" text="3" />
				</CallibrationPointAction>
			</ul>

			<label>
				Previsualiser
				<input
					type="range"
					disabled={isPreviewDisabled}
					min="0"
					max="1"
					step="0.01"
					bind:value={mapOpacity}
				/>
			</label>

			{#if isPreviewDisabled}
				<p>
					<small>Vous devez dessiner les 3 points pour pouvoir prévisualiser</small>
				</p>
			{/if}

			<button type="submit" disabled={isPreviewDisabled} form={formId}> Soumettre </button>
		</article>
	{/if}
</div>

<style>
	.main-container {
		height: 100%;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
	}

	.left-pannel,
	.right-pannel {
		position: relative;
	}

	.left-pannel {
		border-right: 2 solid gray;
	}

	:global(.left-map),
	:global(.right-map) {
		width: 100%;
		height: 100%;
	}

	.calibration-section {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		max-width: 16rem;
		background-color: white;
		padding: 1rem;
		border-radius: 0.25rem;
	}

	.image-help-message,
	.map-help-message {
		position: absolute;
		z-index: 2;
		bottom: 1rem;
		left: 50%;
		translate: -50%;
		color: white;
		background-color: green;
	}

	:global(.maplibregl-ctrl button[type='button']) {
		margin-bottom: 0;
	}

	:global(details summary.maplibregl-ctrl-attrib-button::after) {
		background-image: none;
	}

	.drawing :global(.maplibregl-canvas-container.maplibregl-interactive) {
		cursor: crosshair;
	}
</style>
