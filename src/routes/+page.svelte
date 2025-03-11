<script>
	import MapCalibrator from '$lib/MapCalibrator.svelte';

	const PUBLIC_MAPTILER_API_KEY = 'wyEJtYuGgZZbbcNKZ3Gu';
</script>

<MapCalibrator
	styles={[
		{
			url: `https://api.maptiler.com/maps/satellite/style.json?key=${PUBLIC_MAPTILER_API_KEY}`,
			label: 'Satellite'
		},
		{
			url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${PUBLIC_MAPTILER_API_KEY}`,
			label: 'Rues'
		},
		{
			url: `https://api.maptiler.com/maps/topo-v2/style.json?key=${PUBLIC_MAPTILER_API_KEY}`,
			label: 'Topo'
		}
	]}
/>

<style>
	:global(html),
	:global(body) {
		height: 100%;
		height: 100dvh;
		margin: 0;
	}
</style>
