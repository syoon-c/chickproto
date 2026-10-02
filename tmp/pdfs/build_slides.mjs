import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const workspaceDir = 'C:\\Users\\Soyoon Bang\\Desktop\\ChickProto';
const buildDir = path.join(workspaceDir, 'tmp', 'pdfs');
const skillDir = 'C:\\Users\\Soyoon Bang\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.915.20218\\skills\\presentations';
const outDir = path.join(workspaceDir, 'output', 'pdf');
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools', 'artifact_tool_utils.mjs')).href);

const C = {
  bg: '#FFFDF7', ink: '#2D2A24', muted: '#676B60', orange: '#F28C28',
  orangePale: '#FFF0D8', green: '#63886A', greenPale: '#E7F0DF', line: '#DADDD1'
};
const font = 'Malgun Gothic';
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function txt(slide, value, x, y, w, h, size=28, color=C.ink, bold=false, align='left') {
  const shape = slide.shapes.add({
    geometry: 'textbox', position: {left:x, top:y, width:w, height:h},
    fill:'none', line:{fill:'none',width:0}
  });
  shape.text = value;
  shape.text.style = {typeface:font, fontSize:size, color, bold, alignment:align, verticalAlignment:'middle', autoFit:'none', wrap:true};
  return shape;
}
function rect(slide,x,y,w,h,fill,radius='rect') {
  return slide.shapes.add({geometry:radius, position:{left:x,top:y,width:w,height:h},fill,
    line:{fill:'none',width:0}});
}
function rule(slide,x,y,w,color=C.line) {rect(slide,x,y,w,2,color);}
async function img(slide,rel,x,y,w,h,fit='contain') {
  const bytes = await fs.readFile(path.join(workspaceDir,rel));
  slide.images.add({blob:new Uint8Array(bytes),contentType:'image/png',alt:path.basename(rel),fit,
    position:{left:x,top:y,width:w,height:h}});
}
function base(title, no, sub='') {
  const slide=p.slides.add(); slide.background.fill=C.bg;
  txt(slide,title,70,47,1100,67,43,C.ink,true);
  if(sub) txt(slide,sub,72,118,1120,48,23,C.muted);
  rule(slide,70,654,1140);
  txt(slide,'삐약마을  ·  핵심 시스템과 성장 구조',70,665,700,25,15,C.muted);
  txt(slide,String(no).padStart(2,'0'),1160,665,50,25,15,C.muted,false,'right');
  return slide;
}
function label(slide,s,x,y,w=180,color=C.green) {txt(slide,s,x,y,w,31,20,color,true);}

// 1. Cover
{
  const s=p.slides.add(); s.background.fill=C.bg;
  rect(s,0,0,20,720,C.orange);
  txt(s,'삐약마을',76,134,700,94,67,C.ink,true);
  txt(s,'핵심 시스템과 성장 구조',78,236,820,77,42,C.ink,true);
  txt(s,'만든 공간에 병아리가 찾아오고, 함께한 행동이 다음 성장을 엽니다.',80,343,770,104,27,C.muted);
  rule(s,80,510,680,C.orange);
  txt(s,'기획 방향 초안  ·  2026.10',80,535,600,40,21,C.muted);
  await img(s,'assets/unity/original/icon_chick_001.png',897,207,290,290);
  s.speakerNotes.textFrame.setText('출처: 삐약마을 핵심 시스템과 성장 구조 기획 초안 및 프로젝트 내 병아리 에셋.');
}

// 2. Core loop
{
  const s=base('전체 게임 흐름',2,'한 번의 제작이 끝이 아니라 다음 행동의 이유가 됩니다.');
  const steps=[
    ['01','채집·가공','지역 재료를 얻고 설비에서 가공'],
    ['02','제작·배치','가구와 도구를 만들어 공간에 설치'],
    ['03','발견·맞이','달라진 공간을 보고 새 병아리가 방문'],
    ['04','함께 생활','병아리와 작업하고 가구를 사용하는 모습을 봄'],
    ['05','새 성장','특기와 재료가 다음 제작과 지역을 엶']
  ];
  steps.forEach((a,i)=>{
    const y=193+i*83;
    txt(s,a[0],76,y,69,42,25,i===2?C.orange:C.green,true);
    txt(s,a[1],157,y,246,43,31,C.ink,true);
    txt(s,a[2],414,y+3,765,40,24,C.muted);
    if(i<4) rule(s,157,y+61,1014);
  });
  s.speakerNotes.textFrame.setText('자료: 현재 기획 초안의 핵심 흐름. 병아리 획득 후 새 행동이 이어지는 점을 강조.');
}

// 3. Growth structure
{
  const s=base('성장은 행동과 공간으로 보입니다',3,'레벨 수치보다 플레이어가 새로 할 수 있는 일을 늘립니다.');
  const rows=[
    ['생산 기반','채집과 가공 설비','직접 만들 수 있는 물건이 늘어남'],
    ['생활 공간','가구·둥지·길의 배치','빈 땅에 주민 생활이 생김'],
    ['주민 협동','새 병아리의 특기','기존 설비와 재료의 쓰임이 바뀜'],
    ['영역 확장','여러 지역의 재료 조합','공터와 제작 선택이 늘어남']
  ];
  rows.forEach((a,i)=>{
    const y=200+i*103;
    rect(s,76,y+11,13,61,i%2?C.green:C.orange);
    txt(s,a[0],108,y,263,53,30,C.ink,true);
    txt(s,a[1],424,y+5,306,44,23,C.muted);
    txt(s,a[2],770,y+5,398,49,23,C.ink);
    if(i<3) rule(s,108,y+83,1065);
  });
  s.speakerNotes.textFrame.setText('자료: 기획 초안의 성장 구조. 수치가 아니라 행동과 공간의 변화를 중심으로 정리.');
}

// 4. New chick integration
{
  const s=base('신규 병아리: 방문부터 일상까지',4,'한 병아리의 관심사와 특기가 모든 접점에서 이어집니다.');
  const rows=[
    ['발견','무엇에 끌리는가','화분 주변의 발자국'],
    ['첫 만남','함께 무엇을 해 보는가','첫 물 주기와 새싹 확인'],
    ['일상','혼자 무엇을 하는가','화분을 살피고 꽃을 나눔'],
    ['개입','플레이어가 무엇을 바꾸는가','돌볼 화분과 씨앗 선택'],
    ['성장','다음에 무엇이 열리는가','새 정원 가구·생활 장면']
  ];
  rows.forEach((a,i)=>{
    const y=201+i*86;
    label(s,a[0],78,y,117,i===1?C.orange:C.green);
    txt(s,a[1],201,y-2,410,47,27,C.ink,true);
    txt(s,a[2],672,y,465,42,24,C.muted);
    if(i<4) rule(s,78,y+61,1055);
  });
  txt(s,'예시는 특기 설계 방식의 설명이며 확정된 병아리 사양은 아닙니다.',80,612,1050,34,18,C.muted);
  s.speakerNotes.textFrame.setText('자료: 기획 초안의 병아리 경험 예시. 식물을 좋아하는 병아리는 설명을 위한 가상 사례.');
}

// 5. Skill keywords
{
  const s=base('병아리 특기는 ‘동사’로 구분',5,'새 병아리는 숫자 보너스보다 새로운 장면이나 선택을 만듭니다.');
  const data=[
    ['발견·탐색','숨은 채집처와 병아리 흔적을 찾음'],
    ['기르기·돌보기','자연물과 재배물을 다른 상태로 키움'],
    ['만들기·고치기','새 가공품을 만들거나 시설을 손봄'],
    ['운반·연결','지역 사이의 재료 이동을 바꿈'],
    ['모으기·어울리기','공동 가구에 주민을 모음'],
    ['밝히기·꾸미기','공간의 분위기와 사용 행동을 바꿈']
  ];
  data.forEach((a,i)=>{
    const col=i<3?0:1, row=i%3;
    const x=80+col*585, y=200+row*133;
    txt(s,a[0],x,y,525,43,30,col?C.green:C.orange,true);
    txt(s,a[1],x,y+48,522,70,23,C.ink);
    if(row<2) rule(s,x,y+111,515);
  });
  s.speakerNotes.textFrame.setText('자료: 기획 초안의 특기 키워드. 수치·쿨타임·병아리별 배정은 미확정.');
}

// 6. World objects
{
  const s=base('설비·가구·아이템의 역할',6,'세 요소가 각각 다른 이유로 필요해야 제작이 재미있습니다.');
  const cols=[
    {x:78,title:'설비',lead:'무엇을 할 수 있는가',body:'채집물을 가공하고 가구·도구를 만듭니다. 병아리 특기로 새 제작법이나 작업 방식이 열립니다.',image:'assets/game/workbench.png'},
    {x:474,title:'가구',lead:'어디서 일이 벌어지는가',body:'방문의 실마리이자 입주 후의 생활 무대입니다. 같은 가구도 사용하는 병아리에 따라 장면이 달라집니다.',image:'assets/game/garden-swing.png'},
    {x:870,title:'아이템',lead:'무엇을 다음에 만들까',body:'원재료는 가공품이 되고, 가공품은 도구·가구·공동 시설로 이어집니다. 지역 간 제작에도 다시 쓰입니다.',image:'assets/game/logs.png'}
  ];
  for(const a of cols){
    txt(s,a.title,a.x,195,310,50,37,C.ink,true);
    txt(s,a.lead,a.x,251,332,42,23,C.orange,true);
    txt(s,a.body,a.x,309,332,172,22,C.muted);
    await img(s,a.image,a.x+74,492,184,131);
  }
  s.speakerNotes.textFrame.setText('자료: 기획 초안과 프로젝트 내 게임 에셋. 가구는 방문 조건 이후에도 반복 사용되어야 함.');
}

// 7. Currency
{
  const s=base('재화는 획득처와 소비처가 분명해야 합니다',7,'마을의 성장과 꾸미기에 쓰이는 이유를 먼저 만듭니다.');
  const rows=[
    ['마을 동전','부탁·주문·납품','일반 꾸미기, 설비 개선, 공터 정비'],
    ['지역 재료','지역별 채집·생산','가공품, 도구, 가구, 공동 시설'],
    ['특별 제작 재료','협동·공동 활동·발견','상위 기능 가구와 개성 있는 제작물'],
    ['유료 재화','구매','외형·테마 꾸미기와 선택적 편의']
  ];
  txt(s,'재화',81,188,295,35,21,C.green,true);
  txt(s,'얻는 행동',391,188,310,35,21,C.green,true);
  txt(s,'주요 소비처',748,188,415,35,21,C.green,true);
  rule(s,80,228,1092,C.green);
  rows.forEach((a,i)=>{
    const y=254+i*91;
    txt(s,a[0],81,y,285,58,25,C.ink,true);
    txt(s,a[1],391,y,320,58,23,C.muted);
    txt(s,a[2],748,y,415,58,23,C.ink);
    if(i<3) rule(s,80,y+70,1090);
  });
  txt(s,'행복 별은 소비하는 화폐가 아니라 병아리와 마을의 성장 상태입니다.',81,615,1080,30,19,C.muted);
  s.speakerNotes.textFrame.setText('자료: 기획 초안의 재화 개념. 재화 명칭은 임시이며 구체 수치는 미정.');
}

// 8. Content bundle
{
  const s=base('새 콘텐츠는 기존 마을을 다시 움직입니다',8,'새 병아리 하나가 오래된 가구와 지역에도 새 쓰임을 만들어야 합니다.');
  const blocks=[
    ['관심사','어떤 가구·공간을 보고 찾아오는가'],
    ['첫 행동','맞이하자마자 무엇을 함께 하는가'],
    ['반복 역할','어떤 설비·아이템의 쓰임을 바꾸는가'],
    ['주민 관계','기존 병아리와 어떤 장면을 만드는가']
  ];
  blocks.forEach((a,i)=>{
    const y=199+i*98;
    txt(s,String(i+1).padStart(2,'0'),79,y,72,51,31,i%2?C.green:C.orange,true);
    txt(s,a[0],159,y,231,47,31,C.ink,true);
    txt(s,a[1],416,y+3,755,45,25,C.muted);
    if(i<3) rule(s,159,y+70,1014);
  });
  rect(s,78,601,1090,3,C.orange);
  txt(s,'다음에는 누구와 무엇을 만들어 어떤 장면을 볼까?',80,612,1080,41,27,C.ink,true);
  s.speakerNotes.textFrame.setText('자료: 기획 초안의 신규 콘텐츠 연결 원칙. 병아리 특기, 가구, 아이템, 지역을 한 묶음으로 설계.');
}

await fs.mkdir(buildDir,{recursive:true});
await fs.mkdir(outDir,{recursive:true});
const draft=path.join(buildDir,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(draft);
const finalPptx=path.join(workspaceDir,'output','pptx','삐약마을_핵심시스템_성장구조_v2.pptx');
const result=await finalizePresentation({
  workspaceDir, candidatePath:draft, finalPath:finalPptx,
  pythonExecutable:'C:\\Users\\Soyoon Bang\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe',
  integrityValidatorPath:path.join(skillDir,'container_tools','inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skillDir,'container_tools','inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
  requiredNativeTableOwnerSlides:[],
  fontPolicy:{basis:'design',families:[font]},
  verifyArtifactToolImport:true,
  receiptPath:path.join(buildDir,'validation-v2.json')
});
console.log(JSON.stringify({finalPptx,result},null,2));
for(let i=0;i<p.slides.items.length;i++){
  const slide=p.slides.items[i];
  const blob=await p.export({slide,format:'png',scale:1.5});
  await fs.writeFile(path.join(buildDir,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
