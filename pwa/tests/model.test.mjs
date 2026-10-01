import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,createRequest,transition,saveRecords,saveDecision,requiredReturns,availableAgain,loadState} from '../public/model.mjs';
const now=new Date('2026-09-29T01:00:00Z');
const request=()=>createRequest(initialState(),{start:'2026-10-01',end:'2026-10-04',task:'development'},now);
const step=(s,a,e={})=>transition(s,a,e,'테스트 확인',now);
function active(){let s=step(request(),'review');s=step(s,'secure',{terms:true,buffer:true});s=step(s,'confirm',{approved:true,amount:true,reservation:true});return step(s,'pickup',{handoff:true});}
test('date selection creates only unconfirmed request and does not mutate previous state',()=>{const base=initialState();const s=createRequest(base,{start:'2026-10-01',end:'2026-10-04',task:'development'},now);assert.equal(s.request.status,'requested');assert.equal(s.payment.status,'none');assert.equal(base.request,null);});
test('invalid, past, reversed and impossible dates rejected',()=>{for(const [start,end] of [['2026-09-01','2026-10-01'],['2026-10-01','2026-10-01'],['2027-02-30','2027-03-04'],['garbage','2026-10-05']])assert.throws(()=>createRequest(initialState(),{start,end,task:'video'},now));});
test('duplicate request cannot overwrite saved work',()=>assert.throws(()=>createRequest(request(),{start:'2026-10-01',end:'2026-10-04',task:'daily'},now),/기존/));
test('confirmation and pickup cannot skip operational steps',()=>{assert.throws(()=>step(request(),'confirm',{approved:true,amount:true,reservation:true}),/현재/);assert.throws(()=>step(request(),'pickup',{handoff:true}),/현재/);});
test('one unavailable device blocks pair and buffer is required',()=>{const s=step(request(),'review');s.devices.air.ready=false;assert.throws(()=>step(s,'secure',{terms:true,buffer:true}),/두 기기/);s.devices.air.ready=true;assert.throws(()=>step(s,'secure',{terms:true}),/여유/);});
test('payment link issuance remains pending',()=>{const s=step(step(request(),'review'),'secure',{terms:true,buffer:true});assert.equal(s.request.status,'awaiting_payment');assert.equal(s.payment.status,'pending');assert.equal(availableAgain(s,'air'),false);});
test('screenshot or incomplete matching cannot confirm payment',()=>{const s=step(step(request(),'review'),'secure',{terms:true,buffer:true});assert.throws(()=>step(s,'confirm',{screenshot:true}),/대조/);assert.throws(()=>step(s,'confirm',{approved:true,amount:true}),/대조/);});
test('expired payment never automatically confirms',()=>{const s=step(step(request(),'review'),'secure',{terms:true,buffer:true});assert.throws(()=>transition(s,'confirm',{approved:true,amount:true,reservation:true},'late',new Date('2026-10-02')),/기한/);});
test('all operational changes require a reason',()=>assert.throws(()=>transition(request(),'review',{},'   ',now),/사유/));
test('comparison input has finite ranges and stays editable',()=>{const s=active();assert.throws(()=>saveRecords(s,{air:{minutes:-1},pro:{minutes:3}}),/소요/);const next=saveRecords(s,{air:{minutes:'5.5',portability:5,screen:3,feel:4,note:'가벼움'},pro:{minutes:'',portability:0,screen:0,feel:0,note:''}});assert.equal(next.records.pro.minutes,'');assert.equal(next.records.air.minutes,'5.5');assert.equal(s.records.air.minutes,'');});
test('undecided and a reason are supported',()=>{const s=active();assert.throws(()=>saveDecision(s,{choice:'undecided',reason:'',confidence:3}),/이유/);const next=saveDecision(s,{choice:'undecided',reason:'조금 더 고민',confidence:3});assert.equal(next.decision.saved,true);assert.deepEqual(requiredReturns(next),['air','pro']);});
test('a purchase device must be chosen explicitly and is cleared for other decisions',()=>{
  const s=active();assert.equal(s.decision.device,null);
  for(const device of [undefined,'','unknown'])assert.throws(()=>saveDecision(s,{choice:'used',device,reason:'비교 후 구매 의향',confidence:3}),/체험 기기를 선택/);
  const pro=saveDecision(s,{choice:'used',device:'pro',reason:'내 작업에 편했어요',confidence:4});
  assert.equal(pro.decision.device,'pro');
  for(const choice of ['undecided','return','new']){
    const next=saveDecision(pro,{choice,device:'pro',reason:'조금 더 생각해요',confidence:3});
    assert.equal(next.decision.device,null);assert.deepEqual(requiredReturns(next),['air','pro']);
  }
  assert.equal(pro.decision.device,'pro');
});
test('purchase intent does not waive any device return',()=>{const s=saveDecision(active(),{choice:'used',device:'air',reason:'휴대성',confidence:4});assert.deepEqual(requiredReturns(s),['air','pro']);assert.throws(()=>step(s,'sale',{dealer:true}),/정산/);});
test('one confirmed sale still requires other device and inspection',()=>{let s=saveDecision(active(),{choice:'used',device:'air',reason:'휴대성',confidence:4});s=step(s,'sale',{dealer:true,settled:true});assert.equal(s.request.status,'active');assert.deepEqual(requiredReturns(s),['pro']);assert.throws(()=>saveDecision(s,{choice:'used',device:'pro',reason:'바꿈',confidence:4}),/바꿀/);s=step(s,'return');assert.throws(()=>step(s,'receive',{air:true}),/Pro/);s=step(s,'receive',{pro:true});assert.equal(availableAgain(s,'pro'),false);assert.throws(()=>step(s,'inspect',{}),/Pro/);s=step(s,'inspect',{pro:true});assert.equal(s.request.status,'completed');assert.equal(availableAgain(s,'pro'),true);assert.equal(availableAgain(s,'air'),false);});
test('buying new still requires both demo devices',()=>{const s=saveDecision(active(),{choice:'new',reason:'새 제품 선호',confidence:4});assert.deepEqual(requiredReturns(s),['air','pro']);});
test('customer checklist cannot certify operational inspection',()=>{let s=saveDecision(active(),{choice:'return',reason:'보류',confidence:2});s.returnChecks={backup:true,logout:true,findmy:true,accessories:true};s=step(step(s,'return'),'receive',{air:true,pro:true});assert.throws(()=>step(s,'inspect',{}),/검수/);assert.equal(availableAgain(s,'air'),false);});
test('cancel is disallowed after handoff',()=>assert.throws(()=>step(active(),'cancel',{linkClosed:true,noPending:true}),/현재/));
test('refund requested and completed remain separate states',()=>{let s=step(step(request(),'review'),'secure',{terms:true,buffer:true});s=step(s,'confirm',{approved:true,amount:true,reservation:true});s=step(s,'cancel',{linkClosed:true,noPending:true});assert.equal(s.payment.status,'refund_requested');assert.throws(()=>step(s,'refund',{}),/환불 거래/);s=step(s,'refund',{refunded:true});assert.equal(s.payment.status,'refunded');});
test('invalid stored data is surfaced without removing it',()=>{const raw='{broken';let removed=false;assert.throws(()=>loadState({getItem:()=>raw,removeItem:()=>{removed=true;}}));assert.equal(removed,false);});
test('saved valid state restores all customer data',()=>{const s=saveDecision(active(),{choice:'undecided',reason:'더 생각',confidence:3});assert.deepEqual(loadState({getItem:()=>JSON.stringify(s)}),s);});
