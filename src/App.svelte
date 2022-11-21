<script>
	import Map from './Map.svelte';
	import Panel from './Panel.svelte';
	import { getPlaces, getBoundary, random, shuffle, getState, setState } from './utils.js';
	
	let map;
	let mapstyle = './data/mapstyle.json';
	let places;
	
	const geographies = {
		lad: {
			name: 'Local Authorities (not exactly easy)',
			text: 'local authority',
			codes: ['E06', 'E07', 'E08', 'E09', 'W06', 'N09', 'S12']
		},
		con: {
			name: 'Parliamentary Constituencies (a bit harder)',
			text: 'constituency',
			codes: ['E14', 'W07', 'N06', 'S14']
		},
		war: {
			name: 'Electoral Wards (rather hard)',
			text: 'ward',
			codes: ['E05', 'W05', 'N08', 'S12']
		},
		cit: {
			name: 'Built-up Areas (impossible)',
			text: 'build up area',
			codes: ['E34', 'W37', 'K05']
		}
	};
	
	let texts = {
		next: ['Show me another...', 'Gimme more...', 'More, more, more...', 'Just one more...', 'Keep \'em coming'],
		quit: ['Enough already!', 'I\'m done!', 'I quit!', 'I\'m bored!', 'I can\'t take this any more!', 'I need a break!', 'Please Stop!'],
		wrong: ['Nope, the answer was ', 'Sorry, it was ', 'Bad luck, it was ', 'Are you serious? It was ', 'You need to learn your geography. It was ', 'You\'re just guessing! It was ']
	}
	
	let game = {
		geography: null,
		started: false,
		showscores: false,
		about: false,
		turn: 0,
		score: 0,
		streak: 0,
		place: null,
		places: null,
		message: null
	};
	
	let history;
	
	// Function to load data and start game
	function startGame(geo) {
		// Set the geography type
		game.geography = geo;
		
		// Call function to load/set game history
		if (!history) {
			setHistory();
		}
		
		// Reset game turn and score
		game.turn = 0;
		game.score = 0;
		
		// Carry over streak from previous game
		game.streak = history[game.geography].streak;
		
		// Get geography codes and names from API (initiation of app)
		getPlaces(geographies[game.geography].codes)
			.then(result => {
				if (game.geography === "war") result.forEach(d => d.name = `${d.name} (${d.pname})`);
				places = shuffle(result); // Shuffle the array of places
			})
		  .then(() => { nextTurn() });
	}
	
	// New turn. Randomly select a place + get its polygon
	function nextTurn() {
		if (!game.started) { game.started = true };
		let id = 'boundary';

		// Get the next place from the shuffled list
		let place = places[game.turn % places.length];
		game.place = place;
		
		// Create an array of possible answers
		game.places = [];
		game.places.push(place);
		while (game.places.length < 3) {
			let place = random(places);
			if (!game.places.includes(place)) {
				game.places.push(place);
			}
		}
		game.places = shuffle(game.places);
		
		// Get geographic boundary of selected place
		getBoundary(place.code)
		.then(result => {
			console.log(result);
			// Remove previous boundary from the map
			if (map.getLayer(id)) {
				map.removeLayer(id);
				map.removeSource(id);
			}
			
			// Add new boundary to the map
			map.addSource(id, {
				'type': 'geojson',
				'data': result.geometry
			});
			map.addLayer({
				'id': id,
				'type': 'line',
				'source': id,
				'layout': {},
				'paint': {
					'line-color': '#fff',
					'line-width': 2
				}
			});
			
			// Fit map to boundary
			map.fitBounds(result.bounds, { padding: 20, animate: false });
		});
	}
	
	// Check if chosen place is correct
	function checkPlace(code) {
		if (code == game.place.code) {
			game.score += 1;
			game.streak += 1;
			history[game.geography].score += 1;
			history[game.geography].streak += 1;
			if (game.streak > history[game.geography].maxstreak) {
				history[game.geography].maxstreak = game.streak;
			};
			game.message = `You got it! It was ${game.place.name.replace(' BUA', '')}.`;
			if (game.streak >= 5) {
				game.message += ` That\'s ${game.streak} in a row!`;
				if (game.streak > game.turn + 1) {
					game.message += ` <br/><small>(including previous game)</small>`;
				}
			}
		} else {
			if (game.streak >= 5 && game.streak == history[game.geography].maxstreak) {
				game.message = `Dang, ended longest winning steak! It was ${game.place.name.replace(' BUA', '')}.`;
			} else {
				game.message = random(texts.wrong) + game.place.name.replace(' BUA', '');
			}
			game.streak = 0;
			history[game.geography].streak = 0;
		}
		game.turn += 1;
		history[game.geography].turns += 1;
		game.place = null;
		game.places = null;
		
		// Update the game history cookie
		setState('history', history);
	}
	
	// Function to set or load game history
	function setHistory() {
		// Check for cookie with previous score history
		if (!getState('history')) {
			// If no game history cookie, create cookie
			let hist = {};
			let keys = Object.keys(geographies);
			for (let i in keys) {
				hist[keys[i]] = {
					turns: 0,
					score: 0,
					streak: 0,
					maxstreak: 0
				};
			}
			history = hist;
			setState('history', history);
		} else {
			// Load history cookie
			history = getState('history');
			
			// Check if history for all game types (in case of future additions)
			let keys = Object.keys(history);
			let geos = Object.keys(geographies);
			for (let i in geos) {
				if (!keys.includes(geos[i])) {
					history[geos[i]] = {
						turns: 0,
						score: 0,
						streak: 0,
						maxstreak: 0
					};
				}
				setState('history', history);
			}
		}
	}
	
	// Function to end a game
	function endGame() {
		let id = 'boundary';

		// Remove boundary
		if (map.getLayer(id)) {
			map.removeLayer(id);
			map.removeSource(id);
		}

		// Reset map view
		map.fitBounds([
			[-10.760, 49.864],
			[1.863, 59.479]
		]);

		// Reset game
		game.started = false;
	}
	
	function showScores() {
		if (!history) {
			setHistory();
		}
		game.showscores = !game.showscores;
	}

	function showAbout() {
		game.about = !game.about;
	}

</script>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
	main {
		padding: 20px;
	}
	h1 {
		margin-top: 10px;
	}
	.block {
		display: block;
		width: 100%;
		cursor: pointer;
	}
	.highlight {
		background-color: #ccc;
	}
	td {
		padding-left: 0;
		padding-right: 20px;
	}
</style>

<Panel>
	<main>
		{#if game.about}
		<h1>About the game</h1>
		<p>This game was developed as an experiment using the <a href="https://statistics.data.gov.uk/home" target="_blank">ONS Geography Linked Data API</a> to load geographic boundaries for randomly selected places.</p>
		<p>The game was coded by <a href="https://twitter.com/bothness" target="_blank">Ahmad Barclay</a> using <a href="https://svelte.dev/" target="_blank">Svelte</a> and <a href="https://maplibre.org/maplibre-gl-js-docs/api/" target="_blank">Maplibre GL JS</a>. The base aerial/satellite map is <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI World Imagery</a>.</p>
		<button class="block highlight" on:click={showAbout}>Back to menu</button>
		{:else if game.showscores}
		<h1>Your all time record...</h1>
		<button class="block highlight" on:click={showScores}>Back to menu</button>
		{#each Object.keys(geographies) as geo}
			<h3>{geographies[geo].name}</h3>
			<table>
				<tbody>
					<tr>
						<td>Score</td>
						<td><strong>{history[geo].score} / {history[geo].turns} {#if history[geo].turns > 0}({Math.round((history[geo].score / history[geo].turns) * 100)}%){/if}</strong></td>
					</tr>
					<tr>
						<td>Best streak</td>
						<td><strong>{history[geo].maxstreak} in a row</strong></td>
					</tr>
				</tbody>
			</table>
		{/each}
		{:else if !game.started}
		  <h1>Guess the geography...</h1>
		  {#each Object.keys(geographies) as key}
	  	  <button class="block" on:click={() => {startGame(key)}}>{geographies[key].name}</button>
		  {/each}
			<button class="block highlight" on:click={showScores}>Just show me my scores!</button>
			<button class="block highlight" on:click={showAbout}>About the game</button>
		{:else if game.started}
		  <h1>Can you guess the {geographies[game.geography].text}?</h1>
		  <h3>Score {game.score} / {game.turn} {#if game.turn > 0}({Math.round((game.score / game.turn) * 100)}%){/if}</h3>
		  {#if game.places}
		    {#each game.places as place}
	  	    <button class="block" on:click={checkPlace(place.code)}>
						{#if game.geography == 'cit'}
						  {place.name.replace(' BUA', '')} 
						{:else}
						  {place.name} 
						{/if}
					</button>
		    {/each}
		  {:else if game.message}
			  <h3>{@html game.message}</h3>
		    <button class="block" on:click={nextTurn}>{random(texts.next)}</button>
		    <button class="block highlight" on:click={endGame}>{random(texts.quit)}</button>
		  {/if}
		{/if}
	</main>
</Panel>

<Map style={mapstyle} bind:map={map} />