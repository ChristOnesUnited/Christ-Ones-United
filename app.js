// ═══════════════ STATE
var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var CATS = ["All","Restaurant","Retail","Health & Wellness","Technology","Legal","Finance","Education","Home Services","Beauty","Fitness","Other"];
var CAT_COLORS = {"Restaurant":"#e8603c","Retail":"#6c63ff","Health & Wellness":"#3cbf8f","Technology":"#2d9cdb","Legal":"#8b5cf6","Finance":"#f59e0b","Education":"#ec4899","Home Services":"#10b981","Beauty":"#f472b6","Fitness":"#f97316","Other":"#6b7280"};
var IND_PLANS = [{id:"monthly",label:"Monthly",price:"$1.29",period:"/mo",desc:"Billed monthly."},{id:"annual",label:"Annual",price:"$9.99",period:"/yr",desc:"Save 35%.",badge:"Best Value"}];
var BIZ_PLANS = [{id:"monthly",label:"Monthly",price:"$29.99",period:"/mo",desc:"Billed monthly."},{id:"annual",label:"Annual",price:"$239.99",period:"/yr",desc:"Save 33%.",badge:"Best Value"}];
var NOW = new Date();
var API_BASE = '';

var state = {
  profileType:null, user:null, plan:null, faithAnswer:null, bizTags:[], activeCat:'All',
  savedIds:[], myReferralCount:0,
  notifications:[{id:1,text:"Welcome to Christ One's United! Your membership is active.",time:"Just now",read:false}],
  businesses:[],
  jobs:[],
  pendingBusinesses:[],
  myBiz:null,
  prayerRequests:[],
  events:[],
  messages:[],
  dashMsgThreads:[],
  leaderboard:[]
};

var selectedPlan = null;

// ═══════════════ API HELPERS
async function apiFetch(path, method, body) {
  try {
    var opts = { method: method||'GET', headers:{'Content-Type':'application/json'} };
    if(body) opts.body = JSON.stringify(body);
    var res = await fetch(API_BASE + path, opts);
    return await res.json();
  } catch(err) {
    console.error('API error:', path, err.message);
    return { error: err.message };
  }
}

// Load businesses from Supabase.
// opts.query overrides the location part of the URL; opts.keepTestimonials reuses
// testimonials already loaded (used when only the location changed).
// Returns true when this load's results were applied.
async function loadBusinesses(opts) {
  opts = opts || {};
  var mySeq = state.bizLoadSeq = (state.bizLoadSeq || 0) + 1;
  var data = await apiFetch('/api/businesses'+(opts.query!==undefined?opts.query:dirLocQuery()));
  if(mySeq !== state.bizLoadSeq) return false; // a newer request has started — ignore this one
  if(data.success && data.businesses) {
    var oldTms = {};
    (state.businesses||[]).forEach(function(b){ if(b.testimonials&&b.testimonials.length) oldTms[b.id]=b.testimonials; });
    state.businesses = data.businesses.map(function(b) {
      return {
        id: b.id,
        name: b.name,
        category: b.category,
        description: b.description,
        address: b.address,
        zip: b.zip,
        phone: b.phone,
        email: b.email,
        website: b.website || '',
        facebook: b.facebook || '',
        linkedin: b.linkedin || '',
        church: b.church || '',
        churchAddress: b.church_address || '',
        church_id: b.church_id || null,
        lat: b.lat, lng: b.lng,
        service_type: b.service_type || 'storefront',
        service_radius: b.service_radius || null,
        distance_mi: (b.distance_mi===undefined?null:b.distance_mi),
        serves_area: !!b.serves_area,
        hours: b.hours || {},
        tags: b.tags ? b.tags.split(',').map(t=>t.trim()).filter(Boolean) : [],
        featured: b.featured || false,
        verified: b.verified || false,
        approved: b.approved || false,
        joinedDate: new Date(b.created_at),
        views: b.views || 0,
        referrals: [],
        testimonials: (opts.keepTestimonials && oldTms[b.id]) || [],
      };
    });
    // Load testimonials for all businesses in one pass
    if(!opts.keepTestimonials) loadAllTestimonials();
    return true;
  }
  return false;
}

async function loadAllTestimonials() {
  // Fetch testimonials for each business and attach to state
  await Promise.all(state.businesses.map(async function(biz) {
    try {
      var data = await apiFetch('/api/testimonials?business_id=' + biz.id);
      if(data.success && data.testimonials) {
        biz.testimonials = data.testimonials.map(function(t){
          return { author: t.author_name, text: t.text };
        });
      }
    } catch(e) {}
  }));
  // Re-render directory so testimonials appear on cards
  renderDirectory();
  renderSaved();
}

// Load jobs from Supabase
async function loadJobs() {
  var data = await apiFetch('/api/jobs');
  if(data.success && data.jobs) {
    state.jobs = data.jobs.map(function(j) {
      return {
        id: j.id,
        title: j.title,
        company: j.company || '',
        bizId: j.business_id,
        category: j.category || '',
        type: j.type,
        location: j.location,
        zip: j.zip || '',
        pay: j.pay || '',
        description: j.description,
        faithNote: j.faith_note || '',
        applyMethod: j.apply_method || 'contact',
        applyContact: j.apply_contact || j.contact_email || '',
        contactPhone: j.contact_phone || '',
        contactEmail: j.contact_email || '',
        tags: [],
        postedDate: new Date(j.created_at),
        savedByUsers: [],
        applicants: [],
      };
    });
  }
}

// Save new business to Supabase
async function saveBusinessToAPI(biz) {
  var data = await apiFetch('/api/businesses', 'POST', {
    user_id: state.user ? state.user.id : null,
    name: biz.name,
    category: biz.category,
    description: biz.description,
    church: biz.church,
    church_address: biz.churchAddress,
    church_id: biz.church_id || null,
    service_type: biz.service_type || 'storefront',
    service_radius: biz.service_radius || null,
    address: biz.address,
    zip: biz.zip,
    phone: biz.phone,
    email: biz.email,
    website: biz.website,
    facebook: biz.facebook,
    linkedin: biz.linkedin,
    hours: biz.hours,
    tags: biz.tags ? biz.tags.join(',') : '',
    featured: biz.featured || false,
  });
  return data;
}

// Save referral to Supabase
async function saveReferralToAPI(bizId, ref) {
  await apiFetch('/api/referrals', 'POST', {
    from_user_id: state.user ? state.user.id : null,
    business_id: bizId,
    name: ref.name,
    phone: ref.phone,
    email: ref.email || '',
    need: ref.need || '',
    faith_status: ref.faith || '',
    referred_by: state.user ? state.user.name : 'A Member',
  });
}

// Save newsletter subscriber to Supabase
async function saveNewsletterToAPI(email, name) {
  var data = await apiFetch('/api/newsletter', 'POST', {
    email: email,
    name: name || (state.user ? state.user.name : ''),
  });
  return data;
}

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
  try {
    state.profileType=type;
    var isBiz=type==='business';
    var subEl=document.getElementById('su-subtitle');
    var chipEl=document.getElementById('su-chip');
    var descEl=document.getElementById('su-desc');
    var btnEl=document.getElementById('su-btn');
    if(subEl) subEl.textContent=isBiz?'Business Sign Up':'Individual Sign Up';
    if(chipEl){chipEl.className='ob-chip '+(isBiz?'g':'r');chipEl.textContent=isBiz?'🏢 Business Owner':'🔍 Individual Member';}
    if(descEl) descEl.textContent=isBiz?'Set up your Christ One\'s United business account.':'Join the Christ One\'s United community directory.';
    if(btnEl) btnEl.className='btn btn-mt '+(isBiz?'btn-green':'btn-ink');
    makeDots(1,isBiz?'g':'r','su-stepdots');
    var cb=document.getElementById('su-terms');
    if(cb) cb.checked=false;
    if(btnEl){btnEl.disabled=true;btnEl.style.opacity=.5;btnEl.style.cursor='not-allowed';}
    showScreen('screen-signup');
  } catch(e) {
    console.error('selectType error:', e.message);
  }
}

// ═══════════════ SIGN IN
function doSignIn(){
  var email=document.getElementById('si-email').value.trim();
  var pass=document.getElementById('si-pass').value;
  var e=document.getElementById('si-err');
  e.classList.add('hidden');
  if(!email||!/\S+@\S+\.\S+/.test(email)){e.textContent='Enter a valid email.';e.classList.remove('hidden');return;}
  if(!pass){e.textContent='Enter your password.';e.classList.remove('hidden');return;}
  e.style.color='#1a6b4a';e.textContent='Signing in…';e.classList.remove('hidden');
  apiFetch('/api/auth-signin','POST',{email:email,password:pass}).then(function(data){
    e.style.color='';
    if(data.error){
      e.textContent=data.error;
      e.style.color='var(--red)';
      e.classList.remove('hidden');
      return;
    }
    e.classList.add('hidden');
    if(data.success&&data.user){
      var user=data.user;
      state.user={id:user.id,name:user.name,email:user.email,plan:user.plan,church:user.church||'',church_id:user.church_id||null,zip:user.zip||''};
      state.profileType=user.type||'individual';
      state.plan=user.plan||'monthly';
      if(data.token)state.authToken=data.token;
      // Save session to localStorage for page refresh persistence
      try {
        localStorage.setItem('cou_user', JSON.stringify(state.user));
        localStorage.setItem('cou_profileType', state.profileType);
        localStorage.setItem('cou_plan', state.plan);
        if(data.token) localStorage.setItem('cou_token', data.token);
      } catch(e){}
      // Auto-subscribe to newsletter (silently — won't duplicate if already subscribed)
      autoSubscribeNewsletter(user.email, user.name);
      if(state.profileType==='business'){
        // Check if business owner has a listing already
        apiFetch('/api/businesses?user_id='+user.id).then(function(bizData){
          if(bizData.success&&bizData.businesses&&bizData.businesses.length>0){
            // Has a listing — go to dashboard
            state.myBiz=bizData.businesses[0];
            enterDashboard();
          } else if(bizData.error){
            // API error — go to dashboard anyway, they can manage listing there
            console.error('Business lookup error:', bizData.error);
            enterDashboard();
          } else {
            // No listing yet — show profile form
            state.plan=user.plan||'monthly';
            makeDots(4,'g','bp-stepdots');
            state.bizTags=[];
            populateBizForm();
            showScreen('screen-biz-profile');
          }
        }).catch(function(err){
          // Connection error — go to dashboard rather than trapping in profile form
          console.error('Business lookup failed:', err);
          enterDashboard();
        });
      } else {
        enterDirectory();
      }
    } else {
      e.textContent='Sign in failed. Please try again.';e.classList.remove('hidden');
    }
  }).catch(function(){
    e.style.color='var(--red)';
    e.textContent='Connection error. Please try again.';
    e.classList.remove('hidden');
  });
}

// ═══════════════ SIGNUP
function updateSignupBtn(){
  var cb=document.getElementById('su-terms');
  var btn=document.getElementById('su-btn');
  if(!cb||!btn)return;
  var checked=cb.checked;
  btn.disabled=!checked;
  btn.style.opacity=checked?1:.5;
  btn.style.cursor=checked?'pointer':'not-allowed';
}

function doSignup(){
  var name=document.getElementById('su-name').value.trim();
  var email=document.getElementById('su-email').value.trim();
  var pass=document.getElementById('su-pass').value;
  var terms=document.getElementById('su-terms').checked;
  var e=document.getElementById('su-err');
  e.classList.add('hidden');
  if(!name){e.textContent='Enter your name.';e.classList.remove('hidden');return;}
  if(!email||!/\S+@\S+\.\S+/.test(email)){e.textContent='Enter a valid email.';e.classList.remove('hidden');return;}
  if(pass.length<6){e.textContent='Password must be 6+ characters.';e.classList.remove('hidden');return;}
  if(!terms){e.textContent='You must agree to the Terms of Service to continue.';e.classList.remove('hidden');return;}
  // Proceed to faith verification — duplicate check happens server-side in auth-signup
  proceedToFaith(name,email,pass);
}

function proceedToFaith(name,email,pass){
  // Store password and terms agreement timestamp in state
  state.user={name:name,email:email,termsAgreedAt:new Date().toISOString()};
  state.pendingPassword=pass;
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
function doFaith(){
  if(!state.faithAnswer)return;
  if(state.faithAnswer==='no'){document.getElementById('faith-block').classList.remove('hidden');return;}
  // Create Supabase Auth account before going to payment
  var btn=document.getElementById('faith-btn');
  btn.textContent='Creating account…';btn.disabled=true;
  apiFetch('/api/auth-signup','POST',{
    email:state.user.email,
    password:state.pendingPassword,
    name:state.user.name,
    type:state.profileType||'individual',
    plan:'monthly',
    faith_answer:'yes',
    terms_agreed_at:state.user.termsAgreedAt||new Date().toISOString()
  }).then(function(data){
    btn.textContent='Continue →';btn.disabled=false;
    if(data.error){
      var faithBlock=document.getElementById('faith-block');
      faithBlock.style.cssText='background:#fde8e4;border:1.5px solid #e8b4aa;border-radius:9px;padding:1rem;text-align:left;font-size:.8rem;color:#c8452d;font-weight:500;line-height:1.7;margin-bottom:.8rem;';
      // If email already registered — block and redirect to sign in
      if(data.error.toLowerCase().includes('already exists')||
         data.error.toLowerCase().includes('already registered')||
         data.error.toLowerCase().includes('sign in instead')){
        faithBlock.innerHTML=
          '<strong>An account already exists with this email.</strong><br/>'+
          'Please <button onclick="showScreen(\'screen-signin\')" style="background:none;border:none;color:#c8452d;font-weight:700;cursor:pointer;font-size:.8rem;text-decoration:underline;padding:0;">sign in to your existing account →</button>';
        faithBlock.classList.remove('hidden');
        return;
      }
      // Any other error — block payment and show clear message
      faithBlock.innerHTML='<strong>Account could not be created.</strong><br/>'+
        'Please check your email address and try again. If the problem persists contact us at support@christonesunited.com.<br/><br/>'+
        '<em style="font-weight:400;opacity:.8;">Error: '+data.error+'</em>';
      faithBlock.classList.remove('hidden');
      return;
    }
    // Auth account created successfully — proceed to payment
    if(data.user)state.user.id=data.user.id;
    state.pendingPassword=null;
    goToPayment();
  }).catch(function(){
    btn.textContent='Continue →';btn.disabled=false;
    var faithBlock=document.getElementById('faith-block');
    faithBlock.style.cssText='background:#fde8e4;border:1.5px solid #e8b4aa;border-radius:9px;padding:1rem;text-align:left;font-size:.8rem;color:#c8452d;font-weight:500;line-height:1.7;margin-bottom:.8rem;';
    faithBlock.innerHTML='<strong>Connection error.</strong><br/>Please check your internet connection and try again. Do not proceed to payment until this is resolved.';
    faithBlock.classList.remove('hidden');
  });
}

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

// ═══════════════ UNREAD MESSAGES
function updateUnreadMsgBadge(){
  if(!state.user||!state.user.id)return;
  var lastRead=null;
  try{ lastRead=localStorage.getItem('cou_msg_last_read_'+state.user.id); }catch(e){}
  var isBiz=state.profileType==='business';

  if(isBiz&&state.myBiz&&state.myBiz.id){
    // Business — count unread messages from members
    apiFetch('/api/community?type=messages&business_id='+state.myBiz.id).then(function(data){
      var msgs=(data.messages||[]).filter(function(m){
        return m.from_role==='user'&&(!lastRead||new Date(m.created_at)>new Date(lastRead));
      });
      var cnt=msgs.length;
      var badge=document.getElementById('dash-msg-cnt');
      if(badge){
        if(cnt>0){badge.textContent=cnt;badge.classList.remove('hidden');}
        else badge.classList.add('hidden');
      }
    }).catch(function(){});
  } else {
    // Individual — count unread replies from businesses
    apiFetch('/api/community?type=messages&user_id='+state.user.id).then(function(data){
      var msgs=(data.messages||[]).filter(function(m){
        return m.from_role==='business'&&(!lastRead||new Date(m.created_at)>new Date(lastRead));
      });
      var cnt=msgs.length;
      var badge=document.getElementById('msg-cnt');
      if(badge){
        if(cnt>0){badge.textContent=cnt;badge.classList.remove('hidden');}
        else badge.classList.add('hidden');
      }
    }).catch(function(){});
  }
}

function markMessagesRead(){
  if(!state.user||!state.user.id)return;
  try{ localStorage.setItem('cou_msg_last_read_'+state.user.id, new Date().toISOString()); }catch(e){}
  // Clear badge
  var badge=document.getElementById('msg-cnt');
  if(badge)badge.classList.add('hidden');
  var dashBadge=document.getElementById('dash-msg-cnt');
  if(dashBadge)dashBadge.classList.add('hidden');
}

// ═══════════════ SESSION RESTORE
(function restoreSession(){
  try {
    var savedUser = localStorage.getItem('cou_user');
    var savedType = localStorage.getItem('cou_profileType');
    var savedPlan = localStorage.getItem('cou_plan');
    var savedToken = localStorage.getItem('cou_token');
    if(!savedUser || !savedType) return;
    var user = JSON.parse(savedUser);
    if(!user || !user.email) return;
    state.user = user;
    state.profileType = savedType;
    state.plan = savedPlan || 'monthly';
    if(savedToken) state.authToken = savedToken;
    // Route to correct screen based on type
    if(savedType === 'business'){
      apiFetch('/api/businesses?user_id='+user.id).then(function(bizData){
        if(bizData.success && bizData.businesses && bizData.businesses.length > 0){
          state.myBiz = bizData.businesses[0];
          enterDashboard();
        } else {
          enterDashboard();
        }
      }).catch(function(){ enterDashboard(); });
    } else {
      enterDirectory();
    }
  } catch(e) {
    // Session restore failed — clear and show landing page normally
    try {
      localStorage.removeItem('cou_user');
      localStorage.removeItem('cou_profileType');
      localStorage.removeItem('cou_plan');
      localStorage.removeItem('cou_token');
    } catch(e2){}
  }
})();

// ═══════════════ FORGOT PASSWORD
function showForgotPassword(){
  var email=document.getElementById('si-email').value.trim();
  var modal=document.getElementById('refModal');
  document.getElementById('refModalContent').innerHTML=
    '<div class="modal-icon">🔑</div>'+
    '<div class="modal-title">Reset Password</div>'+
    '<div style="font-size:.73rem;color:var(--muted);margin-bottom:1.1rem;">Enter your email and we\'ll send you a reset link.</div>'+
    '<div class="form-group"><label class="lbl">Email Address</label><input class="inp" id="reset-email" type="email" value="'+(email||'')+'" placeholder="your@email.com"/></div>'+
    '<div id="reset-msg" style="display:none;font-size:.76rem;margin-bottom:.5rem;"></div>'+
    '<button class="btn btn-ink btn-mt" onclick="submitPasswordReset()">Send Reset Link →</button>';
  modal.classList.add('open');
}
function submitPasswordReset(){
  var email=document.getElementById('reset-email').value.trim();
  var msg=document.getElementById('reset-msg');
  if(!email||!/\S+@\S+\.\S+/.test(email)){msg.style.color='var(--red)';msg.textContent='Please enter a valid email.';msg.style.display='block';return;}
  msg.style.color='#1a6b4a';msg.textContent='Sending reset link…';msg.style.display='block';
  apiFetch('/api/auth-reset','POST',{email:email}).then(function(data){
    msg.style.color='#1a6b4a';
    msg.textContent='✓ Reset link sent! Check your email inbox.';
    setTimeout(function(){closeModal('refModal');},3000);
  }).catch(function(){
    msg.style.color='var(--red)';msg.textContent='Connection error. Please try again.';
  });
}

// ═══════════════ PASSWORD RECOVERY HANDLER
(function(){
  var hash = window.location.hash;
  if(!hash) return;
  var hashParams = {};
  hash.replace(/^#/,'').split('&').forEach(function(p){
    var kv = p.split('='); hashParams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]||'');
  });
  if(hashParams['type'] !== 'recovery') return;

  var accessToken  = hashParams['access_token']  || '';
  var refreshToken = hashParams['refresh_token'] || '';
  if(!accessToken || !refreshToken) return;

  // Clear the hash so tokens aren't visible in the URL
  window.history.replaceState({},'',window.location.pathname);

  // Wait for the DOM then show the set-new-password modal
  function showSetPassword(){
    var modal = document.getElementById('refModal');
    if(!modal){ setTimeout(showSetPassword, 150); return; }
    document.getElementById('refModalContent').innerHTML=
      '<div class="modal-icon">🔑</div>'+
      '<div class="modal-title">Set New Password</div>'+
      '<div style="font-size:.73rem;color:var(--muted);margin-bottom:1.1rem;">Choose a new password for your account.</div>'+
      '<div class="form-group"><label class="lbl">New Password</label><input class="inp" id="new-pass" type="password" placeholder="At least 8 characters"/></div>'+
      '<div class="form-group"><label class="lbl">Confirm Password</label><input class="inp" id="new-pass-confirm" type="password" placeholder="Repeat password"/></div>'+
      '<div id="new-pass-msg" style="display:none;font-size:.76rem;margin-bottom:.5rem;"></div>'+
      '<button class="btn btn-ink btn-mt" onclick="submitNewPassword()">Update Password →</button>';
    modal.classList.add('open');
  }

  window._recoveryTokens = { access_token: accessToken, refresh_token: refreshToken };
  showSetPassword();
})();

function submitNewPassword(){
  var pass    = document.getElementById('new-pass').value;
  var confirm = document.getElementById('new-pass-confirm').value;
  var msg     = document.getElementById('new-pass-msg');
  if(!pass || pass.length < 8){
    msg.style.color='var(--red)'; msg.textContent='Password must be at least 8 characters.'; msg.style.display='block'; return;
  }
  if(pass !== confirm){
    msg.style.color='var(--red)'; msg.textContent='Passwords do not match.'; msg.style.display='block'; return;
  }
  var tokens = window._recoveryTokens || {};
  msg.style.color='#1a6b4a'; msg.textContent='Updating…'; msg.style.display='block';
  apiFetch('/api/auth-update-password','POST',{
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    password: pass
  }).then(function(data){
    if(data.success){
      msg.style.color='#1a6b4a'; msg.textContent='✓ Password updated! You can now sign in.';
      window._recoveryTokens = null;
      setTimeout(function(){ closeModal('refModal'); }, 2500);
    } else {
      msg.style.color='var(--red)'; msg.textContent = data.error || 'Something went wrong. Please try again.';
    }
  }).catch(function(){
    msg.style.color='var(--red)'; msg.textContent='Connection error. Please try again.';
  });
}

// ═══════════════ STRIPE RETURN HANDLER
(function(){
  var params = new URLSearchParams(window.location.search);
  if(params.get('cancelled')==='true'){
    window.history.replaceState({},'','/');
    setTimeout(function(){
      var msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fff;border:1.5px solid #ddd8ce;border-radius:12px;padding:.875rem 1.25rem;font-family:DM Sans,sans-serif;font-size:.82rem;color:#7a7369;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:999;text-align:center;max-width:320px;';
      msg.innerHTML = 'No problem — your information is saved.<br/><strong style="color:#0f0e0c;">Complete your membership anytime.</strong>';
      document.body.appendChild(msg);
      setTimeout(function(){msg.remove();}, 5000);
    }, 500);
  }
  // Auto sign in after successful Stripe payment
  if(params.get('signin')==='true'){
    window.history.replaceState({},'','/');
    var pendingEmail = params.get('email') ? decodeURIComponent(params.get('email')) : null;
    var pendingType = params.get('type') || 'individual';

    function autoSignInAfterPayment(){
      var siScreen = document.getElementById('screen-signin');
      if(!siScreen){ setTimeout(autoSignInAfterPayment, 100); return; }

      // If we still have the user in state from the signup flow, sign them in directly
      if(state.user && state.user.email && state.pendingPassword){
        var email = state.user.email;
        var pass = state.pendingPassword;
        state.pendingPassword = null;

        // Show loading screen while signing in
        showScreen('screen-signin');
        var e = document.getElementById('si-err');
        if(e){ e.style.color='#1a6b4a'; e.textContent='Welcome! Signing you in…'; e.classList.remove('hidden'); }

        apiFetch('/api/auth-signin','POST',{email:email,password:pass}).then(function(data){
          if(data.success && data.user){
            var user = data.user;
            state.user = {id:user.id, name:user.name, email:user.email, plan:user.plan, church:user.church||'', church_id:user.church_id||null, zip:user.zip||''};
            state.profileType = user.type || pendingType;
            state.plan = user.plan || 'monthly';
            if(data.token) state.authToken = data.token;
            autoSubscribeNewsletter(user.email, user.name);
            if(state.profileType === 'business'){
              apiFetch('/api/businesses?user_id='+user.id).then(function(bizData){
                if(bizData.success && bizData.businesses && bizData.businesses.length > 0){
                  state.myBiz = bizData.businesses[0];
                  enterDashboard();
                } else {
                  state.plan = user.plan || 'monthly';
                  makeDots(4,'g','bp-stepdots');
                  state.bizTags = [];
                  populateBizForm();
                  showScreen('screen-biz-profile');
                }
              }).catch(function(){
                makeDots(4,'g','bp-stepdots');
                state.bizTags = [];
                populateBizForm();
                showScreen('screen-biz-profile');
              });
            } else {
              enterDirectory();
            }
          } else {
            // Auto sign in failed — show sign in screen with helpful message
            showScreen('screen-signin');
            var err = document.getElementById('si-err');
            if(err){ err.style.color='#1a6b4a'; err.textContent='✓ Payment successful! Please sign in to continue.'; err.classList.remove('hidden'); }
            var emailEl = document.getElementById('si-email');
            if(emailEl && email) emailEl.value = email;
          }
        }).catch(function(){
          showScreen('screen-signin');
          var err = document.getElementById('si-err');
          if(err){ err.style.color='#1a6b4a'; err.textContent='✓ Payment successful! Please sign in to continue.'; err.classList.remove('hidden'); }
          var emailEl = document.getElementById('si-email');
          if(emailEl && email) emailEl.value = email;
        });
      } else {
        // State was lost (page refresh) — show sign in with email pre-filled
        showScreen('screen-signin');
        var err = document.getElementById('si-err');
        if(err){ err.style.color='#1a6b4a'; err.textContent='✓ Payment successful! Please sign in to continue.'; err.classList.remove('hidden'); }
        if(pendingEmail){
          var emailEl = document.getElementById('si-email');
          if(emailEl) emailEl.value = pendingEmail;
        }
      }
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(autoSignInAfterPayment, 300); });
    } else {
      setTimeout(autoSignInAfterPayment, 300);
    }
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
  state.user.zip=document.getElementById('ip-zip').value.trim();
  // Auto-subscribe to newsletter
  autoSubscribeNewsletter(state.user.email, state.user.name);
  enterDirectory();
}

// ═══════════════ BIZ PROFILE
function populateBizForm(){
  var sel=document.getElementById('bp-cat');sel.innerHTML='<option value="">Select a category…</option>';
  CATS.filter(c=>c!=='All').forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  var planLabel={monthly:'Monthly Plan',annual:'Annual Plan'}[state.plan]||'Business Member';
  document.getElementById('bp-chip').textContent='🏢 '+planLabel;
  renderSvcOpts('bp','storefront');
  mountChurchPicker('bp-church',{zipInputId:'bp-zip',churchZipInputId:'bp-church-addr',onPick:function(ch){if(ch&&ch.zip)document.getElementById('bp-church-addr').value=ch.zip;}});
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
  var svcType=(document.getElementById('bp-svc-opts')||{dataset:{}}).dataset.value||'storefront';
  var bizZip=document.getElementById('bp-zip').value.trim();
  var zipBad=svcType!=='national'&&!/^\d{5}(-\d{4})?$/.test(bizZip);
  var valid=true;
  [['bp-zip-err',zipBad],['bp-name-err',!name],['bp-cat-err',!cat],['bp-desc-err',!desc],['bp-addr-err',!addr],['bp-phone-err',!phone],['bp-email-err',!email||!/\S+@\S+\.\S+/.test(email)],['bp-church-err',!church],['bp-church-addr-err',!churchAddr]].forEach(function(pair){document.getElementById(pair[0]).classList[pair[1]?'remove':'add']('hidden');if(pair[1])valid=false;});
  if(!valid)return;
  var hours={};DAYS.forEach(function(d){hours[d]=document.getElementById('hr-'+d).value.trim()||'Closed';});
  var biz={id:Date.now(),name:name,category:cat,description:desc,address:addr,zip:document.getElementById('bp-zip').value,phone:phone,email:email,
    website:document.getElementById('bp-web').value,facebook:document.getElementById('bp-facebook').value,linkedin:document.getElementById('bp-linkedin').value,
    church:church,churchAddress:churchAddr,hours:hours,tags:state.bizTags.slice(),featured:false,verified:false,approved:false,
    joinedDate:new Date(),views:0,referrals:[],testimonials:[],
    church_id:document.getElementById('bp-church').dataset.churchId||null,
    service_type:svcType,
    service_radius:svcType==='service_area'?(parseInt(document.getElementById('bp-radius').value,10)||30):(svcType==='storefront'?25:null)};
  state.myBiz=biz;
  // Auto-subscribe to newsletter
  autoSubscribeNewsletter(email, name);
  // Save to Supabase
  saveBusinessToAPI(biz).then(function(data){
    if(data.success && data.business) {
      state.myBiz.id = data.business.id;
      state.myBiz.church_id = data.business.church_id || null;
      state.myBiz.user_id = data.business.user_id || null;
    } else {
      alert('Sorry — your listing could not be saved'+(data&&data.error?' ('+data.error+')':'')+'. Please try again in a few minutes, or contact support@christonesunited.com.');
    }
  });
  addNotif('Your listing has been submitted for review!');
  enterDashboard();
}

// ═══════════════ DIRECTORY
function enterDirectory(){
  state.activeCat='All';
  document.getElementById('dir-search').value='';
  document.getElementById('acc-name').textContent=state.user.name;
  document.getElementById('acc-email').textContent=state.user.email;
  var planType=state.profileType==='business'?'Business':'Individual';
  document.getElementById('acc-plan').textContent=planType+' · '+(state.plan==='annual'?'Annual':'Monthly');
  updateNotifUI();
  showScreen('screen-directory');
  switchDirTab('home');
  state.showAllMore=false;
  state.dirFilter={maxMi:0,nationalOnly:false};
  renderLocNudge();
  // Load sponsors for banner
  loadSponsors();
  // Check for unread messages
  setTimeout(updateUnreadMsgBadge, 1500);
  // Show loading state then load real data
  document.getElementById('biz-grid').innerHTML='<div class="empty-state"><div class="empty-icon" style="animation:spin 1s linear infinite;display:inline-block;">⟳</div><div class="empty-title">Loading listings…</div></div>';
  loadBusinesses().then(function(){
    document.getElementById('dir-count-sub').textContent='Browsing '+state.businesses.length+' verified listings';
    populateChurchFilter();
    renderCatChips();
    renderDirectory();
    renderFeatured();
  });
  loadJobs().then(function(){
    if(document.getElementById('jobs-grid')) renderJobs();
  });
  renderPrayerBoard();
  renderEvents();
  renderLeaderboard();
  renderMessages('individual');
}
function populateChurchFilter(){
  var sel=document.getElementById('church-filter');sel.setAttribute('data-prev',sel.value||'');sel.innerHTML='<option value="">All Churches</option>';
  var churches=[...new Set(state.businesses.filter(b=>b.approved&&b.church).map(b=>b.church))].sort();
  churches.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
  var prev=sel.getAttribute('data-prev')||'';if(prev&&churches.indexOf(prev)>-1)sel.value=prev;
}
function renderCatChips(){
  var el=document.getElementById('cat-chips');el.innerHTML='';
  CATS.forEach(function(c){var btn=document.createElement('button');btn.className='cat-chip'+(state.activeCat===c?' active':'');btn.textContent=c;btn.onclick=function(){state.activeCat=c;renderCatChips();renderDirectory();};el.appendChild(btn);});
}
function renderFeatured(){
  var featured=state.businesses.filter(b=>b.featured&&b.approved);
  var strip=document.getElementById('feat-strip');
  state.featuredShown=featured.length>0;
  if(!featured.length){strip.classList.add('hidden');return;}
  strip.classList.remove('hidden');
  document.getElementById('feat-row').innerHTML=featured.map(b=>'<div class="feat-card"><div class="feat-name">'+b.name+'</div><div class="feat-cat">'+b.category+'</div></div>').join('');
}
function renderDirectory(){
  var q=(document.getElementById('dir-search').value||'').toLowerCase().trim();
  var cf=document.getElementById('church-filter').value;

  var filtered=state.businesses.filter(function(b){
    if(!b.approved)return false;
    var mc=state.activeCat==='All'||b.category===state.activeCat;
    var cc=!cf||b.church===cf;
    return mc&&cc&&passesDirFilters(b)&&(!q||b.name.toLowerCase().includes(q)||b.description.toLowerCase().includes(q)||b.category.toLowerCase().includes(q)||b.tags.some(t=>t.toLowerCase().includes(q)));
  });
  filtered.sort(compareBizRelevance);

  renderLocBar();
  syncDirFilterControls();
  var df=dirFilter();
  var filterOn=df.nationalOnly||df.maxMi>0;
  var grid=document.getElementById('biz-grid');
  var browsing=!q&&!cf&&state.activeCat==='All'&&!filterOn;
  document.getElementById('feat-strip').classList[browsing?'remove':'add']('hidden');
  if(browsing&&!state.featuredShown)document.getElementById('feat-strip').classList.add('hidden');

  if(!filtered.length){
    document.getElementById('result-meta').innerHTML='Showing <strong>0</strong> results'+(q?' for "<strong>'+escHtml(q)+'</strong>"':'')+dirFilterMeta();
    grid.innerHTML='<div class="empty-state"><div class="empty-icon">🗂</div><div class="empty-title">No results found</div><p>'+(df.maxMi>0?'Try a larger distance, or ':'Try ')+'a different search or filter.</p></div>';
    return;
  }

  // Searching or filtering: one list, ranked church → your area → nationwide → everything else
  if(!browsing){
    document.getElementById('result-meta').innerHTML='Showing <strong>'+filtered.length+'</strong> result'+(filtered.length!==1?'s':'')+(q?' for "<strong>'+escHtml(q)+'</strong>"':'')+(state.activeCat!=='All'?' in <strong>'+escHtml(state.activeCat)+'</strong>':'')+(cf?' · <strong>'+escHtml(cf)+'</strong>':'')+dirFilterMeta()+(hasDirLocation()||myChurchSet()?'<span style="font-size:.72rem;color:var(--green);margin-left:6px;">✝ Most relevant to you first</span>':'');
    grid.innerHTML='';filtered.forEach(function(b){grid.appendChild(makeBizCard(b));});
    return;
  }

  // Browsing: sections
  var groups=[[],[],[],[]];
  filtered.forEach(function(b){groups[bizTier(b)].push(b);});
  var churchName=(state.user&&state.user.church)||'Your Church';
  var hasLoc=state.businesses.some(function(b){return b.distance_mi!=null;});
  var secs=[
    {i:0,title:'✝ From '+churchName,sub:'Businesses run by members of your church'},
    {i:1,title:'📍 Serving Your Area',sub:'Businesses that serve '+dirLocLabel()},
    {i:2,title:'🇺🇸 Nationally Available Services',sub:'Products and services available anywhere in the U.S.'},
    {i:3,title:(hasLoc||myChurchSet())?'More Businesses':'All Businesses',sub:hasLoc?'Outside your area, closest first':'Newest first'}
  ];
  document.getElementById('result-meta').innerHTML='Showing <strong>'+filtered.length+'</strong> listing'+(filtered.length!==1?'s':'');
  grid.innerHTML='';
  secs.forEach(function(sec){
    var list=groups[sec.i];
    if(!list.length){
      if(sec.i===1&&hasLoc)grid.appendChild(feedHeader(sec,'No businesses serve your area yet. Know one? Invite them to join!'));
      return;
    }
    grid.appendChild(feedHeader(sec));
    var limit=(sec.i===3&&(hasLoc||myChurchSet())&&!state.showAllMore)?6:list.length;
    list.slice(0,limit).forEach(function(b){grid.appendChild(makeBizCard(b));});
    if(list.length>limit){
      var more=document.createElement('button');more.className='feed-more';
      more.textContent='Show all '+list.length+' businesses';
      more.onclick=function(){state.showAllMore=true;renderDirectory();};
      grid.appendChild(more);
    }
  });
}
function makeBizCard(b){
  var color=CAT_COLORS[b.category]||'#6b7280',saved=state.savedIds.includes(b.id),ntw=isNewThisWeek(b),hrs=todayHours(b);
  var div=document.createElement('div');div.className='biz-card'+(b.featured?' featured':'')+(ntw?' new-this-week':'');
  var badges='';if(b.verified)badges+='<span class="biz-verified">✓ Verified</span>';if(ntw)badges+='<span class="biz-new">🆕 New This Week</span>';
  var hoursHtml=hrs?'<div class="biz-hours'+(hrs==='Closed'?' closed':'')+'">⏰ Today: '+hrs+'</div>':'';
  var reachHtml=bizReachHtml(b);
  var metaHtml='<div class="biz-meta"><div class="biz-meta-row">📍 '+b.address+'</div><div class="biz-meta-row">📞 '+b.phone+'</div>'+(b.website?'<div class="biz-meta-row">🌐 <a href="https://'+b.website+'" target="_blank">'+b.website+'</a></div>':'')+(b.facebook?'<div class="biz-meta-row">👥 <a href="https://'+b.facebook+'" target="_blank">'+b.facebook+'</a></div>':'')+(b.linkedin?'<div class="biz-meta-row">💼 <a href="https://'+b.linkedin+'" target="_blank">'+b.linkedin+'</a></div>':'')+'<div class="biz-meta-row">✉️ '+b.email+'</div></div>';
  var tmsHtml=b.testimonials&&b.testimonials.length?'<div class="testimonials">'+b.testimonials.slice(0,2).map(t=>'<div class="testimonial"><div class="testimonial-text">"'+t.text+'"</div><div class="testimonial-author">— '+t.author+'</div></div>').join('')+'</div>':'';
  div.innerHTML='<div class="biz-topbar" style="background:'+color+'"></div><div class="biz-head"><div class="biz-name">'+b.name+'</div><span class="biz-cat-badge" style="background:'+color+'1a;color:'+color+'">'+b.category+'</span></div>'+(badges?'<div class="biz-badges">'+badges+'</div>':'')+reachHtml+hoursHtml+'<p class="biz-desc">'+b.description+'</p>'+metaHtml+(b.tags&&b.tags.length?'<div class="biz-tags">'+b.tags.map(t=>'<span class="biz-tag">'+t+'</span>').join('')+'</div>':'')+tmsHtml+'<div class="biz-actions"><button class="biz-btn biz-btn-save'+(saved?' saved':'')+'" onclick="toggleSave(\''+b.id+'\')">'+(saved?'♥ Saved':'♡ Save')+'</button><button class="biz-btn biz-btn-ref" onclick="openRefModal(\''+b.id+'\')">🤝 Refer</button><button class="biz-btn biz-btn-testify" onclick="openRevModal(\''+b.id+'\')">✍️ Testify</button><button class="biz-btn biz-btn-msg" onclick="openMsgModal(\''+b.id+'\')">💬 Message</button></div>';
  return div;
}
function toggleSave(id){var i=state.savedIds.indexOf(id);if(i>-1)state.savedIds.splice(i,1);else state.savedIds.push(id);renderDirectory();renderSaved();updateSavedCount();}
function renderSaved(){
  var grid=document.getElementById('saved-grid'),saved=state.businesses.filter(b=>state.savedIds.includes(b.id));
  document.getElementById('saved-sub').textContent=saved.length+' saved listing'+(saved.length!==1?'s':'');
  grid.innerHTML=saved.length?'':('<div class="empty-state"><div class="empty-icon">♡</div><div class="empty-title">Nothing saved yet</div><p>Tap ♡ Save on any card.</p></div>');
  saved.forEach(function(b){grid.appendChild(makeBizCard(b));});
}
function updateSavedCount(){var cnt=document.getElementById('saved-cnt');if(!cnt)return;if(state.savedIds.length>0){cnt.textContent=state.savedIds.length;cnt.classList.remove('hidden');}else cnt.classList.add('hidden');}
function switchDirTab(tab){
  ['home','saved','community','messages','jobs','account'].forEach(function(t){
    var panel=document.getElementById('dir-tab-'+t);
    if(panel)panel.classList[t===tab?'remove':'add']('hidden');
    var btn=document.getElementById('dir-btn-'+t);
    if(btn)btn.classList.remove('active-ind');
  });
  var activeBtn=document.getElementById('dir-btn-'+tab);
  if(activeBtn)activeBtn.classList.add('active-ind');
  if(tab==='saved')renderSaved();
  if(tab==='community'){renderPrayerBoard();renderEvents();renderLeaderboard();}
  if(tab==='messages'){renderMessages('individual');markMessagesRead();}
  if(tab==='jobs'){initJobFilters();renderJobs();}
  if(tab==='account')renderAccLocation();
}

// ═══════════════ PRAYER BOARD
function renderPrayerBoard(){
  var el=document.getElementById('prayer-list');
  if(!el)return;
  el.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Loading prayers…</p>';
  apiFetch('/api/community?type=prayer').then(function(data){
    var prayers=data.prayers||[];
    state.prayerRequests=prayers.map(function(p){return {
      id:p.id,author:p.author||'Anonymous',
      text:p.text,
      time:p.created_at?new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'',
      prayedBy:p.prayed_by||[],
      prayedByMe:p.prayed_by&&p.prayed_by.includes(state.user?state.user.name:'')
    };});
    if(!prayers.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">🙏</div><div class="empty-title">No prayer requests yet</div><p>Be the first to share a prayer request with the community.</p></div>';return;}
    el.innerHTML=state.prayerRequests.map(function(p,i){
      var isOwner=state.user&&(p.userId===state.user.id||p.author===state.user.name);
      return '<div class="prayer-card" id="prayer-card-'+p.id+'">'+
        '<div class="prayer-header">'+
          '<div class="prayer-author">🙏 '+p.author+'</div>'+
          '<div style="display:flex;align-items:center;gap:.5rem;">'+
            '<div class="prayer-time">'+p.time+'</div>'+
            (isOwner?'<button onclick="deletePrayer(\''+p.id+'\')" style="background:none;border:none;color:#ccc;font-size:.85rem;cursor:pointer;padding:0;" title="Delete">🗑</button>':'')+
          '</div>'+
        '</div>'+
        '<p class="prayer-text">'+p.text+'</p>'+
        '<div style="display:flex;align-items:center;justify-content:space-between;">'+
          '<span class="prayer-prayed" id="pray-cnt-'+p.id+'">'+(p.prayedBy.length)+' praying</span>'+
          '<button class="prayer-pray-btn'+(p.prayedByMe?' prayed':'')+'" id="pray-btn-'+p.id+'" '+(p.prayedByMe?'disabled':'')+' onclick="prayFor(\''+p.id+'\')">'+(p.prayedByMe?'🙏 Praying':'🙏 Pray')+'</button>'+
        '</div>'+
      '</div>';
    }).join('');
  }).catch(function(){
    el.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Could not load prayers. Please refresh.</p>';
  });
}
function prayFor(id){
  // Find prayer in local state by id
  var prayer=state.prayerRequests.find(function(p){return String(p.id)===String(id);});
  if(!prayer||prayer.prayedByMe)return;
  // Update local state immediately
  prayer.prayedByMe=true;
  var userName=state.user?state.user.name:'Anonymous';
  prayer.prayedBy.push(userName);
  // Update individual directory buttons
  var btn=document.getElementById('pray-btn-'+id);
  var cnt=document.getElementById('pray-cnt-'+id);
  if(btn){btn.textContent='🙏 Praying';btn.classList.add('prayed');btn.disabled=true;}
  if(cnt)cnt.textContent=prayer.prayedBy.length+' praying';
  // Update business dashboard buttons (different ID prefix)
  var bizBtn=document.getElementById('biz-pray-btn-'+id);
  var bizCnt=document.getElementById('biz-pray-cnt-'+id);
  if(bizBtn){bizBtn.textContent='🙏 Praying';bizBtn.classList.add('prayed');bizBtn.disabled=true;}
  if(bizCnt)bizCnt.textContent=prayer.prayedBy.length+' praying';
  // Save to Supabase
  apiFetch('/api/community?type=prayer','PUT',{
    id:id,
    prayed_by:prayer.prayedBy
  }).catch(function(){});
}
function openPrayerModal(){
  document.getElementById('prayerModalContent').innerHTML='<div class="modal-icon">🙏</div><div class="modal-title">Post a Prayer Request</div><div style="font-size:.73rem;color:var(--muted);margin-bottom:1rem;">Your request will be shared with the community anonymously if you choose.</div><div class="form-group"><label class="lbl">Your Name</label><input class="inp" id="pr-name" placeholder="Name or \'Anonymous\'"/></div><div class="form-group"><label class="lbl">Prayer Request</label><textarea class="inp" id="pr-text" placeholder="Share your prayer request…" style="min-height:80px;"></textarea></div><button class="btn btn-red btn-mt" onclick="submitPrayer()">Post Request</button>';
  document.getElementById('prayerModal').classList.add('open');
}
function submitPrayer(){
  var name=document.getElementById('pr-name').value.trim()||'Anonymous';
  var text=document.getElementById('pr-text').value.trim();
  if(!text)return;
  apiFetch('/api/community?type=prayer','POST',{
    author:name,text:text,
    user_id:state.user?state.user.id:null
  }).then(function(){
    closeModal('prayerModal');
    addNotif('Your prayer request has been posted. 🙏');
    // Refresh the correct panel based on active screen
    if(state.profileType==='business'){
      renderBizCommunity();
    } else {
      renderPrayerBoard();
    }
  }).catch(function(){
    closeModal('prayerModal');
    addNotif('Prayer request posted.');
  });
}

// ═══════════════ EVENTS
function renderEvents(){
  var el=document.getElementById('events-list');
  if(!el)return;
  el.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Loading events…</p>';
  apiFetch('/api/community?type=events').then(function(data){
    var events=data.events||[];
    state.events=events;
    if(!events.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No events yet</div><p>Be the first to post a community event.</p></div>';return;}
    el.innerHTML=events.map(function(e){
      var d=new Date(e.date),month=d.toLocaleString('default',{month:'short'}).toUpperCase(),day=d.getDate();
      var isOwner=state.user&&(e.user_id===state.user.id||e.host===state.user.name);
      return '<div class="event-card" id="event-card-'+e.id+'">'+
        '<div class="event-date-box"><div class="event-month">'+month+'</div><div class="event-day">'+day+'</div></div>'+
        '<div class="event-body">'+
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'+
            '<div class="event-title">'+e.title+'</div>'+
            (isOwner?'<button onclick="deleteEvent(\''+e.id+'\')" style="background:none;border:none;color:#ccc;font-size:.9rem;cursor:pointer;padding:0 0 0 8px;flex-shrink:0;" title="Delete event">🗑</button>':'')+
          '</div>'+
          '<div class="event-meta">🕐 '+(e.time||'TBD')+'<br/>📍 '+(e.location||'TBD')+'</div>'+
          '<div class="event-host">Hosted by '+(e.host||'Community')+'</div>'+
        '</div>'+
      '</div>';
    }).join('');
  }).catch(function(){
    el.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Could not load events. Please refresh.</p>';
  });
}
function openEventModal(){
  document.getElementById('eventModalContent').innerHTML='<div class="modal-icon">📅</div><div class="modal-title">Post an Event</div><div class="form-group"><label class="lbl">Event Title</label><input class="inp" id="ev-title" placeholder="e.g. Community Prayer Breakfast"/></div><div class="form-group"><label class="lbl">Date</label><input class="inp" type="date" id="ev-date"/></div><div class="form-group"><label class="lbl">Time</label><input class="inp" id="ev-time" placeholder="e.g. 10:00 AM – 12:00 PM"/></div><div class="form-group"><label class="lbl">Location</label><input class="inp" id="ev-loc" placeholder="Venue name and address"/></div><div class="form-group"><label class="lbl">Hosted By</label><input class="inp" id="ev-host" placeholder="Your name or organization"/></div><div class="form-group"><label class="lbl">Description</label><textarea class="inp" id="ev-desc" placeholder="Tell people what to expect…"></textarea></div><button class="btn btn-green btn-mt" onclick="submitEvent()">Post Event</button>';
  document.getElementById('eventModal').classList.add('open');
}
function submitEvent(){
  var title=document.getElementById('ev-title').value.trim();
  var date=document.getElementById('ev-date').value;
  if(!title||!date)return;
  apiFetch('/api/community?type=events','POST',{
    title:title,date:date,
    time:document.getElementById('ev-time').value||'TBD',
    location:document.getElementById('ev-loc').value||'TBD',
    host:document.getElementById('ev-host').value||(state.user?state.user.name:'Community'),
    description:document.getElementById('ev-desc').value,
    user_id:state.user?state.user.id:null
  }).then(function(){
    closeModal('eventModal');
    addNotif('Your event has been posted! 📅');
    // Refresh the correct panel based on active screen
    if(state.profileType==='business'){
      renderBizCommunity();
    } else {
      renderEvents();
    }
  }).catch(function(){
    closeModal('eventModal');
    addNotif('Event posted.');
  });
}

function deleteEvent(id){
  if(!confirm('Delete this event? This cannot be undone.'))return;
  var card=document.getElementById('event-card-'+id);
  if(card)card.remove();
  apiFetch('/api/community?type=events','DELETE',{id:id,type:'events'}).catch(function(){});
  addNotif('Event deleted.');
}
function deletePrayer(id){
  if(!confirm('Delete this prayer request? This cannot be undone.'))return;
  var card=document.getElementById('prayer-card-'+id);
  if(card)card.remove();
  // Remove from local state
  state.prayerRequests=state.prayerRequests.filter(function(p){return String(p.id)!==String(id);});
  apiFetch('/api/community?type=prayer','DELETE',{id:id,type:'prayer'}).catch(function(){});
  addNotif('Prayer request deleted.');
}

// ═══════════════ NEWSLETTER
// ═══════════════ NEWSLETTER — AUTO SUBSCRIBE
function autoSubscribeNewsletter(email, name){
  if(!email) return;
  saveNewsletterToAPI(email, name).then(function(data){
    if(data && data.success){
      console.log('Auto-subscribed to newsletter:', email);
    }
  }).catch(function(e){
    console.log('Newsletter auto-subscribe failed silently:', e);
  });
}

// ═══════════════ NEWSLETTER MODAL — THIS WEEK'S EDITION
function openNewsletterModal(){
  var today = new Date();
  var weekOf = today.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  var newBizCount = state.businesses.filter(function(b){
    return b.approved && (Date.now()-new Date(b.joinedDate).getTime())<7*86400000;
  }).length;
  var featuredBiz = state.businesses.filter(b=>b.approved&&b.featured).slice(0,1)[0];
  var latestPrayer = state.prayerRequests && state.prayerRequests[0];
  var nextEvent = state.events && state.events.find(function(e){return new Date(e.date)>new Date();});

  document.getElementById('newsletterModalContent').innerHTML=
    '<div style="background:linear-gradient(135deg,#1a1a2e,#0f1923);margin:-1.6rem -1.6rem 1.25rem;padding:1.5rem 1.6rem;border-radius:14px 14px 0 0;">'+
      '<div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.15em;color:#c9973a;font-weight:700;margin-bottom:.35rem;">The Christ One\'s United Weekly</div>'+
      '<div style="font-family:\'Playfair Display\',serif;font-size:1.25rem;color:#fff;margin-bottom:.2rem;">This Week\'s Edition</div>'+
      '<div style="font-size:.72rem;color:#8a8278;">Week of '+weekOf+'</div>'+
    '</div>'+

    // New listings
    '<div style="margin-bottom:1.25rem;">'+
      '<div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:700;margin-bottom:.5rem;">🏢 Directory Update</div>'+
      (newBizCount>0?
        '<p style="font-size:.84rem;color:var(--ink);line-height:1.6;"><strong>'+newBizCount+' new business'+(newBizCount!==1?'es':'')+' joined</strong> Christ One\'s United this week. Browse the directory to discover and connect with them.</p>':
        '<p style="font-size:.84rem;color:var(--muted);line-height:1.6;">No new businesses this week — but the directory is full of great options. Browse and discover!</p>')+
    '</div>'+

    // Featured business
    (featuredBiz?
      '<div style="background:linear-gradient(135deg,#fdf9f0,#fdf3e3);border-radius:10px;padding:1rem;margin-bottom:1.25rem;border:1px solid #c9973a33;">'+
        '<div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:#c9973a;font-weight:700;margin-bottom:.35rem;">⭐ Featured Business</div>'+
        '<div style="font-family:\'Playfair Display\',serif;font-size:.95rem;color:var(--ink);margin-bottom:.2rem;">'+featuredBiz.name+'</div>'+
        '<div style="font-size:.78rem;color:var(--muted);">'+featuredBiz.category+' · '+featuredBiz.address+'</div>'+
        '<p style="font-size:.78rem;color:var(--ink);margin-top:.4rem;line-height:1.5;">'+featuredBiz.description.substring(0,120)+'…</p>'+
      '</div>':'')+ 

    // Prayer highlight
    (latestPrayer?
      '<div style="background:#f8f4ff;border-radius:10px;padding:1rem;margin-bottom:1.25rem;border-left:3px solid #7c3aed;">'+
        '<div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:#7c3aed;font-weight:700;margin-bottom:.35rem;">🙏 Prayer Highlight</div>'+
        '<p style="font-size:.82rem;color:var(--ink);font-style:italic;line-height:1.6;">"'+latestPrayer.text.substring(0,120)+(latestPrayer.text.length>120?'…':'')+'"</p>'+
        '<div style="font-size:.7rem;color:var(--muted);margin-top:.3rem;">— '+latestPrayer.author+'</div>'+
      '</div>':'')+ 

    // Upcoming event
    (nextEvent?
      '<div style="background:#e0f0ea;border-radius:10px;padding:1rem;margin-bottom:1.25rem;">'+
        '<div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--green);font-weight:700;margin-bottom:.35rem;">📅 Upcoming Event</div>'+
        '<div style="font-family:\'Playfair Display\',serif;font-size:.9rem;color:var(--ink);margin-bottom:.2rem;">'+nextEvent.title+'</div>'+
        '<div style="font-size:.76rem;color:var(--muted);">'+new Date(nextEvent.date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+' · '+nextEvent.time+'</div>'+
        '<div style="font-size:.74rem;color:var(--green);margin-top:.2rem;">📍 '+nextEvent.location+'</div>'+
      '</div>':'')+ 

    // Footer
    '<div style="text-align:center;padding-top:.75rem;border-top:1px solid var(--border);">'+
      '<p style="font-size:.72rem;color:var(--muted);line-height:1.6;font-style:italic;">"For where two or three gather in my name, there am I with them." — Matthew 18:20</p>'+
      '<p style="font-size:.68rem;color:var(--muted);margin-top:.4rem;">You receive this as a Christ One\'s United member. Delivered every Monday.</p>'+
    '</div>';

  document.getElementById('newsletterModal').classList.add('open');
}

// ═══════════════ LEADERBOARD
function renderLeaderboard(){
  document.getElementById('leaderboard').innerHTML='<div class="dash-card" style="padding:1rem 1.25rem;">'+state.leaderboard.map(function(l,i){return '<div class="leaderboard-item"><div class="lb-rank'+(i<3?' top':'')+'">'+[' 🥇',' 🥈',' 🥉'][i]||i+1+'</div><div class="lb-name">'+l.name+'</div>'+(l.badge?'<span class="lb-badge">'+l.badge+'</span>':'')+' <div class="lb-count">'+l.count+' referrals</div></div>';}).join('')+'</div>';
}

// ═══════════════ MESSAGING
function openMsgModal(bizId){
  var biz=state.businesses.find(b=>String(b.id)===String(bizId));if(!biz)return;
  // Show modal immediately with loading state
  var modal=document.getElementById('msgModal');
  document.getElementById('msgModalContent').innerHTML=
    '<div style="display:flex;align-items:center;gap:.75rem;padding-bottom:.875rem;margin-bottom:.5rem;border-bottom:1px solid #ede9e1;">'+
      '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#c8452d,#e8644e);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.95rem;flex-shrink:0;">'+biz.name.charAt(0).toUpperCase()+'</div>'+
      '<div>'+
        '<div style="font-weight:700;font-size:.9rem;color:#1a1612;">'+biz.name+'</div>'+
        '<div style="font-size:.7rem;color:var(--muted);">Business</div>'+
      '</div>'+
    '</div>'+
    '<div id="modal-bubbles" style="min-height:180px;max-height:300px;overflow-y:auto;padding:.25rem 0;margin-bottom:.75rem;display:flex;flex-direction:column;gap:.4rem;">'+
      '<p style="text-align:center;font-size:.78rem;color:var(--muted);padding:1rem;">Loading messages…</p>'+
    '</div>'+
    '<div style="display:flex;gap:.5rem;align-items:center;border-top:1px solid #ede9e1;padding-top:.75rem;">'+
      '<input class="msg-input" id="modal-msg-inp" placeholder="Message '+biz.name+'…" style="flex:1;border-radius:20px;padding:.55rem 1rem;border:1.5px solid #ede9e1;font-size:.84rem;" onkeydown="if(event.key===\'Enter\')sendModalMsg(\''+bizId+'\')"/>'+
      '<button onclick="sendModalMsg(\''+bizId+'\')" style="width:36px;height:36px;border-radius:50%;background:#c8452d;border:none;color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">↑</button>'+
    '</div>';
  modal.classList.add('open');
  // Load full thread from Supabase (includes both user messages and business replies)
  var userId=state.user?state.user.id:null;
  apiFetch('/api/community?type=messages&business_id='+bizId+(userId?'&user_id='+userId:'')).then(function(data){
    var msgs=data.messages||[];
    var bubbles=document.getElementById('modal-bubbles');
    if(!bubbles)return;
    if(!msgs.length){
      bubbles.innerHTML='<div style="text-align:center;font-size:.78rem;color:var(--muted);padding:1rem;">This is a private conversation with <strong>'+biz.name+'</strong>. Messages are visible to both parties.</div>';
    } else {
      bubbles.innerHTML=msgs.map(function(m){
        var isMine=m.from_role==='user';
        var time=m.created_at?new Date(m.created_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
        return '<div style="display:flex;flex-direction:column;align-items:'+(isMine?'flex-end':'flex-start')+';gap:.15rem;margin-bottom:.4rem;">'+
          '<div style="max-width:75%;padding:.55rem .875rem;border-radius:'+(isMine?'18px 18px 4px 18px':'18px 18px 18px 4px')+';background:'+(isMine?'#1a6b4a':'#f0ece6')+';color:'+(isMine?'#fff':'#1a1612')+';font-size:.84rem;line-height:1.5;word-break:break-word;">'+m.text+'</div>'+
          '<div style="font-size:.62rem;color:#bbb;padding:0 4px;">'+(isMine?'You':biz.name)+(time?' · '+time:'')+'</div>'+
        '</div>';
      }).join('');
      bubbles.scrollTop=bubbles.scrollHeight;
    }
    // Update local thread state
    var thread=state.messages.find(m=>String(m.bizId)===String(bizId));
    if(!thread){thread={bizId:bizId,bizName:biz.name,messages:msgs,unread:false};state.messages.push(thread);}
    else thread.messages=msgs;
  }).catch(function(){
    var bubbles=document.getElementById('modal-bubbles');
    if(bubbles)bubbles.innerHTML='<div style="text-align:center;font-size:.78rem;color:var(--muted);padding:1rem;">Could not load messages. Please try again.</div>';
  });
}
function sendModalMsg(bizId){
  var inp=document.getElementById('modal-msg-inp');
  var text=inp?inp.value.trim():'';
  if(!text)return;
  // Show message immediately in SMS style
  var bubbles=document.getElementById('modal-bubbles');
  if(bubbles){
    var now=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    bubbles.innerHTML+=
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.15rem;margin-bottom:.4rem;">'+
        '<div style="max-width:75%;padding:.55rem .875rem;border-radius:18px 18px 4px 18px;background:#1a6b4a;color:#fff;font-size:.84rem;line-height:1.5;word-break:break-word;">'+text+'</div>'+
        '<div style="font-size:.62rem;color:#bbb;padding:0 4px;">You · '+now+'</div>'+
      '</div>';
    bubbles.scrollTop=bubbles.scrollHeight;
  }
  inp.value='';
  // Save to Supabase
  var biz=state.businesses.find(b=>String(b.id)===String(bizId));
  apiFetch('/api/community?type=messages','POST',{
    business_id:bizId,
    from_user_id:state.user?state.user.id:null,
    from_name:state.user?state.user.name:'Member',
    biz_name:biz?biz.name:'',
    text:text,
    from_role:'user'
  }).catch(function(){});
  // Update local state
  var thread=state.messages.find(m=>String(m.bizId)===String(bizId));
  if(!thread){thread={bizId:bizId,bizName:biz?biz.name:'Business',messages:[],unread:false};state.messages.push(thread);}
  thread.messages.push({from:'user',text:text,time:'Now'});
}
function renderMessages(role){
  var el=document.getElementById('messages-list');if(!el)return;
  // Load from Supabase for individuals
  if(state.user&&state.user.id&&role!=='biz'){
    apiFetch('/api/community?type=messages&user_id='+state.user.id).then(function(data){
      var msgs=data.messages||[];
      // Group by business
      var threads={};
      msgs.forEach(function(m){
        if(!threads[m.business_id]){threads[m.business_id]={bizId:m.business_id,bizName:m.biz_name||'Business',messages:[],unread:false};}
        threads[m.business_id].messages.push(m);
      });
      var threadList=Object.values(threads);
      state.messages=threadList;
      if(!threadList.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><p>Tap 💬 Message on any business card to start a conversation.</p></div>';return;}
      el.innerHTML=threadList.map(function(t){
        var last=t.messages[t.messages.length-1];
        return '<div class="msg-thread" onclick="openMsgModal(\''+t.bizId+'\')"><div class="msg-thread-head"><div class="msg-thread-name">'+t.bizName+'</div><div class="msg-thread-time">'+(last?new Date(last.created_at||Date.now()).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')+'</div></div><div class="msg-thread-preview">'+(last?last.text:'')+'</div></div>';
      }).join('');
    }).catch(function(){
      el.innerHTML='<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><p>Tap 💬 Message on any business card to start a conversation.</p></div>';
    });
  } else {
    if(!state.messages.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><p>Tap 💬 Message on any business card to start a conversation.</p></div>';return;}
    el.innerHTML=state.messages.map(function(t){var last=t.messages[t.messages.length-1];return '<div class="msg-thread" onclick="openMsgModal(\''+t.bizId+'\')"><div class="msg-thread-head"><div class="msg-thread-name">'+t.bizName+'</div><div class="msg-thread-time">'+(last?last.time:'')+'</div></div><div class="msg-thread-preview">'+(last?last.text:'')+'</div></div>';}).join('');
  }
}

// ═══════════════ REF / REVIEW MODALS
function openRefModal(bizId){
  var biz=state.businesses.find(b=>b.id===bizId);if(!biz)return;
  document.getElementById('refModalContent').innerHTML='<div class="modal-icon">🤝</div><div class="modal-title">Share a Referral</div><div class="modal-for">Referring someone to <strong>'+biz.name+'</strong></div><div class="form-group"><label class="lbl">Name</label><input class="inp" id="ref-name" placeholder="Referral\'s full name"/></div><div class="form-group"><label class="lbl">Phone #</label><input class="inp" type="tel" id="ref-phone" placeholder="(555) 000-0000"/></div><div class="form-group"><label class="lbl">Email</label><input class="inp" type="email" id="ref-email" placeholder="their@email.com"/></div><div class="form-group"><label class="lbl">Current Need</label><textarea class="inp" id="ref-need" placeholder="What are they looking for?"></textarea></div><div class="form-group"><label class="lbl">Faith Status</label><select class="inp" id="ref-faith"><option value="">Select…</option><option>Believer</option><option>Exploring faith</option><option>Not yet a believer</option><option>Prefer not to say</option></select></div><button class="btn btn-red btn-mt" onclick="submitRef(\''+bizId+'\')">Send Referral →</button>';
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
  var me=state.leaderboard.find(l=>l.name===state.user.name);
  if(me){me.count++;}else{state.leaderboard.push({name:state.user.name,count:1,badge:''});}
  state.leaderboard.sort((a,b)=>b.count-a.count);
  // Save to Supabase
  saveReferralToAPI(bizId, ref);
  addNotif('Your referral to '+(biz?biz.name:'the business')+' was received!');
  document.getElementById('refModalContent').innerHTML='<div style="text-align:center;padding:.5rem 0;"><div style="font-size:2rem;margin-bottom:.55rem;">🙏</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;margin-bottom:.35rem;">Referral Sent!</div><p style="font-size:.8rem;color:#7a7369;">Your referral has been shared with <strong>'+(biz?biz.name:'the business')+'</strong>.</p></div>';
  setTimeout(function(){closeModal('refModal');},2000);
}
function openRevModal(bizId){
  var biz=state.businesses.find(b=>b.id===bizId);if(!biz)return;
  document.getElementById('revModalContent').innerHTML='<div class="modal-icon">✍️</div><div class="modal-title">Leave a Word</div><div class="modal-for">Share your experience with <strong>'+biz.name+'</strong></div><div class="form-group"><label class="lbl">Your testimonial (1–3 sentences)</label><textarea class="inp" id="rev-text" style="min-height:80px;" placeholder="Share how this business has blessed you…"></textarea></div><button class="btn btn-green btn-mt" onclick="submitRev(\''+bizId+'\')">Share →</button>';
  document.getElementById('revModal').classList.add('open');
}
function submitRev(bizId){
  var txt=document.getElementById('rev-text').value.trim();if(!txt)return;
  var btn=document.querySelector('#revModalContent .btn-green');if(btn){btn.disabled=true;btn.textContent='Saving…';}
  apiFetch('/api/testimonials','POST',{
    business_id: bizId,
    author_name: state.user ? state.user.name : 'Member',
    text: txt
  }).then(function(data){
    if(data.success){
      // Update local state so card re-renders without a full reload
      var tm={author:data.testimonial.author_name,text:data.testimonial.text};
      var biz=state.businesses.find(b=>b.id===bizId);
      if(biz){if(!biz.testimonials)biz.testimonials=[];biz.testimonials.unshift(tm);}
      if(state.myBiz&&state.myBiz.id===bizId){if(!state.myBiz.testimonials)state.myBiz.testimonials=[];state.myBiz.testimonials.unshift(tm);}
      document.getElementById('revModalContent').innerHTML='<div style="text-align:center;padding:.5rem 0;"><div style="font-size:2rem;margin-bottom:.55rem;">✍️</div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;margin-bottom:.35rem;">Word shared!</div><p style="font-size:.8rem;color:#7a7369;">Thank you! Your testimonial has been added.</p></div>';
      setTimeout(function(){closeModal('revModal');renderDirectory();},2000);
    } else {
      if(btn){btn.disabled=false;btn.textContent='Share →';}
      alert(data.error||'Could not save testimonial. Please try again.');
    }
  });
}

// ═══════════════ DASHBOARD
function enterDashboard(){
  try {
    var bizNameEl=document.getElementById('dash-biz-name');
    if(bizNameEl) bizNameEl.textContent=state.myBiz?state.myBiz.name:(state.user?state.user.name:'My Business');
    var planLabel={monthly:'Monthly Plan',annual:'Annual Plan'}[state.plan]||'Business Member';
    var planChipEl=document.getElementById('dash-plan-chip');
    if(planChipEl) planChipEl.textContent='✓ '+planLabel;
    var pendingEl=document.getElementById('dash-pending-banner');
    if(pendingEl){
      if(state.myBiz&&!state.myBiz.approved) pendingEl.classList.remove('hidden');
      else pendingEl.classList.add('hidden');
    }
    updateNotifUI();
    renderDashOverview();
    renderDashMessages();
    showScreen('screen-dashboard');
    switchDashTab('overview');
    // Load sponsors for banner
    loadSponsors();
    // Check for unread messages
    setTimeout(updateUnreadMsgBadge, 1500);
  } catch(e) {
    console.error('enterDashboard error:', e.message);
    // Show dashboard anyway
    showScreen('screen-dashboard');
  }
}
function renderDashOverview(){
  var panel=document.getElementById('dash-panel-overview');
  if(!panel)return;
  var biz=state.myBiz;
  if(!biz||!biz.id){
    panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:2rem;">No listing found. Please submit your business profile.</p>';
    return;
  }

  // Show loading state
  panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:2rem;">Loading overview…</p>';

  // Load all stats in parallel
  Promise.all([
    apiFetch('/api/referrals?business_id='+biz.id),
    apiFetch('/api/jobs?business_id='+biz.id),
    apiFetch('/api/community?type=messages&business_id='+biz.id),
  ]).then(function(results){
    var refs=results[0].referrals||[];
    var jobs=results[1].jobs||[];
    var msgs=results[2].messages||[];

    // Count unique message senders
    var uniqueSenders=new Set(msgs.filter(function(m){return m.from_role==='user';}).map(function(m){return m.from_user_id||m.from_name;}));
    var msgCount=uniqueSenders.size;

    // Testimonials from local state
    var tms=biz.testimonials||[];

    // Count contacted referrals
    var contactedRefs=refs.filter(function(r){return r.contacted;}).length;

    // Update referral badge
    var refBadge=document.getElementById('dash-ref-cnt');
    if(refBadge){if(refs.length>0){refBadge.textContent=refs.length;refBadge.classList.remove('hidden');}else refBadge.classList.add('hidden');}

    // Update local state
    if(state.myBiz)state.myBiz.referrals=refs;

    panel.innerHTML=
      // Stats Row
      '<div class="stats-row">'+
        '<div class="stat-card"><div class="stat-val">'+refs.length+'</div><div class="stat-lbl">Referrals</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+msgCount+'</div><div class="stat-lbl">Messages</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+jobs.length+'</div><div class="stat-lbl">Active Jobs</div></div>'+
        '<div class="stat-card"><div class="stat-val">'+contactedRefs+'</div><div class="stat-lbl">Contacted</div></div>'+
      '</div>'+

      // Listing Status
      '<div class="dash-card" style="margin-bottom:1rem;">'+
        '<div class="dash-card-title">📋 Listing Status</div>'+
        '<div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0;">'+
          '<div style="width:10px;height:10px;border-radius:50%;background:'+(biz.approved?'#1a6b4a':'#c9973a')+';flex-shrink:0;"></div>'+
          '<div style="font-size:.84rem;font-weight:600;color:'+(biz.approved?'#1a6b4a':'#c9973a')+'">'+(biz.approved?'✅ Live — visible in directory':'⏳ Pending admin review')+'</div>'+
        '</div>'+
        '<div style="font-size:.78rem;color:var(--muted);">'+biz.name+' · '+biz.category+'</div>'+
      '</div>'+

      // Recent Referrals
      '<div class="dash-card" style="margin-bottom:1rem;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">'+
          '<div class="dash-card-title" style="margin-bottom:0;">🤝 Recent Referrals</div>'+
          (refs.length?'<button onclick="switchDashTab(\'referrals\')" style="font-size:.72rem;color:var(--green);background:none;border:none;cursor:pointer;font-weight:600;">View all →</button>':'')+
        '</div>'+
        (refs.length?refs.slice(0,3).map(function(r){
          var fc=!r.faith_status?'rf-other':r.faith_status.toLowerCase().includes('believer')?'rf-believer':r.faith_status.toLowerCase().includes('exploring')?'rf-exploring':'rf-other';
          return '<div class="ref-item" style="border-left:3px solid '+(r.contacted?'#1a6b4a':'#e8b4aa')+';padding-left:.75rem;margin-bottom:.5rem;">'+
            '<div class="ref-name">'+r.name+(r.contacted?' <span style="font-size:.65rem;background:#e0f0ea;color:#1a6b4a;padding:1px 6px;border-radius:8px;">✓ Contacted</span>':'')+'</div>'+
            '<div class="ref-detail">📞 '+r.phone+'</div>'+
            '<div style="font-size:.7rem;color:var(--muted);">Referred by '+(r.referred_by||'A Member')+'</div>'+
          '</div>';
        }).join(''):'<p style="font-size:.82rem;color:var(--muted);">No referrals yet.</p>')+
      '</div>'+

      // Recent Messages
      '<div class="dash-card" style="margin-bottom:1rem;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">'+
          '<div class="dash-card-title" style="margin-bottom:0;">💬 Recent Messages</div>'+
          (msgCount?'<button onclick="switchDashTab(\'messages\')" style="font-size:.72rem;color:var(--green);background:none;border:none;cursor:pointer;font-weight:600;">View all →</button>':'')+
        '</div>'+
        (msgs.length?
          (function(){
            // Show last 3 unique member messages
            var seen={};var recent=[];
            msgs.filter(function(m){return m.from_role==='user';}).reverse().forEach(function(m){
              var key=m.from_user_id||m.from_name;
              if(!seen[key]){seen[key]=true;recent.push(m);}
            });
            return recent.slice(0,3).map(function(m){
              var time=m.created_at?new Date(m.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
              return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.5rem 0;border-bottom:1px solid #f0ece6;">'+
                '<div>'+
                  '<div style="font-size:.84rem;font-weight:600;">'+( m.from_name||'Member')+'</div>'+
                  '<div style="font-size:.76rem;color:var(--muted);margin-top:.15rem;">'+m.text.substring(0,60)+(m.text.length>60?'…':'')+'</div>'+
                '</div>'+
                '<div style="font-size:.7rem;color:var(--muted);flex-shrink:0;margin-left:.5rem;">'+time+'</div>'+
              '</div>';
            }).join('');
          })()
        :'<p style="font-size:.82rem;color:var(--muted);">No messages yet.</p>')+
      '</div>'+

      // Newsletter card
      '<div class="dash-card" style="background:linear-gradient(135deg,var(--ink),#1a1612);color:#f7f4ef;">'+
        '<div style="font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:700;margin-bottom:.4rem;">Weekly Newsletter</div>'+
        '<div style="font-family:\'Playfair Display\',serif;font-size:1rem;margin-bottom:.4rem;">The Christ One\'s United Weekly</div>'+
        '<p style="font-size:.78rem;color:#8a8278;margin-bottom:.875rem;">Your business may be featured in our weekly community digest. Keep your listing active!</p>'+
        '<div style="font-size:.76rem;color:#4dbb8a;font-weight:600;">✓ Active listing — eligible for weekly feature</div>'+
      '</div>';

  }).catch(function(err){
    console.error('Overview load error:', err);
    panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:2rem;">Could not load overview. Please refresh.</p>';
  });
}
function renderRefItem(r){
  var fc=!r.faith?'rf-other':r.faith.toLowerCase().includes('believer')?'rf-believer':r.faith.toLowerCase().includes('exploring')?'rf-exploring':'rf-other';
  return '<div class="ref-item"><div class="ref-name">'+r.name+'</div><div class="ref-detail">📞 '+r.phone+(r.email?' · ✉️ '+r.email:'')+'</div>'+(r.need?'<div class="ref-detail">Need: '+r.need+'</div>':'')+(r.faith?'<span class="ref-faith-tag '+fc+'">'+r.faith+'</span>':'')+'</div>';
}
function switchDashTab(tab){
  ['overview','jobs','referrals','testimonials','messages','listing','biz-community','biz-guild'].forEach(function(t){
    var panel=document.getElementById('dash-panel-'+t);
    if(panel)panel.classList[t===tab?'remove':'add']('hidden');
    var tabBtn=document.getElementById('dash-tab-'+t);
    if(tabBtn)tabBtn.classList[t===tab?'add':'remove']('active');
    var navBtn=document.getElementById('dash-btn-'+t);
    if(navBtn)navBtn.classList[t===tab?'add':'remove']('active-biz');
  });
  if(tab==='jobs')renderDashJobs();
  if(tab==='referrals')renderDashReferrals();
  if(tab==='testimonials')renderDashTestimonials();
  if(tab==='messages'){renderDashMessages();markMessagesRead();}
  if(tab==='listing')renderDashListing();
  if(tab==='biz-community')renderBizCommunity();
  if(tab==='biz-guild')renderBizGuild();
}
function renderDashReferrals(){
  var panel=document.getElementById('dash-panel-referrals');
  if(!panel)return;
  panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Loading referrals…</div></div>';
  if(!state.myBiz||!state.myBiz.id){
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">All Referrals</div><p style="font-size:.82rem;color:var(--muted);">No referrals yet.</p></div>';
    return;
  }
  apiFetch('/api/referrals?business_id='+state.myBiz.id).then(function(data){
    var refs=data.referrals||[];
    // Also update local state
    if(state.myBiz)state.myBiz.referrals=refs;
    // Update overview badge
    var refBadge=document.getElementById('dash-ref-cnt');
    if(refBadge){if(refs.length>0){refBadge.textContent=refs.length;refBadge.classList.remove('hidden');}else refBadge.classList.add('hidden');}
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">All Referrals ('+refs.length+')</div>'+(refs.length?refs.map(function(r){
      var fc=!r.faith_status?'rf-other':r.faith_status.toLowerCase().includes('believer')?'rf-believer':r.faith_status.toLowerCase().includes('exploring')?'rf-exploring':'rf-other';
      var isContacted=r.contacted===true;
      return '<div class="ref-item" id="ref-item-'+r.id+'" style="border-left:3px solid '+(isContacted?'#1a6b4a':'#e8b4aa')+';opacity:'+(isContacted?'.7':'1')+';padding-left:.75rem;">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.25rem;">'+
          '<div class="ref-name">'+r.name+'</div>'+
          (isContacted?'<span style="font-size:.65rem;background:#e0f0ea;color:#1a6b4a;padding:2px 8px;border-radius:10px;font-weight:600;">✓ Contacted</span>':
          '<button onclick="markRefContacted(\''+r.id+'\')" style="font-size:.7rem;padding:3px 10px;background:#1a6b4a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;white-space:nowrap;">Mark Contacted</button>')+
        '</div>'+
        '<div class="ref-detail">📞 '+r.phone+(r.email?' · ✉️ '+r.email:'')+'</div>'+
        (r.need?'<div class="ref-detail">Need: '+r.need+'</div>':'')+
        (r.faith_status?'<span class="ref-faith-tag '+fc+'">'+r.faith_status+'</span>':'')+
        '<div style="font-size:.7rem;color:var(--muted);margin-top:.35rem;">Referred by <strong>'+(r.referred_by||'A Member')+'</strong>'+(r.contacted_at?' · Contacted '+new Date(r.contacted_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')+'</div>'+
      '</div>';
    }).join(''):'<p style="font-size:.82rem;color:var(--muted);">No referrals yet.</p>')+'</div>';
  }).catch(function(){
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">All Referrals</div><p style="font-size:.82rem;color:var(--muted);">Could not load referrals. Please refresh.</p></div>';
  });
}
function markRefContacted(id){
  // Update UI immediately
  var item=document.getElementById('ref-item-'+id);
  if(item){
    item.style.borderLeftColor='#1a6b4a';
    item.style.opacity='.7';
    var btn=item.querySelector('button');
    if(btn)btn.outerHTML='<span style="font-size:.65rem;background:#e0f0ea;color:#1a6b4a;padding:2px 8px;border-radius:10px;font-weight:600;">✓ Contacted</span>';
    var byLine=item.querySelector('div:last-child');
    if(byLine)byLine.innerHTML=byLine.innerHTML.replace('</div>','') + ' · Contacted just now</div>';
  }
  // Save to Supabase
  apiFetch('/api/referrals','PUT',{id:id,contacted:true}).catch(function(){});
  addNotif('Referral marked as contacted. 🙏');
}

function renderBizGuild(){
  var panel=document.getElementById('dash-panel-biz-guild');
  if(!panel)return;
  var bizId=state.myBiz&&state.myBiz.id;
  if(!bizId){renderGuild(panel);return;}
  // Load guild state from Supabase, then render
  panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);padding:1rem;">Loading Guild…</p>';
  apiFetch('/api/guilds?business_id='+bizId)
    .then(function(data){
      state.guild=data.guild||null;
      renderGuild(panel);
    })
    .catch(function(){renderGuild(panel);});
}

function renderBizCommunity(){
  var panel=document.getElementById('dash-panel-biz-community');
  if(!panel)return;
  panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Loading community…</p>';

  // Load prayer requests and events in parallel
  Promise.all([
    apiFetch('/api/community?type=prayer'),
    apiFetch('/api/community?type=events')
  ]).then(function(results){
    var prayers=results[0].prayers||[];
    var events=results[1].events||[];

    panel.innerHTML=
      // Prayer Board Section
      '<div class="dash-card" style="margin-bottom:1rem;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.875rem;">'+
          '<div class="dash-card-title" style="margin-bottom:0;">🙏 Prayer Board</div>'+
          '<button onclick="openPrayerModal()" style="padding:5px 12px;background:var(--red);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.72rem;font-weight:600;cursor:pointer;">+ Prayer Request</button>'+
        '</div>'+
        (prayers.length?prayers.slice(0,5).map(function(p){
          var alreadyPrayed=p.prayed_by&&p.prayed_by.includes(state.user?state.user.name:'');
          var isOwner=state.user&&(p.user_id===state.user.id||p.author===state.user.name);
          return '<div class="prayer-card" id="prayer-card-'+p.id+'" style="margin-bottom:.65rem;">'+
            '<div class="prayer-header">'+
              '<div class="prayer-author">🙏 '+(p.author||'Anonymous')+'</div>'+
              '<div style="display:flex;align-items:center;gap:.5rem;">'+
                '<div class="prayer-time">'+(p.created_at?new Date(p.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')+'</div>'+
                (isOwner?'<button onclick="deletePrayer(\''+p.id+'\')" style="background:none;border:none;color:#ccc;font-size:.85rem;cursor:pointer;padding:0;" title="Delete">🗑</button>':'')+
              '</div>'+
            '</div>'+
            '<p class="prayer-text">'+p.text+'</p>'+
            '<div style="display:flex;align-items:center;justify-content:space-between;">'+
              '<span class="prayer-prayed" id="biz-pray-cnt-'+p.id+'">'+(p.prayed_by?p.prayed_by.length:0)+' praying</span>'+
              '<button class="prayer-pray-btn'+(alreadyPrayed?' prayed':'')+'" id="biz-pray-btn-'+p.id+'" '+(alreadyPrayed?'disabled':'')+' onclick="prayFor(\''+p.id+'\')">'+(alreadyPrayed?'🙏 Praying':'🙏 Pray')+'</button>'+
            '</div>'+
          '</div>';
        }).join(''):'<p style="font-size:.82rem;color:var(--muted);">No prayer requests yet.</p>')+
      '</div>'+

      // Events Section
      '<div class="dash-card">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.875rem;">'+
          '<div class="dash-card-title" style="margin-bottom:0;">📅 Events Board</div>'+
          '<button onclick="openEventModal()" style="padding:5px 12px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.72rem;font-weight:600;cursor:pointer;">+ Post Event</button>'+
        '</div>'+
        (events.length?events.slice(0,5).map(function(e){
          var d=new Date(e.date),month=d.toLocaleString('default',{month:'short'}).toUpperCase(),day=d.getDate();
          var isOwner=state.user&&(e.user_id===state.user.id||e.host===state.user.name);
          return '<div class="event-card" id="event-card-'+e.id+'" style="margin-bottom:.65rem;">'+
            '<div class="event-date-box"><div class="event-month">'+month+'</div><div class="event-day">'+day+'</div></div>'+
            '<div class="event-body">'+
              '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'+
                '<div class="event-title">'+e.title+'</div>'+
                (isOwner?'<button onclick="deleteEvent(\''+e.id+'\')" style="background:none;border:none;color:#ccc;font-size:.9rem;cursor:pointer;padding:0 0 0 8px;flex-shrink:0;" title="Delete event">🗑</button>':'')+
              '</div>'+
              '<div class="event-meta">🕐 '+(e.time||'TBD')+'<br/>📍 '+(e.location||'TBD')+'</div>'+
              '<div class="event-host">Hosted by '+(e.host||'Community')+'</div>'+
            '</div>'+
          '</div>';
        }).join(''):'<p style="font-size:.82rem;color:var(--muted);">No events yet.</p>')+
      '</div>';

    // Sync prayer state so prayFor works correctly from dashboard too
    state.prayerRequests=prayers.map(function(p){return {
      id:p.id,author:p.author||'Anonymous',
      text:p.text,time:'',
      prayedBy:p.prayed_by||[],
      prayedByMe:p.prayed_by&&p.prayed_by.includes(state.user?state.user.name:'')
    };});

  }).catch(function(){
    panel.innerHTML='<p style="font-size:.82rem;color:var(--muted);text-align:center;padding:1rem;">Could not load community. Please refresh.</p>';
  });
}

function renderDashTestimonials(){
  var panel=document.getElementById('dash-panel-testimonials');
  panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Testimonials</div><p style="font-size:.82rem;color:var(--muted);">Loading…</p></div>';
  if(!state.myBiz){panel.innerHTML='<div class="dash-card"><p style="font-size:.82rem;color:var(--muted);">No business listing found.</p></div>';return;}
  apiFetch('/api/testimonials?business_id='+state.myBiz.id).then(function(data){
    var tms=[];
    if(data.success&&data.testimonials){
      tms=data.testimonials;
      // Sync back to local state
      state.myBiz.testimonials=tms.map(function(t){return{author:t.author_name,text:t.text};});
    }
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Testimonials ('+tms.length+')</div>'+(tms.length?tms.map(t=>'<div class="testimonial" style="margin-bottom:.65rem;"><div class="testimonial-text" style="font-size:.82rem;">"'+t.text+'"</div><div class="testimonial-author">— '+t.author_name+'</div></div>').join(''):'<p style="font-size:.82rem;color:var(--muted);">No testimonials yet. Members can tap ✍️ Testify on your listing to leave one.</p>')+'</div>';
  });
}
function renderDashMessages(){
  var panel=document.getElementById('dash-panel-messages');if(!panel)return;
  panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Member Messages</div><p style="font-size:.82rem;color:var(--muted);">Loading messages…</p></div>';
  if(!state.myBiz||!state.myBiz.id){
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Member Messages</div><p style="font-size:.82rem;color:var(--muted);">No messages yet. Messages from members will appear here.</p></div>';
    return;
  }
  apiFetch('/api/community?type=messages&business_id='+state.myBiz.id).then(function(data){
    var msgs=data.messages||[];
    // Group by member_user_id first, then fallback to from_user_id for user messages
    // All messages (user + business replies) for same member go into one thread
    var threads={};
    var memberIdToKey={};
    msgs.forEach(function(m){
      var key=null;
      if(m.from_role==='user'){
        // Member message — key by their user_id
        key=m.from_user_id||m.from_name||'anon';
        memberIdToKey[key]=key;
      } else {
        // Business reply — find matching member thread via member_user_id
        key=m.member_user_id||null;
        if(!key){
          // Fallback — attach to first available thread
          var keys=Object.keys(threads);
          key=keys.length?keys[0]:'anon';
        }
      }
      if(!threads[key]){
        var name=m.from_role==='user'?(m.from_name||'Member'):'Member';
        threads[key]={userId:key,name:name,messages:[]};
      }
      if(m.from_role==='user'&&m.from_name)threads[key].name=m.from_name;
      threads[key].messages.push(m);
    });
    var threadList=Object.values(threads);
    state.dashMsgThreads=threadList;
    if(!threadList.length){
      panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Member Messages</div><p style="font-size:.82rem;color:var(--muted);">No messages yet. Messages from members will appear here.</p></div>';
      return;
    }
    // Show ONE conversation box per member thread
    panel.innerHTML=
      '<div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;margin-bottom:1rem;">Conversations ('+threadList.length+')</div>'+
      threadList.map(function(t,i){
        var last=t.messages[t.messages.length-1];
        var lastTime=last&&last.created_at?new Date(last.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
        var lastText=last?last.text:'';
        var isLastFromBiz=last&&last.from_role==='business';
        var unread=t.messages.filter(function(m){return m.from_role==='user';}).length;
        return '<div onclick="openBizReplyThread('+i+')" style="display:flex;align-items:center;gap:.875rem;padding:.875rem 1rem;background:#fff;border-radius:14px;margin-bottom:.6rem;cursor:pointer;border:1.5px solid #ede9e1;box-shadow:0 1px 4px rgba(0,0,0,.04);" onmouseover="this.style.borderColor=\'#1a6b4a\'" onmouseout="this.style.borderColor=\'#ede9e1\'">'+
          '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a6b4a,#2d9b6f);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;flex-shrink:0;">'+t.name.charAt(0).toUpperCase()+'</div>'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">'+
              '<div style="font-weight:700;font-size:.9rem;color:#1a1612;">'+t.name+'</div>'+
              '<div style="font-size:.7rem;color:var(--muted);">'+lastTime+'</div>'+
            '</div>'+
            '<div style="font-size:.8rem;color:'+(isLastFromBiz?'#1a6b4a':'#7a7369')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">'+
              (isLastFromBiz?'<span style="color:#1a6b4a;font-weight:500;">You: </span>':'')+lastText+
            '</div>'+
          '</div>'+
          '<div style="color:#bbb;font-size:1.1rem;flex-shrink:0;">›</div>'+
        '</div>';
      }).join('');
  }).catch(function(){
    panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Member Messages</div><p style="font-size:.82rem;color:var(--muted);">Could not load messages. Please refresh.</p></div>';
  });
}

function openBizReplyThread(threadIdx){
  var threads=state.dashMsgThreads;
  if(!threads||!threads[threadIdx])return;
  var thread=threads[threadIdx];
  var bizId=state.myBiz?state.myBiz.id:null;
  var bizName=state.myBiz?state.myBiz.name:'Us';
  // Build chat bubble conversation
  document.getElementById('msgModalContent').innerHTML=
    // Header
    '<div style="display:flex;align-items:center;gap:.75rem;padding-bottom:.875rem;margin-bottom:.5rem;border-bottom:1px solid #ede9e1;">'+
      '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1a6b4a,#2d9b6f);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.95rem;flex-shrink:0;">'+thread.name.charAt(0).toUpperCase()+'</div>'+
      '<div>'+
        '<div style="font-weight:700;font-size:.9rem;color:#1a1612;">'+thread.name+'</div>'+
        '<div style="font-size:.7rem;color:var(--muted);">Member</div>'+
      '</div>'+
    '</div>'+
    // Chat bubbles
    '<div id="modal-bubbles" style="min-height:180px;max-height:300px;overflow-y:auto;padding:.25rem 0;margin-bottom:.75rem;display:flex;flex-direction:column;gap:.4rem;">'+
      thread.messages.map(function(m){
        var isBiz=m.from_role==='business';
        var time=m.created_at?new Date(m.created_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
        return '<div style="display:flex;flex-direction:column;align-items:'+(isBiz?'flex-end':'flex-start')+';gap:.15rem;">'+
          '<div style="'+
            'max-width:75%;'+
            'padding:.55rem .875rem;'+
            'border-radius:'+(isBiz?'18px 18px 4px 18px':'18px 18px 18px 4px')+';'+
            'background:'+(isBiz?'#1a6b4a':'#f0ece6')+';'+
            'color:'+(isBiz?'#fff':'#1a1612')+';'+
            'font-size:.84rem;'+
            'line-height:1.5;'+
            'word-break:break-word;'+
          '">'+m.text+'</div>'+
          '<div style="font-size:.62rem;color:#bbb;padding:0 4px;">'+time+'</div>'+
        '</div>';
      }).join('')+
    '</div>'+
    // Input
    '<div style="display:flex;gap:.5rem;align-items:center;border-top:1px solid #ede9e1;padding-top:.75rem;">'+
      '<input class="msg-input" id="modal-msg-inp" placeholder="Message '+thread.name+'…" style="flex:1;border-radius:20px;padding:.55rem 1rem;border:1.5px solid #ede9e1;font-size:.84rem;" onkeydown="if(event.key===\'Enter\')sendBizReply(\''+bizId+'\',\''+thread.name+'\')"/>'+
      '<button onclick="sendBizReply(\''+bizId+'\',\''+thread.name+'\')" style="width:36px;height:36px;border-radius:50%;background:#1a6b4a;border:none;color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">↑</button>'+
    '</div>';
  document.getElementById('msgModal').classList.add('open');
  setTimeout(function(){var b=document.getElementById('modal-bubbles');if(b)b.scrollTop=b.scrollHeight;},100);
}

function sendBizReply(bizId, memberName){
  var inp=document.getElementById('modal-msg-inp');
  var text=inp?inp.value.trim():'';
  if(!text)return;
  // Show immediately in SMS style
  var bubbles=document.getElementById('modal-bubbles');
  if(bubbles){
    var now=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    bubbles.innerHTML+=
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.15rem;">'+
        '<div style="max-width:75%;padding:.55rem .875rem;border-radius:18px 18px 4px 18px;background:#1a6b4a;color:#fff;font-size:.84rem;line-height:1.5;word-break:break-word;">'+text+'</div>'+
        '<div style="font-size:.62rem;color:#bbb;padding:0 4px;">'+now+'</div>'+
      '</div>';
    bubbles.scrollTop=bubbles.scrollHeight;
  }
  inp.value='';
  // Save to Supabase with member_user_id for proper threading
  var thread=state.dashMsgThreads?state.dashMsgThreads.find(function(t){return t.name===memberName;}):null;
  apiFetch('/api/community?type=messages','POST',{
    business_id:bizId,
    from_user_id:state.user?state.user.id:null,
    from_name:state.myBiz?state.myBiz.name:'Business',
    biz_name:state.myBiz?state.myBiz.name:'',
    text:text,
    from_role:'business',
    member_user_id:thread?thread.userId:null
  }).catch(function(){});
}
function renderDashListing(){
  var biz=state.myBiz;
  var panel=document.getElementById('dash-panel-listing');
  if(!biz){panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Your Listing</div><p style="font-size:.84rem;color:var(--muted);">No listing yet.</p></div>';return;}
  var svc=biz.service_type||'storefront';
  panel.innerHTML='<div class="dash-card"><div class="dash-card-title">Your Listing '+(!biz.approved?'<span class="biz-pending">⏳ Pending Review</span>':'<span class="biz-verified">✓ Live</span>')+'</div>'+
    '<div class="form-group"><label class="lbl">Description</label><textarea class="inp" id="edit-desc" style="min-height:72px;">'+escHtml(biz.description||'')+'</textarea></div>'+
    '<div class="form-group"><label class="lbl">Business ZIP Code</label><input class="inp" id="edit-zip" maxlength="10" value="'+escHtml(biz.zip||'')+'"/></div>'+
    '<div class="form-group"><label class="lbl">How do you serve customers?</label><div class="svc-opts" id="ed-svc-opts"></div></div>'+
    '<div class="form-group hidden" id="ed-radius-wrap"><label class="lbl">How far do you travel? (miles)</label><input class="inp" id="ed-radius" type="number" min="1" max="500" value="'+(svc==='service_area'&&biz.service_radius?biz.service_radius:30)+'"/></div>'+
    '<div class="form-group"><label class="lbl">Church</label><input class="inp" id="edit-church" autocomplete="off" placeholder="Start typing your church name…" value="'+escHtml(biz.church||'')+'"/></div>'+
    '<button class="btn btn-green btn-mt" id="edit-save-btn" onclick="saveListing()">Save Changes</button>'+
    '<div class="hint-msg" id="edit-msg" style="margin-top:.45rem;"></div></div>';
  renderSvcOpts('ed',svc);
  mountChurchPicker('edit-church',{zipInputId:'edit-zip'});
  if(biz.church_id)document.getElementById('edit-church').dataset.churchId=biz.church_id;
}
function saveListing(){
  var biz=state.myBiz,msg=document.getElementById('edit-msg'),btn=document.getElementById('edit-save-btn');
  function fail(t){msg.style.color='var(--red)';msg.textContent=t;}
  if(!biz||!biz.id||typeof biz.id==='number'){fail('Your listing is still being saved. Please try again in a moment.');return;}
  var desc=document.getElementById('edit-desc').value.trim();
  var zip=document.getElementById('edit-zip').value.trim();
  var svc=document.getElementById('ed-svc-opts').dataset.value||'storefront';
  var chInp=document.getElementById('edit-church');
  if(!desc){fail('Description is required.');return;}
  if(svc!=='national'&&!/^\d{5}(-\d{4})?$/.test(zip)){fail('Enter a valid 5-digit ZIP code.');return;}
  var payload={id:biz.id,user_id:state.user?state.user.id:null,description:desc,zip:zip,service_type:svc,
    service_radius:svc==='service_area'?(parseInt(document.getElementById('ed-radius').value,10)||30):(svc==='storefront'?25:null)};
  if(chInp.dataset.churchId){if(String(chInp.dataset.churchId)!==String(biz.church_id||''))payload.church_id=chInp.dataset.churchId;}
  else if(chInp.value.trim()!==(biz.church||'')){fail('Please pick your church from the list, or tap "Add" to add it.');return;}
  btn.disabled=true;btn.textContent='Saving…';msg.textContent='';
  apiFetch('/api/businesses','PUT',payload).then(function(d){
    btn.disabled=false;btn.textContent='Save Changes';
    if(!d.success||!d.business){fail(d.error||'Could not save. Please try again.');return;}
    var u=d.business;
    ['description','zip','service_type','service_radius','church','church_id','lat','lng'].forEach(function(k){biz[k]=u[k];});
    var b=state.businesses.find(function(x){return x.id===biz.id;});
    if(b)['description','zip','service_type','service_radius','church','church_id','lat','lng'].forEach(function(k){b[k]=u[k];});
    msg.style.color='var(--green)';msg.textContent='✓ Saved';
  });
}

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
// Jobs are loaded from Supabase via loadJobs() in enterDirectory()
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
  var contactPhone=j.contactPhone||j.contact_phone||'';
  var contactEmail=j.contactEmail||j.contact_email||'';
  div.innerHTML=
    (ntw?'<div class="job-new-badge">🆕 New This Week</div>':'')+
    '<div class="job-card-head"><div class="job-title">'+j.title+'</div><span class="job-type-badge '+typeClass+'">'+j.type+'</span></div>'+
    '<div class="job-company">🏢 '+j.company+'</div>'+
    '<div class="job-meta-row"><span class="job-meta-item">📍 '+j.location+'</span>'+(j.pay?'<span class="job-meta-item">💵 '+j.pay+'</span>':'')+'<span class="job-meta-item">🗓 '+posted+'</span></div>'+
    '<p class="job-desc">'+j.description+'</p>'+
    (j.faithNote?'<div class="job-faith-note">✝️ '+j.faithNote+'</div>':'')+
    (j.tags&&j.tags.length?'<div class="job-tags">'+j.tags.map(t=>'<span class="job-tag">'+t+'</span>').join('')+'</div>':'')+
    // Contact info section
    ((contactPhone||contactEmail)?
      '<div style="background:#f7f4ef;border-radius:9px;padding:.75rem 1rem;margin-top:.75rem;font-size:.82rem;">'+
        '<div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:var(--muted);margin-bottom:.4rem;">Contact to Apply</div>'+
        (contactPhone?'<div style="margin-bottom:.25rem;">📞 <strong>'+contactPhone+'</strong></div>':'')+
        (contactEmail?'<div><a href="mailto:'+contactEmail+'" style="color:var(--red);font-weight:600;text-decoration:none;">✉️ '+contactEmail+'</a></div>':'')+
      '</div>':'')+ 
    '<div class="job-actions" style="margin-top:.75rem;">'+
      '<button class="job-save-btn'+(saved?' saved':'')+'" onclick="toggleJobSave(\''+j.id+'\')" style="margin-right:auto;">'+(saved?'♥ Saved':'♡ Save')+'</button>'+
      '<span style="position:relative;display:inline-flex;align-items:center;">'+
        '<button class="job-report-btn" onclick="toggleJobReport(this)" title="Report this posting">?</button>'+
        '<span class="job-report-bubble">If any inappropriate information or activity is found in or through this job posting, please report for immediate administrative review.<br/><br/><button onclick="submitJobReport(\''+j.id+'\')" style="margin-top:6px;padding:5px 12px;background:var(--red);color:#fff;border:none;border-radius:6px;font-family:DM Sans,sans-serif;font-size:.72rem;font-weight:600;cursor:pointer;width:100%;">Report This Post</button></span>'+
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
  var panel=document.getElementById('dash-panel-jobs');
  if(!panel)return;
  var postBtn='<button onclick="openPostJobModal()" style="padding:8px 16px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.78rem;font-weight:600;cursor:pointer;">+ Post a Job</button>';
  panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;"><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">Active Listings</div>'+postBtn+'</div><p style="font-size:.82rem;color:var(--muted);">Loading…</p>';

  if(!state.myBiz||!state.myBiz.id){
    panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;"><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">Active Listings</div>'+postBtn+'</div><div class="empty-state" style="padding:2rem;"><div class="empty-icon">💼</div><div class="empty-title">No active job listings</div><p>Post your first position.</p></div>';
    return;
  }

  // Load jobs from Supabase filtered by business_id
  apiFetch('/api/jobs?business_id='+state.myBiz.id).then(function(data){
    var myJobs=data.jobs||[];
    var badge=document.getElementById('dash-jobs-cnt');
    if(badge){if(myJobs.length>0){badge.textContent=myJobs.length;badge.classList.remove('hidden');}else badge.classList.add('hidden');}
    panel.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">'+
      '<div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">Active Listings ('+myJobs.length+')</div>'+
      postBtn+'</div>'+
      (myJobs.length?myJobs.map(function(j){
        var typeClass={Full:'jt-full','Part':'jt-part','Contract':'jt-contract','Volunteer':'jt-volunteer'}[(j.type||'').split('-')[0]]||'jt-full';
        var daysAgo=Math.floor((Date.now()-new Date(j.created_at||j.postedDate).getTime())/86400000)||0;
        return '<div class="dash-job-item">'+
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'+
            '<div class="dash-job-title">'+j.title+'</div>'+
            '<span class="job-type-badge '+typeClass+'" style="flex-shrink:0;margin-left:8px;">'+j.type+'</span>'+
          '</div>'+
          '<div class="dash-job-meta">📍 '+(j.location||'')+(j.pay?' · 💵 '+j.pay:'')+'</div>'+
          '<div style="font-size:.73rem;color:var(--muted);margin-bottom:.5rem;">Posted '+daysAgo+' day'+(daysAgo!==1?'s':'')+' ago</div>'+
          (j.contact_phone||j.contact_email?
            '<div style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem;">'+
              (j.contact_phone?'📞 '+j.contact_phone+' ':'')+
              (j.contact_email?'✉️ '+j.contact_email:'')+
            '</div>':'')+
          '<div class="dash-job-actions">'+
            '<button class="dash-job-close-btn" onclick="closeJob(\''+j.id+'\')">Close Listing</button>'+
          '</div>'+
        '</div>';
      }).join(''):
      '<div class="empty-state" style="padding:2rem;"><div class="empty-icon">💼</div><div class="empty-title">No active job listings</div><p>Post your first position to start receiving applications.</p></div>');
  }).catch(function(){
    panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;"><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;">Active Listings</div>'+postBtn+'</div><p style="font-size:.82rem;color:var(--muted);">Could not load jobs. Please refresh.</p>';
  });
}
function closeJob(id){
  const bizId = state.myBiz && state.myBiz.id;
  if(!bizId){addNotif('Unable to verify your business. Please refresh.');return;}
  // Verify ownership client-side before even calling the API
  const job = state.jobs && state.jobs.find(j=>j.id===id);
  if(!job){addNotif('Job not found.');return;}
  if(job.business_id !== bizId){addNotif('You can only close your own listings.');return;}
  apiFetch('/api/jobs','PUT',{id:id,business_id:bizId}).catch(function(){});
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
    '<div class="form-group"><label class="lbl">Business Name <span class="req">*</span></label><input class="inp" id="pj-bizname" placeholder="e.g. The Golden Fork" value="'+(state.myBiz?state.myBiz.name:'')+'"/></div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label class="lbl">Contact Phone <span class="req">*</span></label><input class="inp" id="pj-contact-phone" placeholder="(555) 000-0000" value="'+(state.myBiz?state.myBiz.phone||'':'')+'"/></div>'+
      '<div class="form-group"><label class="lbl">Contact Email <span class="req">*</span></label><input class="inp" type="email" id="pj-contact-email" placeholder="hiring@yourbiz.com" value="'+(state.myBiz?state.myBiz.email||'':'')+'"/></div>'+
    '</div>'+
    '<button class="btn btn-green btn-mt" onclick="submitPostJob()">Post Job →</button>';
  document.getElementById('jobModal').classList.add('open');
}
// toggleApplyInput removed — apply fields replaced with contact info fields
function submitPostJob(){
  var title=document.getElementById('pj-title').value.trim();
  var type=document.getElementById('pj-type').value;
  var loc=document.getElementById('pj-loc').value.trim();
  var desc=document.getElementById('pj-desc').value.trim();
  var bizName=document.getElementById('pj-bizname').value.trim();
  var contactPhone=document.getElementById('pj-contact-phone').value.trim();
  var contactEmail=document.getElementById('pj-contact-email').value.trim();
  if(!title||!type||!loc||!desc||!bizName||!contactPhone||!contactEmail){
    alert('Please fill in all required fields.');return;
  }
  var biz=state.myBiz||state.businesses[0];
  var newJob={
    id:Date.now(),
    title:title,
    company:bizName,
    bizId:biz?biz.id:0,
    category:document.getElementById('pj-cat').value,
    type:type,location:loc,
    zip:document.getElementById('pj-zip').value,
    pay:document.getElementById('pj-pay').value,
    description:desc,
    faithNote:document.getElementById('pj-faith').value,
    contactPhone:contactPhone,
    contactEmail:contactEmail,
    applyMethod:'contact',
    applyContact:contactEmail,
    tags:[],postedDate:new Date(),savedByUsers:[],applicants:[]
  };
  // Save to Supabase
  apiFetch('/api/jobs','POST',{
    business_id:biz?biz.id:null,
    title:title,type:type,
    category:newJob.category,
    location:loc,
    zip:newJob.zip,
    pay:newJob.pay,
    description:desc,
    faith_note:newJob.faithNote,
    company:bizName,
    contact_phone:contactPhone,
    contact_email:contactEmail,
  }).then(function(data){
    if(data.success&&data.job)newJob.id=data.job.id;
  }).catch(function(){});
  state.jobs.unshift(newJob);
  closeModal('jobModal');renderDashJobs();
  addNotif('💼 Your job "'+title+'" is now live on the Job Board!');
}

// ═══════════════ ADMIN DATA
state.admin = {
  reportedContent:[],
  members:[],
  appeals:[],
  auditLog:[],
  nlSubscribers:0,
  nlSentCount:0,
  realMembers:null,
};

// ═══════════════ ADMIN AUTH
function doAdminLogin(){
  var email=document.getElementById('adm-email').value.trim();
  var pass=document.getElementById('adm-pass').value;
  var errEl=document.getElementById('adm-err');
  errEl.style.display='none';
  if(!email||!pass){errEl.style.display='block';return;}
  // Send credentials to server for verification
  fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-key':pass},
    body:JSON.stringify({action:'verify'})
  }).then(function(res){
    if(res.status===401){errEl.style.display='block';return;}
    return res.json();
  }).then(function(data){
    if(!data)return;
    // Any non-401 response means the key is valid
    state.adminKey=pass;
    closeModal('adminSignInModal');
    enterAdmin();
  }).catch(function(){
    errEl.style.display='block';
  });
}
function doAdminSignOut(){document.body.classList.remove('admin-mode');showScreen('screen-landing');}
function enterAdmin(){
  document.body.classList.add('admin-mode');
  showScreen('screen-admin');
  switchAdminTab('overview');
  updateAdminBadges();
}
function updateAdminBadges(){
  var reports=state.admin.reportedContent.filter(r=>!r.resolved).length;
  var appeals=state.admin.appeals.filter(a=>a.status==='pending').length;
  var rC=document.getElementById('adm-cnt-reports');
  var apC=document.getElementById('adm-cnt-appeals');
  if(reports>0){rC.textContent=reports;rC.classList.remove('hidden');}else rC.classList.add('hidden');
  if(appeals>0){apC.textContent=appeals;apC.classList.remove('hidden');}else apC.classList.add('hidden');
  // Load real pending count from Supabase
  apiFetch('/api/businesses?approved=false').then(function(data){
    var pending=data.businesses?data.businesses.length:0;
    var aC=document.getElementById('adm-cnt-approvals');
    if(pending>0){aC.textContent=pending;aC.classList.remove('hidden');}else aC.classList.add('hidden');
  }).catch(function(){
    var pending=state.pendingBusinesses.filter(b=>!b.approved).length;
    var aC=document.getElementById('adm-cnt-approvals');
    if(pending>0){aC.textContent=pending;aC.classList.remove('hidden');}else aC.classList.add('hidden');
  });
}
function switchAdminTab(tab){
  ['overview','approvals','reports','members','jobs','sponsors','newsletter','appeals','audit','churches'].forEach(function(t){
    document.getElementById('adm-tab-'+t).classList[t===tab?'remove':'add']('hidden');
    document.getElementById('adm-btn-'+t).classList[t===tab?'add':'remove']('on');
  });
  var renders={overview:renderAdminOverview,approvals:renderAdminApprovals,reports:renderAdminReports,members:renderAdminMembers,jobs:renderAdminJobs,sponsors:renderAdminSponsors,newsletter:renderAdminNewsletter,appeals:renderAdminAppeals,audit:renderAdminAudit,churches:renderAdminChurches};
  if(renders[tab])renders[tab]();
}
function addAuditLog(icon,text){state.admin.auditLog.unshift({icon:icon,text:text,time:'Just now'});}

// ═══════════════ ADMIN OVERVIEW
function renderAdminOverview(){
  var el=document.getElementById('adm-tab-overview');
  el.innerHTML='<div class="admin-page-title">Dashboard Overview</div><div class="admin-page-sub">Loading…</div>';
  fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},
    body:JSON.stringify({action:'get_members'})
  }).then(function(r){return r.json();}).then(function(data){
    var members=(data.members||[]).map(function(m){return {
      id:m.id,name:m.name,email:m.email,
      type:m.type==='business'?'Business':'Individual',
      status:m.status||'active',
    };});
    var totalMembers=members.length;
    var indCount=members.filter(m=>m.type==='Individual').length;
    var bizCount=members.filter(m=>m.type==='Business').length;
    var activeCount=members.filter(m=>m.status==='active').length;
    var pendingCount=state.pendingBusinesses.filter(b=>!b.approved).length;
    var reportCount=state.admin.reportedContent.filter(r=>!r.resolved).length;
    var jobCount=state.jobs.length;
    var recentLog=state.admin.auditLog.slice(0,5);
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
      '</div>'+
      '<div class="admin-card" style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem;">'+
        '<div style="font-size:1.5rem;margin-bottom:.5rem;">📈</div>'+
        '<div style="font-weight:600;color:var(--text);margin-bottom:.25rem;">Revenue Reporting</div>'+
        'Live revenue data will appear here once Stripe is connected.'+
      '</div>'+
      '<div class="admin-card">'+
        '<div style="font-family:\'Playfair Display\',serif;font-size:.95rem;margin-bottom:.875rem;">🕐 Recent Activity</div>'+
        (recentLog.length?
          recentLog.map(function(a){return '<div class="audit-item"><div class="audit-icon">'+a.icon+'</div><div class="audit-text">'+a.text+'</div><div class="audit-time">'+a.time+'</div></div>';}).join(''):
          '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:1rem;">No activity recorded yet.</div>'
        )+
      '</div>';
  }).catch(function(){
    el.innerHTML='<div class="admin-page-title">Dashboard Overview</div><div class="admin-page-sub" style="color:var(--red);">Could not load data. Please refresh.</div>';
  });
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
  el.innerHTML='<div class="admin-page-title">Business Approvals</div><div class="admin-page-sub">Loading pending listings…</div>';
  // Load real pending businesses from Supabase
  apiFetch('/api/businesses?approved=false').then(function(data){
    var pending=[];
    if(data.success&&data.businesses){
      pending=data.businesses.filter(function(b){return !b.approved;});
    }
    // Also include any local pending businesses
    var localPending=state.pendingBusinesses.filter(b=>!b.approved);
    pending=pending.concat(localPending.filter(function(lb){
      return !pending.find(function(pb){return pb.id===lb.id;});
    }));
    el.innerHTML=
      '<div class="admin-page-title">Business Approvals</div>'+
      '<div class="admin-page-sub">'+pending.length+' listing'+(pending.length!==1?'s':'')+' awaiting review</div>'+
      (pending.length?pending.map(function(b){
        return '<div class="admin-card pending">'+
          '<div class="admin-card-head"><div class="admin-card-title">'+b.name+'</div><span class="admin-card-badge ab-gold">⏳ Pending</span></div>'+
          '<div class="admin-card-meta">'+
            '📂 '+(b.category||'N/A')+
            ' · 📍 '+(b.address||'N/A')+
            ' · ✝️ '+(b.church||'N/A')+
            (b.church_address?' · '+(b.church_address||''):'')+
            '<br/>📞 '+(b.phone||'N/A')+
            ' · ✉️ '+(b.email||'N/A')+
            (b.website?' · 🌐 '+b.website:'')+
          '</div>'+
          '<div class="admin-card-content">'+(b.description||'No description provided.')+'</div>'+
          '<div class="admin-actions">'+
            '<button class="adm-approve" onclick="adminApproveBiz(\''+b.id+'\')">✓ Approve</button>'+
            '<button class="adm-reject" onclick="adminRejectBiz(\''+b.id+'\')">✗ Reject</button>'+
          '</div>'+
        '</div>';
      }).join(''):
      '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">All caught up!</div><p>No listings pending review.</p></div>');
  }).catch(function(){
    // Fallback to local state if API fails
    var pending=state.pendingBusinesses.filter(b=>!b.approved);
    el.innerHTML=
      '<div class="admin-page-title">Business Approvals</div>'+
      '<div class="admin-page-sub">'+pending.length+' listing'+(pending.length!==1?'s':'')+' awaiting review</div>'+
      (pending.length?pending.map(function(b){
        return '<div class="admin-card pending">'+
          '<div class="admin-card-head"><div class="admin-card-title">'+b.name+'</div><span class="admin-card-badge ab-gold">⏳ Pending</span></div>'+
          '<div class="admin-card-meta">📂 '+b.category+' · 📍 '+(b.address||'N/A')+' · ✝️ '+b.church+'</div>'+
          '<div class="admin-card-content">'+b.description+'</div>'+
          '<div class="admin-actions">'+
            '<button class="adm-approve" onclick="adminApproveBiz(\''+b.id+'\')">✓ Approve</button>'+
            '<button class="adm-reject" onclick="adminRejectBiz(\''+b.id+'\')">✗ Reject</button>'+
          '</div>'+
        '</div>';
      }).join(''):
      '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">All caught up!</div><p>No listings pending review.</p></div>');
  });
}

function adminApproveBiz(id){
  // Update in Supabase via admin API
  fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},
    body:JSON.stringify({action:'approve_business',business_id:id})
  }).then(function(res){return res.json();}).then(function(data){
    if(data.success){
      // Update local state
      var b=state.pendingBusinesses.find(x=>x.id===id);
      if(b){b.approved=true;b.verified=true;if(!state.businesses.find(x=>x.id===id))state.businesses.unshift(b);}
      state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
      if(state.myBiz&&state.myBiz.id===id){state.myBiz.approved=true;state.myBiz.verified=true;}
      addAuditLog('✅','Business listing approved.');
      updateAdminBadges();
      renderAdminApprovals();
    }
  }).catch(function(){
    // Fallback local approve
    var b=state.pendingBusinesses.find(x=>x.id===id);
    if(b){b.approved=true;b.verified=true;if(!state.businesses.find(x=>x.id===id))state.businesses.unshift(b);}
    state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
    addAuditLog('✅','Business listing approved (local).');
    updateAdminBadges();renderAdminApprovals();
  });
}

function adminRejectBiz(id){
  fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},
    body:JSON.stringify({action:'reject_business',business_id:id})
  }).then(function(res){return res.json();}).then(function(data){
    state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
    addAuditLog('🚫','Business listing rejected.');
    updateAdminBadges();renderAdminApprovals();
  }).catch(function(){
    state.pendingBusinesses=state.pendingBusinesses.filter(x=>x.id!==id);
    addAuditLog('🚫','Business listing rejected (local).');
    updateAdminBadges();renderAdminApprovals();
  });
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
  el.innerHTML='<div class="admin-page-title">Member Management</div><div class="admin-page-sub">Loading members…</div>';
  fetch('/api/admin',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},
    body:JSON.stringify({action:'get_members'})
  }).then(function(r){return r.json();}).then(function(data){
    var members=data.members||[];
    // Normalize Supabase fields to match our table builder
    members=members.map(function(m){return {
      id:m.id,name:m.name,email:m.email,
      type:m.type==='business'?'Business':'Individual',
      plan:m.plan==='annual'?'Annual':'Monthly',
      church:m.church||'',
      joined:m.created_at?new Date(m.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'',
      status:m.status||'active',
      faithAnswer:m.faith_answer||'yes',
      referrals:0
    };});
    el.innerHTML=
      '<div class="admin-page-title">Member Management</div>'+
      '<div class="admin-page-sub">'+members.length+' total members</div>'+
      '<input class="member-search" id="adm-member-search" placeholder="Search by name, email, or church…" oninput="filterAdminMembers()"/>'+
      '<div id="adm-member-table-wrap">'+buildMemberTable(members)+'</div>';
    state.admin.realMembers=members;
  }).catch(function(){
    // Fallback to demo data
    el.innerHTML=
      '<div class="admin-page-title">Member Management</div>'+
      '<div class="admin-page-sub">'+state.admin.members.length+' total members</div>'+
      '<input class="member-search" id="adm-member-search" placeholder="Search by name, email, or church…" oninput="filterAdminMembers()"/>'+
      '<div id="adm-member-table-wrap">'+buildMemberTable(state.admin.members)+'</div>';
  });
}
function filterAdminMembers(){
  var q=document.getElementById('adm-member-search').value.toLowerCase();
  var allMembers=state.admin.realMembers||state.admin.members;
  var filtered=allMembers.filter(function(m){return !q||m.name.toLowerCase().includes(q)||m.email.toLowerCase().includes(q)||(m.church&&m.church.toLowerCase().includes(q));});
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
  fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},body:JSON.stringify({action:'suspend_member',user_id:id})})
  .then(function(r){return r.json();}).then(function(){
    addAuditLog('🚫','Member suspended by Admin.');
    renderAdminMembers();
  }).catch(function(){
    var m=state.admin.members.find(x=>x.id===id);if(m)m.status='suspended';
    addAuditLog('🚫','Member suspended by Admin.');
    renderAdminMembers();
  });
}
function adminRestoreMember(id){
  fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},body:JSON.stringify({action:'restore_member',user_id:id})})
  .then(function(r){return r.json();}).then(function(){
    addAuditLog('✅','Member restored by Admin.');
    renderAdminMembers();
  }).catch(function(){
    var m=state.admin.members.find(x=>x.id===id);if(m)m.status='active';
    addAuditLog('✅','Member restored by Admin.');
    renderAdminMembers();
  });
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
      mkStat(state.admin.nlSubscribers||'—','Subscribers','blue')+
      mkStat(state.admin.nlSentCount||0,'Editions Sent','green')+
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
      '<button class="btn btn-mt" style="background:#1a1a2e;color:#fff;" onclick="sendNewsletter()">📬 Send Newsletter</button>'+
    '</div>';
}
function sendNewsletter(){
  var subj=document.getElementById('nl-subject').value.trim();
  if(!subj){alert('Please enter a subject line.');return;}
  state.admin.nlSentCount++;
  addAuditLog('📬','Newsletter "'+subj+'" sent.');
  alert('Newsletter sent! 🎉');
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

// ═══════════════ SPONSOR BANNER
state.sponsors = [];
state.sponsorIndex = 0;
state.sponsorTimer = null;
state.bannerDismissed = false;

async function loadSponsors(){
  try {
    var data = await apiFetch('/api/sponsors');
    if(data.success && data.sponsors){
      state.sponsors = data.sponsors;
      initBanner();
    }
  } catch(e){
    // Silently fail — banner just stays hidden
  }
}

function initBanner(){
  var banner = document.getElementById('sponsor-banner');
  var slidesEl = document.getElementById('sponsor-slides');
  var dotsEl = document.getElementById('sponsor-dots');
  if(!banner||!slidesEl||state.bannerDismissed) return;
  if(!state.sponsors.length){ banner.classList.remove('has-sponsors'); return; }

  // Build slides
  slidesEl.innerHTML = '';
  dotsEl.innerHTML = '';
  state.sponsors.forEach(function(s, i){
    var slide = document.createElement('div');
    slide.className = 'sponsor-slide' + (i===0?' active':'');
    slide.id = 'sponsor-slide-'+i;
    var logoHtml = s.logo_url
      ? '<img class="sponsor-logo" src="'+s.logo_url+'" alt="'+s.name+'" onerror="this.style.display=\'none\'"/>'
      : '<div class="sponsor-logo-placeholder">'+s.name.charAt(0)+'</div>';
    var linkStart = s.link_url ? '<a href="'+s.link_url+'" target="_blank" style="text-decoration:none;display:contents;">' : '';
    var linkEnd = s.link_url ? '</a>' : '';
    slide.innerHTML =
      logoHtml +
      '<div class="sponsor-text">'+
        '<div class="sponsor-label">National Sponsor</div>'+
        '<div class="sponsor-name">'+s.name+'</div>'+
        '<div class="sponsor-tagline">'+s.tagline+'</div>'+
      '</div>'+
      linkStart+
      '<button class="sponsor-cta" '+(s.link_url?'onclick="window.open(\''+s.link_url+'\',\'_blank\')"':'')+'>Learn More</button>'+
      linkEnd;
    slidesEl.appendChild(slide);

    // Dot
    var dot = document.createElement('div');
    dot.className = 'sponsor-dot'+(i===0?' active':'');
    dot.id = 'sponsor-dot-'+i;
    dotsEl.appendChild(dot);
  });

  banner.classList.add('has-sponsors');
  startBannerRotation();
}

function startBannerRotation(){
  if(state.sponsorTimer) clearTimeout(state.sponsorTimer);
  if(!state.sponsors.length) return;
  var current = state.sponsors[state.sponsorIndex];
  var duration = (current.duration_seconds || 8) * 1000;
  state.sponsorTimer = setTimeout(function(){
    advanceBanner();
  }, duration);
}

function advanceBanner(){
  if(!state.sponsors.length) return;
  var prev = state.sponsorIndex;
  state.sponsorIndex = (state.sponsorIndex + 1) % state.sponsors.length;
  var prevSlide = document.getElementById('sponsor-slide-'+prev);
  var nextSlide = document.getElementById('sponsor-slide-'+state.sponsorIndex);
  var prevDot = document.getElementById('sponsor-dot-'+prev);
  var nextDot = document.getElementById('sponsor-dot-'+state.sponsorIndex);
  if(!prevSlide||!nextSlide) return;

  // Slide out previous
  prevSlide.classList.remove('active');
  prevSlide.classList.add('exit');
  if(prevDot) prevDot.classList.remove('active');

  // Slide in next
  nextSlide.classList.add('active');
  if(nextDot) nextDot.classList.add('active');

  // Clean up exit class after animation
  setTimeout(function(){
    if(prevSlide) prevSlide.classList.remove('exit');
  }, 600);

  startBannerRotation();
}

function dismissBanner(){
  state.bannerDismissed = true;
  if(state.sponsorTimer) clearTimeout(state.sponsorTimer);
  var banner = document.getElementById('sponsor-banner');
  if(banner) banner.classList.remove('has-sponsors');
}

// ═══════════════ ADMIN SPONSORS
state.adminSponsors = [];

async function loadAdminSponsors(){
  try {
    var res = await fetch('/api/sponsors?all=true', {
      headers:{'x-admin-key': state.adminKey||''}
    });
    var data = await res.json();
    if(data.success) state.adminSponsors = data.sponsors||[];
  } catch(e){ state.adminSponsors=[]; }
}

function renderAdminSponsors(){
  var el = document.getElementById('adm-tab-sponsors');
  loadAdminSponsors().then(function(){
    var today = new Date().toISOString().split('T')[0];
    el.innerHTML =
      '<div class="admin-page-title">📢 Sponsor Banner</div>'+
      '<div class="admin-page-sub">Manage national sponsors displayed in the rotating banner</div>'+
      '<button onclick="openAddSponsorForm()" style="width:100%;padding:11px;background:#1a1a2e;color:#fff;border:none;border-radius:9px;font-family:\'DM Sans\',sans-serif;font-weight:600;font-size:.88rem;cursor:pointer;margin-bottom:1.25rem;">+ Add New Sponsor</button>'+
      '<div id="add-sponsor-form"></div>'+
      (state.adminSponsors.length?
        state.adminSponsors.map(function(s){
          var isActive=s.active&&s.start_date<=today&&s.end_date>=today;
          var isScheduled=s.active&&s.start_date>today;
          var statusClass=isActive?'sponsor-status-active':isScheduled?'sponsor-status-scheduled':'sponsor-status-inactive';
          var statusLabel=isActive?'● Live':isScheduled?'◷ Scheduled':'○ Inactive';
          return '<div class="sponsor-admin-card">'+
            '<div class="sponsor-admin-head">'+
              '<div class="sponsor-admin-name">'+s.name+'</div>'+
              '<span class="'+statusClass+'">'+statusLabel+'</span>'+
            '</div>'+
            '<div class="sponsor-admin-meta">'+
              '🗓 '+s.start_date+' → '+s.end_date+'<br/>'+
              '⏱ '+s.duration_seconds+'s display time<br/>'+
              (s.link_url?'🔗 '+s.link_url+'<br/>':'')+
              '📝 '+s.tagline+
            '</div>'+
            '<div class="sponsor-preview">'+
              (s.logo_url?'<img style="width:28px;height:28px;border-radius:5px;object-fit:cover;" src="'+s.logo_url+'" onerror="this.style.display=\'none\'"/>':'<div style="width:28px;height:28px;border-radius:5px;background:rgba(201,151,58,.2);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#c9973a;">'+s.name.charAt(0)+'</div>')+
              '<div style="flex:1;min-width:0;">'+
                '<div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.12em;color:rgba(201,151,58,.8);font-weight:700;">National Sponsor</div>'+
                '<div style="font-size:.82rem;font-weight:600;color:#fff;">'+s.name+'</div>'+
                '<div style="font-size:.65rem;color:rgba(255,255,255,.55);">'+s.tagline+'</div>'+
              '</div>'+
              '<div style="padding:4px 10px;background:#c9973a;color:#0f0e0c;border-radius:20px;font-size:.65rem;font-weight:700;">Learn More</div>'+
            '</div>'+
            '<div style="display:flex;gap:7px;">'+
              '<button onclick="toggleSponsorActive(\''+s.id+'\','+(!s.active)+')" style="flex:1;padding:6px;background:'+(s.active?'#fdf3e3':'#e0f0ea')+';color:'+(s.active?'#c9973a':'#1a6b4a')+';border:1.5px solid '+(s.active?'#c9973a':'#1a6b4a')+';border-radius:7px;font-family:\'DM Sans\',sans-serif;font-size:.73rem;font-weight:600;cursor:pointer;">'+(s.active?'Pause':'Activate')+'</button>'+
              '<button onclick="deleteSponsor(\''+s.id+'\')" style="padding:6px 12px;background:#fde8e4;color:#c8452d;border:1.5px solid #c8452d;border-radius:7px;font-family:\'DM Sans\',sans-serif;font-size:.73rem;font-weight:600;cursor:pointer;">Delete</button>'+
            '</div>'+
          '</div>';
        }).join(''):
        '<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-title">No sponsors yet</div><p>Add your first national sponsor above.</p></div>'
      );
  });
}

function openAddSponsorForm(){
  document.getElementById('add-sponsor-form').innerHTML =
    '<div class="admin-card" style="border-color:#1a1a2e;">'+
    '<div style="font-family:\'Playfair Display\',serif;font-size:.95rem;margin-bottom:.875rem;">New Sponsor</div>'+
    '<div class="form-group"><label class="lbl">Business Name <span class="req">*</span></label><input class="inp" id="sp-name" placeholder="e.g. Faith Financial Group" style="background:#fff;"/></div>'+
    '<div class="form-group"><label class="lbl">Tagline <span class="req">*</span></label><input class="inp" id="sp-tagline" placeholder="e.g. Trusted financial planning for Christian families" style="background:#fff;"/></div>'+
    '<div class="form-group"><label class="lbl">Logo URL</label><input class="inp" id="sp-logo" placeholder="https://example.com/logo.png" style="background:#fff;"/><div class="hint-msg">Link to their logo image. Leave blank to show initial letter.</div></div>'+
    '<div class="form-group"><label class="lbl">Link URL</label><input class="inp" id="sp-link" placeholder="https://theirbusiness.com" style="background:#fff;"/></div>'+
    '<div class="form-group"><label class="lbl">Display Duration: <span id="sp-dur-val">8</span> seconds</label><input type="range" class="duration-slider" id="sp-duration" min="3" max="30" value="8" oninput="document.getElementById(\'sp-dur-val\').textContent=this.value"/></div>'+
    '<div class="form-row">'+
      '<div class="form-group"><label class="lbl">Start Date <span class="req">*</span></label><input class="inp" type="date" id="sp-start" style="background:#fff;"/></div>'+
      '<div class="form-group"><label class="lbl">End Date <span class="req">*</span></label><input class="inp" type="date" id="sp-end" style="background:#fff;"/></div>'+
    '</div>'+
    '<div class="form-group"><label class="lbl">Rotation Order</label><input class="inp" type="number" id="sp-order" placeholder="0 = first" value="0" style="background:#fff;"/></div>'+
    '<div style="display:flex;gap:8px;margin-top:.5rem;">'+
      '<button onclick="submitAddSponsor()" style="flex:1;padding:10px;background:#1a1a2e;color:#fff;border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-weight:600;font-size:.84rem;cursor:pointer;">Save Sponsor →</button>'+
      '<button onclick="document.getElementById(\'add-sponsor-form\').innerHTML=\'\'" style="padding:10px 16px;background:var(--warm);color:var(--muted);border:none;border-radius:8px;font-family:\'DM Sans\',sans-serif;font-size:.84rem;cursor:pointer;">Cancel</button>'+
    '</div>'+
    '</div>';
}

async function submitAddSponsor(){
  var name = document.getElementById('sp-name').value.trim();
  var tagline = document.getElementById('sp-tagline').value.trim();
  var start = document.getElementById('sp-start').value;
  var end = document.getElementById('sp-end').value;
  if(!name||!tagline||!start||!end){alert('Please fill in all required fields.');return;}

  try {
    var res = await fetch('/api/sponsors', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-admin-key': state.adminKey||''},
      body: JSON.stringify({
        name,
        tagline,
        logo_url: document.getElementById('sp-logo').value.trim(),
        link_url: document.getElementById('sp-link').value.trim(),
        duration_seconds: parseInt(document.getElementById('sp-duration').value)||8,
        start_date: start,
        end_date: end,
        order_position: parseInt(document.getElementById('sp-order').value)||0,
      })
    });
    var data = await res.json();
    if(data.success){
      addAuditLog('📢','New sponsor "'+name+'" added to banner rotation.');
      document.getElementById('add-sponsor-form').innerHTML='';
      renderAdminSponsors();
      // Reload banner on live site
      loadSponsors();
    } else {
      alert('Error: '+(data.error||'Could not save sponsor.'));
    }
  } catch(e){ alert('Connection error. Please try again.'); }
}

async function toggleSponsorActive(id, active){
  try {
    var res = await fetch('/api/sponsors', {
      method:'PUT',
      headers:{'Content-Type':'application/json','x-admin-key': state.adminKey||''},
      body: JSON.stringify({id, active})
    });
    var data = await res.json();
    if(data.success){
      addAuditLog('📢','Sponsor "'+(data.sponsor?data.sponsor.name:id)+'" '+(active?'activated':'paused')+'.');
      renderAdminSponsors();
      loadSponsors();
    }
  } catch(e){ alert('Connection error.'); }
}

async function deleteSponsor(id){
  if(!confirm('Delete this sponsor? This cannot be undone.')) return;
  try {
    var res = await fetch('/api/sponsors', {
      method:'DELETE',
      headers:{'Content-Type':'application/json','x-admin-key': state.adminKey||''},
      body: JSON.stringify({id})
    });
    var data = await res.json();
    if(data.success){
      addAuditLog('🗑️','Sponsor deleted from banner rotation.');
      renderAdminSponsors();
      loadSponsors();
    }
  } catch(e){ alert('Connection error.'); }
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
function renderGuild(targetEl){
  // Use provided element or fall back to individual directory element
  var el=targetEl||document.getElementById('guild-content');if(!el)return;
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
function guildRefresh(){
  if(state.profileType==="business"){renderBizGuild();}else{renderGuild();}
}
function joinGuild(){
  var code=document.getElementById('guild-code-input').value.trim().toUpperCase();
  var errEl=document.getElementById('guild-join-err');
  errEl.style.display='none';
  if(code.length<9){errEl.textContent='Please enter a valid 8-character invite code.';errEl.style.display='block';return;}
  var bizId=state.myBiz&&state.myBiz.id;
  if(!bizId){errEl.textContent='Business profile not found. Please refresh.';errEl.style.display='block';return;}
  var btn=document.querySelector('.guild-join-btn');
  if(btn){btn.disabled=true;btn.textContent='Joining…';}
  apiFetch('/api/guilds','POST',{action:'join_guild',business_id:bizId,user_name:state.user.name,code:code})
    .then(function(data){
      if(data.error){errEl.textContent=data.error;errEl.style.display='block';if(btn){btn.disabled=false;btn.textContent='Join →';}return;}
      state.guild=data.guild;
      addNotif('🎉 You joined the Guild "'+data.guild.name+'"!');
      guildRefresh();
    })
    .catch(function(){errEl.textContent='Something went wrong. Please try again.';errEl.style.display='block';if(btn){btn.disabled=false;btn.textContent='Join →';}});
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
  var bizId=state.myBiz&&state.myBiz.id;
  if(!bizId){alert('Business profile not found. Please refresh.');return;}
  var church=document.getElementById('cg-church').value.trim();
  var btn=document.querySelector('#guildModal .btn-green');
  if(btn){btn.disabled=true;btn.textContent='Creating…';}
  apiFetch('/api/guilds','POST',{action:'create_guild',business_id:bizId,user_name:state.user.name,name:name,description:desc,church:church})
    .then(function(data){
      if(data.error){alert(data.error);if(btn){btn.disabled=false;btn.textContent='Create Guild →';}return;}
      state.guild=data.guild;
      closeModal('guildModal');
      addNotif('⚔️ Your Guild "'+name+'" has been created!');
      guildRefresh();
    })
    .catch(function(){alert('Something went wrong. Please try again.');if(btn){btn.disabled=false;btn.textContent='Create Guild →';}});
}
function renderMyGuild(el){
  var g=state.guild;
  var isLeader=g.myRole==='leader';
  var activeCodes=(g.codes||[]).filter(c=>!c.used);
  var usedCodes=(g.codes||[]).filter(c=>c.used);
  el.innerHTML=
    '<div class="guild-hero">'+
      '<div class="guild-hero-icon">⚔️</div>'+
      '<div class="guild-hero-name">'+g.name+'</div>'+
      '<div class="guild-hero-sub">'+g.description+'</div>'+
      (g.church?'<div class="guild-hero-badge">⛪ '+g.church+'</div>':'')+
    '</div>'+
    (isLeader?
      '<div class="guild-section-title">🔑 Invite Codes'+
        '<button class="guild-create-btn" onclick="createInviteCode()">+ New Code</button>'+
      '</div>'+
      (activeCodes.length?
        activeCodes.map(function(c){
          return '<div class="guild-code-card">'+
            '<div>'+
              '<div class="guild-code-val">'+c.code+'</div>'+
              '<div class="guild-code-used">Single-use · Created '+new Date(c.created_at).toLocaleDateString()+'</div>'+
            '</div>'+
            '<div class="guild-code-actions">'+
              '<button class="guild-copy-btn" id="copy-btn-'+c.code+'" onclick="copyCode(\''+c.code+'\')">📋 Copy</button>'+
              '<button class="guild-del-btn" onclick="deleteCode(\''+c.id+'\')">✕</button>'+
            '</div>'+
          '</div>';
        }).join(''):
        '<div class="guild-empty"><div class="guild-empty-icon">🔑</div><div class="guild-empty-text">No active invite codes.<br/>Create one to invite someone to your Guild.</div></div>'
      )+
      (usedCodes.length?
        '<div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;margin:.875rem 0 .5rem;">Used Codes</div>'+
        usedCodes.map(function(c){return '<div class="guild-code-card" style="opacity:.5;"><div><div class="guild-code-val" style="text-decoration:line-through;">'+c.code+'</div><div class="guild-code-used">Used by '+(c.used_by_name||'member')+' · '+new Date(c.used_at).toLocaleDateString()+'</div></div></div>';}).join('')
      :'')+
    '':
    '<div style="background:#e0f0ea;border-radius:10px;padding:.875rem;margin-bottom:1.25rem;font-size:.8rem;color:var(--green);font-weight:500;">✓ You are a member of this Guild</div>'
    )+
    '<div class="guild-section-title" style="margin-top:1.25rem;">👥 Members ('+(g.members||[]).length+')</div>'+
    (g.members||[]).map(function(m){
      var n=m.user_name||m.name||'Member';
      var initials=n.split(' ').map(function(x){return x[0];}).join('').slice(0,2).toUpperCase();
      return '<div class="guild-member-item">'+
        '<div class="guild-member-avatar">'+initials+'</div>'+
        '<div style="flex:1;"><div class="guild-member-name">'+n+'</div><div class="guild-member-meta">Joined '+new Date(m.joined_at).toLocaleDateString()+'</div></div>'+
        '<span class="guild-member-role '+(m.role==='leader'?'gmr-leader':'gmr-member')+'">'+(m.role==='leader'?'👑 Leader':'Member')+'</span>'+
      '</div>';
    }).join('')+
    (isLeader?
      '<button class="btn btn-mt" style="background:#fde8e4;color:var(--red);margin-top:1rem;" onclick="disbandGuild()">Disband Guild</button>':
      '<button class="btn btn-warm btn-mt" onclick="leaveGuild()" style="margin-top:1.25rem;">Leave Guild</button>');
}
function createInviteCode(){
  if(!state.guild)return;
  var bizId=state.myBiz&&state.myBiz.id;if(!bizId)return;
  apiFetch('/api/guilds','POST',{action:'create_code',business_id:bizId,user_name:state.user.name})
    .then(function(data){
      if(data.error){addNotif('Error: '+data.error);return;}
      if(!state.guild.codes)state.guild.codes=[];
      state.guild.codes.unshift(data.code);
      addNotif('🔑 New invite code '+data.code.code+' created!');
      guildRefresh();
    }).catch(function(){addNotif('Could not create code. Please try again.');});
}
function copyCode(code){
  var btn=document.getElementById('copy-btn-'+code);
  if(navigator.clipboard){navigator.clipboard.writeText(code);}
  if(btn){btn.textContent='✓ Copied!';btn.classList.add('copied');setTimeout(function(){btn.textContent='📋 Copy';btn.classList.remove('copied');},2000);}
}
function deleteCode(codeId){
  if(!state.guild)return;
  var bizId=state.myBiz&&state.myBiz.id;if(!bizId)return;
  apiFetch('/api/guilds','POST',{action:'delete_code',business_id:bizId,code_id:codeId})
    .then(function(data){
      if(data.error){addNotif('Error: '+data.error);return;}
      state.guild.codes=(state.guild.codes||[]).filter(c=>c.id!==codeId);
      guildRefresh();
    }).catch(function(){addNotif('Could not delete code. Please try again.');});
}
function leaveGuild(){
  if(!state.guild)return;
  var bizId=state.myBiz&&state.myBiz.id;if(!bizId)return;
  var name=state.guild.name;
  apiFetch('/api/guilds','POST',{action:'leave',business_id:bizId})
    .then(function(data){
      if(data.error){addNotif('Error: '+data.error);return;}
      state.guild=null;
      addNotif('You have left the Guild "'+name+'".');
      guildRefresh();
    }).catch(function(){addNotif('Could not leave guild. Please try again.');});
}
function disbandGuild(){
  if(!state.guild)return;
  var bizId=state.myBiz&&state.myBiz.id;if(!bizId)return;
  var name=state.guild.name;
  apiFetch('/api/guilds','POST',{action:'disband',business_id:bizId})
    .then(function(data){
      if(data.error){addNotif('Error: '+data.error);return;}
      state.guild=null;
      addNotif('Guild "'+name+'" has been disbanded.');
      guildRefresh();
    }).catch(function(){addNotif('Could not disband guild. Please try again.');});
}

// ═══════════════ SIGN OUT
function doSignOut(){
  state.user=null;state.profileType=null;state.plan=null;state.faithAnswer=null;
  state.bizTags=[];state.activeCat='All';state.savedIds=[];state.myBiz=null;state.messages=[];state.myReferralCount=0;state.guild=null;state.geo=null;state.geoLoading=false;state.showAllMore=false;state.dirFilter={maxMi:0,nationalOnly:false};
  // Clear saved session
  try {
    localStorage.removeItem('cou_user');
    localStorage.removeItem('cou_profileType');
    localStorage.removeItem('cou_plan');
    localStorage.removeItem('cou_token');
  } catch(e){}
  showScreen('screen-landing');
}

// ═══════════════ ADMIN CHURCHES
function adminPost(body){
  return fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':state.adminKey||''},body:JSON.stringify(body)})
    .then(function(r){return r.json();}).catch(function(e){return {error:e.message};});
}
function renderAdminChurches(){
  var el=document.getElementById('adm-tab-churches');
  el.innerHTML='<div class="admin-card"><p style="font-size:.82rem;color:var(--muted);">Loading churches…</p></div>';
  adminPost({action:'get_churches'}).then(function(d){
    if(!d.success){el.innerHTML='<div class="admin-card"><p style="color:var(--red);font-size:.82rem;">'+escHtml(d.error||'Could not load churches.')+'</p></div>';return;}
    state.admin.churches=d.churches||[];
    var p=d.pending||{};
    var pendingTotal=(p.members_unlinked||0)+(p.businesses_unlinked||0)+(p.businesses_no_location||0);
    el.innerHTML=
      '<div class="admin-card" style="margin-bottom:1rem;">'+
        '<div style="font-weight:700;font-size:.95rem;margin-bottom:.35rem;">⛪ Churches ('+state.admin.churches.length+')</div>'+
        '<div style="font-size:.78rem;color:var(--muted);line-height:1.55;margin-bottom:.7rem;">'+
          (pendingTotal?'Not yet linked: <strong>'+(p.businesses_unlinked||0)+'</strong> businesses and <strong>'+(p.members_unlinked||0)+'</strong> members with a typed church name; <strong>'+(p.businesses_no_location||0)+'</strong> businesses without map coordinates.':'Everything is linked. ✓')+
        '</div>'+
        '<button class="btn" style="background:#1a1a2e;color:#fff;padding:.55rem 1rem;font-size:.78rem;" id="adm-cleanup-btn" onclick="runAdminLocationCleanup()">Run Church & Location Cleanup</button>'+
        '<div id="adm-cleanup-result" style="font-size:.75rem;margin-top:.6rem;line-height:1.55;">'+(state.admin.cleanupResult||'')+'</div>'+
      '</div>'+
      '<div class="admin-card">'+
        '<input class="member-search" id="adm-church-search" placeholder="Search churches…" oninput="renderAdminChurchTable()"/>'+
        '<div id="adm-church-mergebar" style="margin:.6rem 0;"></div>'+
        '<div id="adm-church-table"></div>'+
      '</div>';
    renderAdminChurchTable();
  });
}
function renderAdminChurchTable(){
  var q=((document.getElementById('adm-church-search')||{}).value||'').toLowerCase();
  var sel=state.admin.churchSel||(state.admin.churchSel={});
  var rows=(state.admin.churches||[]).filter(function(c){return !q||c.name.toLowerCase().indexOf(q)>-1||(c.city||'').toLowerCase().indexOf(q)>-1||(c.zip||'').indexOf(q)>-1;});
  document.getElementById('adm-church-table').innerHTML=rows.length?
    '<div style="overflow-x:auto;"><table class="member-table"><thead><tr><th></th><th>Church</th><th>Location</th><th>Members</th><th>Businesses</th><th></th></tr></thead><tbody>'+
    rows.map(function(c){
      return '<tr><td><input type="checkbox" '+(sel[c.id]?'checked':'')+' onchange="toggleAdminChurchSel(\''+c.id+'\',this.checked)"/></td>'+
        '<td><strong>'+escHtml(c.name)+'</strong></td><td style="font-size:.73rem;">'+escHtml([c.city,c.state].filter(Boolean).join(', '))+' '+escHtml(c.zip||'')+'</td>'+
        '<td>'+c.members+'</td><td>'+c.businesses+'</td>'+
        '<td><button style="font-size:.7rem;background:none;border:1px solid var(--border);border-radius:6px;padding:3px 8px;cursor:pointer;" onclick="renameAdminChurch(\''+c.id+'\')">Rename</button></td></tr>';
    }).join('')+'</tbody></table></div>':
    '<p style="font-size:.8rem;color:var(--muted);">No churches yet. They are added when members and businesses pick or add their church, or when you run the cleanup.</p>';
  renderAdminMergeBar();
}
function toggleAdminChurchSel(id,on){var sel=state.admin.churchSel||(state.admin.churchSel={});if(on)sel[id]=true;else delete sel[id];renderAdminMergeBar();}
function renderAdminMergeBar(){
  var bar=document.getElementById('adm-church-mergebar');if(!bar)return;
  var ids=Object.keys(state.admin.churchSel||{});
  var picked=(state.admin.churches||[]).filter(function(c){return ids.indexOf(String(c.id))>-1;});
  if(picked.length<2){bar.innerHTML='<div style="font-size:.72rem;color:var(--muted);">Tick two or more duplicates to merge them.</div>';return;}
  bar.innerHTML='<div style="background:#fff8e6;border:1.5px solid #f2d48a;border-radius:9px;padding:.7rem .8rem;font-size:.78rem;">'+
    '<div style="font-weight:700;margin-bottom:.4rem;">Merge '+picked.length+' churches — which one should stay?</div>'+
    picked.map(function(c,i){return '<label style="display:block;margin:.2rem 0;cursor:pointer;"><input type="radio" name="adm-keep" value="'+c.id+'" '+(i===0?'checked':'')+'/> '+escHtml(c.name)+' <span style="color:var(--muted);">('+escHtml([c.city,c.state].filter(Boolean).join(', '))+' · '+c.members+' members, '+c.businesses+' businesses)</span></label>';}).join('')+
    '<button class="btn" style="background:var(--green);color:#fff;padding:.45rem .9rem;font-size:.75rem;margin-top:.4rem;" onclick="mergeAdminChurches()">Merge</button></div>';
}
function mergeAdminChurches(){
  var keep=document.querySelector('input[name="adm-keep"]:checked');if(!keep)return;
  var ids=Object.keys(state.admin.churchSel||{}).filter(function(id){return id!==keep.value;});
  var keepName=((state.admin.churches||[]).find(function(c){return String(c.id)===keep.value;})||{}).name;
  if(!confirm('Merge '+ids.length+' duplicate(s) into "'+keepName+'"? Members and businesses will be moved over. This cannot be undone.'))return;
  adminPost({action:'merge_churches',keep_id:keep.value,merge_ids:ids}).then(function(d){
    if(!d.success){alert(d.error||'Merge failed.');return;}
    addAuditLog('⛪','Merged '+d.merged+' church(es) into '+keepName);
    state.admin.churchSel={};
    renderAdminChurches();
  });
}
function renameAdminChurch(id){
  var c=(state.admin.churches||[]).find(function(x){return String(x.id)===String(id);});if(!c)return;
  var name=prompt('New name for this church:',c.name);
  if(!name||!name.trim()||name.trim()===c.name)return;
  adminPost({action:'rename_church',church_id:id,name:name.trim()}).then(function(d){
    if(!d.success){alert(d.error||'Rename failed.');return;}
    addAuditLog('⛪','Renamed church "'+c.name+'" to "'+name.trim()+'"');
    renderAdminChurches();
  });
}
function runAdminLocationCleanup(){
  var btn=document.getElementById('adm-cleanup-btn'),out=document.getElementById('adm-cleanup-result');
  btn.disabled=true;btn.textContent='Running…';out.textContent='';
  adminPost({action:'run_location_cleanup'}).then(function(d){
    btn.disabled=false;btn.textContent='Run Church & Location Cleanup';
    if(!d.success){out.style.color='var(--red)';out.textContent=d.error||'Cleanup failed.';return;}
    var s=d.summary;
    addAuditLog('🧹','Ran church & location cleanup');
    state.admin.cleanupResult='✓ Linked <strong>'+s.businesses_linked+'</strong> businesses and <strong>'+s.members_linked+'</strong> members to churches. Added coordinates for <strong>'+s.businesses_located+'</strong> businesses and <strong>'+s.members_located+'</strong> members.'+
      (s.needs_review.length?'<div style="margin-top:.4rem;color:var(--muted);">Needs review ('+s.needs_review.length+'):<br/>'+s.needs_review.slice(0,30).map(escHtml).join('<br/>')+(s.needs_review.length>30?'<br/>…':'')+'</div>':'');
    renderAdminChurches();
  });
}

// ═══════════════ DIRECTORY RELEVANCE (church → your area → nationwide → rest)
function myChurchSet(){return !!(state.user&&(state.user.church_id||state.user.church));}
function isMyChurch(b){
  if(!state.user)return false;
  if(state.user.church_id&&b.church_id)return String(b.church_id)===String(state.user.church_id);
  return !!(state.user.church&&b.church&&b.church.toLowerCase()===state.user.church.toLowerCase());
}
function hasDirLocation(){return !!((state.geo&&state.geo.lat!=null)||(state.user&&state.user.zip));}
function dirLocQuery(){
  if(state.geo&&state.geo.lat!=null)return '?lat='+state.geo.lat+'&lng='+state.geo.lng;
  if(state.user&&state.user.zip)return '?zip='+encodeURIComponent(state.user.zip);
  return '';
}
function dirLocLabel(){
  if(state.geo&&state.geo.lat!=null)return 'your current location';
  if(state.user&&state.user.zip)return 'ZIP '+state.user.zip;
  return 'your area';
}
// 0 = your church, 1 = serves your area, 2 = nationally available, 3 = everything else
function bizTier(b){
  if(isMyChurch(b))return 0;
  if(b.serves_area)return 1;
  if(b.service_type==='national')return 2;
  return 3;
}
function compareBizRelevance(a,b){
  var ta=bizTier(a),t=ta-bizTier(b);if(t)return t;
  var feat=(a.featured&&!b.featured)?-1:((!a.featured&&b.featured)?1:0);
  var da=a.distance_mi,db=b.distance_mi;
  var near=0;
  if(da!=null&&db!=null&&da!==db)near=da-db;
  else if(da!=null&&db==null)near=-1;
  else if(da==null&&db!=null)near=1;
  // Your area / more businesses: closest first. Your church / nationwide: featured first.
  if(ta===1||ta===3){if(near)return near;if(feat)return feat;}
  else{if(feat)return feat;if(near)return near;}
  return (new Date(b.joinedDate)-new Date(a.joinedDate))||0;
}
function bizReachHtml(b){
  var parts=[];
  if(isMyChurch(b))parts.push('<span class="mine">✝ Your church</span>');
  var d=b.distance_mi;
  if(b.service_type==='national')parts.push('<span class="nat">🇺🇸 Available nationwide</span>');
  else if(b.serves_area&&b.service_type==='service_area')parts.push('<span class="area">🚐 Serves your area'+(d!=null?' · '+d+' mi':'')+'</span>');
  else if(d!=null)parts.push('<span'+(b.serves_area?' class="area"':'')+'>📍 '+d+' mi away</span>');
  return parts.length?'<div class="biz-reach">'+parts.join('')+'</div>':'';
}
function feedHeader(sec,emptyNote){
  var h=document.createElement('div');h.className='feed-sec';
  h.innerHTML='<div class="feed-sec-title">'+escHtml(sec.title)+'</div><div class="feed-sec-sub">'+escHtml(emptyNote||sec.sub)+'</div>';
  return h;
}
function renderLocBar(){
  var el=document.getElementById('loc-bar');if(!el)return;
  if(state.geoLoading){el.innerHTML='<div class="loc-bar">📍 Finding your location…</div>';return;}
  if(state.geo&&state.geo.lat!=null){
    el.innerHTML='<div class="loc-bar">📍 Showing businesses near <strong>your current location</strong>'+(state.user&&state.user.zip?' <button onclick="useMyZip()">Use ZIP '+escHtml(state.user.zip)+' instead</button>':'')+'</div>';
  } else if(state.user&&state.user.zip){
    el.innerHTML='<div class="loc-bar">📍 Showing businesses near <strong>ZIP '+escHtml(state.user.zip)+'</strong> <button onclick="useMyLocation()">Use my current location</button></div>';
  } else {
    el.innerHTML='<div class="loc-bar"><button onclick="useMyLocation()">📍 Use my current location</button></div>';
  }
}
function reloadDirectory(query){
  state.showAllMore=false;
  return loadBusinesses({keepTestimonials:true,query:query}).then(function(ok){
    if(ok){populateChurchFilter();renderDirectory();renderSaved();}
    return ok;
  });
}
// Uses the phone's location for this visit only — it is never saved
function useMyLocation(){
  if(!navigator.geolocation){alert('Location isn\'t available on this device. Add your ZIP code on the Account tab instead.');return;}
  state.geoLoading=true;renderLocBar();
  navigator.geolocation.getCurrentPosition(function(pos){
    if(!state.geoLoading||!state.user)return; // signed out while waiting
    var geo={lat:Math.round(pos.coords.latitude*1000)/1000,lng:Math.round(pos.coords.longitude*1000)/1000};
    reloadDirectory('?lat='+geo.lat+'&lng='+geo.lng).then(function(ok){
      state.geoLoading=false;
      if(ok){state.geo=geo;renderDirectory();}
      else{renderLocBar();alert('We couldn\'t load businesses near you. Please try again.');}
    });
  },function(err){
    if(!state.geoLoading)return;
    state.geoLoading=false;renderLocBar();
    alert(err&&err.code===1?'Location permission was turned off. You can allow it in your browser settings, or add your ZIP code on the Account tab.':'We couldn\'t get your location. Please try again, or add your ZIP code on the Account tab.');
  },{timeout:10000,maximumAge:600000});
}
function useMyZip(){state.geo=null;state.geoLoading=false;reloadDirectory();}

// ═══════════════ SEARCH FILTERS (distance + Nationally Available only)
function dirFilter(){return state.dirFilter||(state.dirFilter={maxMi:0,nationalOnly:false});}
function dirHasDistances(){return (state.businesses||[]).some(function(b){return b.distance_mi!=null;});}
function passesDirFilters(b){
  var f=dirFilter();
  if(f.nationalOnly)return b.service_type==='national';
  if(f.maxMi>0&&dirHasDistances())return b.distance_mi!=null&&b.distance_mi<=f.maxMi;
  return true;
}
function dirFilterMeta(){
  var f=dirFilter();
  if(f.nationalOnly)return ' · <strong>Nationally Available</strong>';
  if(f.maxMi>0&&dirHasDistances())return ' · within <strong>'+f.maxMi+' mi</strong>';
  return '';
}
function setDistFilter(v){
  var f=dirFilter();
  f.maxMi=parseInt(v,10)||0;
  if(f.maxMi>0)f.nationalOnly=false;
  renderDirectory();
}
function toggleNationalOnly(){
  var f=dirFilter();
  f.nationalOnly=!f.nationalOnly;
  if(f.nationalOnly)f.maxMi=0;
  renderDirectory();
}
// Keeps the controls in step with the current filter and location
function syncDirFilterControls(){
  var sel=document.getElementById('dist-filter'),btn=document.getElementById('nat-filter');
  if(!sel||!btn)return;
  var f=dirFilter(),hasDist=dirHasDistances();
  if(!hasDist&&f.maxMi>0)f.maxMi=0;
  sel.disabled=!hasDist;
  sel.title=hasDist?'':'Add your ZIP code on the Account tab, or tap "Use my current location", to filter by distance.';
  sel.value=String(f.maxMi);
  btn.classList[f.nationalOnly?'add':'remove']('on');
  btn.setAttribute('aria-pressed',f.nationalOnly?'true':'false');
}

// ═══════════════ CHURCH PICKER & LOCATION
function escHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

var SVC_OPTS=[
  {id:'storefront',icon:'🏪',title:'Storefront',sub:'Customers come to my location.'},
  {id:'service_area',icon:'🚐',title:'Service Area',sub:'I travel to customers within a set distance.'},
  {id:'national',icon:'🇺🇸',title:'Nationally Available Services',sub:'I ship products or serve customers anywhere in the U.S.'}
];
// Renders the 3 service-type choices into #<prefix>-svc-opts and toggles #<prefix>-radius-wrap
function renderSvcOpts(prefix,selected){
  var box=document.getElementById(prefix+'-svc-opts');if(!box)return;
  var val=SVC_OPTS.some(function(o){return o.id===selected;})?selected:'storefront';
  box.dataset.value=val;
  box.innerHTML=SVC_OPTS.map(function(o){
    return '<button type="button" class="svc-opt'+(o.id===val?' sel':'')+'" onclick="renderSvcOpts(\''+prefix+'\',\''+o.id+'\')">'+
      '<span class="svc-opt-icon">'+o.icon+'</span><span><span class="svc-opt-title">'+o.title+'</span><span class="svc-opt-sub">'+o.sub+'</span></span></button>';
  }).join('');
  var rw=document.getElementById(prefix+'-radius-wrap');
  if(rw)rw.classList[val==='service_area'?'remove':'add']('hidden');
}

// Turns a text input into a search-as-you-type church picker.
// The chosen church's ID is stored on input.dataset.churchId (empty if the user typed without picking).
function mountChurchPicker(inputId,opts){
  opts=opts||{};
  var inp=document.getElementById(inputId);if(!inp||inp._cp)return;
  inp._cp=true;inp.setAttribute('autocomplete','off');
  var wrap=document.createElement('div');wrap.className='cp-wrap';
  inp.parentNode.insertBefore(wrap,inp);wrap.appendChild(inp);
  var list=document.createElement('div');list.className='cp-list hidden';wrap.appendChild(list);
  var picked=document.createElement('div');picked.className='cp-picked hidden';wrap.appendChild(picked);
  var timer=null,seq=0;
  function setPicked(ch){
    inp.dataset.churchId=ch?ch.id:'';
    if(ch){
      inp.value=ch.name;
      picked.textContent='✓ '+[ch.city,ch.state].filter(Boolean).join(', ')+(ch.zip?' '+ch.zip:'');
      picked.classList.remove('hidden');
    } else picked.classList.add('hidden');
    list.classList.add('hidden');
    if(opts.onPick)opts.onPick(ch);
  }
  function nearZip(){
    var z=opts.zipInputId?document.getElementById(opts.zipInputId):null;
    return (z&&z.value)||(state.user&&state.user.zip)||'';
  }
  function showAdd(q){
    var pre=opts.churchZipInputId?((document.getElementById(opts.churchZipInputId)||{}).value||''):'';
    list.innerHTML='<div class="cp-addform"><span style="width:100%;">What ZIP code is <strong>'+escHtml(q)+'</strong> in?</span>'+
      '<input placeholder="Church ZIP" maxlength="10" inputmode="numeric" value="'+escHtml(pre)+'"/><button type="button">Add Church</button>'+
      '<span class="cp-add-err" style="width:100%;color:var(--red);display:none;"></span></div>';
    var form=list.querySelector('.cp-addform'),zi=form.querySelector('input'),btn=form.querySelector('button'),err=form.querySelector('.cp-add-err');
    form.addEventListener('mousedown',function(e){if(e.target!==zi)e.preventDefault();});
    zi.addEventListener('blur',function(){setTimeout(function(){if(!wrap.contains(document.activeElement))list.classList.add('hidden');},150);});
    zi.focus();
    btn.onclick=function(){
      btn.disabled=true;btn.textContent='Adding…';err.style.display='none';
      apiFetch('/api/churches','POST',{action:'add',name:q,zip:zi.value}).then(function(d){
        btn.disabled=false;btn.textContent='Add Church';
        if(d.success&&d.church)setPicked(d.church);
        else{err.textContent=d.error||'Could not add church.';err.style.display='block';}
      });
    };
  }
  function render(results,q){
    list.innerHTML=results.map(function(c,i){
      return '<div class="cp-item" data-i="'+i+'">'+escHtml(c.name)+'<small>'+escHtml([c.city,c.state].filter(Boolean).join(', '))+(c.distance!=null?' · '+c.distance+' mi away':'')+'</small></div>';
    }).join('')+'<div class="cp-item cp-add" data-add="1">+ Add "'+escHtml(q)+'" as a new church</div>';
    list.classList.remove('hidden');
    Array.prototype.forEach.call(list.querySelectorAll('.cp-item'),function(el){
      el.addEventListener('mousedown',function(e){e.preventDefault();});
      el.addEventListener('click',function(){if(el.dataset.add)showAdd(q);else setPicked(results[+el.dataset.i]);});
    });
  }
  inp.addEventListener('input',function(){
    inp.dataset.churchId='';picked.classList.add('hidden');
    var q=inp.value.trim();clearTimeout(timer);
    if(q.length<2){list.classList.add('hidden');return;}
    timer=setTimeout(function(){
      var my=++seq;
      apiFetch('/api/churches?q='+encodeURIComponent(q)+'&zip='+encodeURIComponent(nearZip())).then(function(d){
        if(my!==seq)return;
        render((d&&d.churches)||[],q);
      });
    },250);
  });
  inp.addEventListener('blur',function(){
    setTimeout(function(){if(!wrap.contains(document.activeElement))list.classList.add('hidden');},150);
  });
}

// Account tab: member's church and ZIP
function renderAccLocation(){
  var el=document.getElementById('acc-location');if(!el||!state.user)return;
  el.innerHTML='<div class="info-label">My Church & Location</div>'+
    '<div class="info-sub" style="margin-bottom:.6rem;">Used to show businesses from your church first, then those serving your area.</div>'+
    '<div class="form-group"><label class="lbl">Your Church</label><input class="inp" id="acc-church" placeholder="Start typing your church name…" value="'+escHtml(state.user.church||'')+'"/></div>'+
    '<div class="form-group"><label class="lbl">Your ZIP Code</label><input class="inp" id="acc-zip" maxlength="10" inputmode="numeric" placeholder="e.g. 80470" value="'+escHtml(state.user.zip||'')+'"/></div>'+
    '<button class="btn btn-ink" style="width:100%;" id="acc-loc-btn" onclick="saveMyLocation()">Save</button>'+
    '<div class="hint-msg" id="acc-loc-msg" style="margin-top:.4rem;"></div>';
  mountChurchPicker('acc-church',{zipInputId:'acc-zip'});
  if(state.user.church_id)document.getElementById('acc-church').dataset.churchId=state.user.church_id;
}
function saveMyLocation(){
  var inp=document.getElementById('acc-church'),zip=document.getElementById('acc-zip').value.trim();
  var msg=document.getElementById('acc-loc-msg'),btn=document.getElementById('acc-loc-btn');
  function fail(t){msg.style.color='var(--red)';msg.textContent=t;}
  var churchId=inp.dataset.churchId||'';
  if(inp.value.trim()&&!churchId){fail('Please pick your church from the list, or tap "Add" to add it.');return;}
  if(zip&&!/^\d{5}(-\d{4})?$/.test(zip)){fail('Enter a valid 5-digit ZIP code.');return;}
  if(!state.user||!state.user.id){fail('Please sign out and sign back in, then try again.');return;}
  btn.disabled=true;btn.textContent='Saving…';msg.textContent='';
  apiFetch('/api/churches','POST',{action:'update_member',user_id:state.user.id,church_id:churchId||null,zip:zip}).then(function(d){
    btn.disabled=false;btn.textContent='Save';
    if(!d.success||!d.user){fail(d.error||'Could not save. Please try again.');return;}
    state.user.church=d.user.church||'';
    state.user.church_id=d.user.church_id||null;
    state.user.zip=d.user.zip||'';
    try{localStorage.setItem('cou_user',JSON.stringify(state.user));}catch(e){}
    msg.style.color='var(--green)';msg.textContent='✓ Saved. Your directory now shows your church first.';
    renderLocNudge();
    reloadDirectory();
  });
}
// Home tab prompt for members who haven't set their church or ZIP yet
function renderLocNudge(){
  var el=document.getElementById('loc-nudge');if(!el)return;
  if(!state.user||state.profileType==='business'||(state.user.church_id&&state.user.zip)){el.innerHTML='';return;}
  var missing=(!state.user.church_id&&!state.user.zip)?'your church and ZIP code':(!state.user.church_id?'your church':'your ZIP code');
  el.innerHTML='<div class="loc-nudge"><span style="font-size:1.3rem;">✝</span><div class="loc-nudge-text">Add '+missing+' to see businesses from your church first, then those serving your area.</div><button onclick="switchDirTab(\'account\')">Add Now</button></div>';
}

// ═══════════════ INSTALL MODAL
(function(){
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isAndroid = /android/i.test(navigator.userAgent);
  var isMobile = isIOS || isAndroid;
  var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if(!isMobile || isStandalone) return;
  try { if(localStorage.getItem('cou_install_dismissed')) return; } catch(e){ return; }

  var instructions = isIOS
    ? '<div style="display:flex;flex-direction:column;gap:.6rem;">'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">1️⃣</span><span>Tap the <strong>Share</strong> button <strong>(□↑)</strong> at the bottom of your Safari browser.</span></div>'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">2️⃣</span><span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span></div>'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">3️⃣</span><span>Tap <strong>Add</strong> in the top right corner.</span></div>'+
      '</div>'
    : '<div style="display:flex;flex-direction:column;gap:.6rem;">'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">1️⃣</span><span>Tap the <strong>three-dot menu (⋮)</strong> in the top right of Chrome.</span></div>'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">2️⃣</span><span>Tap <strong>"Add to Home Screen"</strong>.</span></div>'+
        '<div style="display:flex;align-items:flex-start;gap:.6rem;"><span style="font-size:1.3rem;flex-shrink:0;">3️⃣</span><span>Tap <strong>Add</strong> to confirm.</span></div>'+
      '</div>';

  function showInstallModal(){
    if(document.getElementById('cou-install-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'cou-install-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1.25rem;font-family:DM Sans,sans-serif;';

    overlay.innerHTML =
      '<div style="background:#fff;border-radius:18px;width:100%;max-width:340px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.25);">'+
        '<div style="background:#1a2a5e;padding:1.25rem 1.25rem 1rem;display:flex;align-items:center;gap:.75rem;">'+
          '<img src="/icon-192.png" style="width:48px;height:48px;border-radius:11px;flex-shrink:0;" onerror="this.style.display=\'none\'"/>'+
          '<div>'+
            '<div style="color:#fff;font-weight:700;font-size:1rem;line-height:1.2;">Add to Home Screen</div>'+
            '<div style="color:rgba(255,255,255,.75);font-size:.75rem;margin-top:.15rem;">Access the app like a native app</div>'+
          '</div>'+
        '</div>'+
        '<div style="padding:1.1rem 1.25rem;font-size:.82rem;color:#374151;line-height:1.55;">'+
          instructions+
        '</div>'+
        '<div style="padding:.75rem 1.25rem 1.1rem;display:flex;flex-direction:column;gap:.5rem;">'+
          '<button onclick="dismissInstallModal()" style="background:#1a2a5e;color:#fff;border:none;border-radius:10px;padding:.7rem;font-family:DM Sans,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;width:100%;">Got it!</button>'+
          '<button onclick="dismissInstallModal()" style="background:none;border:none;color:#9ca3af;font-family:DM Sans,sans-serif;font-size:.76rem;cursor:pointer;padding:.25rem;">Maybe later</button>'+
        '</div>'+
      '</div>';

    document.body.appendChild(overlay);
  }

  window.dismissInstallModal = function(){
    var o = document.getElementById('cou-install-overlay');
    if(o) o.remove();
    try { localStorage.setItem('cou_install_dismissed','1'); } catch(e){}
  };

  setTimeout(showInstallModal, 2500);
})();