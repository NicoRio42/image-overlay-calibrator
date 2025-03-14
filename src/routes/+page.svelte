<script lang="ts">
	import MapCalibrator from '$lib/MapCalibrator.svelte';
	import maplibregl from 'maplibre-gl';
	import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
	import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';

	// import '@picocss/pico/css/pico.css';
	// Keep styles imports in this order
	import './global.css';
	// Keep styles imports in this order
	import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';

	const PUBLIC_MAPTILER_API_KEY = 'wyEJtYuGgZZbbcNKZ3Gu';

	const formId = 'form-id';
</script>

<div class="wrapper">
	<form
		id={formId}
		onsubmit={(e: SubmitEvent) => {
			e.preventDefault();

			const formData = new FormData(e.target as HTMLFormElement);

			formData.forEach((value, key) => console.log({ key, value }));
		}}
	></form>

	<nav>Toto</nav>

	<MapCalibrator
		{formId}
		imageInputName="mapFile"
		style="https://api.maptiler.com/maps/satellite/style.json?key={PUBLIC_MAPTILER_API_KEY}"
		onMapLoad={(map) => {
			const geocoder = new (MaplibreGeocoder as unknown as typeof MaplibreGeocoder.default)(
				{
					forwardGeocode: async (config) => {
						const response = await fetch(
							`https://api.maptiler.com/geocoding/${config.query}.json?key=${PUBLIC_MAPTILER_API_KEY}`
						);
						const geojson = await response.json();
						return {
							type: 'FeatureCollection',
							features: geojson.features
						};
					}
				},
				{ maplibregl }
			);
			map.addControl(geocoder);
		}}
	>
		<label>
			Map name

			<input type="text" name="name" form={formId} required />
		</label>
	</MapCalibrator>
</div>

<style>
	.wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	form {
		display: none;
	}
</style>
