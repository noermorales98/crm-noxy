import test from 'node:test';import assert from 'node:assert/strict';// @ts-ignore Node test runner requires the explicit .ts extension.
import {mappedCsv} from './csv-videos.ts';
test('CSV conserva coma y salto dentro de comillas con mapeo configurable',()=>{const rows=mappedCsv('Nombre,Alcance\n"Video, uno",100\n',{title:'Nombre',reach:'Alcance'});assert.deepEqual(rows,[{title:'Video, uno',reach:'100'}]);});

test('CSV con punto y coma',()=>{assert.deepEqual(mappedCsv('Nombre;Vistas\nA;5',{title:'Nombre',views:'Vistas'}),[{title:'A',views:'5'}]);});
