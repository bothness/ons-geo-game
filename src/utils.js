import { csvParse } from 'd3-dsv';
import { bbox } from '@turf/turf';
import { parse } from './wellknown.js';

const apiurl = 'https://pmd3-production-drafter-onsgeo.publishmydata.com/v1/sparql/live?query=';

// Function to get place names and codes
export async function getPlaces(codes) {
	let codestring = '';
	codes.forEach(code => {
		codestring += ' statid:' + code;
	});
	let query = `PREFIX statid: <http://statistics.data.gov.uk/id/statistical-entity/>
PREFIX statdef: <http://statistics.data.gov.uk/def/statistical-entity#>
PREFIX statgeo: <http://statistics.data.gov.uk/def/statistical-geography#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?code ?name ?pname
WHERE {
  VALUES ?ent {${codestring} }
  ?geography statdef:code ?ent ;
             statgeo:status "live" ;
             rdfs:label ?code ;
             statgeo:officialname ?name .
  OPTIONAL {
    ?geography statgeo:parentcode ?parent .
    ?parent statgeo:officialname ?pname .
  }
}
LIMIT 10000`;
	
  let response = await fetch(apiurl + encodeURIComponent(query));
  let string = await response.text();
  let data = csvParse(string);
  return data;
}

// Function to get boundary polygon based on place code
export async function getBoundary(code) {
	let query = `PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
SELECT ?geometry
WHERE {
  <http://statistics.data.gov.uk/id/statistical-geography/${code}/geometry> geosparql:asWKT ?geometry
}
LIMIT 1`;
  let response = await fetch(apiurl + encodeURIComponent(query));
  let string = await response.text();
  let data = await csvParse(string);
	
	// Convert polygon from WKT to geojson format
  let geojson = await parse(data[0].geometry);
	
	// Get the lon/lat bounding box of the polygon
  let bounds = await bbox(geojson);
	
  return {
		geometry: geojson,
		bounds: bounds
	};
}

// Select a random item from an array
export function random(array) {
	let num = Math.floor(Math.random() * array.length);
	return array[num];
}

// Function to return an array in a random order
export function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export function setState(name, value) {
	let val = JSON.stringify(value);
	localStorage.setItem(name, val);
}

export function getState(name) {
	if (localStorage.getItem(name)) {
		return JSON.parse(localStorage.getItem(name));
	}
	return null;
}

export function deleteState(name) {
	localStorage.setItem(name, null);
}