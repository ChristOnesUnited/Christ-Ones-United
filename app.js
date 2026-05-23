// ═══════════════ STATE
var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var CATS = ["All","Restaurant","Retail","Health & Wellness","Technology","Legal","Finance","Education","Home Services","Beauty","Fitness","Other"];
var CAT_COLORS = {"Restaurant":"#e8603c","Retail":"#6c63ff","Health & Wellness":"#3cbf8f","Technology":"#2d9cdb","Legal":"#8b5cf6","Finance":"#f59e0b","Education":"#ec4899","Home Services":"#10b981","Beauty":"#f472b6","Fitness":"#f97316","Other":"#6b7280"};
var IND_PLANS = [{id:"monthly",label:"Monthly",price:"$1.29",period:"/mo",desc:"Billed monthly."},{id:"annual",label:"Annual",price:"$9.99",period:"/yr",desc:"Save 35%.",badge:"Best Value"}];
var BIZ_PLANS = [{id:"monthly",label:"Monthly",price:"$29.99",period:"/mo",desc:"Billed monthly."},{id:"annual",label:"Annual",price:"$239.99",period:"/yr",desc:"Save 33%.",badge:"Best Value"}];
var NOW = new Date();

var state = {
  profileType:null, user:null, plan:null, faithAnswer:null, bizTags:[], activeCat:'All',
  savedIds:[], myReferralCount:0,
  notifications:[{id:1,text:"Welcome to Christ One's United! Your membership is active.",time:"Just now",read:false}],
  businesses:[
    {id:1,name:"The Golden Fork",category:"Restaurant",description:"Farm-to-table dining with seasonal menus and a curated wine list.",address:"42 Elm Street, Portland, OR",phone:"(503) 555-0101",email:"hello@goldenfork.com",website:"goldenfork.com",facebook:"facebook.com/goldenfork",linkedin:"",tags:["vegan options","wine bar","outdoor seating"],church:"Grace Community Church",churchAddress:"10 Grace Ave, Portland, OR",hours:{Mon:"9am–9pm",Tue:"9am–9pm",Wed:"9am–9pm",Thu:"9am–9pm",Fri:"9am–10pm",Sat:"10am–10pm",Sun:"Closed"},featured:false,verified:true,approved:true,joinedDate:new Date(Date.now()-20*86400000),views:142,referrals:[],testimonials:[{author:"Sarah M.",text:"Best meal I've had in Portland. Truly a blessing of a place!"}]},
    {id:2,name:"Pixel & Co.",category:"Technology",description:"Full-stack web design and development studio specializing in startups.",address:"88 Innovation Blvd, Austin, TX",phone:"(512) 555-0234",email:"studio@pixelco.dev",website:"pixelco.dev",facebook:"",linkedin:"linkedin.com/company/pixelco",tags:["web design","React","branding"],church:"Harvest Fellowship",churchAddress:"55 Harvest Rd, Austin, TX",hours:{Mon:"8am–6pm",Tue:"8am–6pm",Wed:"8am–6pm",Thu:"8am–6pm",Fri:"8am–5pm",Sat:"Closed",Sun:"Closed"},featured:true,verified:true,approved:true,joinedDate:new Date(Date.now()-3*86400000),views:98,referrals:[],testimonials:[]},
    {id:3,name:"Bloom Wellness Spa",category:"Health & Wellness",description:"Holistic treatments, massage therapy, and mindfulness sessions.",address:"15 Serenity Lane, Asheville, NC",phone:"(828) 555-0378",email:"book@bloomwellness.com",website:"bloomwellness.com",facebook:"facebook.com/bloomwellness",linkedin:"",tags:["massage","meditation","facials"],church:"Mountain Hope Church",churchAddress:"200 Summit Dr, Asheville, NC",hours:{Mon:"Closed",Tue:"10am–7pm",Wed:"10am–7pm",Thu:"10am–7pm",Fri:"10am–8pm",Sat:"9am–8pm",Sun:"11am–5pm"},featured:true,verified:true,approved:true,joinedDate:new Date(Date.now()-45*86400000),views:210,referrals:[],testimonials:[{author:"James T.",text:"A place of true peace and healing. Highly recommend."}]},
    {id:4,name:"Ironwood Legal",category:"Legal",description:"Business and estate law firm with 20+ years of experience.",address:"200 Commerce Dr, Chicago, IL",phone:"(312) 555-0456",email:"info@ironwoodlegal.com",website:"ironwoodlegal.com",facebook:"",linkedin:"linkedin.com/company/ironwoodlegal",tags:["business law","estate planning","contracts"],church:"Grace Community Church",churchAddress:"40 Grace Blvd, Chicago, IL",hours:{Mon:"9am–5pm",Tue:"9am–5pm",Wed:"9am–5pm",Thu:"9am–5pm",Fri:"9am–4pm",Sat:"Closed",Sun:"Closed"},featured:false,verified:true,approved:true,joinedDate:new Date(Date.now()-60*86400000),views:67,referrals:[],testimonials:[]},
    {id:5,name:"Harbor Fitness",category:"Fitness",description:"Waterfront gym with personal training, yoga, and group classes.",address:"9 Harbor View, Seattle, WA",phone:"(206) 555-0512",email:"join@harborfitness.com",website:"harborfitness.com",facebook:"facebook.com/harborfitness",linkedin:"",tags:["personal training","yoga","group classes"],church:"Cornerstone Church",churchAddress:"88 Harbor Blvd, Seattle, WA",hours:{Mon:"5am–10pm",Tue:"5am–10pm",Wed:"5am–10pm",Thu:"5am–10pm",Fri:"5am–9pm",Sat:"7am–8pm",Sun:"8am–6pm"},featured:false,verified:true,approved:true,joinedDate:new Date(Date.now()-5*86400000),views:185,referrals:[],testimonials:[]},
    {id:6,name:"Sage & Shears",category:"Beauty",description:"Boutique hair salon focused on sustainable products and precision cuts.",address:"33 Main St, Denver, CO",phone:"(720) 555-0601",email:"hello@sageshears.com",website:"sageshears.com",facebook:"facebook.com/sageshears",linkedin:"",tags:["haircuts","color","eco-friendly"],church:"Harvest Fellowship",churchAddress:"22 Harvest Way, Denver, CO",hours:{Mon:"Closed",Tue:"9am–6pm",Wed:"9am–6pm",Thu:"9am–7pm",Fri:"9am–7pm",Sat:"8am–5pm",Sun:"Closed"},featured:false,verified:true,approved:true,joinedDate:new Date(Date.now()-55*86400000),views:93,referrals:[],testimonials:[{author:"Maria L.",text:"Love this salon. Faith-filled atmosphere and incredible work!"}]},
  ],
  pendingBusinesses:[
    {id:99,name:"Sunrise Bakery",category:"Restaurant",description:"Christian-owned artisan bakery specializing in fresh breads and pastries.",address:"77 Sunrise Ave, Nashville, TN",phone:"(615) 555-0799",email:"hello@sunrisebakery.com",church:"New Life Church",churchAddress:"100 New Life Blvd, Nashville, TN",tags:["bakery","pastries","gluten-free"],approved:false}
  ],
  myBiz:null,
  prayerRequests:[
    {id:1,author:"Grace M.",text:"Please pray for my husband's recovery from surgery this week.",time:"2 hours ago",prayedBy:[],prayedByMe:false},
    {id:2,author:"David K.",text:"Seeking God's guidance as I start my new business venture for His glory.",time:"Yesterday",prayedBy:[],prayedByMe:false},
    {id:3,author:"Anonymous",text:"Prayers for unity in our congregation and strength for our pastor.",time:"2 days ago",prayedBy:[],prayedByMe:false},
  ],
  events:[
    {id:1,title:"Community Business Mixer",date:new Date(Date.now()+7*86400000),time:"6:00 PM – 9:00 PM",location:"Grace Community Church Hall",host:"Christ One's United",desc:"Network with fellow faith-based business owners over light refreshments."},
    {id:2,title:"Faith & Finance Workshop",date:new Date(Date.now()+14*86400000),time:"10:00 AM – 12:00 PM",location:"Harvest Fellowship Center",host:"Ironwood Legal",desc:"Biblical principles for managing your business finances. All welcome."},
    {id:3,title:"Sunday Market",date:new Date(Date.now()+21*86400000),time:"12:00 PM – 4:00 PM",location:"Cornerstone Church Courtyard",host:"Cornerstone Church",desc:"Local Christian vendors, food, fellowship. Family friendly."},
  ],
  messages:[],
  leaderboard:[
    {name:"Marcus J.",count:12,badge:"🏆 Top Referrer"},
    {name:"Linda P.",count:8,badge:"🥈 Silver"},
    {name:"Thomas R.",count:5,badge:"🥉 Bronze"},
    {name:"Angela S.",count:3,badge:""},
    {name:"Kevin W.",count:2,badge:""},
  ]
};

var selectedPlan = null;

// ═══════════════ UTILS
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);}
function toggleInfo(btn){
  var isActive=btn.classList.contains('active');
  document.querySelectorAll('.info-btn.active').forEach(function(b){b.classList.remove('active');});
  if(!isActive)btn.classList.add('active');
}
document.addEventListener('click',function(e){
  if(!e.target.classList.contains('info-btn'))document.querySelectorAll('.info-btn.active').forEach(function(b){b.classList.remove('active');});
  if(!e.target.classList.contains('job-report-btn'))document.querySelectorAll('.job-report-btn.active').forEach(function(b){b.classList.remove('active');});
});
function makeDots(step,color,cid){var c=document.getElementById(cid);if(!c)return;c.innerHTML='';for(var i=1;i<=4;i++){var d=document.createElement('div');d.className='step-dot'+(i<step?' done':(i===step?' active-'+color:''));d.textContent=i<step?'✓':i;c.appendChild(d);if(i<4){var l=document.createElement('div');l.className='step-line'+(i<step?' done':'');c.appendChild(l);}}}
function isNewThisWeek(b){return (Date.now()-new Date(b.joinedDate).getTime())<7*86400000;}
function todayHours(b){if(!b.hours)return null;var d=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];return b.hours[d]||null;}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function addNotif(text){state.notifications.unshift({id:Date.now(),text:text,time:'Just now',read:false});updateNotifUI();}

// ═══════════════ LANDING
function selectType(type){
  state.profileType=type;var isBiz=type==='business';
  document.getElementById('su-subtitle').textContent=isBiz?'Business Sign Up':'Individual Sign Up';
  document.getElementById('su-chip').className='ob-chip '+(isBiz?'g':'r');
  document.getElementById('su-chip').textContent=isBiz?'🏢 Business Owner':'🔍 Individual Member';
  document.getElementById('su-desc').textContent=isBiz?'Set up your Christ One\'s United business account.':'Join the Christ One\'s United community directory.';
  document.getElementById('su-btn').className='btn btn-mt '+(isBiz?'btn-green':'btn-ink');
  makeDots(1,isBiz?'g':'r','su-stepdots');
  showScreen('screen-signup');
}

// ═══════════════ SIGN IN
function doSignIn(){
  var email=document.getElementById('si-email').value.trim(),pass=document.getElementById('si-pass').value,e=document.getElementById('si-err');
  e.classList.add('hidden');
  if(!email||!/\S+@\S+\.\S+/.test(email)){e.textContent='Enter a valid email.';e.classList.remove('hidden');return;}
  if(!pass){e.textContent='Enter your password.';e.classList.remove('hidden');return;}
  state.user={name:email.split('@')[0],email:email,plan:'monthly',church:''};state.profileType='individual';
  enterDirectory();
}

// ═══════════════ SIGNUP
function doSignup(){
  var name=document.getElementById('su-name').value.trim(),email=document.getElementById('su-email').value.trim(),pass=document.getElementById('su-pass').value,e=document.getElementById('su-err');
  e.classList.add('hidden');
  if(!name){e.textContent='Enter your name.';e.classList.remove('hidden');return;}
  if(!email||!/\S+@\S+\.\S+/.test(email)){e.textContent='Enter a valid email.';e.classList.remove('hidden');return;}
  if(pass.length<6){e.textContent='Password must be 6+ characters.';e.classList.remove('hidden');return;}
  state.user={name:name,email:email};
  var isBiz=state.profileType==='business';
  makeDots(2,isBiz?'g':'r','faith-stepdots');
  document.getElementById('faith-btn').className='btn btn-mt '+(isBiz?'btn-green':'btn-ink');
  state.faithAnswer=null;
  document.getElementById('faith-yes').className='faith-opt yes';
  document.getElementById('faith-no').className='faith-opt no';
  document.getElementById('faith-block').classList.add('hidden');
  showScreen('screen-faith');
}

// ═══════════════ FAITH
function selectFaith(v){state.faithAnswer=v;document.getElementById('faith-yes').className='faith-opt yes'+(v==='yes'?' sel':'');document.getElementById('faith-no').className='faith-opt no'+(v==='no'?' sel':'');document.getElementById('faith-block').classList.add('hidden');}
function doFaith(){if(!state.faithAnswer)return;if(state.faithAnswer==='no'){document.getElementById('faith-block').classList.remove('hidden');return;}goToPayment();}

// ═══════════════ PAYMENT
function goToPayment(){
  var isBiz=state.profileType==='business';var plans=isBiz?BIZ_PLANS:IND_PLANS;
  selectedPlan=plans.find(p=>p.id==='annual')||plans[0];
  document.getElementById('pay-subtitle').textContent=isBiz?'Business Membership':'Individual Membership';
  document.getElementById('pay-chip').className='ob-chip '+(isBiz?'g':'r');
  document.getElementById('pay-chip').textContent=isBiz?'🏢 Business Owner':'🔍 Individual Member';
  makeDots(3,isBiz?'g':'r','pay-stepdots');
  renderPlans();
  document.getElementById('pay-form').classList.remove('hidden');
  document.getElementById('pay-processing').classList.add('hidden');
  updatePayBtn();
  showScreen('screen-payment');
}
function renderPlans(){
  var isBiz=state.profileType==='business';var plans=isBiz?BIZ_PLANS:IND_PLANS;var color=isBiz?'g':'r';
  document.getElementById('pay-plans').innerHTML=plans.map(function(p){
    var sel=selectedPlan&&selectedPlan.id===p.id;
    return '<div class="plan-opt'+(sel?' sel-'+color:'')+'" onclick="selectPlan(\''+p.id+'\')">'+(p.badge?'<div class="plan-badge '+color+'">'+p.badge+'</div>':'')+'<div class="plan-label">'+p.label+'</div><div class="plan-price">'+p.price+'</div><div class="plan-period">'+p.period+'</div><div class="plan-desc">'+p.desc+'</div></div>';
  }).join('');
}
function selectPlan(id){var isBiz=state.profileType==='business';selectedPlan=(isBiz?BIZ_PLANS:IND_PLANS).find(p=>p.id===id)||selectedPlan;renderPlans();updatePayBtn();}
function updatePayBtn(){
  var btn=document.getElementById('pay-btn');
  if(!btn)return;
  btn.disabled=false;
  btn.style.opacity=1;
  btn.style.cursor='pointer';
  btn.textContent='Proceed to Checkout →';
  btn.className='btn btn-mt '+(state.profileType==='business'?'btn-green':'btn-red');
}
function doPay(){
  document.getElementById('pay-form').classList.add('hidden');
  document.getElementById('pay-processing').classList.remove('hidden');
  // Build the plan key to send to our serverless function
  var isBiz = state.profileType === 'business';
  var planKey = (isBiz ? 'business' : 'individual') + '_' + (selectedPlan ? selectedPlan.id : 'monthly');
  // Call our Vercel serverless function
  fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planKey:     planKey,
      email:       state.user ? state.user.email : '',
      name:        state.user ? state.user.name  : '',
      profileType: state.profileType,
    }),
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    if(data.url){
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      // Stripe returned an error
      document.getElementById('pay-form').classList.remove('hidden');
      document.getElementById('pay-processing').classList.add('hidden');
      alert('Payment error: ' + (data.error || 'Please try again.'));
    }
  })
  .catch(function(err){
    document.getElementById('pay-form').classList.remove('hidden');
    document.getElementById('pay-processing').classList.add('hidden');
    alert('Connection error. Please check your internet and try again.');
  });
}

// ═══════════════ STRIPE RETURN HANDLER
// Runs on page load — checks if user was redirected back from Stripe
(function(){
  var params = new URLSearchParams(window.location.search);
  if(params.get('cancelled')==='true'){
    // User cancelled Stripe checkout — show landing with a gentle message
    window.history.replaceState({},'','/');
    setTimeout(function(){
      var msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fff;border:1.5px solid #ddd8ce;border-radius:12px;padding:.875rem 1.25rem;font-family:DM Sans,sans-serif;font-size:.82rem;color:#7a7369;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:999;text-align:center;max-width:320px;';
      msg.innerHTML = 'No problem — your information is saved.<br/><strong style="color:#0f0e0c;">Complete your membership anytime.</strong>';
      document.body.appendChild(msg);
      setTimeout(function(){msg.remove();}, 5000);
    }, 500);
  }
})();

// ═══════════════ IND PROFILE
function populateIndCats(){
  var el=document.getElementById('ip-cats');el.innerHTML='';var selected=[];
  CATS.filter(c=>c!=='All').forEach(function(c){
    var s=document.createElement('span');s.textContent=c;
    s.style.cssText='padding:4px 11px;border-radius:20px;font-size:.73rem;font-weight:500;cursor:pointer;border:1.5px solid #ddd8ce;background:#fff;color:#7a7369;';
    s.onclick=function(){var i=selected.indexOf(c);if(i>-1){selected.splice(i,1);s.style.borderColor='#ddd8ce';s.style.background='#fff';s.style.color='#7a7369';}else{selected.push(c);s.style.borderColor='#c8452d';s.style.background='#f0e4e0';s.style.color='#c8452d';}};
    el.appendChild(s);
  });
}
function doIndProfile(){
  state.user.church=document.getElementById('ip-church').value.trim();
  enterDirectory();
}

// ═══════════════ BIZ PROFILE
function populateBizForm(){
  var sel=document.getElementById('bp-cat');sel.innerHTML='<option value="">Select a category…</option>';
  CATS.filter(c=>c!=='All').forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  var planLabel={monthly:'Monthly Plan',annual:'Annual Plan'}[state.plan]||'Business Member';
  document.getElementById('bp-chip').textContent='🏢 '+planLabel;
  // Hours rows
  var hr=document.getElementById('bp-hours-rows');hr.innerHTML='';
  DAYS.forEach(function(d){
    hr.innerHTML+='<div style="display:grid;grid-template-columns:60px 1fr;gap:8px;margin-bottom:6px;align-items:center;"><label style="font-size:.76rem;font-weight:600;color:var(--muted);">'+d+'</label><input class="inp" id="hr-'+d+'" placeholder="e.g. 9am–5pm or Closed" style="padding:7px 10px;font-size:.8rem;"/></div>';
  });
}
function addBizTag(){var inp=document.getElementById('bp-tag-input'),t=inp.value.trim();if(!t||state.bizTags.includes(t)||state.bizTags.length>=8)return;state.bizTags.push(t);inp.value='';renderBizTags();}
function removeBizTag(t){state.bizTags=state.bizTags.filter(x=>x!==t);renderBizTags();}
function renderBizTags(){document.getElementById('bp-tags').innerHTML=state.bizTags.map(t=>'<span class="tag-pill">'+t+' <span class="tag-remove" onclick="removeBizTag(\''+t+'\')">×</span></span>').join('');}
function doBizProfile(){
  var name=document.getElementById('bp-name').value.trim(),cat=document.getElementById('bp-cat').value,desc=document.getElementById('bp-desc').value.trim(),
      addr=document.getElementById('bp-addr').value.trim(),phone=document.getElementById('bp-phone').value.trim(),email=document.getElementById('bp-email').value.trim(),
      church=document.getElementById('bp-church').value.trim(),churchAddr=document.getElementById('bp-church-addr').value.trim();
  var valid=true;
  [['bp-name-err',!name],['bp-cat-err',!cat],['bp-desc-err',!desc],['bp-addr-err',!addr],['bp-phone-err',!phone],['bp-email-err',!email||!/\S+@\S+\.\S+/.test(email)],['bp-church-err',!church],['bp-church-addr-err',!churchAddr]].forEach(function(pair){document.getElementById(pair[0]).classList[pair[1]?'remove':'add']('hidden');if(pair[1])valid=false;});
  if(!valid)return;
  var hours={};DAYS.forEach(function(d){hours[d]=document.getElementById('hr-'+d).value.trim()||'Closed';});
  var biz={id:Date.now(),name:name,category:cat,description:desc,address:addr,zip:document.getElementById('bp-zip').value,phone:phone,email:email,
    website:document.getElementById('bp-web').value,facebook:document.getElementById('bp-facebook').value,linkedin:document.getElementById('bp-linkedin').value,
    church:church,churchAddress:churchAddr,hours:hours,tags:state.bizTags.slice(),featured:false,verified:false,approved:false,
    joinedDate:new Date(),views:0,referrals:[],testimonials:[]};
  state.pendingBusinesses.push(biz);state.myBiz=biz;
  addNotif('Your listing has been submitted for review!');
  enterDashboard();
}

// ═══════════════ DIRECTORY
function enterDirectory(){
  state.activeCat='All';document.getElementById('dir-search').value='';
  document.getElementById('dir-count-sub').textContent='Browsing '+state.businesses.filter(b=>b.approved).length+' verified listings';
  document.getElementById('acc-name').textContent=state.user.name;
  document.getElementById('acc-email').textContent=state.user.email;
  document.getElementById('acc-plan').textContent='Individual · '+(state.plan==='annual'?'Annual ($9.99/yr)':'Monthly ($1.29/mo)');
  populateChurchFilter();renderCatChips();renderDirectory();renderFeatured();
  renderPrayerBoard();renderEvents();renderLeaderboard();renderMessages('individual');
  updateNotifUI();showScreen('screen-directory');switchDirTab('home');
}
function populateChurchFilter(){
  var sel=document.getElementById('church-filter');sel.innerHTML='<option value="">All Churches</option>';
  var churches=[...new Set(state.businesses.filter(b=>b.approved&&b.church).map(b=>b.church))].sort();
  churches.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  if(state.user&&state.user.church){sel.value=state.user.church;}
}
function renderCatChips(){
  var el=document.getElementById('cat-chips');el.innerHTML='';
  CATS.forEach(function(c){var btn=document.createElement('button');btn.className='cat-chip'+(state.activeCat===c?' active':'');btn.textContent=c;btn.onclick=function(){state.activeCat=c;renderCatChips();renderDirectory();};el.appendChild(btn);});
}
function renderFeatured(){
  var featured=state.businesses.filter(b=>b.featured&&b.approved);
  var strip=document.getElementById('feat-strip');
  if(!featured.length){strip.classList.add('hidden');return;}
  strip.classList.remove('hidden');
  document.getElementById('feat-row').innerHTML=featured.map(b=>'<div class="feat-card"><div class="feat-name">'+b.name+'</div><div class="feat-cat">'+b.category+'</div></div>').join('');
}
function renderDirectory(){
  var q=(document.getElementById('dir-search').value||'').toLowerCase();
  var cf=document.getElementById('church-filter').value;
  var filtered=state.businesses.filter(function(b){
    if(!b.approved)return false;
    var mc=state.activeCat==='All'||b.category===state.activeCat;
    var cc=!cf||b.church===cf;
    return mc&&cc&&(!q||b.name.toLowerCase().includes(q)||b.description.toLowerCase().includes(q)||b.category.toLowerCase().includes(q)||b.tags.some(t=>t.toLowerCase().includes(q)));
  });
  document.getElementById('result-meta').innerHTML='Showing <strong>'+filtered.length+'</strong> result'+(filtered.length!==1?'s':'')+(q?' for "<strong>'+q+'</strong>"':'')+(state.activeCat!=='All'?' in <strong>'+state.activeCat+'</strong>':'')+(cf?' · <strong>'+cf+'</strong>':'');
  var grid=document.getElementById('biz-grid');
  if(!filtered.length){grid.innerHTML='<div class="empty-state"><div class="empty-icon">🗂</div><div class="empty-title">No results found</div><p>Try a different search or filter.</p></div>';return;}
  grid.innerHTML='';filtered.forEach(function(b){grid.appendChild(makeBizCard(b));});
  document.getElementById('feat-strip').classList[q||state.activeCat!=='All'||cf?'add':'remove']('hidden');
}
function makeBizCard(b){
  var color=CAT_COLORS[b.category]||'#6b7280',saved=state.savedIds.includes(b.id),ntw=isNewThisWeek(b),hrs=todayHours(b);
  var div=document.createElement('div');div.className='biz-card'+(b.featured?' featured':'')+(ntw?' new-this-week':'');
  var badges='';if(b.verified)badges+='<span class="biz-verified">✓ Verified</span>';if(ntw)badges+='<span class="biz-new">🆕 New This Week</span>';
  var hoursHtml=hrs?'<div class="biz-hours'+(hrs==='Closed'?' closed':'')+'">⏰ Today: '+hrs+'</div>':'';
  var metaHtml='<div class="biz-meta"><div class="biz-meta-row">📍 '+b.address+'</div><div class="biz-meta-row">📞 '+b.phone+'</div>'+(b.website?'<div class="biz-meta-row">🌐 <a href="https://'+b.website+'" target="_blank">'+b.website+'</a></div>':'')+(b.facebook?'<div class="biz-meta-row">👥 <a href="https://'+b.facebook+'" target="_blank">'+b.facebook+'</a></div>':'')+(b.linkedin?'<div class="biz-meta-row">💼 <a href="https://'+b.linkedin+'" target="_blank">'+b.linkedin+'</a></div>':'')+'<div class="biz-meta-row">✉️ '+b.email+'</div></div>';
  var tmsHtml=b.testimonials&&b.testimonials.length?'<div class="testimonials">'+b.testimonials.slice(0,2).map(t=>'<div class="testimonial"><div class="testimonial-text">"'+t.text+'"</div><div class="testimonial-author">— '+t.author+'</div></div>').join('')+'</div>':'';
  div.innerHTML='<div class="biz-topbar" style="background:'+color+'"></div><div class="biz-head"><div class="biz-name">'+b.name+'</div><span class="biz-cat-badge" style="background:'+color+'1a;color:'+color+'">'+b.category+'</span></div>'+(badges?'<div class="biz-badges">'+badges+'</div>':'')+hoursHtml+'<p class="biz-desc">'+b.description+'</p>'+metaHtml+(b.tags.length?'<div class="biz-tags">'+b.tags.map(t=>'<span class="biz-tag">'+t+'</span>').join('')+'</div>':'')+tmsHtml+'<div class="biz-actions"><button class="biz-btn biz-btn-save'+(saved?' saved':'')+'" onclick="toggleSave('+b.id+')">'+(saved?'♥ Saved':'♡ Save')+'</button><button class="biz-btn biz-btn-ref" onclick="openRefModal('+b.id+')">🤝 Refer</button><button class="biz-btn biz-btn-testify" onclick="openRevModal('+b.id+')">✍️ Testify</button><button class="biz-btn biz-btn-msg" onclick="openMsgModal('+b.id+')">💬 Message</button></div>';
  return div;
}
function toggleSave(id){var i=state.savedIds.indexOf(id);if(i>-1)state.savedIds.splice(i,1);else state.savedIds.push(id);renderDirectory();renderSaved();updateSavedCount();}
function renderSaved(){
  var grid=document.getElementById('saved-grid'),saved=state.businesses.filter(b=>state.savedIds.includes(b.id));
  document.getElementById('saved-sub').textContent=saved.length+' saved listing'+(saved.length!==1?'s':'');
  grid.innerHTML=saved.length?'':('<div class="empty-state"><div class="empty-icon">♡</div><div class="empty-title">Nothing saved yet</div><p>Tap ♡ Save on any card.</p></div>');
  saved.forEach(function(b){grid.appendChild(makeBizCard(b));});
}
function updateSavedCount(){var cnt=document.getElementById('saved-cnt');if(state.savedIds.length>0){cnt.textContent=state.savedIds.length;cnt.classList.remove('hidden');}else cnt.classList.add('hidden');}
function switchDirTab(tab){
  ['home','saved','community','messages','jobs','guild','account'].forEach(function(t){
    var panel=document.getElementById('dir-tab-'+t);
    if(panel)panel.classList[t===tab?'remove':'add']('hidden');
    var btn=document.getElementById('dir-btn-'+t);
    if(btn)btn.classList.remove('active-ind');
  });
  var activeBtn=document.getElementById('dir-btn-'+tab);
  if(activeBtn)activeBtn.classList.add('active-ind');
  if(tab==='saved')renderSaved();
  if(tab==='community'){renderPrayerBoard();renderEvents();renderLeaderboard();}
  if(tab==='messages')renderMessages('individual');
  if(tab==='jobs'){initJobFilters();renderJobs();}
  if(tab==='guild')renderGuild();
}

// ═══════════════ PRAYER BOARD
function renderPrayerBoard(){
  document.getElementById('prayer-list').innerHTML=state.prayerRequests.map(function(p,i){
    return '<div class="prayer-card"><div class="prayer-header"><div class="prayer-author">🙏 '+p.author+'</div><div class="prayer-time">'+p.time+'</div></div><p class="prayer-text">'+p.text+'</p><div style="display:flex;align-items:center;justify-content:space-between;"><span class="prayer-prayed">'+p.prayedBy.length+' praying</span><button class="prayer-pray-btn'+(p.prayedByMe?' prayed':'')+'" onclick="prayFor('+i+')">'+(p.prayedByMe?'🙏 Praying':'🙏 Pray')+' </button></div></div>';
  }).join('');
}
function prayFor(i){if(!state.prayerRequests[i].prayedByMe){state.prayerRequests[i].prayedByMe=true;state.prayerRequests[i].prayedBy.push(state.user.name);}renderPrayerBoard();}
function openPrayerModal(){
  document.getElementById('prayerModalContent').innerHTML='<div class="modal-icon">🙏</div><div class="modal-title">Post a Prayer Request</div><div style="font-size:.73rem;color:var(--muted);margin-bottom:1rem;">Your request will be shared with the community anonymously if you choose.</div><div class="form-group"><label class="lbl">Your Name</label><input class="inp" id="pr-name" placeholder="Name or \'Anonymous\'"/></div><div class="form-group"><label class="lbl">Prayer Request</label><textarea class="inp" id="pr-text" placeholder="Share your prayer request…" style="min-height:80px;"></textarea></div><button class="btn btn-red btn-mt" onclick="submitPrayer()">Post Request</button>';
  document.getElementById('prayerModal').classList.add('open');
}
function submitPrayer(){
  var name=document.getElementById('pr-name').value.trim()||'Anonymous',text=document.getElementById('pr-text').value.trim();
  if(!text)return;
  state.prayerRequests.unshift({id:Date.now(),author:name,text:text,time:'Just now',prayedBy:[],prayedByMe:false});
  closeModal('prayerModal');renderPrayerBoard();addNotif('Your prayer request has been posted.');
}

// ═══════════════ EVENTS
function renderEvents(){
  var el=document.getElementById('events-list');
  el.innerHTML=state.events.map(function(e){
    var d=new Date(e.date),month=d.toLocaleString('default',{month:'short'}).toUpperCase(),day=d.getDate();
    return '<div class="event-card"><div class="event-date-box"><div class="event-month">'+month+'</div><div class="event-day">'+day+'</div></div><div class="event-body"><div class="event-title">'+e.title+'</div><div class="event-meta">🕐 '+e.time+'<br/>📍 '+e.location+'</div><div class="event-host">Hosted by '+e.host+'</div></div></div>';
  }).join('');
}
function openEventModal(){
  document.getElementById('eventModalContent').innerHTML='<div class="modal-icon">📅</div><div class="modal-title">Post an Event</div><div class="form-group"><label class="lbl">Event Title</label><input class="inp" id="ev-title" placeholder="e.g. Community Prayer Breakfast"/></div><div class="form-group"><label class="lbl">Date</label><input class="inp" type="date" id="ev-date"/></div><div class="form-group"><label class="lbl">Time</label><input class="inp" id="ev-time" placeholder="e.g. 10:00 AM – 12:00 PM"/></div><div class="form-group"><label class="lbl">Location</label><input class="inp" id="ev-loc" placeholder="Venue name and address"/></div><div class="form-group"><label class="lbl">Hosted By</label><input class="inp" id="ev-host" placeholder="Your name or organization"/></div><div class="form-group"><label class="lbl">Description</label><textarea class="inp" id="ev-desc" placeholder="Tell people what to expect…"></textarea></div><button class="btn btn-green btn-mt" onclick="submitEvent()">Post Event</button>';
  document.getElementById('eventModal').classList.add('open');
}
function submitEvent(){
  var title=document.getElementById('ev-title').value.trim(),date=document.getElementById('ev-date').value;
  if(!title||!date)return;
  state.events.unshift({id:Date.now(),title:title,date:new Date(date),time:document.getElementById('ev-time').value||'TBD',location:document.getElementById('ev-loc').value||'TBD',host:document.getElementById('ev-host').value||state.user.name,desc:document.getElementById('ev-desc').value});
  closeModal('eventModal');renderEvents();addNotif('Your event has been posted!');
}

// ═══════════════ NEWSLETTER
function subscribeNewsletter(){
  var email=document.getElementById('nl-email').value.trim();
  if(!email||!/\S+@\S+\.\S+/.test(email)){alert('Please enter a valid email.');return;}
  document.querySelector('.newsletter-card').innerHTML='<div style="text-align:center;padding:.5rem 0;"><div style="font-size:2rem;margin-bottom:.5rem;">📬</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;color:#f7f4ef;margin-bottom:.4rem;">You\'re subscribed!</div><p style="font-size:.78rem;color:#8a8278;">The Christ One\'s United Weekly will land in your inbox every Monday morning.</p></div>';
  addNotif('You\'ve subscribed to the weekly newsletter!');
}

// ═══════════════ LEADERBOARD
function renderLeaderboard(){
  document.getElementById('leaderboard').innerHTML='<div class="dash-card" style="padding:1rem 1.25rem;">'+state.leaderboard.map(function(l,i){return '<div class="leaderboard-item"><div class="lb-rank'+(i<3?' top':'')+'">'+[' 🥇',' 🥈',' 🥉'][i]||i+1+'</div><div class="lb-name">'+l.name+'</div>'+(l.badge?'<span class="lb-badge">'+l.badge+'</span>':'')+' <div class="lb-count">'+l.count+' referrals</div></div>';}).join('')+'</div>';
}

// ═══════════════ MESSAGING
function openMsgModal(bizId){
  var biz=state.businesses.find(b=>b.id===bizId);if(!biz)return;
  var thread=state.messages.find(m=>m.bizId===bizId);
  if(!thread){thread={bizId:bizId,bizName:biz.name,messages:[{from:'system',text:'This is a private conversation with '+biz.name+'. Messages are visible to both parties.',time:'Now'}],unread:false};state.messages.push(thread);}
  document.getElementById('msgModalContent').innerHTML=
    '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;"><div style="font-size:1.2rem;">💬</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">'+biz.name+'</div></div>'+
    '<div class="msg-bubble-wrap" id="modal-bubbles">'+thread.messages.map(function(m){return '<div class="msg-bubble '+(m.from==='user'?'sent':'recv')+'">'+m.text+'</div>';}).join('')+'</div>'+
    '<div class="msg-input-row"><input class="msg-input" id="modal-msg-inp" placeholder="Type a message…" onkeydown="if(event.key===\'Enter\')sendModalMsg('+bizId+')"/><button class="msg-send-btn" onclick="sendModalMsg('+bizId+')">Send</button></div>';
  document.getElementById('msgModal').classList.add('open');
}
function sendModalMsg(bizId){
  var inp=document.getElementById('modal-msg-inp'),text=inp.value.trim();if(!text)return;
  var thread=state.messages.find(m=>m.bizId===bizId);
  if(thread){thread.messages.push({from:'user',text:text,time:'Now'});inp.value='';
    var bubbles=document.getElementById('modal-bubbles');
    bubbles.innerHTML+=('<div class="msg-bubble sent">'+text+'</div>');
    bubbles.scrollTop=bubbles.scrollHeight;
    setTimeout(function(){thread.messages.push({from:'biz',text:'Thanks for reaching out! We\'ll get back to you shortly. God bless! 🙏',time:'Now'});bubbles.innerHTML+=('<div class="msg-bubble recv">Thanks for reaching out! We\'ll get back to you shortly. God bless! 🙏</div>');bubbles.scrollTop=bubbles.scrollHeight;},1000);
  }
}
function renderMessages(role){
  var el=document.getElementById('messages-list');if(!el)return;
  if(!state.messages.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><p>Tap 💬 Message on any business card to start a conversation.</p></div>';return;}
  el.innerHTML=state.messages.map(function(t){var last=t.messages[t.messages.length-1];return '<div class="msg-thread" onclick="openMsgModal('+t.bizId+')"><div class="msg-thread-head"><div class="msg-thread-name">'+t.bizName+'</div><div class="msg-thread-time">'+(last?last.time:'')+'</div></div><div class="msg-thread-preview">'+(last?last.text:'')+'</div></div>';}).join('');
}

// ═══════════════ REF / REVIEW MODALS
function openRefModal(bizId){
  var biz=state.businesses.find(b=>b.id===bizId);if(!biz)return;
  document.getElementById('refModalContent').innerHTML='<div class="modal-icon">🤝</div><div class="modal-title">Share a Referral</div><div class="modal-for">Referring someone to <strong>'+biz.name+'</strong></div><div class="form-group"><label class="lbl">Name</label><input class="inp" id="ref-name" placeholder="Referral\'s full name"/></div><div class="form-group"><label class="lbl">Phone #</label><input class="inp" type="tel" id="ref-phone" placeholder="(555) 000-0000"/></div><div class="form-group"><label class="lbl">Email</label><input class="inp" type="email" id="ref-email" placeholder="their@email.com"/></div><div class="form-group"><label class="lbl">Current Need</label><textarea class="inp" id="ref-need" placeholder="What are they looking for?"></textarea></div><div class="form-group"><label class="lbl">Faith Status</label><select class="inp" id="ref-faith"><option value="">Select…</option><option>Believer</option><option>Exploring faith</option><option>Not yet a believer</option><option>Prefer not to say</option></select></div><button class="btn btn-red btn-mt" onclick="submitRef('+bizId+')">Send Referral →</button>';
  document.getElementById('refModal').classList.add('open');
}
function submitRef(bizId){
  var name=document.getElementById('ref-name').value.trim(),phone=document.getElementById('ref-phone').value.trim();
  if(!name||!phone){alert('Name and phone are required.');return;}
  var ref={name:name,phone:phone,email:document.getElementById('ref-email').value,need:document.getElementById('ref-need').value,faith:document.getElementById('ref-faith').value,time:'Just now'};
  var biz=state.businesses.find(b=>b.id===bizId);if(biz)biz.referrals.unshift(ref);
  if(state.myBiz&&state.myBiz.id===bizId)state.myBiz.referrals.unshift(ref);
  state.myReferralCount++;
  document.getElementById('my-ref-count').textContent=state.myReferralCount;
  // update leaderboard
  var me=state.leaderboard.find(l=>l.name===state.user.name);
  if(me){me.count++;}else{state.leaderboard.push({name:state.user.name,count:1,badge:''});}
  state.leaderboard.sort((a,b)=>b.count-a.count);
  addNotif('Your referral to '+(biz?biz.name:'the business')+' was received!');
  document.getElementById('refModalContent').innerHTML='<div style="text-align:center;padding:.5rem 0;"><div style="font-size:2rem;margin-bottom:.55rem;">🙏</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;margin-bottom:.35rem;">Referral Sent!</div><p style="font-size:.8rem;color:#7a7369;">Your referral has been shared with <strong>'+(biz?biz.name:'the business')+'</strong>.</p></div>';
  setTimeout(function(){closeModal('refModal');},2000);
}
function openRevModal(bizId){
  var biz=state.businesses.find(b=>b.id===bizId);if(!biz)return;
  document.getElementById('revModalContent').innerHTML='<div class="modal-icon">✍️</div><div class="modal-title">Leave a Word</div><div class="modal-for">Share your experience with <strong>'+biz.name+'</strong></div><div class="form-group"><label class="lbl">Your testimonial (1–3 sentences)</label><textarea class="inp" id="rev-text" style="min-height:80px;" placeholder="Share how this business has blessed you…"></textarea></div><button class="btn btn-green btn-mt" onclick="submitRev('+bizId+')">Share →</button>';
  document.getElementById('revModal').classList.add('open');
}
function submitRev(bizId){
  var txt=document.getElementById('rev-text').value.trim();if(!txt)return;
  var tm={author:state.user?state.user.name:'Member',text:txt};
  var biz=state.businesses.find(b=>b.id===bizId);if(biz)biz.testimonials.push(tm);
  if(state.myBiz&&state.myBiz.id===bizId)state.myBiz.testimonials.push(tm);
  document.getElementById('revModalContent').innerHTML='<div style="text-align:center;padding:.5rem 0;"><div style="font-size:2rem;margin-bottom:.55rem;">✍️</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;margin-bottom:.35rem;">Word shared!</div><p style="font-size:.8rem;color:#7a7369;">Thank you! Your testimonial has been added.</p></div>';
  setTimeout(function(){closeModal('revModal');renderDirectory();},2000);
}

// ═══════════════ DASHBOARD
function enterDashboard(){
  document.getElementById('dash-biz-name').textContent=state.myBiz?state.myBiz.name:state.user.name;
  var planLabel={monthly:'Monthly Plan',annual:'Annual Plan'}[state.plan]||'Business Member';
  document.getElementById('dash-plan-chip').textContent='✓ '+planLabel;
  if(state.myBiz&&!state.myBiz.approved)document.getElementById('dash-pending-banner').classList.remove('hidden');
  updateNotifUI();renderDashOverview();renderDashMessages();
  showScreen('screen-dashboard');switchDashTab('overview');
}
function renderDashOverview(){
  var biz=state.myBiz,refs=biz?biz.referrals:[],tms=biz?biz.testimonials:[];
  document.getElementById('dash-panel-overview').innerHTML=
    '<div class="stats-row"><div class="stat-card"><div class="stat-val">'+(biz?biz.views:0)+'</div><div class="stat-lbl">Views</div></div><div class="stat-card"><div class="stat-val">'+refs.length+'</div><div class="stat-lbl">Referrals</div></div><div class="stat-card"><div class="stat-val">'+tms.length+'</div><div class="stat-lbl">Testimonials</div></div></div>'+
    '<div class="dash-card"><div class="dash-card-title">Recent Referrals</div>'+(refs.length?refs.slice(0,3).map(renderRefItem).join(''):'<p style="font-size:.82rem;color:var(--muted);">No referrals yet.</p>')+'</div>'+
    '<div class="dash-card" style="background:linear-gradient(135deg,var(--ink),#1a1612);color:#f7f4ef;"><div style="font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:700;margin-bottom:.4rem;">Weekly Newsletter</div><div style="font-family:\'Playfair Display\',serif;font-size:1rem;margin-bottom:.4rem;">The Christ One\'s United Weekly</div><p style="font-size:.78rem;color:#8a8278;margin-bottom:.875rem;">Your business may be featured in our weekly community digest. Keep your listing active!</p><div style="font-size:.76rem;color:#4dbb8a;font-weight:600;">✓ Active listing — eligible for weekly feature</div></div>';
  var refBadge=document.getElementById('dash-ref-cnt');if(refs.length>0){refBadge.textContent=refs.length;refBadge.classList.remove('hidden');}else refBadge.classList.add('hidden');
}
function renderRefItem(r){
  var fc=!r.faith?'rf-other':r.faith.toLowerCase().includes('believer')?'rf-believer':r.faith.toLowerCase().includes('exploring')?'rf-exploring':'rf-other';
  return '<div class="ref-item"><div class="ref-name">'+r.name+'</div><div class="ref-detail">📞 '+r.phone+(r.email?' · ✉️ '+r.email:'')+'</div>'+(r.need?'<div class="ref-detail">Need: '+r.need+'</div>':'')+(r.faith?'<span class="ref-faith-tag '+fc+'">'+r.faith+'</span>':'')+'</div>';
}
function switchDashTab(tab){
  ['overview','jobs','referrals','testimonials','messages','listing'].forEach(function(t){
    document.getElementById('dash-panel-'+t).classList[t===tab?'remove':'add']('hidden');
    document.getElementById('dash-tab-'+t).classList[t===tab?'add':'remove']('active');
    var btn=document.getElementById('dash-btn-'+t);if(btn)btn.classList[t===tab?'add':'remove']('active-biz');
  });
  if(tab==='jobs')renderDashJobs();
  if(tab==='referrals')renderDashReferrals();
  if(tab==='testimonials')renderDashTestimonials();
  if(tab==='messages')renderDashMessages();
  if(tab==='listing')renderDashListing();
}
function renderDashReferrals(){
  var refs=state.myBiz?state.myBiz.referrals:[];
  document.getElementById('dash-panel-referrals').innerHTML='<div class="dash-card"><div class="dash-card-title">All Referrals ('+refs.length+')</div>'+(refs.length?refs.map(renderRefItem).join(''):'<p style="font-size:.82rem;color:var(--muted);">No referrals yet.</p>')+'</div>';
}
function renderDashTestimonials(){
  var tms=state.myBiz?state.myBiz.testimonials:[];
  document.getElementById('dash-panel-testimonials').innerHTML='<div class="dash-card"><div class="dash-card-title">Testimonials ('+tms.length+')</div>'+(tms.length?tms.map(t=>'<div class="testimonial" style="margin-bottom:.65rem;"><div class="testimonial-text" style="font-size:.82rem;">"'+t.text+'"</div><div class="testimonial-author">— '+t.author+'</div></div>').join(''):'<p style="font-size:.82rem;color:var(--muted);">No testimonials yet.</p>')+'</div>';
}
function renderDashMessages(){
  var panel=document.getElementById('dash-panel-messages');if(!panel)return;
  var msgs=state.messages.filter(m=>m.bizId===(state.myBiz?state.myBiz.id:null));
  panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Member Messages</div>'+(msgs.length?msgs.map(function(t){var last=t.messages[t.messages.length-1];return '<div class="msg-thread"><div class="msg-thread-head"><div class="msg-thread-name">Member</div><div class="msg-thread-time">'+(last?last.time:'')+'</div></div><div class="msg-thread-preview">'+(last?last.text:'')+'</div></div>';}).join(''):'<p style="font-size:.82rem;color:var(--muted);">No messages yet. Messages from members will appear here.</p>')+'</div>';
}
function renderDashListing(){
  var biz=state.myBiz;
  document.getElementById('dash-panel-listing').innerHTML='<div class="dash-card"><div class="dash-card-title">Your Listing '+(biz&&!biz.approved?'<span class="biz-pending">⏳ Pending Review</span>':'<span class="biz-verified">✓ Live</span>')+'</div><p style="font-size:.84rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">'+(biz?biz.description:'No listing yet.')+'</p><div class="form-group"><label class="lbl">Description</label><textarea class="inp" id="edit-desc" style="min-height:72px;">'+(biz?biz.description:'')+'</textarea></div><button class="btn btn-green btn-mt" onclick="saveListing()">Save Changes</button></div>';
}
function saveListing(){var desc=document.getElementById('edit-desc').value.trim();if(state.myBiz){state.myBiz.description=desc;var b=state.businesses.find(x=>x.id===state.myBiz.id);if(b)b.description=desc;}renderDashListing();}

// ═══════════════ ADMIN (accessible for demo — in production would be auth-gated)
// Simulated: pending listings get auto-reviewed after 3 seconds on dashboard entry
function simulateAdminApproval(){
  setTimeout(function(){
    state.pendingBusinesses.forEach(function(b){
      if(!b.approved){
        b.approved=true;b.verified=true;
        state.businesses.unshift(b);
        if(state.myBiz&&state.myBiz.id===b.id){state.myBiz.approved=true;state.myBiz.verified=true;document.getElementById('dash-pending-banner').classList.add('hidden');}
        addNotif('🎉 Your listing "'+b.name+'" has been approved and is now live!');
      }
    });
    state.pendingBusinesses=[];
    renderFeatured();populateChurchFilter();
  },3000);
}

// ═══════════════ NOTIFICATIONS
function updateNotifUI(){
  var unread=state.notifications.filter(n=>!n.read).length;
  ['bell-dot-dir','bell-dot-dash'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList[unread>0?'remove':'add']('hidden');});
  var list=document.getElementById('notifList');
  list.innerHTML=state.notifications.length?state.notifications.map(function(n){return '<div class="notif-item'+(n.read?'':' unread')+'" onclick="markRead('+n.id+')"><div class="notif-dot'+(n.read?' read':'')+'"></div><div><div class="notif-text">'+n.text+'</div><div class="notif-time">'+n.time+'</div></div></div>';}).join(''):'<div class="notif-empty">No notifications yet.</div>';
  var badge=document.getElementById('notifBadgePanel');
  if(unread>0){badge.textContent=unread;badge.classList.remove('hidden');}else badge.classList.add('hidden');
}
function markRead(id){state.notifications.forEach(function(n){if(n.id===id)n.read=true;});updateNotifUI();}
function toggleNotifs(){document.getElementById('notifOverlay').classList.toggle('open');document.getElementById('notifPanel').classList.toggle('open');}
function closeNotifs(){document.getElementById('notifOverlay').classList.remove('open');document.getElementById('notifPanel').classList.remove('open');}

// ═══════════════ JOBS DATA
state.jobs = [
  {id:1,title:"Head Chef",company:"The Golden Fork",bizId:1,category:"Restaurant",type:"Full-time",location:"Portland, OR",zip:"97201",pay:"$55,000–$70,000/yr",description:"We're looking for a passionate Head Chef to lead our farm-to-table kitchen. You'll design seasonal menus, manage kitchen staff, and uphold our commitment to fresh, local ingredients.",faithNote:"We open every shift with a short prayer and maintain a respectful, faith-centered work environment.",tags:["culinary","management","seasonal menus"],applyMethod:"email",applyContact:"hiring@goldenfork.com",postedDate:new Date(Date.now()-2*86400000),savedByUsers:[],applicants:[]},
  {id:2,title:"React Developer",company:"Pixel & Co.",bizId:2,category:"Technology",type:"Full-time",location:"Austin, TX",zip:"78701",pay:"$90,000–$120,000/yr",description:"Join our growing studio as a React Developer. You'll build beautiful web applications for faith-based and mission-driven clients. Remote-friendly with occasional in-person collaboration.",faithNote:"We open team meetings with scripture and prayer. Our work is our ministry.",tags:["React","JavaScript","remote-friendly"],applyMethod:"link",applyContact:"https://pixelco.dev/careers",postedDate:new Date(Date.now()-1*86400000),savedByUsers:[],applicants:[]},
  {id:3,title:"Massage Therapist",company:"Bloom Wellness Spa",bizId:3,category:"Health & Wellness",type:"Part-time",location:"Asheville, NC",zip:"28801",pay:"$28–$35/hr",description:"Certified massage therapist needed for 20–30 hours per week. Experience in Swedish, deep tissue, and hot stone preferred. Join our team committed to holistic healing.",faithNote:"Our spa is a place of peace. We integrate faith and wellness in everything we do.",tags:["massage","certified","holistic"],applyMethod:"email",applyContact:"book@bloomwellness.com",postedDate:new Date(Date.now()-4*86400000),savedByUsers:[],applicants:[]},
  {id:4,title:"Paralegal",company:"Ironwood Legal",bizId:4,category:"Legal",type:"Full-time",location:"Chicago, IL",zip:"60601",pay:"$48,000–$58,000/yr",description:"Experienced paralegal needed to support our business and estate law practice. Strong organizational skills, attention to detail, and experience with legal research required.",faithNote:"",tags:["paralegal","legal research","estate law"],applyMethod:"email",applyContact:"careers@ironwoodlegal.com",postedDate:new Date(Date.now()-6*86400000),savedByUsers:[],applicants:[]},
  {id:5,title:"Personal Trainer",company:"Harbor Fitness",bizId:5,category:"Fitness",type:"Contract",location:"Seattle, WA",zip:"98101",pay:"$45–$65/hr",description:"Certified personal trainers wanted for one-on-one and small group sessions. Flexible scheduling. Build your client base within our established faith-community gym.",faithNote:"We close every session with an optional moment of gratitude and reflection.",tags:["personal training","certified","flexible"],applyMethod:"link",applyContact:"https://harborfitness.com/join-our-team",postedDate:new Date(Date.now()-3*86400000),savedByUsers:[],applicants:[]},
  {id:6,title:"Volunteer Hair Stylist",company:"Sage & Shears",bizId:6,category:"Beauty",type:"Volunteer",location:"Denver, CO",zip:"80202",pay:"No pay — community service",description:"Join us one Saturday per month to provide free haircuts to unhoused community members. We supply all products. A beautiful way to serve your neighbors.",faithNote:"This is ministry through service. We believe in restoring dignity.",tags:["volunteer","haircuts","community service"],applyMethod:"email",applyContact:"hello@sageshears.com",postedDate:new Date(Date.now()-5*86400000),savedByUsers:[],applicants:[]},
];
state.savedJobIds = [];

// ═══════════════ JOBS — INDIVIDUAL
function initJobFilters(){
  var sel=document.getElementById('job-cat-filter');
  if(!sel||sel.options.length>1)return;
  sel.innerHTML='<option value="">All Categories</option>';
  var cats=[...new Set(state.jobs.map(j=>j.category))].sort();
  cats.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}
function renderJobs(){
  initJobFilters();
  var q=(document.getElementById('job-search').value||'').toLowerCase();
  var loc=(document.getElementById('job-loc').value||'').toLowerCase();
  var type=document.getElementById('job-type-filter').value;
  var cat=document.getElementById('job-cat-filter').value;
  var sort=document.getElementById('job-sort').value;
  var filtered=state.jobs.filter(function(j){
    var mq=!q||(j.title.toLowerCase().includes(q)||j.company.toLowerCase().includes(q)||j.description.toLowerCase().includes(q)||j.tags.some(t=>t.toLowerCase().includes(q)));
    var ml=!loc||(j.location.toLowerCase().includes(loc)||j.zip.includes(loc));
    var mt=!type||j.type===type;
    var mc=!cat||j.category===cat;
    return mq&&ml&&mt&&mc;
  });
  if(sort==='newest')filtered.sort((a,b)=>new Date(b.postedDate)-new Date(a.postedDate));
  document.getElementById('job-result-meta').innerHTML='Showing <strong>'+filtered.length+'</strong> position'+(filtered.length!==1?'s':'')+(q?' matching "<strong>'+q+'</strong>"':'')+(loc?' near "<strong>'+loc+'</strong>"':'');
  var grid=document.getElementById('jobs-grid');
  if(!filtered.length){grid.innerHTML='<div class="empty-state"><div class="empty-icon">💼</div><div class="empty-title">No positions found</div><p>Try different keywords or a broader location.</p></div>';return;}
  grid.innerHTML='';filtered.forEach(function(j){grid.appendChild(makeJobCard(j));});
}
function makeJobCard(j){
  var ntw=(Date.now()-new Date(j.postedDate).getTime())<7*86400000;
  var typeClass={Full:'jt-full','Part':'jt-part','Contract':'jt-contract','Volunteer':'jt-volunteer'}[j.type.split('-')[0]]||'jt-full';
  var saved=state.savedJobIds.includes(j.id);
  var daysAgo=Math.floor((Date.now()-new Date(j.postedDate).getTime())/86400000);
  var posted=daysAgo===0?'Today':daysAgo===1?'Yesterday':daysAgo+' days ago';
  var div=document.createElement('div');div.className='job-card'+(ntw?' new-job':'');
  div.innerHTML=
    (ntw?'<div class="job-new-badge">🆕 New This Week</div>':'')+
    '<div class="job-card-head"><div class="job-title">'+j.title+'</div><span class="job-type-badge '+typeClass+'">'+j.type+'</span></div>'+
    '<div class="job-company">'+j.company+'</div>'+
    '<div class="job-meta-row"><span class="job-meta-item">📍 '+j.location+'</span><span class="job-meta-item">'+( j.pay?'💵 '+j.pay:'')+'</span><span class="job-meta-item">🗓 '+posted+'</span></div>'+
    '<p class="job-desc">'+j.description+'</p>'+
    (j.faithNote?'<div class="job-faith-note">✝️ '+j.faithNote+'</div>':'')+
    (j.tags.length?'<div class="job-tags">'+j.tags.map(t=>'<span class="job-tag">'+t+'</span>').join('')+'</div>':'')+
    '<div class="job-actions">'+
      '<button class="job-apply-btn" onclick="openApplyModal('+j.id+')">Apply Now →</button>'+
      '<button class="job-save-btn'+(saved?' saved':'')+'" onclick="toggleJobSave('+j.id+')">'+(saved?'♥':'♡')+'</button>'+
      '<span style="position:relative;display:inline-flex;align-items:center;">'+
        '<button class="job-report-btn" onclick="toggleJobReport(this)" title="Report this posting">?</button>'+
        '<span class="job-report-bubble">If any inappropriate information or activity is found in or through this job posting, please report for immediate administrative review. <br/><br/><button onclick="submitJobReport('+j.id+')" style="margin-top:6px;padding:5px 12px;background:var(--red);color:#fff;border:none;border-radius:6px;font-family:DM Sans,sans-serif;font-size:.72rem;font-weight:600;cursor:pointer;width:100%;">Report This Post</button></span>'+
      '</span>'+
    '</div>';
  return div;
}
function toggleJobSave(id){
  var i=state.savedJobIds.indexOf(id);if(i>-1)state.savedJobIds.splice(i,1);else state.savedJobIds.push(id);
  renderJobs();
}
function toggleJobReport(btn){
  var isActive=btn.classList.contains('active');
  document.querySelectorAll('.job-report-btn.active').forEach(b=>b.classList.remove('active'));
  if(!isActive)btn.classList.add('active');
}
function submitJobReport(jobId){
  document.querySelectorAll('.job-report-btn.active').forEach(b=>b.classList.remove('active'));
  addNotif('⚠️ Job posting #'+jobId+' has been reported and flagged for administrative review. Thank you.');
}
function openApplyModal(jobId){
  var j=state.jobs.find(x=>x.id===jobId);if(!j)return;
  document.getElementById('applyModalContent').innerHTML=
    '<div class="modal-icon">💼</div>'+
    '<div class="modal-title">Apply — '+j.title+'</div>'+
    '<div class="modal-for" style="margin-bottom:1.25rem;">at <strong>'+j.company+'</strong></div>'+
    '<div class="form-group"><label class="lbl">Full Name <span class="req">*</span></label><input class="inp" id="app-name" placeholder="Your full name"/></div>'+
    '<div class="form-group"><label class="lbl">Email <span class="req">*</span></label><input class="inp" type="email" id="app-email" placeholder="your@email.com"/></div>'+
    '<div class="form-group"><label class="lbl">Phone</label><input class="inp" id="app-phone" placeholder="(555) 000-0000"/></div>'+
    '<div class="form-group"><label class="lbl">Why are you a great fit? <span class="req">*</span></label><textarea class="inp" id="app-cover" style="min-height:90px;" placeholder="Tell them why you\'re the right person for this role…"></textarea></div>'+
    '<div class="form-group"><label class="lbl">Faith Background (optional)</label><input class="inp" id="app-faith" placeholder="e.g. Active member of Grace Church"/></div>'+
    '<button class="btn btn-green btn-mt" onclick="submitApplication('+jobId+')">Submit Application →</button>';
  document.getElementById('applyModal').classList.add('open');
}
function submitApplication(jobId){
  var name=document.getElementById('app-name').value.trim(),email=document.getElementById('app-email').value.trim(),cover=document.getElementById('app-cover').value.trim();
  if(!name||!email||!cover){alert('Please fill in all required fields.');return;}
  var j=state.jobs.find(x=>x.id===jobId);
  if(j)j.applicants.push({name:name,email:email,phone:document.getElementById('app-phone').value,cover:cover,faith:document.getElementById('app-faith').value,time:'Just now'});
  addNotif('✅ Your application for "'+( j?j.title:'the position')+'" at '+(j?j.company:'')+' was submitted!');
  document.getElementById('applyModalContent').innerHTML='<div style="text-align:center;padding:.75rem 0;"><div style="font-size:2.5rem;margin-bottom:.75rem;">🎉</div><div style="font-family:\'Playfair Display\',serif;font-size:1.3rem;margin-bottom:.5rem;">Application Sent!</div><p style="font-size:.84rem;color:var(--muted);line-height:1.6;">Your application has been submitted to <strong>'+(j?j.company:'the employer')+'</strong>. They\'ll be in touch. God bless your journey!</p></div>';
  setTimeout(function(){closeModal('applyModal');},3000);
}

// ═══════════════ JOBS — BUSINESS DASHBOARD
function renderDashJobs(){
  var myJobs=state.jobs.filter(j=>j.bizId===(state.myBiz?state.myBiz.id:null));
  var badge=document.getElementById('dash-jobs-cnt');
  if(myJobs.length>0){badge.textContent=myJobs.length;badge.classList.remove('hidden');}else badge.classList.add('hidden');
  document.getElementById('dash-panel-jobs').innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">'+
    '<div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">Active Listings ('+myJobs.length+')</div>'+
    '<button onclick="openPostJobModal()" style="padding:8px 16px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.78rem;font-weight:600;cursor:pointer;">+ Post a Job</button>'+
    '</div>'+
    (myJobs.length?myJobs.map(function(j){
      var typeClass={Full:'jt-full','Part':'jt-part','Contract':'jt-contract','Volunteer':'jt-volunteer'}[j.type.split('-')[0]]||'jt-full';
      return '<div class="dash-job-item">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'+
          '<div class="dash-job-title">'+j.title+'</div>'+
          '<span class="job-type-badge '+typeClass+'" style="flex-shrink:0;margin-left:8px;">'+j.type+'</span>'+
        '</div>'+
        '<div class="dash-job-meta">📍 '+j.location+' · '+(j.pay||'Pay TBD')+'</div>'+
        '<div style="font-size:.73rem;color:var(--muted);margin-bottom:.5rem;">'+j.applicants.length+' applicant'+(j.applicants.length!==1?'s':'')+' · Posted '+(Math.floor((Date.now()-new Date(j.postedDate).getTime())/86400000)||0)+' days ago</div>'+
        (j.applicants.length?'<div style="margin-bottom:.5rem;">'+j.applicants.slice(0,3).map(a=>'<div class="dash-job-applicant"><div class="dash-job-applicant-name">'+a.name+'</div><div class="dash-job-applicant-meta">'+a.email+(a.faith?' · '+a.faith:'')+'</div></div>').join('')+'</div>':'')+
        '<div class="dash-job-actions">'+
          '<button class="dash-job-close-btn" onclick="closeJob('+j.id+')">Close Listing</button>'+
        '</div>'+
      '</div>';
    }).join(''):
    '<div class="empty-state" style="padding:2rem;"><div class="empty-icon">💼</div><div class="empty-title">No active job listings</div><p>Post your first position to start receiving applications.</p></div>');
}
function closeJob(id){
  state.jobs=state.jobs.filter(j=>j.id!==id);
  renderDashJobs();addNotif('Your job listing has been closed.');
}
function openPostJobModal(){
  document.getElementById('jobModalContent').innerHTML=
    '<div class="modal-icon">💼</div>'+
    '<div class="modal-title">Post a Job</div>'+
    '<div style="font-size:.73rem;color:var(--muted);margin-bottom:1.25rem;">Goes live immediately — no review required for verified businesses.</div>'+
    '<div class="form-group"><label class="lbl">Job Title <span class="req">*</span></label><input class="inp" id="pj-title" placeholder="e.g. Senior Chef"/></div>'+
    '<div class="form-group"><label class="lbl">Job Type <span class="req">*</span></label><select class="inp" id="pj-type"><option value="">Select…</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Volunteer</option></select></div>'+
    '<div class="form-group"><label class="lbl">Category</label><select class="inp" id="pj-cat">'+['Restaurant','Retail','Health & Wellness','Technology','Legal','Finance','Education','Home Services','Beauty','Fitness','Other'].map(c=>'<option>'+c+'</option>').join('')+'</select></div>'+
    '<div class="form-group"><label class="lbl">Location <span class="req">*</span></label><input class="inp" id="pj-loc" placeholder="City, State"/></div>'+
    '<div class="form-group"><label class="lbl">ZIP Code</label><input class="inp" id="pj-zip" placeholder="e.g. 90210" maxlength="10"/></div>'+
    '<div class="form-group"><label class="lbl">Pay Range</label><input class="inp" id="pj-pay" placeholder="e.g. $18–$22/hr (optional)"/></div>'+
    '<div class="form-group"><label class="lbl">Job Description <span class="req">*</span></label><textarea class="inp" id="pj-desc" style="min-height:90px;" placeholder="Describe the role, responsibilities, and requirements…"></textarea></div>'+
    '<div class="form-group"><label class="lbl">Faith Note <span style="color:var(--muted);font-weight:400;">(optional)</span></label><input class="inp" id="pj-faith" placeholder="e.g. We open every shift with prayer…"/></div>'+
    '<div class="form-group"><label class="lbl">How to Apply <span class="req">*</span></label><select class="inp" id="pj-apply-method" onchange="toggleApplyInput()"><option value="email">Email</option><option value="link">External Link</option><option value="inapp">In-App Message</option></select></div>'+
    '<div class="form-group" id="pj-apply-contact-wrap"><label class="lbl" id="pj-apply-label">Apply Email</label><input class="inp" id="pj-apply-contact" placeholder="hiring@yourbiz.com"/></div>'+
    '<button class="btn btn-green btn-mt" onclick="submitPostJob()">Post Job →</button>';
  document.getElementById('jobModal').classList.add('open');
}
function toggleApplyInput(){
  var m=document.getElementById('pj-apply-method').value;
  var lbl=document.getElementById('pj-apply-label');var inp=document.getElementById('pj-apply-contact');
  if(m==='email'){lbl.textContent='Apply Email';inp.placeholder='hiring@yourbiz.com';}
  else if(m==='link'){lbl.textContent='Application URL';inp.placeholder='https://yoursite.com/apply';}
  else{document.getElementById('pj-apply-contact-wrap').style.display='none';return;}
  document.getElementById('pj-apply-contact-wrap').style.display='';
}
function submitPostJob(){
  var title=document.getElementById('pj-title').value.trim(),type=document.getElementById('pj-type').value,loc=document.getElementById('pj-loc').value.trim(),desc=document.getElementById('pj-desc').value.trim();
  if(!title||!type||!loc||!desc){alert('Please fill in all required fields.');return;}
  var biz=state.myBiz||state.businesses[0];
  var newJob={id:Date.now(),title:title,company:biz?biz.name:'My Business',bizId:biz?biz.id:0,category:document.getElementById('pj-cat').value,type:type,location:loc,zip:document.getElementById('pj-zip').value,pay:document.getElementById('pj-pay').value,description:desc,faithNote:document.getElementById('pj-faith').value,applyMethod:document.getElementById('pj-apply-method').value,applyContact:document.getElementById('pj-apply-contact')?document.getElementById('pj-apply-contact').value:'',tags:[],postedDate:new Date(),savedByUsers:[],applicants:[]};
  state.jobs.unshift(newJob);
  closeModal('jobModal');renderDashJobs();
  addNotif('💼 Your job "'+title+'" is now live on the Job Board!');
}

// ═══════════════ ADMIN DATA
state.admin = {
  reportedContent:[
    {id:1,type:'Job Posting',title:'Suspicious Marketing Job',content:'This posting asks applicants to send money for training materials upfront.',reportedBy:'Member #42',time:'2 hours ago',resolved:false},
    {id:2,type:'Prayer Request',title:'Prayer Request by Anonymous',content:'Content appeared to be spam — repeated identical posts.',reportedBy:'Member #17',time:'Yesterday',resolved:false},
    {id:3,type:'Testimonial',title:'Review on Ironwood Legal',content:'This review contains a competitor\'s advertisement embedded in the text.',reportedBy:'Member #88',time:'3 days ago',resolved:false},
  ],
  members:[
    {id:1,name:'Sarah Mitchell',email:'sarah@example.com',type:'Individual',plan:'Annual',church:'Grace Community Church',joined:'Jan 2024',status:'active',faithAnswer:'yes',referrals:12},
    {id:2,name:'Marcus Johnson',email:'marcus@example.com',type:'Individual',plan:'Monthly',church:'Harvest Fellowship',joined:'Feb 2024',status:'active',faithAnswer:'yes',referrals:8},
    {id:3,name:'The Golden Fork',email:'hello@goldenfork.com',type:'Business',plan:'Annual',church:'Grace Community Church',joined:'Jan 2024',status:'active',faithAnswer:'yes',referrals:0},
    {id:4,name:'Pixel & Co.',email:'studio@pixelco.dev',type:'Business',plan:'Monthly',church:'Harvest Fellowship',joined:'Feb 2024',status:'active',faithAnswer:'yes',referrals:0},
    {id:5,name:'Linda Patterson',email:'linda@example.com',type:'Individual',plan:'Monthly',church:'Cornerstone Church',joined:'Mar 2024',status:'suspended',faithAnswer:'yes',referrals:2},
    {id:6,name:'Bloom Wellness Spa',email:'book@bloomwellness.com',type:'Business',plan:'Annual',church:'Mountain Hope Church',joined:'Jan 2024',status:'active',faithAnswer:'yes',referrals:0},
    {id:7,name:'Kevin Wright',email:'kevin@example.com',type:'Individual',plan:'Annual',church:'',joined:'Apr 2024',status:'active',faithAnswer:'yes',referrals:3},
    {id:8,name:'Sunrise Bakery',email:'hello@sunrisebakery.com',type:'Business',plan:'Monthly',church:'New Life Church',joined:'Apr 2024',status:'pending',faithAnswer:'yes',referrals:0},
  ],
  appeals:[
    {id:1,name:'Linda Patterson',email:'linda@example.com',reason:'I was suspended unfairly. I believe my account was flagged in error. I have been a faithful member since the beginning.',submitted:'1 day ago',status:'pending'},
  ],
  auditLog:[
    {icon:'✅',text:'Business listing "The Golden Fork" approved by Admin.',time:'Jan 15, 2024'},
    {icon:'✅',text:'Business listing "Bloom Wellness Spa" approved by Admin.',time:'Jan 15, 2024'},
    {icon:'🚫',text:'Member "Kevin Test" suspended for inappropriate content.',time:'Feb 3, 2024'},
    {icon:'✅',text:'Business listing "Pixel & Co." approved by Admin.',time:'Feb 10, 2024'},
    {icon:'📬',text:'Weekly newsletter sent to 247 subscribers.',time:'Mar 4, 2024'},
    {icon:'🗑️',text:'Job posting removed — flagged as suspicious.',time:'Mar 12, 2024'},
    {icon:'✅',text:'Appeal from "James T." reviewed and account reinstated.',time:'Mar 18, 2024'},
    {icon:'📬',text:'Weekly newsletter sent to 312 subscribers.',time:'Apr 1, 2024'},
  ],
  nlSubscribers:312,
  nlSentCount:8,
  revenue:{labels:['Nov','Dec','Jan','Feb','Mar','Apr'],values:[1240,1580,2100,2480,2950,3420]},
  signups:{labels:['Nov','Dec','Jan','Feb','Mar','Apr'],values:[18,24,38,29,45,52]},
};

// ═══════════════ ADMIN AUTH
function doAdminLogin(){
  var email=document.getElementById('adm-email').value.trim(),pass=document.getElementById('adm-pass').value;
  var errEl=document.getElementById('adm-err');errEl.style.display='none';
  if(email==='admin@cou.com'&&pass==='admin123'){
    closeModal('adminSignInModal');
    enterAdmin();
  } else {errEl.style.display='block';}
}
function doAdminSignOut(){document.body.classList.remove('admin-mode');showScreen('screen-landing');}
function enterAdmin(){
  document.body.classList.add('admin-mode');
  showScreen('screen-admin');
  switchAdminTab('overview');
  updateAdminBadges();
}
function updateAdminBadges(){
  var pending=state.pendingBusinesses.filter(b=>!b.approved).length;
  var reports=state.admin.reportedContent.filter(r=>!r.resolved).length;
  var appeals=state.admin.appeals.filter(a=>a.status==='pending').length;
  var aC=document.getElementById('adm-cnt-approvals'),rC=document.getElementById('adm-cnt-reports'),apC=document.getElementById('adm-cnt-appeals');
  if(pending>0){aC.textContent=pending;aC.classList.remove('hidden');}else aC.classList.add('hidden');
  if(reports>0){rC.textContent=reports;rC.classList.remove('hidden');}else rC.classList.add('hidden');
  if(appeals>0){apC.textContent=appeals;apC.classList.remove('hidden');}else apC.classList.add('hidden');
}
function switchAdminTab(tab){
  ['overview','approvals','reports','members','jobs','newsletter','appeals','audit'].forEach(function(t){
    document.getElementById('adm-tab-'+t).classList[t===tab?'remove':'add']('hidden');
    document.getElementById('adm-btn-'+t).classList[t===tab?'add':'remove']('on');
  });
  var renders={overview:renderAdminOverview,approvals:renderAdminApprovals,reports:renderAdminReports,members:renderAdminMembers,jobs:renderAdminJobs,newsletter:renderAdminNewsletter,appeals:renderAdminAppeals,audit:renderAdminAudit};
  if(renders[tab])renders[tab]();
}
function addAuditLog(icon,text){state.admin.auditLog.unshift({icon:icon,text:text,time:'Just now'});}

// ═══════════════ ADMIN OVERVIEW
function renderAdminOverview(){
  var el=document.getElementById('adm-tab-overview');
  var totalMembers=state.admin.members.length;
  var indCount=state.admin.members.filter(m=>m.type==='Individual').length;
  var bizCount=state.admin.members.filter(m=>m.type==='Business').length;
  var activeCount=state.admin.members.filter(m=>m.status==='active').length;
  var pendingCount=state.pendingBusinesses.filter(b=>!b.approved).length;
  var reportCount=state.admin.reportedContent.filter(r=>!r.resolved).length;
  var jobCount=state.jobs.length;
  var rev=state.admin.revenue;
  el.innerHTML=
    '<div class="admin-page-title">Dashboard Overview</div>'+
    '<div class="admin-page-sub">Welcome back, Admin · Christ One\'s United</div>'+
    '<div class="admin-stats">'+
      mkStat(totalMembers,'Total Members','blue')+
      mkStat(indCount,'Individuals','green')+
      mkStat(bizCount,'Businesses','gold')+
      mkStat(activeCount,'Active','green')+
      mkStat(pendingCount,'Pending Approval','gold')+
      mkStat(reportCount,'Open Reports','red')+
      mkStat(jobCount,'Active Jobs','blue')+
      mkStat('$'+rev.values[rev.values.length-1],'Revenue (Mo)','green')+
    '</div>'+
    '<div class="admin-chart">'+
      '<div class="admin-chart-title">📈 Monthly Revenue</div>'+
      mkBarChart(rev.labels,rev.values,'#1a6b4a')+
    '</div>'+
    '<div class="admin-chart">'+
      '<div class="admin-chart-title">👥 New Signups</div>'+
      mkBarChart(state.admin.signups.labels,state.admin.signups.values,'#2d9cdb')+
    '</div>'+
    '<div class="admin-card">'+
      '<div style="font-family:\'Playfair Display\',serif;font-size:.95rem;margin-bottom:.875rem;">🕐 Recent Activity</div>'+
      state.admin.auditLog.slice(0,5).map(function(a){return '<div class="audit-item"><div class="audit-icon">'+a.icon+'</div><div class="audit-text">'+a.text+'</div><div class="audit-time">'+a.time+'</div></div>';}).join('')+
    '</div>';
}
function mkStat(val,lbl,color){return '<div class="admin-stat"><div class="admin-stat-val '+color+'">'+val+'</div><div class="admin-stat-lbl">'+lbl+'</div></div>';}
function mkBarChart(labels,values,color){
  var max=Math.max(...values)||1;
  return '<div class="chart-bars">'+labels.map(function(l,i){
    var pct=Math.round((values[i]/max)*76);
    return '<div class="chart-bar-wrap"><div class="chart-bar-val">'+values[i]+'</div><div class="chart-bar" style="height:'+pct+'px;background:'+color+';min-height:4px;"></div><div class="chart-bar-lbl">'+l+'</div></div>';
  }).join('')+'</div>';
}

// ═══════════════ ADMIN APPROVALS
function renderAdminApprovals(){
  var el=document.getElementById('adm-tab-approvals');
  var pending=state.pendingBusinesses.filter(b=>!b.approved);
  el.innerHTML=
    '<div class="admin-page-title">Business Approvals</div>'+
    '<div class="admin-page-sub">'+pending.length+' listing'+(pending.length!==1?'s':'')+' awaiting review</div>'+
    (pending.length?pending.map(function(b){
      return '<div class="admin-card pending">'+
        '<div class="admin-card-head"><div class="admin-card-title">'+b.name+'</div><span class="admin-card-badge ab-gold">⏳ Pending</span></div>'+
        '<div class="admin-card-meta">📂 '+b.category+' · 📍 '+(b.address||'N/A')+' · ✝️ '+b.church+', '+(b.churchAddress||'')+'<br/>📞 '+(b.phone||'N/A')+' · ✉️ '+(b.email||'N/A')+(b.website?' · 🌐 '+b.website:'')+'</div>'+
        '<div class="admin-card-content">'+b.description+'</div>'+
        '<div class="admin-actions">'+
          '<button class="adm-approve" onclick="adminApproveBiz('+b.id+')">✓ Approve</button>'+
          '<button class="adm-reject" onclick="adminRejectBiz('+b.id+')">✗ Reject</button>'+
        '</div>'+
      '</div>';
    }).join(''):
    '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">All caught up!</div><p>No listings pending review.</p></div>');
}
function adminApproveBiz(id){
  var b=state.pendingBusinesses.find(x=>x.id===id);
  if(b){b.approved=true;b.verified=true;if(!state.businesses.find(x=>x.id===id))state.businesses.unshift(b);}
  state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
  if(state.myBiz&&state.myBiz.id===id){state.myBiz.approved=true;state.myBiz.verified=true;}
  addAuditLog('✅','Business listing "'+( b?b.name:'Listing')+'" approved.');
  addNotif('🎉 Your listing "'+( b?b.name:'')+'" has been approved and is now live!');
  updateAdminBadges();renderAdminApprovals();
}
function adminRejectBiz(id){
  var b=state.pendingBusinesses.find(x=>x.id===id);
  state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
  addAuditLog('🚫','Business listing "'+( b?b.name:'Listing')+'" rejected.');
  updateAdminBadges();renderAdminApprovals();
}

// ═══════════════ ADMIN REPORTS
function renderAdminReports(){
  var el=document.getElementById('adm-tab-reports');
  var open=state.admin.reportedContent.filter(r=>!r.resolved);
  var resolved=state.admin.reportedContent.filter(r=>r.resolved);
  el.innerHTML=
    '<div class="admin-page-title">Reported Content</div>'+
    '<div class="admin-page-sub">'+open.length+' open · '+resolved.length+' resolved</div>'+
    (open.length?open.map(function(r){
      return '<div class="admin-card flagged">'+
        '<div class="admin-card-head"><div class="admin-card-title">'+r.title+'</div><span class="admin-card-badge ab-red">🚨 '+r.type+'</span></div>'+
        '<div class="admin-card-meta">Reported by '+r.reportedBy+' · '+r.time+'</div>'+
        '<div class="admin-card-content">'+r.content+'</div>'+
        '<div class="admin-actions">'+
          '<button class="adm-remove" onclick="adminRemoveContent('+r.id+')">🗑 Remove Content</button>'+
          '<button class="adm-warn" onclick="adminWarnUser('+r.id+')">⚠️ Warn User</button>'+
          '<button class="adm-suspend" onclick="adminSuspendFromReport('+r.id+')">🚫 Suspend User</button>'+
          '<button class="adm-approve" onclick="adminDismissReport('+r.id+')" style="background:var(--muted);">Dismiss</button>'+
        '</div>'+
      '</div>';
    }).join(''):'<div class="empty-state"><div class="empty-icon">🚨</div><div class="empty-title">No open reports</div><p>All reported content has been reviewed.</p></div>')+
    (resolved.length?'<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;margin:1rem 0 .5rem;">Resolved</div>'+
      resolved.map(function(r){return '<div class="admin-card" style="opacity:.6;"><div class="admin-card-head"><div class="admin-card-title">'+r.title+'</div><span class="admin-card-badge ab-green">✓ Resolved</span></div><div class="admin-card-meta">'+r.type+' · '+r.time+'</div></div>';}).join(''):'');
}
function adminRemoveContent(id){
  var r=state.admin.reportedContent.find(x=>x.id===id);if(r)r.resolved=true;
  addAuditLog('🗑️','Reported content "'+( r?r.title:'')+'" removed.');
  updateAdminBadges();renderAdminReports();
}
function adminWarnUser(id){
  var r=state.admin.reportedContent.find(x=>x.id===id);if(r)r.resolved=true;
  addAuditLog('⚠️','Warning issued for content: "'+( r?r.title:'')+'".');
  updateAdminBadges();renderAdminReports();
}
function adminSuspendFromReport(id){
  var r=state.admin.reportedContent.find(x=>x.id===id);if(r)r.resolved=true;
  addAuditLog('🚫','User suspended following report: "'+( r?r.title:'')+'".');
  updateAdminBadges();renderAdminReports();
}
function adminDismissReport(id){
  var r=state.admin.reportedContent.find(x=>x.id===id);if(r)r.resolved=true;
  addAuditLog('✓','Report dismissed: "'+( r?r.title:'')+'".');
  updateAdminBadges();renderAdminReports();
}

// ═══════════════ ADMIN MEMBERS
function renderAdminMembers(){
  var el=document.getElementById('adm-tab-members');
  el.innerHTML=
    '<div class="admin-page-title">Member Management</div>'+
    '<div class="admin-page-sub">'+state.admin.members.length+' total members</div>'+
    '<input class="member-search" id="adm-member-search" placeholder="Search by name, email, or church…" oninput="filterAdminMembers()"/>'+
    '<div id="adm-member-table-wrap">'+buildMemberTable(state.admin.members)+'</div>';
}
function filterAdminMembers(){
  var q=document.getElementById('adm-member-search').value.toLowerCase();
  var filtered=state.admin.members.filter(function(m){return !q||m.name.toLowerCase().includes(q)||m.email.toLowerCase().includes(q)||(m.church&&m.church.toLowerCase().includes(q));});
  document.getElementById('adm-member-table-wrap').innerHTML=buildMemberTable(filtered);
}
function buildMemberTable(members){
  if(!members.length)return '<div class="empty-state" style="padding:2rem;"><div class="empty-icon">👥</div><p>No members match your search.</p></div>';
  return '<div style="overflow-x:auto;"><table class="member-table"><thead><tr><th>Name</th><th>Type</th><th>Church</th><th>Plan</th><th>Joined</th><th>Status</th><th>Faith</th><th>Actions</th></tr></thead><tbody>'+
    members.map(function(m){
      var statusClass={active:'ms-active',suspended:'ms-suspended',pending:'ms-pending'}[m.status]||'ms-pending';
      return '<tr><td><strong>'+m.name+'</strong><br/><span style="font-size:.68rem;color:var(--muted);">'+m.email+'</span></td><td>'+m.type+'</td><td style="font-size:.73rem;">'+( m.church||'—')+'</td><td>'+m.plan+'</td><td>'+m.joined+'</td>'+
        '<td><span class="member-status '+statusClass+'">'+m.status+'</span></td>'+
        '<td style="text-align:center;">'+(m.faithAnswer==='yes'?'✅':'❌')+'</td>'+
        '<td><div style="display:flex;gap:4px;flex-wrap:wrap;">'+(m.status==='suspended'?
          '<button class="adm-restore" style="padding:4px 8px;font-size:.68rem;" onclick="adminRestoreMember('+m.id+')">Restore</button>':
          '<button class="adm-suspend" style="padding:4px 8px;font-size:.68rem;" onclick="adminSuspendMember('+m.id+')">Suspend</button>')+
        '</div></td></tr>';
    }).join('')+'</tbody></table></div>';
}
function adminSuspendMember(id){
  var m=state.admin.members.find(x=>x.id===id);if(m)m.status='suspended';
  addAuditLog('🚫','Member "'+( m?m.name:id)+'" suspended by Admin.');
  renderAdminMembers();
}
function adminRestoreMember(id){
  var m=state.admin.members.find(x=>x.id===id);if(m)m.status='active';
  addAuditLog('✅','Member "'+( m?m.name:id)+'" restored by Admin.');
  renderAdminMembers();
}

// ═══════════════ ADMIN JOBS
function renderAdminJobs(){
  var el=document.getElementById('adm-tab-jobs');
  el.innerHTML=
    '<div class="admin-page-title">Job Board Moderation</div>'+
    '<div class="admin-page-sub">'+state.jobs.length+' active listings · '+state.admin.reportedContent.filter(r=>r.type==='Job Posting'&&!r.resolved).length+' flagged</div>'+
    (state.jobs.length?state.jobs.map(function(j){
      var flagged=state.admin.reportedContent.some(r=>r.type==='Job Posting'&&r.title.includes(j.title)&&!r.resolved);
      var typeClass={Full:'jt-full','Part':'jt-part','Contract':'jt-contract','Volunteer':'jt-volunteer'}[j.type.split('-')[0]]||'jt-full';
      return '<div class="admin-card'+(flagged?' flagged':'')+'">'+
        '<div class="admin-card-head">'+
          '<div class="admin-card-title">'+j.title+'</div>'+
          '<div style="display:flex;gap:5px;align-items:center;">'+
            (flagged?'<span class="admin-card-badge ab-red">🚨 Flagged</span>':'')+
            '<span class="job-type-badge '+typeClass+'">'+j.type+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="admin-card-meta">🏢 '+j.company+' · 📍 '+j.location+' · '+j.applicants.length+' applicants</div>'+
        '<div class="admin-card-content" style="font-size:.78rem;">'+j.description.substring(0,120)+(j.description.length>120?'…':'')+'</div>'+
        '<div class="admin-actions">'+
          '<button class="adm-remove" onclick="adminRemoveJob('+j.id+')">🗑 Remove Listing</button>'+
          (flagged?'<button class="adm-approve" onclick="adminClearJobFlag('+j.id+')" style="background:var(--muted);">Clear Flag</button>':'')+
        '</div>'+
      '</div>';
    }).join(''):
    '<div class="empty-state"><div class="empty-icon">💼</div><div class="empty-title">No active job listings</div></div>');
}
function adminRemoveJob(id){
  var j=state.jobs.find(x=>x.id===id);
  state.jobs=state.jobs.filter(x=>x.id!==id);
  addAuditLog('🗑️','Job listing "'+( j?j.title:id)+'" removed by Admin.');
  renderAdminJobs();
}
function adminClearJobFlag(id){
  state.admin.reportedContent.forEach(function(r){if(r.type==='Job Posting')r.resolved=true;});
  addAuditLog('✓','Job listing flag cleared by Admin.');
  updateAdminBadges();renderAdminJobs();
}

// ═══════════════ ADMIN NEWSLETTER
function renderAdminNewsletter(){
  var el=document.getElementById('adm-tab-newsletter');
  el.innerHTML=
    '<div class="admin-page-title">Newsletter Management</div>'+
    '<div class="admin-page-sub">Weekly community digest · The Christ One\'s United Weekly</div>'+
    '<div class="admin-stats" style="margin-bottom:1.25rem;">'+
      mkStat(state.admin.nlSubscribers,'Subscribers','blue')+
      mkStat(state.admin.nlSentCount,'Editions Sent','green')+
      mkStat('68%','Avg Open Rate','gold')+
      mkStat('12%','Avg Click Rate','green')+
    '</div>'+
    '<div class="nl-compose">'+
      '<div class="nl-compose-title">✍️ Compose This Week\'s Edition</div>'+
      '<div class="form-group"><label class="lbl">Subject Line</label><input class="inp" id="nl-subject" placeholder="e.g. This Week in Christ One\'s United — Apr 29" style="background:#fff;"/></div>'+
      '<div class="form-group"><label class="lbl">Headline</label><input class="inp" id="nl-headline" placeholder="e.g. 3 New Businesses, 2 Events & This Week\'s Prayer Highlight" style="background:#fff;"/></div>'+
      '<div class="form-group"><label class="lbl">Featured Business</label><select class="inp" id="nl-biz" style="background:#fff;">'+
        '<option value="">Select a business to feature…</option>'+
        state.businesses.filter(b=>b.approved).map(b=>'<option value="'+b.id+'">'+b.name+'</option>').join('')+
      '</select></div>'+
      '<div class="form-group"><label class="lbl">Prayer Highlight</label><textarea class="inp" id="nl-prayer" style="min-height:60px;background:#fff;" placeholder="Share a community prayer highlight or spotlight…"></textarea></div>'+
      '<div class="form-group"><label class="lbl">Admin Message (optional)</label><textarea class="inp" id="nl-msg" style="min-height:60px;background:#fff;" placeholder="A personal note from the Christ One\'s United team…"></textarea></div>'+
      '<button class="btn btn-mt" style="background:#1a1a2e;color:#fff;" onclick="sendNewsletter()">📬 Send to '+state.admin.nlSubscribers+' Subscribers</button>'+
    '</div>'+
    '<div class="admin-card">'+
      '<div class="admin-chart-title">📊 Subscriber Growth</div>'+
      '<div class="nl-stats"><span class="nl-stat">Last 7 days: <strong>+18 subscribers</strong></span><span class="nl-stat">Last 30 days: <strong>+62 subscribers</strong></span><span class="nl-stat">Unsubscribes this week: <strong>3</strong></span></div>'+
      mkBarChart(['Nov','Dec','Jan','Feb','Mar','Apr'],[180,210,247,278,295,312],'#c9973a')+
    '</div>';
}
function sendNewsletter(){
  var subj=document.getElementById('nl-subject').value.trim();
  if(!subj){alert('Please enter a subject line.');return;}
  state.admin.nlSentCount++;
  addAuditLog('📬','Weekly newsletter "'+subj+'" sent to '+state.admin.nlSubscribers+' subscribers.');
  alert('Newsletter sent to '+state.admin.nlSubscribers+' subscribers! 🎉');
  renderAdminNewsletter();
}

// ═══════════════ ADMIN APPEALS
function renderAdminAppeals(){
  var el=document.getElementById('adm-tab-appeals');
  var open=state.admin.appeals.filter(a=>a.status==='pending');
  var resolved=state.admin.appeals.filter(a=>a.status!=='pending');
  el.innerHTML=
    '<div class="admin-page-title">Suspension Appeals</div>'+
    '<div class="admin-page-sub">'+open.length+' pending · '+resolved.length+' resolved</div>'+
    (open.length?open.map(function(a){
      return '<div class="appeal-item" style="border-left:3px solid var(--gold);">'+
        '<div class="admin-card-head"><div class="appeal-name">'+a.name+'</div><span class="admin-card-badge ab-gold">⚖️ Pending</span></div>'+
        '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.4rem;">'+a.email+' · Submitted '+a.submitted+'</div>'+
        '<div class="appeal-reason">'+a.reason+'</div>'+
        '<div class="admin-actions">'+
          '<button class="adm-restore" onclick="adminGrantAppeal('+a.id+')">✓ Reinstate Account</button>'+
          '<button class="adm-reject" onclick="adminDenyAppeal('+a.id+')">✗ Deny Appeal</button>'+
        '</div>'+
      '</div>';
    }).join(''):'<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-title">No pending appeals</div></div>')+
    (resolved.length?'<div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;margin:1rem 0 .5rem;">Resolved</div>'+
      resolved.map(function(a){return '<div class="appeal-item" style="opacity:.6;"><div class="appeal-name">'+a.name+'</div><div style="font-size:.72rem;color:var(--muted);">'+a.status.toUpperCase()+' · '+a.submitted+'</div></div>';}).join(''):'');
}
function adminGrantAppeal(id){
  var a=state.admin.appeals.find(x=>x.id===id);if(a){a.status='granted';}
  var m=state.admin.members.find(x=>x.email===(a?a.email:''));if(m)m.status='active';
  addAuditLog('✅','Appeal from "'+( a?a.name:id)+'" granted. Account reinstated.');
  updateAdminBadges();renderAdminAppeals();
}
function adminDenyAppeal(id){
  var a=state.admin.appeals.find(x=>x.id===id);if(a)a.status='denied';
  addAuditLog('🚫','Appeal from "'+( a?a.name:id)+'" denied.');
  updateAdminBadges();renderAdminAppeals();
}

// ═══════════════ ADMIN AUDIT LOG
function renderAdminAudit(){
  var el=document.getElementById('adm-tab-audit');
  el.innerHTML=
    '<div class="admin-page-title">Audit Log</div>'+
    '<div class="admin-page-sub">Full record of all administrative actions</div>'+
    '<div class="admin-card">'+
      state.admin.auditLog.map(function(a){return '<div class="audit-item"><div class="audit-icon">'+a.icon+'</div><div class="audit-text">'+a.text+'</div><div class="audit-time">'+a.time+'</div></div>';}).join('')+
    '</div>';
}

// ═══════════════ GUILD STATE
state.guild = null; // null = not in a guild yet
state.allGuilds = [
  {id:1,name:"Grace Builders",description:"A guild for Christian entrepreneurs and business owners in the Grace Community Church family.",leader:"Marcus J.",members:[{name:"Marcus J.",role:"leader",joined:"Jan 2024"},{name:"Sarah M.",role:"member",joined:"Feb 2024"},{name:"Linda P.",role:"member",joined:"Mar 2024"}],codes:[],church:"Grace Community Church",created:"Jan 2024"},
  {id:2,name:"Harvest Network",description:"Connecting faith-based professionals across Harvest Fellowship to grow together in business and ministry.",leader:"Thomas R.",members:[{name:"Thomas R.",role:"leader",joined:"Feb 2024"},{name:"Kevin W.",role:"member",joined:"Mar 2024"}],codes:[],church:"Harvest Fellowship",created:"Feb 2024"},
];

// ═══════════════ GUILD FUNCTIONS
function genCode(){
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code='';for(var i=0;i<8;i++){if(i===4)code+='-';code+=chars[Math.floor(Math.random()*chars.length)];}
  return code;
}
function renderGuild(){
  var el=document.getElementById('guild-content');if(!el)return;
  if(state.guild){
    renderMyGuild(el);
  } else {
    renderNoGuild(el);
  }
}
function renderNoGuild(el){
  el.innerHTML=
    '<div class="no-guild-wrap">'+
      '<div class="no-guild-icon">⚔️</div>'+
      '<div class="no-guild-title">You\'re not in a Guild yet</div>'+
      '<p class="no-guild-sub">Guilds are invite-only faith communities within Christ One\'s United. Join one with an invite code or create your own.</p>'+
    '</div>'+
    '<div class="guild-join-card">'+
      '<div class="guild-join-title">🔑 Join a Guild</div>'+
      '<div style="font-size:.78rem;color:var(--muted);margin-bottom:.875rem;">Enter an invite code shared by a Guild leader.</div>'+
      '<div class="guild-join-row">'+
        '<input class="guild-join-inp" id="guild-code-input" placeholder="XXXX-XXXX" maxlength="9" oninput="formatGuildCode(this)"/>'+
        '<button class="guild-join-btn" onclick="joinGuild()">Join →</button>'+
      '</div>'+
      '<div id="guild-join-err" style="color:var(--red);font-size:.72rem;margin-top:6px;display:none;"></div>'+
    '</div>'+
    '<div class="guild-action-card" onclick="openCreateGuildModal()">'+
      '<div class="guild-action-icon">➕</div>'+
      '<div><div class="guild-action-label">Create a New Guild</div><div class="guild-action-sub">Start your own invite-only faith community group</div></div>'+
      '<div style="color:var(--muted);font-size:1.2rem;">›</div>'+
    '</div>';
}
function formatGuildCode(el){
  var v=el.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,8);
  if(v.length>4)v=v.slice(0,4)+'-'+v.slice(4);
  el.value=v;
}
function joinGuild(){
  var code=document.getElementById('guild-code-input').value.trim().toUpperCase();
  var errEl=document.getElementById('guild-join-err');
  errEl.style.display='none';
  if(code.length<9){errEl.textContent='Please enter a valid 8-character invite code.';errEl.style.display='block';return;}
  // search all guilds for matching code
  var found=null;var foundGuild=null;
  state.allGuilds.forEach(function(g){
    g.codes.forEach(function(c){
      if(c.code===code&&!c.used){found=c;foundGuild=g;}
    });
  });
  if(!foundGuild){errEl.textContent='Invalid or expired invite code. Please check with your Guild leader.';errEl.style.display='block';return;}
  // Mark code as used and join
  found.used=true;found.usedBy=state.user.name;found.usedTime='Just now';
  foundGuild.members.push({name:state.user.name,role:'member',joined:'Just now'});
  state.guild=foundGuild;
  addNotif('🎉 You joined the Guild "'+foundGuild.name+'"!');
  renderGuild();
}
function openCreateGuildModal(){
  document.getElementById('guildModalContent').innerHTML=
    '<div class="modal-icon">⚔️</div>'+
    '<div class="modal-title">Create a Guild</div>'+
    '<div style="font-size:.73rem;color:var(--muted);margin-bottom:1.25rem;">Build your own invite-only faith community within Christ One\'s United.</div>'+
    '<div class="form-group"><label class="lbl">Guild Name <span class="req">*</span></label><input class="inp" id="cg-name" placeholder="e.g. Grace Builders"/></div>'+
    '<div class="form-group"><label class="lbl">Description <span class="req">*</span></label><textarea class="inp" id="cg-desc" style="min-height:72px;" placeholder="What is your Guild about? Who is it for?"></textarea></div>'+
    '<div class="form-group"><label class="lbl">Church Affiliation</label><input class="inp" id="cg-church" placeholder="e.g. First Baptist Church (optional)"/></div>'+
    '<button class="btn btn-green btn-mt" onclick="createGuild()">Create Guild →</button>';
  document.getElementById('guildModal').classList.add('open');
}
function createGuild(){
  var name=document.getElementById('cg-name').value.trim();
  var desc=document.getElementById('cg-desc').value.trim();
  if(!name||!desc){alert('Please fill in the Guild name and description.');return;}
  var newGuild={
    id:Date.now(),name:name,description:desc,
    leader:state.user.name,
    members:[{name:state.user.name,role:'leader',joined:'Just now'}],
    codes:[],church:document.getElementById('cg-church').value.trim(),
    created:'Just now'
  };
  state.allGuilds.push(newGuild);
  state.guild=newGuild;
  closeModal('guildModal');
  addNotif('⚔️ Your Guild "'+name+'" has been created!');
  renderGuild();
}
function renderMyGuild(el){
  var g=state.guild;
  var isLeader=g.leader===state.user.name;
  var activeCodes=g.codes.filter(c=>!c.used);
  var usedCodes=g.codes.filter(c=>c.used);
  el.innerHTML=
    // Hero
    '<div class="guild-hero">'+
      '<div class="guild-hero-icon">⚔️</div>'+
      '<div class="guild-hero-name">'+g.name+'</div>'+
      '<div class="guild-hero-sub">'+g.description+'</div>'+
      (g.church?'<div class="guild-hero-badge">⛪ '+g.church+'</div>':'')+
    '</div>'+
    // Invite Codes section (leader only)
    (isLeader?
      '<div class="guild-section-title">🔑 Invite Codes'+
        '<button class="guild-create-btn" onclick="createInviteCode()">+ New Code</button>'+
      '</div>'+
      (activeCodes.length?
        activeCodes.map(function(c,i){
          return '<div class="guild-code-card">'+
            '<div>'+
              '<div class="guild-code-val">'+c.code+'</div>'+
              '<div class="guild-code-used">Single-use · Created '+c.created+'</div>'+
            '</div>'+
            '<div class="guild-code-actions">'+
              '<button class="guild-copy-btn" id="copy-btn-'+c.code+'" onclick="copyCode(\''+c.code+'\')">📋 Copy</button>'+
              '<button class="guild-del-btn" onclick="deleteCode(\''+c.code+'\')">✕</button>'+
            '</div>'+
          '</div>';
        }).join(''):
        '<div class="guild-empty"><div class="guild-empty-icon">🔑</div><div class="guild-empty-text">No active invite codes.<br/>Create one to invite someone to your Guild.</div></div>'
      )+
      (usedCodes.length?
        '<div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;margin:.875rem 0 .5rem;">Used Codes</div>'+
        usedCodes.map(function(c){return '<div class="guild-code-card" style="opacity:.5;"><div><div class="guild-code-val" style="text-decoration:line-through;">'+c.code+'</div><div class="guild-code-used">Used by '+c.usedBy+' · '+c.usedTime+'</div></div></div>';}).join('')
      :'')+
    '':
    // Non-leader: show join info
    '<div style="background:#e0f0ea;border-radius:10px;padding:.875rem;margin-bottom:1.25rem;font-size:.8rem;color:var(--green);font-weight:500;">✓ You are a member of this Guild</div>'
    )+
    // Members
    '<div class="guild-section-title" style="margin-top:1.25rem;">👥 Members ('+g.members.length+')</div>'+
    g.members.map(function(m){
      var initials=m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      return '<div class="guild-member-item">'+
        '<div class="guild-member-avatar">'+initials+'</div>'+
        '<div style="flex:1;"><div class="guild-member-name">'+m.name+'</div><div class="guild-member-meta">Joined '+m.joined+'</div></div>'+
        '<span class="guild-member-role '+(m.role==='leader'?'gmr-leader':'gmr-member')+'">'+(m.role==='leader'?'👑 Leader':'Member')+'</span>'+
      '</div>';
    }).join('')+
    // Leave guild button (non-leaders)
    (!isLeader?'<button class="btn btn-warm btn-mt" onclick="leaveGuild()" style="margin-top:1.25rem;">Leave Guild</button>':''+
    // Disband (leader only)
    '<button class="btn btn-mt" style="background:#fde8e4;color:var(--red);margin-top:1rem;" onclick="disbandGuild()">Disband Guild</button>');
}
function createInviteCode(){
  if(!state.guild)return;
  var code=genCode();
  state.guild.codes.unshift({code:code,created:'Just now',used:false,usedBy:null,usedTime:null});
  addNotif('🔑 New invite code '+code+' created for "'+state.guild.name+'"');
  renderGuild();
}
function copyCode(code){
  var btn=document.getElementById('copy-btn-'+code);
  // Copy to clipboard
  if(navigator.clipboard){navigator.clipboard.writeText(code);}
  if(btn){btn.textContent='✓ Copied!';btn.classList.add('copied');setTimeout(function(){btn.textContent='📋 Copy';btn.classList.remove('copied');},2000);}
}
function deleteCode(code){
  if(!state.guild)return;
  state.guild.codes=state.guild.codes.filter(c=>c.code!==code);
  renderGuild();
}
function leaveGuild(){
  if(!state.guild)return;
  state.guild.members=state.guild.members.filter(m=>m.name!==state.user.name);
  var name=state.guild.name;
  state.guild=null;
  addNotif('You have left the Guild "'+name+'".');
  renderGuild();
}
function disbandGuild(){
  if(!state.guild)return;
  var name=state.guild.name;
  state.allGuilds=state.allGuilds.filter(g=>g.id!==state.guild.id);
  state.guild=null;
  addNotif('Guild "'+name+'" has been disbanded.');
  renderGuild();
}

// ═══════════════ SIGN OUT
function doSignOut(){
  state.user=null;state.profileType=null;state.plan=null;state.faithAnswer=null;
  state.bizTags=[];state.activeCat='All';state.savedIds=[];state.myBiz=null;state.messages=[];state.myReferralCount=0;state.guild=null;
  showScreen('screen-landing');
}