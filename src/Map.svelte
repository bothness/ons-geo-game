<script>
	import { onDestroy } from 'svelte';
	import maplibre from 'maplibre-gl';
	
	export let location = {
		bounds: [[-10.760, 49.864], [1.863, 59.479]] // UK Bounding box
	};
	export let style;
	
	export let map;
	let container;
	let options;
	
	function resetView() {
		map.fitBounds(location.bounds);
	}
	
	if (location.bounds) {
		options = { bounds: location.bounds };
	} else if (location.lon && location.lat) {
		options = {
			center: [location.lon, location.lat]
		}
		if (location.zoom) {
			options.zoom = location.zoom;
		}
	};

	function init() {
		map = new maplibre.Map({
			container,
			style: style,
			interactive: false,
			maxZoom: 13.9,
			...options
		});
		map.scrollZoom.disable();
	}

	onDestroy(() => {
		if (map) map.remove();
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" on:load={init} />
</svelte:head>

<style>
	div {
		width: 60%;
		height: 100%;
		position: fixed;
		right: 0;
	}
	@media (max-width: 600px) {
		div {
			width: 100%;
			height: 60%;
			position: absolute;
		}
	}
</style>

<div bind:this={container}>
	{#if map}
		<slot></slot>
	{/if}
</div>