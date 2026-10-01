import test from 'node:test';
import assert from 'node:assert/strict';
import {webRequestDates,readWebRequestDates,WEB_STORAGE_KEY} from '../public/app/bridge.mjs';
const res=(id,status,startDate,createdAt)=>({id,status,createdAt,request:{startDate,pickupStore:'s',usage:'unsure',question:'',leaningBefore:'unsure',confidenceBefore:3}});
const store=reservations=>JSON.stringify({version:2,reservations,devices:[],dealerTermsConfirmed:false,calendarUpdatedAt:'2026-10-01T00:00:00Z'});

test('newest pending website request pre-fills the start date with a 3-day end',()=>{
  const raw=store([res('TB-0002','operator_check','2026-10-06','2026-10-01T02:00:00Z'),res('TB-0001','requested','2026-10-03','2026-10-01T01:00:00Z')]);
  assert.deepEqual(webRequestDates(raw,'2026-10-01'),{start:'2026-10-06',end:'2026-10-09'});
  assert.deepEqual(webRequestDates(store([res('TB-1','confirmed','2026-10-30','x')]),'2026-10-01'),{start:'2026-10-30',end:'2026-11-02'});
});

test('no prefill for missing, corrupt, finished, past or malformed requests',()=>{
  for(const raw of [null,'','{bad',JSON.stringify({}),JSON.stringify({reservations:'x'}),
    store([res('a','in_trial','2026-10-05','x'),res('b','cancelled','2026-10-05','x'),res('c','completed','2026-10-05','x')]),
    store([res('d','requested','2026-09-30','x')]),store([res('e','requested','2026-13-01','x')]),store([res('f','requested','10/05/2026','x')]),store([null])])
    assert.equal(webRequestDates(raw,'2026-10-01'),null,String(raw));
});

test('reading the website store never writes or throws',()=>{
  const raw=store([res('TB-0001','requested','2026-10-03','x')]);
  const writes=[];const storage={getItem:key=>key===WEB_STORAGE_KEY?raw:null,setItem:(...args)=>writes.push(args),removeItem:(...args)=>writes.push(args)};
  assert.deepEqual(readWebRequestDates(storage,'2026-10-01'),{start:'2026-10-03',end:'2026-10-06'});
  assert.deepEqual(writes,[]);
  assert.equal(readWebRequestDates({getItem(){throw new DOMException('blocked','SecurityError');}},'2026-10-01'),null);
});
