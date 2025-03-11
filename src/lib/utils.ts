// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_(JavaScript/ActionScript,_etc.)
function lon2tile(lon: number, zoom: number) {
	return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number) {
	return (
		((1 -
			Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
			2) *
		Math.pow(2, zoom)
	);
}

export function lonLat2Tile(lon: number, lat: number, zoom: number): [number, number] {
	return [lon2tile(lon, zoom), lat2tile(lat, zoom)];
}

function tile2long(x: number, z: number) {
	return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number) {
	var n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tile2LonLat(x: number, y: number, z: number): [number, number] {
	return [tile2long(x, z), tile2lat(y, z)];
}
