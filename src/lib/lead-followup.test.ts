import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node test runner requires the explicit .ts extension.
import { followupTasks, shouldCloseSilentLead } from './lead-followup.ts';
test('tres seguimientos con mensaje pendiente de aprobación', () => {
 const tasks = followupTasks({id:'d',title:'Video',contactId:'c',createdAt:new Date('2026-01-01T00:00:00Z')});
 assert.deepEqual(tasks.map(t=>t.dueDate.toISOString().slice(0,10)),['2026-01-02','2026-01-04','2026-01-08']);
 assert.ok(tasks.every(t=>t.description.includes('revisar y copiar')));
});
test('solo un lead sin actividad por 14 días es candidato', () => {
 const createdAt=new Date('2026-01-01T00:00:00Z'); const now=new Date('2026-01-15T00:00:00Z');
 assert.equal(shouldCloseSilentLead({createdAt,stageName:'Lead'},now),true);
 assert.equal(shouldCloseSilentLead({createdAt,stageName:'Lead',lastActivityAt:now},now),false);
 assert.equal(shouldCloseSilentLead({createdAt,stageName:'Contactado'},now),false);
});
