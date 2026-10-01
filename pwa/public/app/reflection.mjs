// Local demonstration of a review workflow. This is not a payment or fraud-prevention service.
export const moments = {
  watch: {label:'영상 · 웹 서핑', icon:'play', prompt:'평소 보던 영상이나 웹페이지를 열어 봤나요?', details:{screen:'화면을 볼 때',sound:'소리를 들을 때',switching:'탭을 오갈 때',unclear:'딱히 기억나는 차이는 없어요'}},
  write: {label:'문서 · 공부', icon:'edit', prompt:'메모하거나 읽는 시간을 가져봤나요?', details:{typing:'글을 입력할 때',reading:'작은 글씨를 읽을 때',switching:'창을 오갈 때',unclear:'딱히 기억나는 차이는 없어요'}},
  carry: {label:'들고 다니기', icon:'bag', prompt:'책상에서 옮기거나 가방에 넣어 봤나요?', details:{weight:'손에 들었을 때',bag:'가방에 넣었을 때',space:'작은 책상에 놓았을 때',unclear:'딱히 기억나는 차이는 없어요'}},
  explore: {label:'그냥 써보기', icon:'spark', prompt:'이것저것 눌러보기만 해도 괜찮아요.', details:{trackpad:'트랙패드를 쓸 때',keyboard:'키보드를 쓸 때',screen:'화면을 볼 때',unclear:'딱히 기억나는 차이는 없어요'}}
};
export const deviceAnswers={both:'두 대 다 써봤어요',air:'Air만 써봤어요',pro:'Pro만 써봤어요'};
export const conditions={same:'같은 걸 해봤어요',different:'서로 다르게 써봤어요',unsure:'잘 기억나지 않아요'};
export const preferences={air:'Air가 더 편했어요',pro:'Pro가 더 편했어요',same:'차이를 못 느꼈어요',unsure:'아직 잘 모르겠어요',comfortable:'편하게 썼어요',mixed:'좋은 점도, 불편한 점도',difficult:'조금 어려웠어요'};
export function choicesFor(devices){return devices==='both'?['air','pro','same','unsure']:['comfortable','mixed','difficult','unsure'];}
export function followupFor(answer){
  if(answer.devices!=='both')return {question:'다른 한 대는 어떤 상태인가요?',options:{not_yet:'아직 손이 안 갔어요',unavailable:'사용하기 어려웠어요',later:'다음에 써보고 싶어요'}};
  if(answer.condition!=='same')return {question:'두 대를 다르게 쓴 이유가 있나요?',options:{natural:'각자 다른 일이 있어서요',setup:'설정이나 사용이 어려웠어요',remember:'같은 조건인지 기억이 안 나요'}};
  if(answer.preference==='unsure')return {question:'무엇이 더 있으면 고르기 쉬울까요?',options:{time:'조금 더 써볼 시간',help:'처음 쓰는 법 안내',none:'지금은 결정할 필요가 없어요'}};
  if(answer.preference==='same')return {question:'차이를 못 느낀 이유에 가까운 건?',options:{enough:'둘 다 하던 일에 충분했어요',brief:'짧게 써서 아직 모르겠어요',notImportant:'그 차이가 중요하지 않았어요'}};
  return {question:'다음에 같은 일을 한다면?',options:{air:'Air를 다시 쓸래요',pro:'Pro를 다시 쓸래요',either:'어느 쪽이든 괜찮아요',unsure:'다시 써보고 고를래요'}};
}
export const emptyReflection=()=>({step:0,moment:'',devices:'',condition:'',preference:'',detail:'',followup:'',note:''});
export const experienceAllowed=state=>Boolean(state.request&&['active','returning','inspecting','completed'].includes(state.request.status));
export function validateReflection(input,step=2){
  if(!moments[input.moment]||!deviceAnswers[input.devices])throw new Error('써본 장면과 기기를 선택해 주세요.');
  if(input.devices==='both'&&!conditions[input.condition])throw new Error('두 기기를 어떻게 써봤는지 선택해 주세요.');
  if(step<1)return;
  if(!choicesFor(input.devices).includes(input.preference)||!moments[input.moment].details[input.detail])throw new Error('느낌과 기억나는 순간을 선택해 주세요. 모르겠다는 답도 괜찮아요.');
  if(step<2)return;
  if(!followupFor(input).options[input.followup])throw new Error('마지막 질문에 가까운 답을 골라 주세요.');
}
function normalized(input){return {moment:input.moment,devices:input.devices,condition:input.devices==='both'?input.condition:'single',preference:input.preference,detail:input.detail,followup:input.followup,note:String(input.note||'').trim().slice(0,500)};}
export function saveReflection(state,input,now=new Date()){
  if(!experienceAllowed(state))throw new Error('기기를 받은 뒤 경험을 남길 수 있어요.');
  validateReflection(input);
  const answer=normalized(input), fingerprint=JSON.stringify({...answer,note:''});
  const dayOf=value=>{const date=new Date(value);return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;};
  const day=dayOf(now);
  if((state.reflections||[]).some(item=>item.fingerprint===fingerprint&&dayOf(item.createdAt)===day))throw new Error('오늘 같은 경험이 이미 저장되어 있어요. 다른 장면을 써본 뒤 이어서 남겨 주세요.');
  const flags=[];
  if(answer.devices!=='both')flags.push('single_device');
  else if(answer.condition!=='same')flags.push('different_context');
  if(['air','pro'].includes(answer.preference)&&['air','pro'].includes(answer.followup)&&answer.preference!==answer.followup)flags.push('choice_changed');
  const next=structuredClone(state),index=(next.reflections||[]).length;
  next.reflections=[...(next.reflections||[]),{id:`${state.request.id}-R${index+1}`,requestId:state.request.id,createdAt:now.toISOString(),...answer,flags,fingerprint}];
  next.reflectionDraft=null;
  return next;
}
export function rewardAssessment(state){
  const records=(state.reflections||[]).filter(item=>item.requestId===state.request?.id);
  if(!state.request||!records.length)return {status:'empty',label:'써본 뒤 참여할 수 있어요',reasons:['경험 기록을 먼저 남겨 주세요.']};
  if(state.request.status!=='completed')return {status:'waiting',label:'반납 확인 후 신청 가능',reasons:['반납·검수가 끝나면 기록을 묶어 한 번 신청해요.']};
  // Identical/no-difference, negative and uncertain answers are valid. Flags request context, never deny payment automatically.
  const flags=[...new Set(records.flatMap(record=>record.flags))];
  return {status:'ready',label:'참여 신청을 준비했어요',reasons:flags.map(flag=>({single_device:'한 대만 사용한 사정을 함께 확인해요.',different_context:'같은 조건의 비교인지 추가로 확인해요.',choice_changed:'선호와 다음 선택이 다른 이유를 확인해요.'})[flag]),recordIds:records.map(item=>item.id)};
}
export function submitReward(state,now=new Date()){
  if(state.rewardClaim)throw new Error('이 체험은 이미 신청했어요. 중복 신청은 만들지 않아요.');
  const assessment=rewardAssessment(state);
  if(assessment.status!=='ready')throw new Error(assessment.reasons[0]);
  const next=structuredClone(state);
  next.rewardClaim={id:`${state.request.id}-REWARD`,requestId:state.request.id,status:'pending_review',amount:null,recordIds:assessment.recordIds,reviewNotes:assessment.reasons,createdAt:now.toISOString()};
  next.logs.push({time:now.toISOString(),action:'리워드 신청 · 데모',reason:'체험 건당 한 번 검토 대기로 저장. 지급·실제 사용 증명 아님.'});
  return next;
}
export function reviewReward(state,input,now=new Date()){
  if(!state.rewardClaim||!['pending_review','needs_context'].includes(state.rewardClaim.status))throw new Error('검토 대기 중인 신청이 없어요.');
  if(!['needs_context','reviewed'].includes(input.result)||!String(input.reason||'').trim())throw new Error('검토 결과와 확인한 맥락을 남겨 주세요.');
  const next=structuredClone(state);
  next.rewardClaim.status=input.result;
  next.rewardClaim.reviews=[...(next.rewardClaim.reviews||[]),{result:input.result,reason:String(input.reason).trim().slice(0,500),time:now.toISOString()}];
  next.logs.push({time:now.toISOString(),action:'리워드 검토 · 데모',reason:String(input.reason).trim().slice(0,500)});
  return next;
}

export function validateSavedReflections(state){
  const fail=()=>{throw new Error('경험 기록을 읽을 수 없어요. 원본을 먼저 내보내 주세요.');};
  if(state.reflections!==undefined&&!Array.isArray(state.reflections))fail();
  for(const record of state.reflections||[]){
    if(!record||typeof record.id!=='string'||record.requestId!==state.request?.id||!Number.isFinite(Date.parse(record.createdAt))||typeof record.fingerprint!=='string'||!Array.isArray(record.flags)||record.flags.some(flag=>!['single_device','different_context','choice_changed'].includes(flag)))fail();
    try{validateReflection(record);}catch{fail();}
  }
  if(state.reflectionDraft){
    const draft=state.reflectionDraft;
    if(!Number.isInteger(draft.step)||draft.step<0||draft.step>2)fail();
    if(draft.step>0)try{validateReflection(draft,draft.step-1);}catch{fail();}
  }
  if(state.rewardClaim){
    const claim=state.rewardClaim;
    if(claim.requestId!==state.request?.id||!['pending_review','needs_context','reviewed'].includes(claim.status)||claim.amount!==null||!Number.isFinite(Date.parse(claim.createdAt))||!Array.isArray(claim.recordIds)||!claim.recordIds.length||claim.recordIds.some(id=>!(state.reflections||[]).some(record=>record.id===id))||!Array.isArray(claim.reviewNotes)||claim.reviewNotes.some(note=>typeof note!=='string')||(claim.reviews!==undefined&&(!Array.isArray(claim.reviews)||claim.reviews.some(review=>!review||!['needs_context','reviewed'].includes(review.result)||typeof review.reason!=='string'||!Number.isFinite(Date.parse(review.time))))))fail();
  }
}
