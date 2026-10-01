import {validateSavedReflections} from './reflection.mjs';
export const STORAGE_KEY = 'tbyb-teto-demo-v1';
export const labels = {requested:'요청 접수 · 미확정',reviewing:'운영 확인 중',awaiting_payment:'결제 대기 · 미확정',confirmed:'예약 확정 · 데모',active:'체험 중 · 데모',returning:'반납 접수',inspecting:'검수 중',completed:'체험 완료 · 데모',cancelled:'취소 완료 · 데모'};
export const stages = ['requested','reviewing','awaiting_payment','confirmed','active','returning','inspecting','completed'];
export const taskLabels = {development:'개발',video:'영상 편집',design:'디자인',daily:'문서 · 일상'};
export const choiceLabels = {undecided:'아직 결정 못 함',return:'두 대 모두 반납',new:'새 제품 구매 의향',used:'체험 기기 구매 의향'};
export function initialState() {
  return {version:1,request:null,devices:{air:{ready:true,secured:false,returned:false,inspected:false},pro:{ready:true,secured:false,returned:false,inspected:false}},payment:{status:'none',deadline:null},records:{air:{minutes:'',portability:0,screen:0,feel:0,note:''},pro:{minutes:'',portability:0,screen:0,feel:0,note:''}},decision:{choice:'undecided',device:null,confidence:3,reason:'',saved:false},returnChecks:{backup:false,logout:false,findmy:false,accessories:false},sale:{confirmed:false,device:null},survey:{day7:'unknown',day30:'unknown'},logs:[]};
}
export function freshDate(offset = 0, now = new Date()) { const date = new Date(now); date.setDate(date.getDate()+offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function createRequest(state, input, now = new Date()) {
  if (state.request) throw new Error('기존 데모가 있어요. 운영 화면에서 초기화한 뒤 새로 시작해 주세요.');
  const start = String(input.start || ''), end = String(input.end || '');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!validDate(start) || !validDate(end) || start < freshDate(0,now) || end <= start) throw new Error('오늘 이후의 시작일과 그보다 늦은 반납일을 선택해 주세요.');
  const next = structuredClone(state);
  next.request = {id:'DEMO-'+now.getTime().toString(36).toUpperCase(),start,end,task:taskLabels[input.task]?input.task:null,point:String(input.point||'').slice(0,300),status:'requested',createdAt:now.toISOString(),beforeChoice:['air','pro','undecided'].includes(input.beforeChoice)?input.beforeChoice:'undecided',beforeConfidence:input.beforeConfidence?Number(input.beforeConfidence):null};
  next.logs.push({time:now.toISOString(),action:'데모 일정 요청',reason:'고객 요청을 이 브라우저에만 저장. 실제 접수·확정 아님.'});
  return next;
}
export function requiredReturns(state) { return ['air','pro'].filter(key => !(state.sale.confirmed && state.sale.device === key)); }
export function availableAgain(state,key) { const d=state.devices[key]; return d.ready && !d.secured && (!state.sale.confirmed || state.sale.device!==key); }
export function transition(state,action,evidence={},reason='',now=new Date()) {
  if (!state.request) throw new Error('먼저 데모 일정 요청을 만들어 주세요.');
  if (!String(reason).trim()) throw new Error('변경 사유를 입력해 주세요.');
  const next=structuredClone(state), status=state.request.status;
  const need=(test,message)=>{if(!test)throw new Error(message);};
  const at=(expected)=>need(expected.includes(status),'현재 단계에서는 이 작업을 할 수 없어요.');
  const setStatus=value=>{next.request.status=value;};
  if(action==='review'){at(['requested']);setStatus('reviewing');}
  else if(action==='secure'){
    at(['reviewing']);need(state.devices.air.ready && state.devices.pro.ready,'두 기기가 모두 준비되어야 해요.');
    need(evidence.terms && evidence.buffer,'데모 조건 확인과 검수 여유 시간 확보를 확인해 주세요.');
    for(const key of ['air','pro'])next.devices[key].secured=true;
    next.payment={status:'pending',deadline:new Date(now.getTime()+86400000).toISOString()};setStatus('awaiting_payment');
  } else if(action==='confirm'){
    at(['awaiting_payment']);need(state.devices.air.secured && state.devices.pro.secured && state.devices.air.ready && state.devices.pro.ready,'두 기기 확보 상태를 확인해 주세요.');
    need(new Date(state.payment.deadline)>now,'결제 기한이 지났어요. 취소하고 일정을 다시 확인해 주세요.');
    need(evidence.approved && evidence.amount && evidence.reservation,'승인 상태·금액·요청 ID를 모두 대조해야 해요. 고객 캡처만으로 확정할 수 없어요.');
    next.payment.status='verified';setStatus('confirmed');
  } else if(action==='pickup'){at(['confirmed']);need(evidence.handoff,'두 기기와 부속품 인계를 확인해 주세요.');setStatus('active');}
  else if(action==='return'){at(['active']);need(state.decision.saved,'결정 화면에서 선택과 이유를 먼저 저장해 주세요.');setStatus('returning');}
  else if(action==='receive'){at(['returning']);for(const key of requiredReturns(state)){need(evidence[key],`${key==='air'?'Air':'Pro'}와 부속품의 실제 회수를 확인해 주세요.`);next.devices[key].returned=true;}setStatus('inspecting');}
  else if(action==='inspect'){at(['inspecting']);for(const key of requiredReturns(state)){need(state.devices[key].returned && evidence[key],`${key==='air'?'Air':'Pro'} 초기화·계정 잠금 해제·재활성화 검수를 확인해 주세요.`);next.devices[key].inspected=true;next.devices[key].secured=false;}setStatus('completed');}
  else if(action==='sale'){at(['active','returning']);need(state.decision.choice==='used' && !state.sale.confirmed,'체험 기기 구매 의향을 먼저 선택해 주세요.');need(['air','pro'].includes(state.decision.device),'구매 의향이 있는 체험 기기를 선택해 주세요.');need(evidence.dealer && evidence.settled,'딜러 판매 확인과 정산 확인이 모두 필요해요.');next.sale={confirmed:true,device:state.decision.device};next.devices[state.decision.device].ready=false;}
  else if(action==='cancel'){at(['requested','reviewing','awaiting_payment','confirmed']);need(evidence.linkClosed && evidence.noPending,'결제 링크 차단과 진행 중 거래 확인이 필요해요.');setStatus('cancelled');next.payment.status=state.payment.status==='verified'?'refund_requested':'cancelled';for(const key of ['air','pro'])next.devices[key].secured=false;}
  else if(action==='refund'){need(state.payment.status==='refund_requested','환불 요청 상태가 아니에요.');need(evidence.refunded,'실제 환불 거래 확인이 필요해요.');next.payment.status='refunded';}
  else throw new Error('지원하지 않는 상태 변경이에요.');
  next.logs.push({time:now.toISOString(),action,reason:String(reason).trim().slice(0,500)});
  return next;
}
export function saveRecords(state,input) {
  if (!state.request || !['active','returning','inspecting','completed'].includes(state.request.status)) throw new Error('체험 시작 후 기록할 수 있어요. 운영 시뮬레이터에서 데모를 진행해 주세요.');
  const next=structuredClone(state);
  for(const key of ['air','pro']){const value=input[key];if(!value)throw new Error('두 기기 기록을 확인해 주세요.');const minutes=String(value.minutes??'');if(minutes!=='' && (!Number.isFinite(Number(minutes)) || Number(minutes)<=0 || Number(minutes)>1440))throw new Error('소요 시간은 0보다 크고 1,440분 이하로 입력해 주세요.');next.records[key]={minutes,portability:score(value.portability),screen:score(value.screen),feel:score(value.feel),note:String(value.note||'').slice(0,500)};}
  return next;
}
function score(value){const n=Number(value);if(!Number.isInteger(n)||n<0||n>5)throw new Error('점수는 1~5점, 미입력은 0으로 표시해 주세요.');return n;}
export function saveDecision(state,input) {
  if(!state.request || !['active','returning'].includes(state.request.status))throw new Error('체험 중에 결정을 저장할 수 있어요.');
  if(state.sale.confirmed)throw new Error('데모 판매 확인 이후에는 구매 대상을 바꿀 수 없어요.');
  if(!choiceLabels[input.choice])throw new Error('결정 항목을 선택해 주세요.');
  if(input.choice==='used' && !['air','pro'].includes(input.device))throw new Error('구매 의향이 있는 체험 기기를 선택해 주세요.');
  if(!String(input.reason||'').trim())throw new Error('결정한 이유를 한 줄 남겨 주세요.');
  const next=structuredClone(state);next.decision={choice:input.choice,device:input.choice==='used'?input.device:null,confidence:Math.max(1,score(input.confidence)),reason:String(input.reason).trim().slice(0,500),saved:true};return next;
}
export function loadState(storage) {
  const raw=storage.getItem(STORAGE_KEY);if(!raw)return initialState();
  const value=JSON.parse(raw);
  if(value.version!==1 || !value.devices?.air || !value.devices?.pro || !value.records?.air || !value.records?.pro || !value.decision || !value.sale || !value.payment || !value.returnChecks || !value.survey || !Array.isArray(value.logs) || (value.request && !labels[value.request.status]))throw new Error('저장된 데모 형식을 읽을 수 없어요. 초기화 전 원본 데이터를 내보내 주세요.');
  validateSavedReflections(value);
  return value;
}
