<svelte:options customElement="map-calibrator" />

<script lang="ts">
	import { CoordinatesConverter } from '@orienteering-js/map';
	import type { Map, MapMouseEvent } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import {
		ImageSource,
		MapLibre,
		Marker,
		NavigationControl,
		RasterLayer,
		type LngLatBoundsLike,
		type LngLatLike
	} from 'svelte-maplibre';
	import { lonLat2Tile, tile2LonLat } from './utils.js';
	import { ENGLISH_LABELS, type Labels } from './labels.js';

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
		style: string;
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
		initialZoom?: number;
		initialCenter?: [number, number];
		labels?: Partial<Labels>;
		onMapLoad?: (map: Map) => void;
		acceptImage?: (args: {
			file: File;
			width: number;
			height: number;
		}) => boolean | Promise<boolean>;
		children?: Snippet;
	}

	let {
		style,
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
		initialCenter,
		initialZoom,
		labels,
		onMapLoad,
		acceptImage,
		children
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
	let realMapZoom: number | undefined = $state(initialZoom ?? 4);
	let realMapCenter: LngLatLike | undefined = $state(initialCenter ?? [2.43028, 46.53972]);
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
	let imageInput: HTMLInputElement | undefined = $state();

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

			image.onload = async function () {
				const isImageAccepted =
					acceptImage === undefined ||
					(await acceptImage({ file, width: image.width, height: image.height }));

				if (!isImageAccepted) return;

				mapUrl = image.src;
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
			class="left-maplibre-map"
			zoom={imageMapZoom}
			bounds={imageMapBounds}
			zoomOnDoubleClick
			onclick={onImageMapClick}
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

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }}>
					{@render pin(1)}
				</Marker>
			{/if}

			{#if point2X !== undefined && point2Y !== undefined && imageCoordinatesConverter !== undefined}
				{@const lngLat = imageCoordinatesConverter.xYToLatLong([point2X, point2Y])}

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }}>
					{@render pin(2)}
				</Marker>
			{/if}

			{#if point3X !== undefined && point3Y !== undefined && imageCoordinatesConverter !== undefined}
				{@const lngLat = imageCoordinatesConverter.xYToLatLong([point3X, point3Y])}

				<Marker lngLat={{ lon: lngLat[1], lat: lngLat[0] }}>
					{@render pin(3)}
				</Marker>
			{/if}
		</MapLibre>

		<input
			bind:this={imageInput}
			type="file"
			name={imageInputName}
			form={formId}
			style="display: none;"
			accept="image/*"
			oninput={handleMapFileLoading}
		/>

		<button
			type="button"
			onclick={() => imageInput?.click()}
			class="load-image-btn btn"
			style:display={mapUrl === undefined ? 'flex' : 'none'}
		>
			<i class="icon icon-upload"></i>

			{labels?.LOAD_IMAGE_BTN ?? ENGLISH_LABELS.LOAD_IMAGE_BTN}
		</button>

		{#if isDrawingCallibrationPointOnImage !== null}
			<article class="help-message">
				{labels?.IMAGE_PANNEL_HELP_MSG ?? ENGLISH_LABELS.IMAGE_PANNEL_HELP_MSG}
			</article>
		{/if}
	</div>

	<div class="right-pannel" class:drawing={isDrawingCallibrationPointOnMap}>
		<MapLibre
			{style}
			class="right-maplibre-map"
			center={realMapCenter}
			zoom={realMapZoom}
			bounds={realMapBounds}
			zoomOnDoubleClick
			onclick={handleRealMapClick}
			onload={onMapLoad}
		>
			<NavigationControl position="bottom-right" />

			{#if mapUrl !== undefined && coordinatesOnRealMap !== undefined}
				<ImageSource url={mapUrl} coordinates={coordinatesOnRealMap}>
					<RasterLayer {paint} />
				</ImageSource>
			{/if}

			{#if point1LonLat !== undefined}
				<Marker bind:lngLat={point1LonLat} draggable>
					{@render pin(1)}
				</Marker>
			{/if}

			{#if point2LonLat !== undefined}
				<Marker bind:lngLat={point2LonLat} draggable>
					{@render pin(2)}
				</Marker>
			{/if}

			{#if point3LonLat !== undefined}
				<Marker bind:lngLat={point3LonLat} draggable>
					{@render pin(3)}
				</Marker>
			{/if}
		</MapLibre>

		{#if isDrawingCallibrationPointOnMap !== null}
			<article class="help-message">
				{labels?.MAP_PANNEL_HELP_MSG ?? ENGLISH_LABELS.MAP_PANNEL_HELP_MSG}
			</article>
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

		<article class="central-section">
			<p>
				<big>
					{labels?.CALIBRATION_SECTION_TITLE ?? ENGLISH_LABELS.CALIBRATION_SECTION_TITLE}
				</big>
			</p>

			<ul>
				{@render calibrationPointAction({
					canDraw: point1LonLat === undefined || point1X === undefined || point1Y === undefined,
					isDrawingDisabled:
						isDrawingCallibrationPointOnImage !== null || isDrawingCallibrationPointOnMap !== null,
					onDraw: () => (isDrawingCallibrationPointOnImage = 1),
					onDelete: () => {
						point1LonLat = undefined;
						point1Longitude = undefined;
						point1Latitude = undefined;
						point1X = undefined;
						point1Y = undefined;
						coordinatesOnRealMap = undefined;
					},
					pinNumber: 1
				})}

				{@render calibrationPointAction({
					canDraw: point2LonLat === undefined || point2X === undefined || point2Y === undefined,
					isDrawingDisabled:
						isDrawingCallibrationPointOnImage !== null || isDrawingCallibrationPointOnMap !== null,
					onDraw: () => (isDrawingCallibrationPointOnImage = 2),
					onDelete: () => {
						point2LonLat = undefined;
						point2Longitude = undefined;
						point2Latitude = undefined;
						point2X = undefined;
						point2Y = undefined;
						coordinatesOnRealMap = undefined;
					},
					pinNumber: 2
				})}

				{@render calibrationPointAction({
					canDraw: point3LonLat === undefined || point3X === undefined || point3Y === undefined,
					isDrawingDisabled:
						isDrawingCallibrationPointOnImage !== null || isDrawingCallibrationPointOnMap !== null,
					onDraw: () => (isDrawingCallibrationPointOnImage = 3),
					onDelete: () => {
						point3LonLat = undefined;
						point3Longitude = undefined;
						point3Latitude = undefined;
						point3X = undefined;
						point3Y = undefined;
						coordinatesOnRealMap = undefined;
					},
					pinNumber: 3
				})}
			</ul>

			<label class="preview-label">
				{labels?.CALIBRATION_SECTION_MAP_OPACITY_RANGE_LABEL ??
					ENGLISH_LABELS.CALIBRATION_SECTION_MAP_OPACITY_RANGE_LABEL}

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
					<small>
						{labels?.CALIBRATION_SECTION_PREVIEW_DISABLED_MSG ??
							ENGLISH_LABELS.CALIBRATION_SECTION_PREVIEW_DISABLED_MSG}
					</small>
				</p>
			{/if}

			{@render children?.()}

			<button type="submit" disabled={isPreviewDisabled} form={formId} class="btn">
				<i class="icon icon-save"></i>

				{labels?.CALIBRATION_SECTION_SUBMIT_BTN ?? ENGLISH_LABELS.CALIBRATION_SECTION_SUBMIT_BTN}
			</button>
		</article>
	{/if}
</div>

{#snippet calibrationPointAction({
	canDraw,
	isDrawingDisabled,
	onDelete,
	onDraw,
	pinNumber
}: {
	isDrawingDisabled: boolean;
	canDraw: boolean;
	pinNumber: 1 | 2 | 3;
	onDraw: () => void;
	onDelete: () => void;
})}
	<li>
		{@render pin(pinNumber)}

		{#if canDraw}
			<button
				type="button"
				disabled={isDrawingDisabled}
				class="btn btn-secondary"
				onclick={() => onDraw()}
			>
				<i class="icon icon-edit"></i>

				{labels?.CALIBRATION_SECTION_DRAW_BTN ?? ENGLISH_LABELS.CALIBRATION_SECTION_DRAW_BTN}
			</button>
		{:else}
			<button
				type="button"
				disabled={isDrawingDisabled}
				class="btn btn-secondary"
				onclick={() => onDelete()}
			>
				<i class="icon icon-delete"></i>

				{labels?.CALIBRATION_SECTION_DELETE_BTN ?? ENGLISH_LABELS.CALIBRATION_SECTION_DELETE_BTN}
			</button>
		{/if}
	</li>
{/snippet}

{#snippet pin(pinNumber: 1 | 2 | 3)}
	<i
		class={[
			'icon icon-location pin',
			{
				'pin-1': pinNumber === 1,
				'pin-2': pinNumber === 2,
				'pin-3': pinNumber === 3
			}
		]}
	>
	</i>
{/snippet}

<input type="hidden" form={formId} name="point1Longitude" bind:value={point1Longitude} />
<input type="hidden" form={formId} name="point1Latitude" bind:value={point1Latitude} />
<input type="hidden" form={formId} name="point1X" bind:value={point1X} />
<input type="hidden" form={formId} name="point1Y" bind:value={point1Y} />
<input type="hidden" form={formId} name="point2Longitude" bind:value={point2Longitude} />
<input type="hidden" form={formId} name="point2Latitude" bind:value={point2Latitude} />
<input type="hidden" form={formId} name="point2X" bind:value={point2X} />
<input type="hidden" form={formId} name="point2Y" bind:value={point2Y} />
<input type="hidden" form={formId} name="point3Longitude" bind:value={point3Longitude} />
<input type="hidden" form={formId} name="point3Latitude" bind:value={point3Latitude} />
<input type="hidden" form={formId} name="point3X" bind:value={point3X} />
<input type="hidden" form={formId} name="point3Y" bind:value={point3Y} />
<input type="hidden" form={formId} name="topLeftLongitude" bind:value={topLeftLongitude} />
<input type="hidden" form={formId} name="topLeftLatitude" bind:value={topLeftLatitude} />
<input type="hidden" form={formId} name="topRightLongitude" bind:value={topRightLongitude} />
<input type="hidden" form={formId} name="topRightLatitude" bind:value={topRightLatitude} />
<input type="hidden" form={formId} name="bottomRightLongitude" bind:value={bottomRightLongitude} />
<input type="hidden" form={formId} name="bottomRightLatitude" bind:value={bottomRightLatitude} />
<input type="hidden" form={formId} name="bottomLeftLongitude" bind:value={bottomLeftLongitude} />
<input type="hidden" form={formId} name="bottomLeftLatitude" bind:value={bottomLeftLatitude} />
<input type="hidden" form={formId} name="width" bind:value={mapWidth} />
<input type="hidden" form={formId} name="height" bind:value={mapHeight} />

<style>
	:root {
		/* Help messages */
		--calibration-help-messages-padding: 1rem;
		--calibration-help-messages-border-radius: 0.25rem;
		--calibration-help-messages-color: white;
		--calibration-help-messages-background-color: green;

		/* Calibration section */
		--calibration-central-section-background-color: white;
		--calibration-central-section-border-radius: 0.25rem;
		--calibration-central-section-padding: 1rem;

		/* Buttons */
		--calibrator-btn-vertical-padding: 0.5rem;
		--calibrator-btn-horizontal-padding: 0.75rem;
		--calibrator-btn-background-color: blue;
		--calibrator-btn-secondary-color: blue;
		--calibrator-btn-border-radius: 0.25rem;

		/* Pins */
		--calibrator-pin-1-color: red;
		--calibrator-pin-2-color: green;
		--calibrator-pin-3-color: blue;

		/* Icons */
		--calibrator-location-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='00100100'%3E%3Ccircle cx='50' cy='50' r='47' stroke='currentColor' stroke-width='6' fill='none'/%3E%3Cline x1='50' y1='1' x2='50' y2='99' stroke='currentColor' stroke-width='4' /%3E%3Cline x1='1' y1='50' x2='99' y2='50' stroke='currentColor' stroke-width='4' /%3E%3C/svg%3E");
		--calibrator-upload-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 32 32'%3E%3C!-- Icon from Carbon by IBM - undefined --%3E%3Cpath fill='currentColor' d='m6 18l1.41 1.41L15 11.83V30h2V11.83l7.59 7.58L26 18L16 8zM6 8V4h20v4h2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4z'/%3E%3C/svg%3E");
		--calibrator-edit-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 32 32'%3E%3C!-- Icon from Carbon by IBM - undefined --%3E%3Cpath fill='currentColor' d='M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4zm-5-5L24 7.6l-3 3L17.4 7zM6 22v-3.6l10-10l3.6 3.6l-10 10z'/%3E%3C/svg%3E");
		--calibrator-delete-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 32 32'%3E%3C!-- Icon from Carbon by IBM - undefined --%3E%3Cpath fill='currentColor' d='M12 12h2v12h-2zm6 0h2v12h-2z'/%3E%3Cpath fill='currentColor' d='M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z'/%3E%3C/svg%3E");
		--calibrator-delete-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 32 32'%3E%3C!-- Icon from Carbon by IBM - undefined --%3E%3Cpath fill='currentColor' d='M12 12h2v12h-2zm6 0h2v12h-2z'/%3E%3Cpath fill='currentColor' d='M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z'/%3E%3C/svg%3E");
		--calibrator-save-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 32 32'%3E%3C!-- Icon from Carbon by IBM - undefined --%3E%3Cpath fill='currentColor' d='m27.71 9.29l-5-5A1 1 0 0 0 22 4H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V10a1 1 0 0 0-.29-.71M12 6h8v4h-8Zm8 20h-8v-8h8Zm2 0v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8H6V6h4v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.41l4 4V26Z'/%3E%3C/svg%3E");
	}

	/* Layout styles */
	.main-container {
		height: 100%;
		display: grid;
		align-items: stretch;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
	}

	.load-image-btn {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
	}

	.left-pannel,
	.right-pannel {
		position: relative;
	}

	.left-pannel {
		border-right: 2 solid gray;
	}

	:global(.left-maplibre-map),
	:global(.right-maplibre-map) {
		width: 100%;
		height: 100%;
	}

	.central-section {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		max-width: 16rem;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.central-section ul {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.central-section li {
		list-style-type: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.central-section li button {
		flex-grow: 1;
	}

	.preview-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.help-message {
		position: absolute;
		z-index: 2;
		bottom: 1rem;
		left: 50%;
		translate: -50%;
	}

	/* UI styles */
	.help-message {
		padding: var(--calibration-help-messages-padding);
		background-color: var(--calibration-help-messages-background-color);
		border-radius: var(--calibration-help-messages-border-radius);
		color: var(--calibration-help-messages-color);
	}

	.central-section {
		background-color: var(--calibration-central-section-background-color);
		padding: var(--calibration-central-section-padding);
		border-radius: var(--calibration-central-section-border-radius);
	}

	.btn {
		margin: 0;
		padding: var(--calibrator-btn-vertical-padding) var(--calibrator-btn-horizontal-padding);
		background-color: var(--calibrator-btn-background-color);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: var(--calibrator-btn-border-radius);
		border-style: none;
		color: white;
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--calibrator-btn-secondary-color);
		border: 1px solid var(--calibrator-btn-secondary-color);
	}

	.btn:disabled {
		opacity: 0.5;
	}

	.icon {
		-webkit-mask: var(--callibrator-icon) no-repeat;
		mask: var(--callibrator-icon) no-repeat;
		-webkit-mask-size: 100% 100%;
		mask-size: 100% 100%;
		background-color: currentColor;
		color: inherit;
		display: inline-block;
		width: 1.25rem;
		height: 1.25rem;
	}

	.pin {
		width: 2rem;
		height: 2rem;
	}

	.pin-1 {
		color: var(--calibrator-pin-1-color);
	}
	.pin-2 {
		color: var(--calibrator-pin-2-color);
	}
	.pin-3 {
		color: var(--calibrator-pin-3-color);
	}

	.icon-location {
		--callibrator-icon: var(--calibrator-location-icon);
	}
	.icon-upload {
		--callibrator-icon: var(--calibrator-upload-icon);
	}
	.icon-edit {
		--callibrator-icon: var(--calibrator-edit-icon);
	}
	.icon-delete {
		--callibrator-icon: var(--calibrator-delete-icon);
	}
	.icon-save {
		--callibrator-icon: var(--calibrator-save-icon);
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
