<script lang="ts">
	import MapCalibrator from '$lib/MapCalibrator.svelte';
	import maplibregl from 'maplibre-gl';
	import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';

	// import '@picocss/pico/css/pico.css';
	import '@maptiler/geocoding-control/style.css';

	const PUBLIC_MAPTILER_API_KEY = 'wyEJtYuGgZZbbcNKZ3Gu';

	const formId = 'form-id';
</script>

<form
	id={formId}
	onsubmit={(e: SubmitEvent) => {
		e.preventDefault();

		const formData = new FormData(e.target as HTMLFormElement);

		formData.forEach((value, key) => console.log({ key, value }));
	}}
></form>

<MapCalibrator
	{formId}
	imageInputName="mapFile"
	style="https://api.maptiler.com/maps/satellite/style.json?key={PUBLIC_MAPTILER_API_KEY}"
	onMapLoad={(map) => {
		const gc = new GeocodingControl({ apiKey: PUBLIC_MAPTILER_API_KEY, maplibregl });
		map.addControl(gc);
	}}
>
	<label>
		Map name

		<input type="text" name="name" form={formId} required />
	</label>
</MapCalibrator>

<style>
	:global(html),
	:global(body) {
		height: 100%;
		height: 100dvh;
		margin: 0;
	}
</style>
