window.__pageErrors=[];
window.addEventListener('error',event=>window.__pageErrors.push(event.message));
const pages = [...document.querySelectorAll('.page')];
const drawer = document.getElementById('drawer');
const pageTurner = document.getElementById('pageTurner');
const progressBar = document.getElementById('progressBar');
const pageIndexBadge = document.getElementById('pageIndexBadge');
let current = 0;
let transitionTimer = null;

pages.forEach((page,index)=>{
  const button = document.createElement('button');
  button.className = `nav-item${index===0?' active':''}`;
  button.dataset.page = index;
  button.innerHTML = `<span>${page.dataset.title||`第 ${index} 页`}</span>`;
  drawer.appendChild(button);
});

function updateNav(){
  document.querySelectorAll('.nav-item').forEach((btn,i)=>btn.classList.toggle('active',i===current));
  progressBar.style.width = `${((current+1)/pages.length)*100}%`;
  pageIndexBadge.textContent = `第 ${String(current).padStart(2,'0')} 页 / 共 ${String(pages.length-1).padStart(2,'0')} 页`;
  document.body.classList.toggle('cover-mode',current===0);
}

function triggerFlip(direction){
  pageTurner.classList.remove('flip','forward','backward');
  void pageTurner.offsetWidth;
  pageTurner.classList.add('flip',direction>0?'forward':'backward');
}

function gotoPage(index){
  index=Math.max(0,Math.min(pages.length-1,index));
  if(index===current)return;
  if(transitionTimer){
    clearTimeout(transitionTimer);
    pages.forEach(page=>page.classList.remove('page-exit','page-enter','forward','backward'));
    pages.forEach((page,i)=>page.classList.toggle('active',i===current));
  }
  const direction=index>current?1:-1;
  const directionClass=direction>0?'forward':'backward';
  const outgoing=pages[current];
  triggerFlip(direction);
  current=index;
  const incoming=pages[current];
  outgoing.classList.add('page-exit',directionClass);
  incoming.classList.add('active','page-enter',directionClass);
  incoming.querySelector('.spread-scroll')?.scrollTo({top:0});
  updateNav();
  initActivePage();
  transitionTimer=setTimeout(()=>{
    outgoing.classList.remove('active','page-exit',directionClass);
    incoming.classList.remove('page-enter',directionClass);
    pageTurner.classList.remove('flip','forward','backward');
    transitionTimer=null;
    balanceDiarySpreads();
    requestAnimationFrame(balanceDiarySpreads);
  },660);
}

function animateStats(){
  document.querySelectorAll('.page.active [data-count]').forEach(element=>{
    if(element.dataset.done)return;
    element.dataset.done='1';
    const target=parseFloat(element.dataset.count);
    const decimals=+(element.dataset.decimal||0);
    const start=performance.now();
    function tick(now){
      const progress=Math.min((now-start)/1350,1);
      const eased=1-Math.pow(1-progress,3);
      element.textContent=(target*eased).toFixed(decimals);
      if(progress<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function initActivePage(){
  animateStats();
  const active=pages[current];
  if(active.querySelector('#deathChart'))renderDeathChart();
  if(active.querySelector('#barrage'))launchBarrage();
  balanceDiarySpreads();
  queueBalance();
  setTimeout(balanceDiarySpreads,760);
}

const menuBtn=document.getElementById('menuBtn');
menuBtn.addEventListener('click',()=>drawer.classList.toggle('open'));
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{gotoPage(+button.dataset.page);drawer.classList.remove('open')}));
document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>gotoPage(current+1)));
document.getElementById('goGame').addEventListener('click',()=>gotoPage(pages.length-1));
document.getElementById('restartStory').addEventListener('click',()=>gotoPage(0));
document.addEventListener('click',event=>{
  if(drawer.classList.contains('open')&&!drawer.contains(event.target)&&!menuBtn.contains(event.target))drawer.classList.remove('open');
});
window.addEventListener('keydown',event=>{
  if(document.body.classList.contains('game-mode'))return;
  if(event.key==='ArrowRight')gotoPage(current+1);
  if(event.key==='ArrowLeft')gotoPage(current-1);
  if(event.key==='Escape')drawer.classList.remove('open');
});

let touchStartX=0;
let touchStartY=0;
document.addEventListener('touchstart',event=>{
  touchStartX=event.changedTouches[0].clientX;
  touchStartY=event.changedTouches[0].clientY;
},{passive:true});
document.addEventListener('touchend',event=>{
  if(document.body.classList.contains('game-mode'))return;
  const dx=event.changedTouches[0].clientX-touchStartX;
  const dy=event.changedTouches[0].clientY-touchStartY;
  if(Math.abs(dx)>64&&Math.abs(dx)>Math.abs(dy)*1.35)gotoPage(current+(dx<0?1:-1));
},{passive:true});

// Click the quiet left/right edges of a page to turn it; interactive content keeps its own clicks.
document.querySelectorAll('.page-frame').forEach(frame=>frame.addEventListener('click',event=>{
  if(document.body.classList.contains('game-mode'))return;
  if(event.target.closest('button,a,.zoomable,.hotspot,.carousel,.interactive-wordcloud,.country-selector,.poach-interactive,.stacked-chart,.animated-flow,.barrage,.image-modal,input,textarea,select'))return;
  const rect=frame.getBoundingClientRect();
  const position=(event.clientX-rect.left)/rect.width;
  if(position<=.22)gotoPage(current-1);
  else if(position>=.78)gotoPage(current+1);
}));

// Body figures stay in Songti and receive a restrained marker highlight.
function highlightBodyNumbers(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(!/\d/.test(node.nodeValue))continue;
    if(node.parentElement.closest('.number-font,.body-number,[data-count],script,style,canvas'))continue;
    nodes.push(node);
  }
  nodes.forEach(node=>{
    const parts=node.nodeValue.split(/(\d+(?:[.,]\d+)*(?:[-–—]\d+(?:[.,]\d+)*)?%?)/g);
    if(parts.length<2)return;
    const fragment=document.createDocumentFragment();
    parts.forEach(part=>{
      if(/^\d/.test(part)){
        const span=document.createElement('span');
        span.className='body-number';
        span.textContent=part;
        fragment.appendChild(span);
      }else fragment.appendChild(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
}

const balanceTigerAssets=[1,2,3,4,5].map(number=>`assets/图标/素材贴纸/老虎素材${number}.png`);
let balanceTimer=0;
function contentBottom(paper){
  const top=paper.getBoundingClientRect().top;
  return [...paper.children].reduce((bottom,child)=>{
    if(child.classList.contains('balance-fill')||getComputedStyle(child).position==='absolute')return bottom;
    return Math.max(bottom,child.getBoundingClientRect().bottom-top);
  },0);
}
function balanceDiarySpreads(){
  window.__balanceRuns=(window.__balanceRuns||0)+1;
  document.querySelectorAll('.balance-fill').forEach(fill=>fill.remove());
  document.querySelectorAll('.book-spread:not(.single-cover-layout)').forEach((spread,spreadIndex)=>{
    const papers=[...spread.children].filter(child=>child.classList.contains('paper'));
    if(papers.length!==2)return;
    const bottoms=papers.map(contentBottom);
    const shorter=bottoms[0]<=bottoms[1]?0:1;
    const difference=Math.abs(bottoms[0]-bottoms[1]);
    if(difference)window.__balanceSeen=[spreadIndex,Math.round(bottoms[0]),Math.round(bottoms[1]),Math.round(difference)];
    if(difference<2)return;
    const fill=document.createElement('div');
    fill.className='balance-fill';
    const previous=[...papers[shorter].children].filter(child=>getComputedStyle(child).position!=='absolute').at(-1);
    const previousMargin=previous?parseFloat(getComputedStyle(previous).marginBottom)||0:0;
    fill.style.marginTop=`${-previousMargin}px`;
    fill.style.height=`${Math.max(1,difference)}px`;
    const image=document.createElement('img');
    image.src=balanceTigerAssets[(spreadIndex*2+shorter)%balanceTigerAssets.length];
    image.alt='东北虎日记装饰插画';
    fill.appendChild(image);
    papers[shorter].appendChild(fill);
    const allBottom=paper=>[...paper.children].reduce((bottom,child)=>Math.max(bottom,child.getBoundingClientRect().bottom-paper.getBoundingClientRect().top),0);
    for(let pass=0;pass<5;pass++){
      const measured=papers.map(allBottom);
      const correction=measured[1-shorter]-measured[shorter];
      const currentHeight=fill.getBoundingClientRect().height;
      const nextHeight=currentHeight+correction;
      if(nextHeight>=0)fill.style.height=`${nextHeight}px`;
      else{
        fill.style.height='0';
        fill.style.marginTop=`${parseFloat(fill.style.marginTop||0)+nextHeight}px`;
      }
    }
    const finalMeasured=papers.map(allBottom).map(Math.round);
    const pixelCorrection=finalMeasured[1-shorter]-finalMeasured[shorter];
    if(pixelCorrection)fill.style.height=`${Math.max(0,fill.getBoundingClientRect().height+pixelCorrection)}px`;
  });
}
function queueBalance(){
  clearTimeout(balanceTimer);
  balanceTimer=setTimeout(()=>requestAnimationFrame(balanceDiarySpreads),90);
}

updateNav();
initActivePage();

// Country map: all country copy stays inside this page.
const countryInfo={
  '印度':{title:'印度——全球老虎的“超级大国”',copy:['印度是全球野生虎的绝对中心。2022年全印老虎估算（All India Tiger Estimation）显示，该国野生虎数量已增至3,682只，较2018年的2,967只大幅增长。印度目前拥有58个老虎保护区，约占国土面积的2.5%。','但“虎口”之下代价沉重：2025年印度全国有166只老虎死亡，为近年来最高。冲突、栖息地压力与种群增长之间的矛盾日益尖锐。']},
  '俄罗斯':{title:'俄罗斯——东北虎的“避风港”',copy:['俄罗斯是东北虎（阿穆尔虎）的核心分布国。经过十余年系统性保护，俄罗斯东北虎数量已从2013年的约430只增长至2025年的750只。俄罗斯司法部长兼阿穆尔虎中心监事会主席康斯坦丁·崔琴科宣布：“东北虎不再面临灭绝风险”。','2025年5月，俄罗斯建立了覆盖25%东北虎栖息地的特别自然保护区域。过去十年间新增了7个特别自然保护区域。俄罗斯东北虎种群分为两大群体：锡霍特山脉的大种群和西南滨海边疆区的小种群——后者在1996年曾一度不足10只，如今已恢复至50只以上。']},
  '中国':{title:'中国——“王者归来”正在上演',copy:['中国是东北虎、印支虎、孟加拉虎和华南虎（已野外灭绝）四个亚种的历史分布国。截至2026年，稳定生活在东北虎豹国家公园的野生东北虎达70只左右，野生东北豹达80只左右。相比2015年试点之初的27只，翻倍增长。东北虎的保护已全面超越2010年老虎保护峰会提出的种群恢复目标。']},
  '印度尼西亚':{title:'印度尼西亚——苏门答腊虎的最后堡垒',copy:['苏门答腊虎是印尼仅存的老虎亚种，被IUCN列为极危（Critically Endangered）。野生种群数量不足400只。印尼政府估计全境约不超过600只。栖息地破碎化和盗猎是其主要威胁。']},
  '尼泊尔':{title:'尼泊尔——翻三倍的保护奇迹',copy:['尼泊尔是老虎保护的全球典范。2010年该国仅有121只老虎。到2024年，这一数字已飙升至355只——几乎翻了三倍。尼泊尔的再造林倡议已被联合国认定为“世界生态恢复旗舰项目”之一。']},
  '泰国':{title:'泰国——东南亚的“逆势增长”',copy:['在东南亚老虎数量普遍下降的大背景下，泰国是为数不多的亮点。泰国西部森林保护区（靠近缅甸边境）的野生虎数量从2007年的约40只增长至2024年的179-223只，增长近五倍。红外相机连续两年记录到母虎带幼崽活动，被视为种群繁衍能力恢复的积极信号。']},
  '不丹':{title:'不丹——高海拔的虎影',copy:['不丹是全球唯一老虎在海拔4,200米高山地区活动、与雪豹共享栖息地的国家。2024年全国老虎数量达131只，较2016年增长27%。老虎在不丹所有17个宗（县）均有分布。']},
  '孟加拉国':{title:'孟加拉国——孙德尔本斯的虎影',copy:['孟加拉国的老虎全部集中在孙德尔本斯（Sundarbans）——全球最大的红树林。2024年政府调查显示，孟加拉国境内孙德尔本斯有125只老虎。从2015年的106只增长至125只，增长约18%。但相比2004年的440只，仍相距甚远。']},
  '马来西亚':{title:'马来西亚——马来虎的生死倒计时',copy:['马来虎是2004年才被确认的独立亚种。如今，野生马来虎数量已不足150只，被IUCN列为极危。专家警告，如不采取紧急大规模保护行动，马来虎可能在10至20年内灭绝。']},
  '缅甸':{title:'缅甸——数据极度匮乏',copy:['缅甸的老虎数据极为模糊。2024年仅在Htamanthi野生动物保护区通过24台相机捕捉到约22只老虎的影像。该国印支虎和孟加拉虎两个亚种均有分布，但全国总数估计仅为22只左右。']}
};
const mapCard=document.getElementById('mapCard');
function showCountry(country){
  const info=countryInfo[country];
  if(!info)return;
  mapCard.innerHTML=`<h3>${info.title}</h3>${info.copy.map(text=>`<p>${text}</p>`).join('')}`;
  document.querySelectorAll('[data-country]').forEach(button=>button.classList.toggle('active',button.dataset.country===country));
  queueBalance();
}
document.querySelectorAll('.hotspot,[data-country]').forEach(button=>button.addEventListener('click',event=>{
  if(button.classList.contains('hotspot'))event.stopPropagation();
  showCountry(button.dataset.country);
}));
showCountry('中国');

// Poaching categories replace one another; the full copy is not duplicated below.
const poachInfo={
  medicine:{title:'传统医药：最主要的驱动力',copy:['虎骨：这是最主要的商品，被用来泡制药酒或磨粉制成药丸。一根虎骨在中国黑市的价格可高达20万元人民币。虎骨也曾在藏药中使用。','虎肉：在传统观念中被认为有滋补功效，也因此成为走私对象。','其他器官：虎鞭、虎爪、内脏等，也都被用作所谓的“补品”或药材。']},
  luxury:{title:'装饰与奢侈品：彰显身份的符号',copy:['虎皮：完整的虎皮是昂贵的装饰品或奢侈品。2002年海关就曾查获过正在交易的东北虎虎皮。','虎爪：如同熊掌会被端上餐桌，虎爪有时也被作为珍稀的装饰品或收藏品进行交易。','护身符：在一些地区，老虎的身体部分被认为具有驱邪避灾的“力量”，被制成护身符或宗教用品。']},
  other:{title:'其他用途：从餐桌到收藏',copy:['食用：虎肉在一些地方被视为野味，会被送上餐桌。','收藏品：完整的虎头、虎骨等，也可能作为奇特的收藏品在黑市中流通。']}
};
const poachDetail=document.getElementById('poachDetail');
function showPoach(key){
  const info=poachInfo[key];
  poachDetail.innerHTML=`<h4>${info.title}</h4>${info.copy.map(text=>`<p>${text}</p>`).join('')}`;
  document.querySelectorAll('[data-poach]').forEach(button=>button.classList.toggle('active',button.dataset.poach===key));
  queueBalance();
}
document.querySelectorAll('[data-poach]').forEach(button=>button.addEventListener('click',()=>showPoach(button.dataset.poach)));
showPoach('medicine');

// India mortality chart, recolored to the new mountain background palette.
const deathData=[
  {year:2018,total:101,vals:{'自然':57.4,'偷猎':4.0,'人为影响':6.9,'领地竞争':11.9,'调查中':19.8}},
  {year:2019,total:96,vals:{'自然':56.3,'偷猎':8.3,'人为影响':10.4,'领地竞争':10.4,'调查中':14.6}},
  {year:2020,total:106,vals:{'自然':52.8,'偷猎':6.6,'人为影响':8.5,'领地竞争':12.3,'调查中':19.8}},
  {year:2021,total:127,vals:{'自然':48.0,'偷猎':3.9,'人为影响':11.8,'领地竞争':13.4,'调查中':22.8}},
  {year:2022,total:116,vals:{'自然':50.9,'偷猎':4.3,'人为影响':8.6,'领地竞争':9.5,'调查中':26.7}},
  {year:2023,total:181,vals:{'自然':55.2,'偷猎':4.4,'人为影响':7.2,'领地竞争':8.8,'调查中':24.3}},
  {year:2024,total:115,vals:{'自然':65.2,'偷猎':2.6,'人为影响':7.8,'领地竞争':7.0,'调查中':17.4}}
];
const chartColors={'自然':'#8fc7a5','偷猎':'#174d43','人为影响':'#e67836','领地竞争':'#2e87aa','调查中':'#c7d9a8'};
let chartRendered=false;
const tooltip=document.createElement('div');
tooltip.className='tooltip';
document.body.appendChild(tooltip);
function renderDeathChart(){
  const box=document.getElementById('deathChart');
  if(!box||chartRendered)return;
  chartRendered=true;
  deathData.forEach(row=>{
    const rowElement=document.createElement('div');
    rowElement.className='bar-row';
    rowElement.innerHTML=`<b>${row.year}</b>`;
    const bar=document.createElement('div');
    bar.className='bar';
    Object.entries(row.vals).forEach(([name,value])=>{
      const segment=document.createElement('span');
      segment.className='seg';
      segment.style.width=`${value}%`;
      segment.style.background=chartColors[name];
      segment.dataset.tip=`${row.year}年｜${name} ${value}%｜死亡总数 ${row.total}只`;
      const show=event=>{tooltip.textContent=segment.dataset.tip;tooltip.style.left=`${event.clientX+12}px`;tooltip.style.top=`${event.clientY+12}px`;tooltip.style.opacity='1'};
      segment.addEventListener('mousemove',show);
      segment.addEventListener('mouseenter',show);
      segment.addEventListener('mouseleave',()=>tooltip.style.opacity='0');
      segment.addEventListener('click',show);
      bar.appendChild(segment);
    });
    rowElement.appendChild(bar);
    box.appendChild(rowElement);
  });
}

// Complete barrage: each sentence stays fully inside the panel while drifting horizontally.
function launchBarrage(){
  const box=document.getElementById('barrage');
  if(!box||box.dataset.on)return;
  box.dataset.on='1';
  const fallback=['保护东北虎，就是保护整片森林','愿每一只东北虎都平安长大','生态保护没有国界'];
  const words=Array.isArray(window.TIGER_BARRAGE_LINES)&&window.TIGER_BARRAGE_LINES.length?window.TIGER_BARRAGE_LINES:fallback;
  const laneCount=7;
  let cursor=laneCount;
  const fit=(span,word)=>{
    span.textContent=word;
    let fontSize=17;
    span.style.fontSize=`${fontSize}px`;
    while(span.scrollWidth>box.clientWidth-24&&fontSize>11){fontSize-=.5;span.style.fontSize=`${fontSize}px`}
    span.style.setProperty('--start-x',`${box.clientWidth+24}px`);
    span.style.setProperty('--right-x',`${Math.max(12,box.clientWidth-span.offsetWidth-12)}px`);
    span.style.setProperty('--end-x',`${-span.offsetWidth-24}px`);
  };
  words.slice(0,laneCount).forEach((word,index)=>{
    const span=document.createElement('span');
    span.className='danmu';
    span.style.top=`${12+index*43}px`;
    span.style.setProperty('--duration',`${9+index*.5}s`);
    span.style.animationDelay=`${-index*1.45}s`;
    box.appendChild(span);
    fit(span,word);
    span.addEventListener('animationiteration',()=>{fit(span,words[cursor%words.length]);cursor++});
  });
  window.addEventListener('resize',()=>[...box.children].forEach(span=>fit(span,span.textContent)),{passive:true});
}

// The supplied word cloud becomes a touch-friendly, floating bubble field.
function setupWordCloud(){
  const stage=document.getElementById('wordcloudBubbles');
  const tip=document.getElementById('wordcloudTip');
  if(!stage||stage.dataset.ready)return;
  stage.dataset.ready='1';
  const bubbles=[
    ['未来',38.4,14.5,11.8,'#123e63'],['出圈',52.8,14.5,10.2,'#164f3d'],['祝福',66.5,18.2,10.7,'#123e63'],
    ['生态保护',29.1,23.1,10.6,'#164f3d'],['勇气',59.0,23.0,7.2,'#123e63'],['林海',67.2,31.0,10.5,'#164f3d'],
    ['亚洲森林',79.3,31.7,11.4,'#123e63'],['自然教育',24.4,34.1,12.3,'#173d61'],['幼崽',35.1,33.7,8.0,'#164f3d'],
    ['濒危',44.2,36.0,10.6,'#313131'],['国宝',32.0,42.2,8.6,'#164f3d'],['雪地',39.8,48.0,10.6,'#123e63'],
    ['温暖',80.1,45.0,11.4,'#164f3d'],['期待',22.4,48.7,11.6,'#313131'],['生命力',47.0,53.0,10.0,'#164f3d'],
    ['欢迎你',56.8,54.1,9.8,'#123e63'],['守护自然',67.1,57.2,10.8,'#164f3d'],['守护',76.3,55.5,9.8,'#313131'],
    ['破圈',27.2,62.8,11.5,'#164f3d'],['复苏',49.6,65.2,10.7,'#123e63'],['野性',59.5,66.9,10.4,'#313131'],
    ['治愈',69.4,66.4,9.8,'#164f3d'],['冰城',79.1,68.2,10.4,'#164f3d'],['国际传播',62.0,79.7,12.0,'#123e63']
  ];
  bubbles.forEach(([word,x,y,diam,color],index)=>{
    const button=document.createElement('button');
    button.type='button';button.className='word-bubble';button.textContent=word;
    button.style.setProperty('--x',`${x}%`);button.style.setProperty('--y',`${y}%`);button.style.setProperty('--diam',`${diam}cqw`);
    button.style.setProperty('--size',`${Math.max(10,11+diam*.34)}px`);button.style.setProperty('--speed',`${4.4+(index%4)*.8}s`);button.style.setProperty('--bubble',color);
    const activate=()=>{stage.querySelectorAll('.word-bubble').forEach(item=>item.classList.toggle('active',item===button));tip.textContent=`“${word}”——每一个关键词，都是公众写给东北虎的一句回声。`};
    button.addEventListener('click',activate);button.addEventListener('mouseenter',activate);
    stage.appendChild(button);
  });
}
setupWordCloud();

// Sequential labels for every editorial visual, including interactive charts and carousels.
function setupFigureLabels(){
  const entries=[];
  const add=(element,title,interactive=false,inside=false)=>{if(element)entries.push({element,title,interactive,inside})};
  add(document.getElementById('tigerMap'),'亚洲野生虎分布新地图',true);
  document.querySelectorAll('.chapter-data-figure').forEach(figure=>add(figure,figure.querySelector('img')?.alt||'东北虎数据图',false,true));
  add(document.querySelector('img[alt="俄罗斯东北虎年度盗猎数量变化"]'),'俄罗斯东北虎年度盗猎数量变化');
  add(document.querySelector('img[alt="东北虎非法贸易走私路线示意图"]'),'东北虎非法贸易走私路线示意图');
  add(document.getElementById('deathChart'),'印度老虎死亡原因百分比图',true);
  add(document.querySelector('img[alt="印度全国老虎攻击致人死亡事件数量"]'),'印度全国老虎攻击致人死亡事件数量');
  add(document.querySelector('img[alt="东北虎主要猎物相对丰富度变化图"]'),'东北虎主要猎物相对丰富度变化图');
  add(document.querySelector('img[alt="东北虎估计可用栖息地面积及相对变化"]'),'东北虎估计可用栖息地面积及相对变化');
  add(document.getElementById('animatedFlow'),'东北虎“天空地”一体化主动预警全流程',true);
  add(document.getElementById('barrage'),'东北虎相关评论滚动弹幕',true);
  add(document.querySelector('img[alt="东北虎研究文献统计表"]'),'东北虎研究文献统计');
  document.querySelectorAll('.culture-card img').forEach(image=>add(image,image.alt));
  add(document.getElementById('interactiveWordcloud'),'东北虎相关评论关键词气泡图',true);
  add(document.querySelector('.mascot-wordcloud'),'亚冬会吉祥物相关词云图');
  document.querySelectorAll('.policy-carousel figure').forEach(figure=>add(figure,figure.querySelector('img')?.alt||'中俄东北虎保护政策图',false,true));
  add(document.querySelector('.game-poster'),'东北虎成长小游戏海报');
  add(document.querySelector('.game-stage'),'东北虎成长小游戏交互画面',true);
  entries.sort((a,b)=>a.element.compareDocumentPosition(b.element)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  entries.forEach((entry,index)=>{
    if(entry.inside?entry.element.firstElementChild?.classList.contains('figure-label'):entry.element.previousElementSibling?.classList.contains('figure-label'))return;
    const label=document.createElement('div');
    label.className='figure-label';
    if(entry.element.classList.contains('game-poster'))label.classList.add('game-poster-label');
    if(entry.element.classList.contains('game-stage'))label.classList.add('game-stage-label');
    label.textContent=`图${index+1} ${entry.title}${entry.interactive?'（可交互）':''}`;
    if(entry.inside)entry.element.insertBefore(label,entry.element.firstChild);
    else entry.element.parentNode.insertBefore(label,entry.element);
  });
}
setupFigureLabels();

function setupCarousel(root){
  if(!root)return;
  const track=root.querySelector('.car-track');
  const items=[...track.children];
  let index=0;
  function paint(){
    if(!items.length)return;
    const gap=18;
    const width=items[0].getBoundingClientRect().width+gap;
    track.style.transform=`translateX(${-index*width}px)`;
    queueBalance();
  }
  root.querySelector('.next').addEventListener('click',()=>{index=Math.min(index+1,items.length-1);paint()});
  root.querySelector('.prev').addEventListener('click',()=>{index=Math.max(index-1,0);paint()});
  window.addEventListener('resize',paint);
  paint();
}
setupCarousel(document.getElementById('cultureCarousel'));
setupCarousel(document.getElementById('policyCarousel'));
window.addEventListener('load',queueBalance,{once:true});
window.addEventListener('resize',queueBalance,{passive:true});
if(document.fonts?.ready)document.fonts.ready.then(()=>{queueBalance();setTimeout(balanceDiarySpreads,650)});
Promise.all([...document.images].map(image=>image.decode?.().catch(()=>{})||Promise.resolve())).then(()=>{queueBalance();setTimeout(balanceDiarySpreads,700)});

// Image modal.
const imageModal=document.getElementById('imageModal');
const imageModalImg=document.getElementById('imageModalImg');
const imageModalCaption=document.getElementById('imageModalCaption');
function openImageModal(source,caption){
  imageModalImg.src=source;
  imageModalCaption.textContent=caption||'';
  imageModal.classList.add('open');
  imageModal.setAttribute('aria-hidden','false');
}
function closeImageModal(){
  imageModal.classList.remove('open');
  imageModal.setAttribute('aria-hidden','true');
  imageModalImg.src='';
}
document.querySelectorAll('.zoomable').forEach(image=>image.addEventListener('click',event=>{event.stopPropagation();openImageModal(image.currentSrc||image.src,image.dataset.caption||image.alt||'')}));
document.getElementById('imageModalClose').addEventListener('click',closeImageModal);
imageModal.addEventListener('click',event=>{if(event.target===imageModal)closeImageModal()});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&imageModal.classList.contains('open'))closeImageModal()});

// Survival game with supplied tiger and encounter artwork.
const canvas=document.getElementById('tigerGame');
const ctx=canvas.getContext('2d');
const GAME_WIDTH=640;
const GAME_HEIGHT=420;
const gameStatus=document.getElementById('gameStatus');
const gameTip=document.getElementById('gameTip');
const gameBoardSheet=document.getElementById('gameBoardSheet');
const gameResult=document.getElementById('gameResult');
const gameResultTitle=document.getElementById('gameResultTitle');
const gameResultCopy=document.getElementById('gameResultCopy');
const gameBoardHome=document.createComment('game-board-home');
gameBoardSheet.parentNode.insertBefore(gameBoardHome,gameBoardSheet);

const gameImages={
  tiger:'assets/图标/素材贴纸/老虎素材3.png',
  pig:'assets/图标/素材贴纸/猎物1小猪.png',
  deer:'assets/图标/素材贴纸/猎物2小鹿.png',
  road:'assets/图标/素材贴纸/公路.png',
  trap:'assets/图标/素材贴纸/偷猎.png',
  village:'assets/图标/素材贴纸/房屋.png',
  camera:'assets/图标/素材贴纸/监管.png',
  landscape:'assets/新背景.png'
};
const spriteCropRatios={
  pig:[.25,.21146,.79219,.85417],
  deer:[.19298,.07416,.83254,.89952],
  road:[0,.12361,.99414,.88889],
  trap:[.11396,.22645,.863,.77355],
  village:[.10273,.20694,.88164,.80208],
  camera:[.19336,.16389,.80273,.92431]
};
Object.keys(gameImages).forEach(key=>{
  const image=new Image();
  image.src=gameImages[key];
  gameImages[key]=image;
});

const game={running:false,score:0,energy:120,safety:120,tiger:{x:70,y:190,w:100,h:70},items:[],keys:{},tick:0,age:0,elapsed:0,spawnClock:0,startTime:0,lastTime:0,runId:0};
const GAME_MAX=200;
const TARGET_AGE=15;
const SECONDS_PER_YEAR=3;
const ITEM_SPAWN_INTERVAL=.675;
function rand(min,max){return Math.random()*(max-min)+min}
function spawnItem(){
  const positive=['prey','camera'];
  const negative=['village','road','trap'];
  const pool=Math.random()<.51?positive:negative;
  const type=pool[Math.floor(Math.random()*pool.length)];
  const asset=type==='prey'?(Math.random()<.5?'pig':'deer'):type;
  game.items.push({type,asset,x:GAME_WIDTH+60,y:rand(50,GAME_HEIGHT-58),r:type==='road'?31:27,s:rand(62,96)});
}
function collide(tiger,item){return Math.hypot((tiger.x+tiger.w/2)-item.x,(tiger.y+tiger.h/2)-item.y)<(tiger.w/2+item.r-5)}
function updateGameStatus(){gameStatus.textContent=`年龄 ${game.age.toFixed(1)} / ${TARGET_AGE} 年｜能量 ${Math.max(0,Math.round(game.energy))} / ${GAME_MAX}｜安全 ${Math.max(0,Math.round(game.safety))} / ${GAME_MAX}｜积分 ${Math.max(0,game.score)}`}
function resetGame(){
  game.running=false;game.runId++;game.score=0;game.energy=120;game.safety=120;game.tiger.x=70;game.tiger.y=190;game.items=[];game.keys={};game.tick=0;game.age=0;game.elapsed=0;game.spawnClock=0;game.startTime=0;game.lastTime=0;gameResult.hidden=true;gameTip.textContent='目标：安全与能量不归零，坚持到15岁寿终正寝。';drawGame();updateGameStatus();
}
function applyItemEffect(type){
  if(type==='prey'){game.energy=Math.min(GAME_MAX,game.energy+22);game.score+=22;gameTip.textContent='捕食成功：猎物帮助我恢复能量。'}
  if(type==='camera'){game.safety=Math.min(GAME_MAX,game.safety+20);game.score+=28;gameTip.textContent='监测点及时发现了我的踪迹，安全值提升。'}
  if(type==='village'){game.safety-=22;game.score=Math.max(0,game.score-8);gameTip.textContent='靠近房屋：人与虎的安全距离缩短。'}
  if(type==='road'){game.safety-=18;game.energy-=8;gameTip.textContent='穿过公路：栖息地破碎增加了迁移风险。'}
  if(type==='trap'){game.safety-=32;game.energy-=20;gameTip.textContent='遭遇偷猎威胁：安全和能量大幅下降。'}
  game.energy=Math.min(GAME_MAX,game.energy);game.safety=Math.min(GAME_MAX,game.safety);
}
function finishGame(won,reason){
  game.running=false;game.keys={};gameResultTitle.textContent=won?'守住了林海中的一生':'这次生存挑战结束了';gameResultCopy.textContent=`${reason} 最终年龄 ${game.age.toFixed(1)} 年，保护积分 ${Math.max(0,game.score)}。`;gameResult.hidden=false;gameTip.textContent=won?'保护不是一场冲刺，而是让每一年都更安全。':'再试一次：寻找猎物与监测点，避开房屋、公路和偷猎威胁。';
}
function gameLoop(now,runId){
  if(!game.running||runId!==game.runId)return;
  if(!game.startTime){game.startTime=now;game.lastTime=now}
  const dt=Math.min((now-game.lastTime)/1000,.05);game.lastTime=now;game.elapsed=(now-game.startTime)/1000;game.age=Math.min(TARGET_AGE,game.elapsed/SECONDS_PER_YEAR);game.tick+=dt*60;game.spawnClock+=dt;
  if(game.spawnClock>=ITEM_SPAWN_INTERVAL){game.spawnClock-=ITEM_SPAWN_INTERVAL;spawnItem()}
  const tiger=game.tiger;const movement=150*dt;
  if(game.keys.ArrowUp||game.keys.w||game.keys.W)tiger.y-=movement;
  if(game.keys.ArrowDown||game.keys.s||game.keys.S)tiger.y+=movement;
  if(game.keys.ArrowLeft||game.keys.a||game.keys.A)tiger.x-=movement;
  if(game.keys.ArrowRight||game.keys.d||game.keys.D)tiger.x+=movement;
  tiger.x=Math.max(0,Math.min(GAME_WIDTH-tiger.w,tiger.x));tiger.y=Math.max(0,Math.min(GAME_HEIGHT-tiger.h,tiger.y));
  game.energy-=1.15*dt;game.items.forEach(item=>item.x-=item.s*dt);game.items=game.items.filter(item=>item.x>-70);
  for(const item of [...game.items])if(collide(tiger,item)){game.items.splice(game.items.indexOf(item),1);applyItemEffect(item.type)}
  drawGame();updateGameStatus();
  if(game.energy<=0||game.safety<=0){finishGame(false,game.energy<=0?'能量耗尽。':'安全值降到了零。');return}
  if(game.age>=TARGET_AGE){finishGame(true,'你平安活到15岁，寿终正寝。');return}
  requestAnimationFrame(next=>gameLoop(next,runId));
}
function drawLandscape(){
  const image=gameImages.landscape;
  if(image.complete&&image.naturalWidth){
    const sourceRatio=image.naturalWidth/image.naturalHeight;
    const canvasRatio=GAME_WIDTH/GAME_HEIGHT;
    let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
    if(sourceRatio>canvasRatio){sw=image.naturalHeight*canvasRatio;sx=(image.naturalWidth-sw)/2}
    else{sh=image.naturalWidth/canvasRatio;sy=(image.naturalHeight-sh)/2}
    ctx.drawImage(image,sx,sy,sw,sh,0,0,GAME_WIDTH,GAME_HEIGHT);
  }
  else{const gradient=ctx.createLinearGradient(0,0,0,GAME_HEIGHT);gradient.addColorStop(0,'#83c8d3');gradient.addColorStop(1,'#317052');ctx.fillStyle=gradient;ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT)}
  ctx.fillStyle='rgba(20,74,53,.15)';ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
}
function prepareSprite(image,key){
  const ratio=spriteCropRatios[key];
  if(!ratio||!image.naturalWidth)return;
  image._crop={
    sx:ratio[0]*image.naturalWidth,
    sy:ratio[1]*image.naturalHeight,
    sw:(ratio[2]-ratio[0])*image.naturalWidth,
    sh:(ratio[3]-ratio[1])*image.naturalHeight
  };
}
function drawFitted(image,cx,cy,size){
  if(!image.complete||!image.naturalWidth)return;
  const crop=image._crop||{sx:0,sy:0,sw:image.naturalWidth,sh:image.naturalHeight};
  const ratio=crop.sw/crop.sh;
  let width=size;let height=size;
  if(ratio>1)height=size/ratio;else width=size*ratio;
  ctx.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,cx-width/2,cy-height/2,width,height);
}
function drawItems(){game.items.forEach(item=>drawFitted(gameImages[item.asset],item.x,item.y,item.r*1.72))}
function drawTiger(){const tiger=game.tiger;const image=gameImages.tiger;if(image.complete&&image.naturalWidth)drawFitted(image,tiger.x+tiger.w/2,tiger.y+tiger.h/2,118);else{ctx.fillStyle='#ef7b28';ctx.fillRect(tiger.x,tiger.y,tiger.w,tiger.h)}}
function drawGame(){ctx.setTransform(canvas.width/GAME_WIDTH,0,0,canvas.height/GAME_HEIGHT,0,0);ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);drawLandscape();drawItems();drawTiger()}
function enterGameMode(){document.body.appendChild(gameBoardSheet);document.body.classList.add('game-mode');gameBoardSheet.scrollTop=0}
function exitGameMode(){resetGame();document.body.classList.remove('game-mode');gameBoardHome.parentNode.insertBefore(gameBoardSheet,gameBoardHome.nextSibling)}
function startGame(){enterGameMode();resetGame();game.running=true;const runId=game.runId;requestAnimationFrame(now=>gameLoop(now,runId))}
document.getElementById('startGame').addEventListener('click',startGame);
document.getElementById('resetGame').addEventListener('click',startGame);
document.getElementById('playAgain').addEventListener('click',startGame);
document.getElementById('closeGame').addEventListener('click',exitGameMode);
document.getElementById('exitGame').addEventListener('click',exitGameMode);
window.addEventListener('keydown',event=>{
  const controlKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'];
  if(document.body.classList.contains('game-mode')&&controlKeys.includes(event.key)){event.preventDefault();game.keys[event.key]=true}
  if(document.body.classList.contains('game-mode')&&event.key==='Escape')exitGameMode();
},{passive:false});
window.addEventListener('keyup',event=>{if(document.body.classList.contains('game-mode')){event.preventDefault();game.keys[event.key]=false}},{passive:false});
Object.entries(gameImages).forEach(([key,image])=>{
  const prepare=()=>{prepareSprite(image,key);drawGame()};
  if(image.complete&&image.naturalWidth)prepare();
  else image.addEventListener('load',prepare,{once:true});
});
resetGame();

// Lightweight deep links are also used for visual QA screenshots.
const previewParams=new URLSearchParams(location.search);
const previewPage=Number(previewParams.get('page'));
if(previewParams.has('page')&&Number.isFinite(previewPage))gotoPage(previewPage);
if(previewParams.get('game')==='1')setTimeout(startGame,720);
if(previewParams.get('qa')==='1')window.addEventListener('load',()=>setTimeout(()=>{
  const balanceDiffs=[...document.querySelectorAll('.book-spread:not(.single-cover-layout)')].map(spread=>{
    const papers=[...spread.children].filter(child=>child.classList.contains('paper'));
    if(papers.length!==2)return 0;
    const lastBottom=paper=>[...paper.children].reduce((bottom,child)=>Math.max(bottom,child.getBoundingClientRect().bottom-paper.getBoundingClientRect().top),0);
    return Math.round(Math.abs(lastBottom(papers[0])-lastBottom(papers[1])));
  });
  const balanceDebug=[...document.querySelectorAll('.book-spread:not(.single-cover-layout)')].map(spread=>[...spread.children].filter(child=>child.classList.contains('paper')).map(paper=>({last:Math.round([...paper.children].reduce((bottom,child)=>Math.max(bottom,child.getBoundingClientRect().bottom-paper.getBoundingClientRect().top),0)),fill:Math.round(paper.querySelector('.balance-fill')?.getBoundingClientRect().height||0)})));
  const barrage=document.getElementById('barrage');
  const barrageBox=barrage?.getBoundingClientRect();
  const barrageClipped=barrage?[...barrage.children].filter(item=>{const rect=item.getBoundingClientRect();return rect.left<barrageBox.left-1||rect.right>barrageBox.right+1}).length:0;
  document.body.dataset.qa=JSON.stringify({pages:pages.length,nav:document.querySelectorAll('.nav-item').length,bottomDiffs:balanceDiffs,balanceDebug,maxBottomDiff:Math.max(...balanceDiffs),flowButtons:document.querySelectorAll('.flow-dots button').length,wordBubbles:document.querySelectorAll('.word-bubble').length,barrageClipped,legend:document.querySelectorAll('.legend-item').length,balanceRuns:window.__balanceRuns,balanceSeen:window.__balanceSeen,errors:window.__pageErrors});
},1200),{once:true});
