(function(){
  "use strict";

  var SECTION_LABELS = { leaders: 'Leaders', promotions: 'Promotions', books: 'Books', leaks: 'Leaks' };
  var MEMBER_TYPES = ['P.S','C.D','S.P.L','P.L','A.P.L','MEMBER'];
  function normalizeMemberTypes(value){
    var arr = Array.isArray(value) ? value.slice() : (typeof value === 'string' ? value.split(/\s*[,\/]\s*/).filter(Boolean) : []);
    return arr.filter(function(v){ return MEMBER_TYPES.indexOf(v) !== -1; }).slice(0,3);
  }
  function selectedMemberTypes(containerId){
    var wrap = document.getElementById(containerId);
    if (!wrap) return [];
    return Array.prototype.slice.call(wrap.querySelectorAll('input[type="checkbox"]:checked')).map(function(input){ return input.value; });
  }
  function setMemberTypeChecks(containerId, values){
    var set = {}; normalizeMemberTypes(values).forEach(function(v){ set[v] = true; });
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.querySelectorAll('input[type="checkbox"]').forEach(function(input){ input.checked = !!set[input.value]; });
  }
  function bindMemberTypeLimit(containerId){
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.addEventListener('change', function(e){
      if (!e.target.matches('input[type="checkbox"]')) return;
      var checked = wrap.querySelectorAll('input[type="checkbox"]:checked');
      if (checked.length > 3){ e.target.checked = false; showToast('Choose a maximum of 3 member types.'); }
    });
  }

  var VALID_TABS = ['home','leaders','promotions','books','leaks','attendance','shop'];

  /* ==========================================================
     SEED DATA — used for the read-only preview shown until
     Firebase is configured (see firebase-config.js / SETUP.md)
  ========================================================== */
  function seedPosts(){
    return {
      leaders: [
        { id:'l1', name:'Md. Mizanur Kabir', description:'Group Scout Leader. Steering the troop since 2016. Wood Badge holder, national jamboree contingent leader (2019).', imageURL:'', pdfURL:'', videoURL:'', order:0 },
        { id:'l2', name:'Rezaul Alam', description:'Assistant Scout Leader. Runs pioneering and camp-craft. Fifteen years with the district scout council.', imageURL:'', pdfURL:'', videoURL:'', order:1 },
        { id:'l3', name:'Farzana Nasrin', description:'Assistant Scout Leader. Leads first-aid and community service badge work; district first-aid trainer.', imageURL:'', pdfURL:'', videoURL:'', order:2 }
      ],
      promotions: [
        { id:'p1', name:'Apprentice Scout', description:'Entry rank on joining the troop. Oath taken, uniform issued, patrol assigned.', imageURL:'', pdfURL:'', videoURL:'', order:0 },
        { id:'p2', name:'Second Class Scout', description:'Tested on knotting, map & compass, first aid basics and troop history.', imageURL:'', pdfURL:'', videoURL:'', order:1 },
        { id:'p3', name:'First Class Scout', description:'Pioneering, endurance hike, and a supervised service project in the community.', imageURL:'', pdfURL:'', videoURL:'', order:2 }
      ],
      books: [
        { id:'b1', name:'Bangladesh Scouts Handbook', description:'National Council · Core Text. The foundational manual — oath, law, uniform standards and the full badge syllabus.', imageURL:'', pdfURL:'', videoURL:'', order:0 },
        { id:'b2', name:'Field Craft & Pioneering', description:'Reference · Knots & Structures. Lashings, bridges, and camp construction, illustrated step by step.', imageURL:'', pdfURL:'', videoURL:'', order:1 }
      ],
      leaks: [
        { id:'k1', name:'Monsoon camp site — rumor', description:"Word from the district office is that this year's monsoon camp may move to the Ramsagar site. Nothing signed yet.", imageURL:'', pdfURL:'', videoURL:'', order:0 },
        { id:'k2', name:'New scarves have arrived', description:'New uniform scarves have arrived at the troop store and will be issued at the next Saturday parade.', imageURL:'', pdfURL:'', videoURL:'', order:1 }
      ]
    };
  }

  var posts = seedPosts();       // live cache, kept in sync with Realtime Database once configured
  var auth = null;               // { email, name, isAdmin, emailVerified }
  var currentFirebaseUser = null; // raw Firebase user object (for resend/refresh actions)
  var firebaseReady = false;
  var fbAuth, fbDb;

  /* ==========================================================
     FIREBASE INIT (falls back to read-only preview if the
     config in firebase-config.js is still the placeholder)
  ========================================================== */
  (function initFirebase(){
    var configured = typeof firebaseConfig !== 'undefined' &&
      firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('YOUR_') !== 0 &&
      firebaseConfig.databaseURL && firebaseConfig.databaseURL.indexOf('YOUR_') === -1;

    if (!configured){
      var banner = document.getElementById('setupBanner');
      if (banner) banner.hidden = false;
      return;
    }
    try{
      firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth();
      fbDb = firebase.database();
      firebaseReady = true;
    }catch(e){
      console.error('Firebase init failed:', e);
      var banner2 = document.getElementById('setupBanner');
      if (banner2) banner2.hidden = false;
    }
  })();

  /* ==========================================================
     TAB NAVIGATION
  ========================================================== */
  var tabButtons = document.querySelectorAll('[data-tab]');
  var panels = document.querySelectorAll('[data-panel]');
  var gotoButtons = document.querySelectorAll('[data-goto]');
  var drawer = document.getElementById('mobileDrawer');
  var hamburger = document.getElementById('hamburger');
  var mobileProfileTrigger = document.getElementById('mobileProfileTrigger');

  function activateTab(name){
    if (name === 'attendance' && !(auth && auth.isAdmin)){
      showToast('Attendance is available to the administrator only.');
      name = 'home';
    }
    tabButtons.forEach(function(btn){ btn.classList.toggle('is-active', btn.getAttribute('data-tab') === name); });
    panels.forEach(function(panel){ panel.classList.toggle('is-active', panel.getAttribute('data-panel') === name); });
    if (drawer) drawer.classList.remove('is-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    if (name === 'attendance' && auth && auth.isAdmin) loadAdminAttendanceData();
    if (name === 'shop') loadShopProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  tabButtons.forEach(function(btn){ btn.addEventListener('click', function(){ activateTab(btn.getAttribute('data-tab')); }); });
  gotoButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var target = btn.getAttribute('data-goto');
      if (target === 'signup') openAuthModal('signup'); else activateTab(target);
    });
  });
  if (hamburger){
    hamburger.addEventListener('click', function(){
      var isOpen = drawer.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
  }
  if (mobileProfileTrigger){
    mobileProfileTrigger.addEventListener('click', function(){
      if (drawer) drawer.classList.remove('is-open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      openProfileModal();
    });
  }

  /* ==========================================================
     TOAST
  ========================================================== */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(message){
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('is-shown'); }, 3800);
  }

  /* ==========================================================
     AUTH MODAL (login / sign up)
  ========================================================== */
  var authOverlay = document.getElementById('modalOverlay');
  var authClose = document.getElementById('modalClose');
  var authSwitchButtons = document.querySelectorAll('[data-authtab]');
  var authForms = document.querySelectorAll('.auth-form');
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');

  function openAuthModal(which){
    if (!firebaseReady){
      showToast('Sign-in needs Firebase set up first — see the banner at the bottom of the page.');
      return;
    }
    authOverlay.classList.add('is-open');
    setAuthTab(which || 'login');
    document.body.style.overflow = 'hidden';
  }
  function closeAuthModal(){
    authOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function setAuthTab(which){
    authSwitchButtons.forEach(function(btn){ btn.classList.toggle('is-active', btn.getAttribute('data-authtab') === which); });
    authForms.forEach(function(f){ f.classList.toggle('is-active', f.getAttribute('data-form') === which); });
  }
  ['openLogin','openLoginMobile'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function(){ openAuthModal('login'); });
  });
  ['openSignup','openSignupMobile','heroSignup'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function(){ openAuthModal('signup'); });
  });
  authSwitchButtons.forEach(function(btn){ btn.addEventListener('click', function(){ setAuthTab(btn.getAttribute('data-authtab')); }); });
  if (authClose) authClose.addEventListener('click', closeAuthModal);
  if (authOverlay){ authOverlay.addEventListener('click', function(e){ if (e.target === authOverlay) closeAuthModal(); }); }

  if (loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = loginForm.querySelector('[name="identifier"]').value.trim();
      var password = loginForm.querySelector('[name="password"]').value;
      var submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      fbAuth.signInWithEmailAndPassword(email, password).then(function(cred){
        closeAuthModal();
        loginForm.reset();
        if (!cred.user.emailVerified){
          showToast('Logged in — verify your email from the link we sent to unlock full access.');
        } else {
          showToast('Logged in — welcome back.');
        }
      }).catch(function(err){
        showToast(friendlyAuthError(err));
      }).finally(function(){ submitBtn.disabled = false; });
    });
  }

  if (signupForm){
    signupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var fullname = signupForm.querySelector('[name="fullname"]').value.trim();
      var email = signupForm.querySelector('[name="email"]').value.trim();
      var username = signupForm.querySelector('[name="username"]').value.trim();
      var mobile = signupForm.querySelector('[name="mobile"]').value.trim();
      var className = signupForm.querySelector('[name="className"]').value.trim();
      var roll = signupForm.querySelector('[name="roll"]').value.trim();
      var memberTypes = normalizeMemberTypes(selectedMemberTypes('signupMemberTypes'));
      var password = signupForm.querySelector('[name="password"]').value;
      if (memberTypes.length < 1 || memberTypes.length > 3){ showToast('Select 1 to 3 member types.'); return; }
      var submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      fbAuth.createUserWithEmailAndPassword(email, password).then(function(cred){
        return cred.user.updateProfile({ displayName: username || fullname }).then(function(){
          return fbDb.ref('users/' + cred.user.uid).set({
            fullname: fullname, username: username, email: email,
            mobile: mobile, className: className, roll: roll, memberTypes: memberTypes,
            profileImageURL: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });
        }).then(function(){
          return cred.user.sendEmailVerification();
        });
      }).then(function(){
        closeAuthModal();
        signupForm.reset();
        showToast('Account created — check your email to verify it.');
      }).catch(function(err){
        showToast(friendlyAuthError(err));
      }).finally(function(){ submitBtn.disabled = false; });
    });
  }

  function friendlyAuthError(err){
    var code = err && err.code || '';
    if (code === 'auth/email-already-in-use') return 'An account with that email already exists.';
    if (code === 'auth/invalid-email') return 'That email address looks invalid.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Incorrect email or password.';
    if (code === 'auth/too-many-requests') return 'Too many attempts — try again in a bit.';
    return err && err.message ? err.message : 'Something went wrong. Please try again.';
  }

  /* ---------- logged-in topbar state ---------- */
  var loggedOutDesktop = document.getElementById('authActionsLoggedOut');
  var loggedInDesktop = document.getElementById('authActionsLoggedIn');
  var loggedOutMobile = document.getElementById('mobileAuthLoggedOut');
  var loggedInMobile = document.getElementById('mobileAuthLoggedIn');
  var userPillBadge = document.getElementById('userPillBadge');
  var userPillAvatar = document.getElementById('userPillAvatar');
  var userPillBadgeMobile = document.getElementById('userPillBadgeMobile');
  var userPillAvatarMobile = document.getElementById('userPillAvatarMobile');
  var mobileProfileBadge = document.getElementById('mobileProfileBadge');
  var mobileProfileAvatar = document.getElementById('mobileProfileAvatar');
  var userPillName = document.getElementById('userPillName');
  var userPillNameMobile = document.getElementById('userPillNameMobile');
  var currentProfile = null;

  function renderAuthUI(){
    var isLoggedIn = !!auth;
    if (loggedOutDesktop) loggedOutDesktop.hidden = isLoggedIn;
    if (loggedInDesktop) loggedInDesktop.hidden = !isLoggedIn;
    if (loggedOutMobile) loggedOutMobile.hidden = isLoggedIn;
    if (loggedInMobile) loggedInMobile.hidden = !isLoggedIn;

    if (mobileProfileTrigger) mobileProfileTrigger.hidden = !isLoggedIn;
    if (!isLoggedIn && mobileProfileTrigger) mobileProfileTrigger.setAttribute('aria-hidden','true');
    if (isLoggedIn && mobileProfileTrigger) mobileProfileTrigger.setAttribute('aria-hidden','false');

    if (isLoggedIn){
      var label = auth.isAdmin ? 'Admin' : ((currentProfile && currentProfile.username) || auth.name || auth.email);
      var initial = (((currentProfile && (currentProfile.fullname || currentProfile.username)) || auth.name || auth.email || 'U').trim().charAt(0).toUpperCase());
      var photo = currentProfile && currentProfile.profileImageURL ? safeImageURL(currentProfile.profileImageURL) : '';
      if (userPillBadge) userPillBadge.textContent = initial;
      if (userPillBadgeMobile) userPillBadgeMobile.textContent = initial;
      if (userPillName) userPillName.textContent = label;
      if (userPillNameMobile) userPillNameMobile.textContent = label;
      [userPillAvatar,userPillAvatarMobile].forEach(function(img){
        if (!img) return;
        if (photo){ img.src = photo; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
      });
      [userPillBadge,userPillBadgeMobile].forEach(function(el){ if (el) el.hidden = !!photo; });
      if (mobileProfileBadge) { mobileProfileBadge.textContent = initial; mobileProfileBadge.hidden = !!photo; }
      if (mobileProfileAvatar) {
        if (photo){ mobileProfileAvatar.src = photo; mobileProfileAvatar.hidden = false; }
        else { mobileProfileAvatar.removeAttribute('src'); mobileProfileAvatar.hidden = true; }
      }
    }
    document.querySelectorAll('.admin-only').forEach(function(el){ el.hidden = !(auth && auth.isAdmin); });
    var attendancePanel = document.getElementById('panel-attendance');
    if (attendancePanel) attendancePanel.hidden = !(auth && auth.isAdmin);
    if (!(auth && auth.isAdmin) && document.querySelector('[data-panel="attendance"].is-active')) activateTab('home');

    var verifyBanner = document.getElementById('verifyBanner');
    if (verifyBanner) verifyBanner.hidden = !(auth && auth.isPendingAdmin);
  }

  function logout(){
    if (fbAuth) fbAuth.signOut();
    activateTab('home');
    showToast('Logged out.');
  }
  ['logoutBtn','logoutBtnMobile'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', logout);
  });

  var refreshVerifyBtn = document.getElementById('refreshVerifyBtn');
  var resendVerifyBtn = document.getElementById('resendVerifyBtn');
  if (refreshVerifyBtn){
    refreshVerifyBtn.addEventListener('click', function(){
      if (!currentFirebaseUser){ showToast('Log in first.'); return; }
      refreshVerifyBtn.disabled = true;
      currentFirebaseUser.reload().then(function(){
        // Force a fresh ID token so auth.token.email_verified updates
        // server-side, then re-trigger our own auth-state handling.
        return currentFirebaseUser.getIdToken(true);
      }).then(function(){
        var ADMIN = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : '';
        var isMatchingEmail = currentFirebaseUser.email.toLowerCase() === ADMIN.toLowerCase();
        auth = {
          email: currentFirebaseUser.email,
          name: currentFirebaseUser.displayName || currentFirebaseUser.email,
          isAdmin: isMatchingEmail && currentFirebaseUser.emailVerified,
          isPendingAdmin: isMatchingEmail && !currentFirebaseUser.emailVerified,
          emailVerified: currentFirebaseUser.emailVerified
        };
        renderAuthUI();
        renderAllPosts();
        showToast(auth.isAdmin ? 'Verified — edit tools unlocked.' : 'Still not verified — check your inbox (and spam folder).');
      }).catch(function(err){
        showToast('Could not refresh: ' + err.message);
      }).finally(function(){ refreshVerifyBtn.disabled = false; });
    });
  }
  if (resendVerifyBtn){
    resendVerifyBtn.addEventListener('click', function(){
      if (!currentFirebaseUser){ showToast('Log in first.'); return; }
      resendVerifyBtn.disabled = true;
      currentFirebaseUser.sendEmailVerification()
        .then(function(){ showToast('Verification email sent — check your inbox.'); })
        .catch(function(err){ showToast('Could not send: ' + err.message); })
        .finally(function(){ resendVerifyBtn.disabled = false; });
    });
  }

  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    closeAuthModal();
    closePostModal();
  });

  /* ---------- react to real Firebase auth state ---------- */
  if (firebaseReady){
    fbAuth.onAuthStateChanged(function(user){
      if (user){
        var ADMIN = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : '';
        var isMatchingEmail = user.email.toLowerCase() === ADMIN.toLowerCase();
        auth = {
          email: user.email,
          name: user.displayName || user.email,
          isAdmin: isMatchingEmail && user.emailVerified,
          isPendingAdmin: isMatchingEmail && !user.emailVerified,
          emailVerified: user.emailVerified
        };
        currentFirebaseUser = user;
        fbDb.ref('users/' + user.uid).once('value').then(function(snap){
          var existing = snap.val();
          if (existing) {
            currentProfile = existing;
          } else {
            // Older accounts may exist in Firebase Authentication but have no
            // matching Realtime Database profile record. Create a minimal
            // profile so the admin can see the account in Attendance.
            currentProfile = {
              fullname: user.displayName || '',
              username: user.displayName || '',
              email: user.email || '',
              mobile: '', className: '', roll: '', memberTypes: [],
              profileImageURL: '',
              createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            fbDb.ref('users/' + user.uid).set(currentProfile).catch(function(err){
              console.error('Could not create missing profile record:', err);
            });
          }
          renderAuthUI();
          renderAllPosts();
          if (auth.isAdmin) loadAdminAttendanceData();
        }).catch(function(){
          currentProfile = {fullname:user.displayName || '',username:user.displayName || '',email:user.email || '',mobile:'',className:'',roll:'',memberTypes:[],profileImageURL:''};
          renderAuthUI(); renderAllPosts();
          if (auth.isAdmin) loadAdminAttendanceData();
        });
      } else {
        auth = null;
        currentFirebaseUser = null;
        currentProfile = null;
        renderAuthUI();
        renderAllPosts();
      }
    });
  } else {
    renderAuthUI();
  }

  function safeImageURL(value){
    var s = String(value || '').trim();
    if (!s) return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s;
    try {
      var u = new URL(s, window.location.href);
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch(e){ return ''; }
  }

  async function compressProfileImage(file){
    if (!file || !file.type || file.type.indexOf('image/') !== 0) throw new Error('Please choose an image file.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB. Choose a smaller photo.');
    var blobURL = URL.createObjectURL(file);
    try{
      var img = await new Promise(function(resolve,reject){
        var im = new Image(); im.onload=function(){resolve(im);}; im.onerror=function(){reject(new Error('Could not read the image.'));}; im.src=blobURL;
      });
      var maxSide = 320, scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',0.72);
    } finally { URL.revokeObjectURL(blobURL); }
  }


  /* ==========================================================
     USER PROFILE — stored in Realtime Database only
  ========================================================== */
  var profileOverlay = document.getElementById('profileOverlay');
  var profileForm = document.getElementById('profileForm');
  var profileClose = document.getElementById('profileModalClose');
  var profileCancel = document.getElementById('profileCancel');
  var profileSave = document.getElementById('profileSave');
  var profileAvatarPreview = document.getElementById('profileAvatarPreview');

  function renderProfileAvatar(photo, initial){
    if (!profileAvatarPreview) return;
    var safe = safeImageURL(photo || '');
    if (safe){
      profileAvatarPreview.innerHTML = '<img src="' + safe + '" alt="Profile picture">';
    } else {
      profileAvatarPreview.textContent = initial || 'U';
    }
  }
  function openProfileModal(){
    if (!auth || !currentFirebaseUser || !profileOverlay) return;
    var p = currentProfile || {};
    document.getElementById('profileFullname').value = p.fullname || '';
    document.getElementById('profileUsername').value = p.username || currentFirebaseUser.displayName || '';
    document.getElementById('profileMobile').value = p.mobile || '';
    document.getElementById('profileClass').value = p.className || '';
    document.getElementById('profileRoll').value = p.roll || '';
    setMemberTypeChecks('profileMemberTypes', p.memberTypes || p.memberType || []);
    document.getElementById('profileImageURL').value = p.profileImageURL && !/^data:image\//i.test(p.profileImageURL) ? p.profileImageURL : '';
    document.getElementById('profileImageFile').value = '';
    renderProfileAvatar(p.profileImageURL, (p.fullname || p.username || 'U').charAt(0).toUpperCase());
    profileOverlay.classList.add('is-open'); document.body.style.overflow='hidden';
  }
  function closeProfileModal(){ if (profileOverlay) profileOverlay.classList.remove('is-open'); document.body.style.overflow=''; }
  [document.getElementById('userProfileTrigger'), document.getElementById('userProfileTriggerMobile')].forEach(function(btn){ if(btn) btn.addEventListener('click', openProfileModal); });
  if (profileClose) profileClose.addEventListener('click', closeProfileModal);
  if (profileCancel) profileCancel.addEventListener('click', closeProfileModal);
  if (profileOverlay) profileOverlay.addEventListener('click', function(e){ if(e.target===profileOverlay) closeProfileModal(); });
  if (profileForm) profileForm.addEventListener('submit', async function(e){
    e.preventDefault();
    if (!auth || !currentFirebaseUser || !firebaseReady){ showToast('Please log in first.'); return; }
    profileSave.disabled = true;
    try{
      var file = document.getElementById('profileImageFile').files[0];
      var url = document.getElementById('profileImageURL').value.trim();
      var profileImageURL = url ? safeImageURL(url) : (currentProfile && currentProfile.profileImageURL || '');
      if (url && !profileImageURL) throw new Error('Profile picture URL must use http or https.');
      if (file) profileImageURL = await compressProfileImage(file);
      var payload = {
        fullname: document.getElementById('profileFullname').value.trim(),
        username: document.getElementById('profileUsername').value.trim(),
        mobile: document.getElementById('profileMobile').value.trim(),
        className: document.getElementById('profileClass').value.trim(),
        roll: document.getElementById('profileRoll').value.trim(),
        memberTypes: normalizeMemberTypes(selectedMemberTypes('profileMemberTypes')),
        email: currentFirebaseUser.email,
        profileImageURL: profileImageURL,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };
      if (!payload.fullname || !payload.username || !payload.mobile || !payload.className || !payload.roll) throw new Error('Please complete all required profile fields.');
      if (payload.memberTypes.length < 1 || payload.memberTypes.length > 3) throw new Error('Select 1 to 3 member types.');
      await fbDb.ref('users/' + currentFirebaseUser.uid).update(payload);
      await currentFirebaseUser.updateProfile({displayName:payload.username});
      currentProfile = Object.assign({}, currentProfile || {}, payload);
      auth.name = payload.username;
      renderAuthUI();
      if (auth.isAdmin) loadAdminAttendanceData();
      closeProfileModal(); showToast('Profile updated.');
    }catch(err){ showToast('Could not save profile: ' + (err.message || err)); }
    finally{ profileSave.disabled = false; }
  });

  bindMemberTypeLimit('signupMemberTypes');
  bindMemberTypeLimit('profileMemberTypes');

  /* ==========================================================
     ADMIN ATTENDANCE + DEVICE BIOMETRIC + SHOP
  ========================================================== */
  var adminUsersCache = {};
  var adminBiometricCache = {};
  var adminAttendanceCache = {};
  var shopProducts = [];
  var adminDataLoaded = false;

  function isWebAuthnReady(){
    return window.isSecureContext && !!window.PublicKeyCredential && !!navigator.credentials;
  }

  function bytesToBase64Url(bytes){
    var str = '';
    for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function arrayBufferToBase64Url(buf){ return bytesToBase64Url(new Uint8Array(buf)); }
  function base64UrlToBytes(input){
    var pad = '='.repeat((4 - (input.length % 4)) % 4);
    var b64 = input.replace(/-/g,'+').replace(/_/g,'/') + pad;
    var raw = atob(b64), out = new Uint8Array(raw.length);
    for (var i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function randomBytes(len){
    var bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  function webAuthnUserId(uid){ return new TextEncoder().encode(uid); }
  function credentialMatchesStored(cred, storedId){
    return cred && cred.rawId && arrayBufferToBase64Url(cred.rawId) === storedId;
  }
  function uvFlagPresent(assertionResponse){
    try{
      var data = new Uint8Array(assertionResponse.authenticatorData);
      return data.length > 32 && (data[32] & 0x04) === 0x04;
    }catch(e){ return false; }
  }

  function dhakaDateParts(dateObj){
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone:'Asia/Dhaka', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(dateObj || new Date());
    var out = {};
    parts.forEach(function(p){ if (p.type !== 'literal') out[p.type] = p.value; });
    return out;
  }
  function dhakaISODate(dateObj){
    var p = dhakaDateParts(dateObj); return p.year + '-' + p.month + '-' + p.day;
  }
  function dhakaMonthKey(dateObj){ return dhakaISODate(dateObj).slice(0,7); }
  function monthLabel(monthKey){
    var [y,m] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'Asia/Dhaka'}).format(new Date(Date.UTC(y,m-1,1,6)));
  }
  function daysInMonth(year, month){ return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function prettyDate(iso){
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  var biometricRing = document.getElementById('biometricRing');

  function setBiometricModal(open, title, subtitle, userLabel, message, working){
    var overlay = document.getElementById('biometricOverlay');
    var titleEl = document.getElementById('biometricTitle');
    var subtitleEl = document.getElementById('biometricSubtitle');
    var userEl = document.getElementById('biometricUser');
    var messageEl = document.getElementById('biometricMessage');
    var ring = document.getElementById('biometricRing');
    var start = document.getElementById('biometricStart');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = title || 'Fingerprint Attendance';
    if (subtitleEl) subtitleEl.textContent = subtitle || '';
    if (userEl) userEl.textContent = userLabel || '';
    if (messageEl) messageEl.textContent = message || '';
    if (ring) ring.classList.toggle('is-working', !!working);
    overlay.classList.toggle('is-open', !!open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function closeBiometricModal(){ setBiometricModal(false); }

  async function setupFingerprintForUser(uid){
    if (!auth || !auth.isAdmin){ showToast('Only the administrator can set fingerprints.'); return; }
    if (!firebaseReady){ showToast('Firebase must be connected before fingerprint setup can be saved.'); return; }
    if (!isWebAuthnReady()){
      showToast('Fingerprint setup needs HTTPS or localhost and a device/browser with WebAuthn support.');
      return;
    }
    var user = adminUsersCache[uid];
    if (!user){ showToast('User record not found.'); return; }
    var existing = adminBiometricCache[uid];
    var actionTitle = existing ? 'Change Fingerprint' : 'Fingerprint Setup';
    setBiometricModal(true, actionTitle, existing ? 'Replacing the registered device credential' : 'Registering this exact device', user.username || user.email, 'Follow the on-screen device prompt and complete fingerprint/user verification.', false);
    try{
      var challenge = randomBytes(32);
      var credential = await navigator.credentials.create({
        publicKey:{
          challenge:challenge,
          rp:{name:'Dinajpur Zilla School Scout Group', id:location.hostname},
          user:{id:webAuthnUserId(uid), name:user.username || user.email, displayName:user.username || user.email},
          pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
          authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'required', requireResidentKey:true},
          timeout:60000,
          attestation:'none'
        }
      });
      if (!credential) throw new Error('No credential was created.');
      var credentialId = arrayBufferToBase64Url(credential.rawId);
      await fbDb.ref('biometric/' + uid).set({
        credentialId:credentialId,
        origin:location.origin,
        registeredAt:firebase.database.ServerValue.TIMESTAMP,
        method:'WebAuthn platform user verification'
      });
      adminBiometricCache[uid] = {credentialId:credentialId, origin:location.origin, registeredAt:Date.now(), method:'WebAuthn platform user verification'};
      closeBiometricModal();
      showToast(existing ? 'Fingerprint changed for ' + (user.username || user.email) + '.' : 'Fingerprint setup complete for ' + (user.username || user.email) + '.');
      renderAdminUsers();
    }catch(err){
      closeBiometricModal();
      var msg = err && err.name === 'NotAllowedError' ? 'Fingerprint setup was cancelled or rejected by the device.' : (err.message || 'Fingerprint setup failed.');
      showToast(msg);
    }
  }

  async function startAttendanceCheck(){
    if (!auth || !auth.isAdmin){ showToast('Only the administrator can start attendance.'); return; }
    if (!firebaseReady){ showToast('Firebase must be connected before attendance can be saved.'); return; }
    if (!isWebAuthnReady()){ showToast('This browser/device does not support the biometric check.'); return; }

    var credentialOwners = {};
    Object.keys(adminBiometricCache).forEach(function(uid){
      var bio = adminBiometricCache[uid];
      if (bio && bio.credentialId) credentialOwners[bio.credentialId] = uid;
    });
    if (!Object.keys(credentialOwners).length){
      showToast('No fingerprints have been registered yet. Use Fingerprint Setup beside a member first.');
      return;
    }

    setBiometricModal(true, 'Attendance Check', 'Any registered member can check in', '', 'Place a registered finger on the device. The system will identify the matching member automatically.', false);

    try{
      var challenge = randomBytes(32);
      var credential = await navigator.credentials.get({
        publicKey:{
          challenge:challenge,
          rpId:location.hostname,
          allowCredentials:[],
          userVerification:'required',
          timeout:60000
        }
      });
      if (!credential || !credential.response || !credential.rawId) throw new Error('No biometric credential was returned.');
      var returnedId = arrayBufferToBase64Url(credential.rawId);
      var uid = credentialOwners[returnedId];
      if (!uid) throw new Error('That fingerprint is not registered for this group. Attendance was not recorded.');
      if (!uvFlagPresent(credential.response)) throw new Error('The device did not report user verification. Attendance was not recorded.');
      var user = adminUsersCache[uid];
      if (!user) throw new Error('The matched user profile could not be found. Attendance was not recorded.');

      var today = dhakaISODate();
      if (adminAttendanceCache[uid] && adminAttendanceCache[uid][today]){
        closeBiometricModal();
        showToast((user.username || user.email) + ' is already present today.');
        return;
      }
      var record = {
        date:today,
        username:user.username || '',
        email:user.email || '',
        mobile:user.mobile || '',
        className:user.className || '',
        roll:user.roll || '',
        memberTypes:normalizeMemberTypes(user.memberTypes || []),
        verifiedBy:auth.email,
        verification:'WebAuthn user verification',
        recordedAt:firebase.database.ServerValue.TIMESTAMP
      };
      await fbDb.ref('attendance/' + uid + '/' + today).set(record);
      if (!adminAttendanceCache[uid]) adminAttendanceCache[uid] = {};
      adminAttendanceCache[uid][today] = {recordedAt:Date.now(), verification:record.verification};
      closeBiometricModal();
      renderAdminUsers();
      showToast((user.username || user.email) + ' marked present for ' + prettyDate(today) + '.');
      generateAttendancePDF(true);
    }catch(err){
      closeBiometricModal();
      var msg = err && err.name === 'NotAllowedError'
        ? 'Fingerprint verification failed or was cancelled. Attendance was not recorded.'
        : (err.message || 'Fingerprint verification failed. Attendance was not recorded.');
      showToast(msg);
    }
  }

  async function loadAdminAttendanceData(){
    if (!auth || !auth.isAdmin || !firebaseReady) return;
    try{
      var snapshots = await Promise.all([
        fbDb.ref('users').once('value'),
        fbDb.ref('biometric').once('value'),
        fbDb.ref('attendance').once('value')
      ]);
      adminUsersCache = {};
      snapshots[0].forEach(function(child){
        var d = child.val() || {};
        adminUsersCache[child.key] = {
          uid:child.key, username:d.username || '', email:d.email || '', fullname:d.fullname || '',
          mobile:d.mobile || '', className:d.className || '', roll:d.roll || '', memberTypes:normalizeMemberTypes(d.memberTypes || d.memberType || []),
          profileImageURL:d.profileImageURL || ''
        };
      });

      // Guarantee that the currently logged-in administrator appears even
      // when the Firebase Authentication account was created before this
      // profile system was added.
      if (currentFirebaseUser && !adminUsersCache[currentFirebaseUser.uid]) {
        adminUsersCache[currentFirebaseUser.uid] = {
          uid:currentFirebaseUser.uid,
          username:currentFirebaseUser.displayName || '',
          email:currentFirebaseUser.email || '',
          fullname:currentFirebaseUser.displayName || '',
          mobile:'', className:'', roll:'', memberTypes:['MEMBER'], profileImageURL:''
        };
      }

      adminBiometricCache = snapshots[1].val() || {};
      adminAttendanceCache = snapshots[2].val() || {};
      adminDataLoaded = true;
      renderAdminUsers();
    }catch(err){
      showToast('Could not load admin attendance data: ' + err.message);
    }
  }

  function renderAttendanceSummary(){
    var el = document.getElementById('attendanceSummary');
    if (!el) return;
    var users = Object.keys(adminUsersCache).length;
    var configured = Object.keys(adminBiometricCache).filter(function(uid){ return adminBiometricCache[uid] && adminBiometricCache[uid].credentialId; }).length;
    var today = dhakaISODate();
    var present = Object.keys(adminAttendanceCache).filter(function(uid){ return adminAttendanceCache[uid] && adminAttendanceCache[uid][today]; }).length;
    el.innerHTML =
      '<div class="attendance-stat"><span class="attendance-stat__value">' + users + '</span><span class="attendance-stat__label">Registered users</span></div>' +
      '<div class="attendance-stat"><span class="attendance-stat__value">' + configured + '</span><span class="attendance-stat__label">Fingerprint ready</span></div>' +
      '<div class="attendance-stat"><span class="attendance-stat__value">' + present + '</span><span class="attendance-stat__label">Present today</span></div>';
  }

  function renderAdminUsers(){
    var body = document.getElementById('usersTableBody');
    var empty = document.getElementById('attendanceEmpty');
    if (!body) return;
    var ids = Object.keys(adminUsersCache).sort(function(a,b){ return (adminUsersCache[a].username || '').localeCompare(adminUsersCache[b].username || ''); });
    empty.hidden = ids.length !== 0;
    renderAttendanceSummary();
    body.innerHTML = ids.map(function(uid){
      var u = adminUsersCache[uid], bio = adminBiometricCache[uid], today = dhakaISODate();
      var hasBio = !!(bio && bio.credentialId);
      var isPresent = !!(adminAttendanceCache[uid] && adminAttendanceCache[uid][today]);
      var lastDates = adminAttendanceCache[uid] ? Object.keys(adminAttendanceCache[uid]).sort().reverse() : [];
      var last = lastDates[0] || '';
      var fingerprintBtn = hasBio
        ? '<button class="admin-action-btn admin-action-btn--gold" data-biometric="' + uid + '">Change Fingerprint</button>'
        : '<button class="admin-action-btn admin-action-btn--gold" data-biometric="' + uid + '">Fingerprint Setup</button>';
      var status = isPresent
        ? '<span class="status-chip status-chip--present">Present today</span>'
        : '<span class="status-chip status-chip--muted">' + (last ? 'Last: ' + prettyDate(last) : 'Not attended yet') + '</span>';
      var photo = safeImageURL(u.profileImageURL || '');
      var avatar = photo
        ? '<img class="attendance-avatar" src="' + photo + '" alt="' + escapeHTML(u.username || 'Profile') + '">' 
        : '<div class="attendance-avatar attendance-avatar--fallback">' + escapeHTML((u.username || u.fullname || 'U').charAt(0).toUpperCase()) + '</div>';
      return '<tr>' +
        '<td>' + avatar + '</td>' +
        '<td><div class="admin-table__identity"><strong>' + escapeHTML(u.fullname || 'No name') + '</strong></div></td>' +
        '<td>' + escapeHTML(u.username || '') + '</td>' +
        '<td>' + escapeHTML(u.email || '') + '</td>' +
        '<td>' + escapeHTML(u.mobile || '') + '</td>' +
        '<td>' + escapeHTML(u.className || '') + '</td>' +
        '<td>' + escapeHTML(u.roll || '') + '</td>' +
        '<td>' + escapeHTML(normalizeMemberTypes(u.memberTypes || []).join(' / ')) + '</td>' +
        '<td><div class="admin-action-group">' + fingerprintBtn + '</div></td>' +
        '<td>' + status + '</td>' +
      '</tr>';
    }).join('');
  }

  async function generateAttendancePDF(autoDownload){
    if (!auth || !auth.isAdmin){ showToast('Only the administrator can generate attendance PDFs.'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF){ showToast('PDF library did not load. Check the internet connection and reload.'); return; }
    if (!adminDataLoaded) await loadAdminAttendanceData();
    var monthKey = dhakaMonthKey(new Date());
    var [year, month] = monthKey.split('-').map(Number);
    var currentDay = Number(dhakaDateParts(new Date()).day);
    var totalDays = daysInMonth(year, month);
    var daysThroughToday = Math.min(currentDay, totalDays);
    var doc = new window.jspdf.jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
    doc.setFont('helvetica','bold');
    doc.setFontSize(15);
    doc.text('Dinajpur Zilla School Scout Group - Attendance Sheet', 10, 12);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.text(monthLabel(monthKey), 10, 18);
    doc.text('Generated: ' + prettyDate(dhakaISODate()), 228, 18, {align:'right'});

    var head = [['Name','Username','Email','Mobile','Class','Roll','Member Type']];
    for (var d=1; d<=daysThroughToday; d++) head[0].push(String(d).padStart(2,'0'));
    var rows = Object.keys(adminUsersCache).sort(function(a,b){ return (adminUsersCache[a].username || '').localeCompare(adminUsersCache[b].username || ''); }).map(function(uid){
      var u = adminUsersCache[uid], row = [u.fullname || '', u.username || '', u.email || '', u.mobile || '', u.className || '', u.roll || '', normalizeMemberTypes(u.memberTypes || []).join(' / ')];
      for (var day=1; day<=daysThroughToday; day++){
        var iso = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
        row.push(adminAttendanceCache[uid] && adminAttendanceCache[uid][iso] ? 'P' : '-');
      }
      return row;
    });
    doc.autoTable({
      head:head, body:rows, startY:24, margin:{left:10,right:10}, theme:'grid',
      styles:{font:'helvetica',fontSize:5.4,cellPadding:1.1,halign:'center',valign:'middle'},
      headStyles:{fontStyle:'bold',fontSize:5.7,halign:'center'},
      columnStyles:{0:{cellWidth:31,halign:'left'},1:{cellWidth:27,halign:'left'},2:{cellWidth:54,halign:'left'},3:{cellWidth:26,halign:'left'},4:{cellWidth:18,halign:'left'},5:{cellWidth:12,halign:'left'},6:{cellWidth:24,halign:'left'}},
      didParseCell:function(data){
        if (data.section === 'body' && data.column.index >= 2){ data.cell.styles.fontStyle = data.cell.raw === 'P' ? 'bold' : 'normal'; }
      }
    });
    var finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 210;
    doc.setFontSize(7);
    doc.text('P = Present   - = No attendance record for that date', 10, Math.min(finalY, 198));
    var filename = 'attendance-' + monthKey + '.pdf';
    doc.save(filename);
    if (!autoDownload) showToast('Attendance PDF generated: ' + filename);
  }

  // Admin attendance button actions.
  document.getElementById('main').addEventListener('click', function(e){
    var bioBtn = e.target.closest('[data-biometric]');
    var shopEdit = e.target.closest('[data-shop-edit]');
    var shopDelete = e.target.closest('[data-shop-delete]');
    if (bioBtn){ setupFingerprintForUser(bioBtn.getAttribute('data-biometric')); return; }
    if (shopEdit){ openShopModal(shopEdit.getAttribute('data-shop-edit')); return; }
    if (shopDelete){ deleteShopProduct(shopDelete.getAttribute('data-shop-delete')); return; }
  });

  var refreshAttendanceBtn = document.getElementById('refreshAttendanceBtn');
  var generateAttendancePdfBtn = document.getElementById('generateAttendancePdfBtn');
  if (refreshAttendanceBtn) refreshAttendanceBtn.addEventListener('click', loadAdminAttendanceData);
  var startAttendanceBtn = document.getElementById('startAttendanceBtn');
  if (startAttendanceBtn) startAttendanceBtn.addEventListener('click', startAttendanceCheck);
  if (generateAttendancePdfBtn) generateAttendancePdfBtn.addEventListener('click', function(){ generateAttendancePDF(false); });

  var biometricClose = document.getElementById('biometricClose');
  if (biometricClose) biometricClose.addEventListener('click', closeBiometricModal);
  var biometricOverlay = document.getElementById('biometricOverlay');
  if (biometricOverlay) biometricOverlay.addEventListener('click', function(e){ if (e.target === biometricOverlay) closeBiometricModal(); });


  // Shop data and editor.
  function seedShop(){ return []; }
  function loadShopProducts(){
    if (!firebaseReady){ shopProducts = seedShop(); renderShop(); return; }
    fbDb.ref('shop').orderByChild('createdAt').once('value').then(function(snapshot){
      var list = [];
      snapshot.forEach(function(child){
        var d = child.val() || {};
        list.push({id:child.key,name:d.name||'',price:Number(d.price)||0,stock:d.stock === '' || d.stock == null ? null : Number(d.stock),description:d.description||'',imageURL:d.imageURL||'',createdAt:d.createdAt||0});
      });
      shopProducts = list.reverse();
      renderShop();
    }).catch(function(err){ showToast('Could not load shop: ' + err.message); });
  }
  function renderShop(){
    var grid = document.getElementById('shopGrid');
    if (!grid) return;
    if (!shopProducts.length){
      grid.innerHTML = '<div class="posts-empty">No shop products yet' + (auth && auth.isAdmin ? ' - use + Add Product.' : '.') + '</div>';
      return;
    }
    grid.innerHTML = shopProducts.map(function(p){
      var shopImage = safeImageURL(p.imageURL);
      var image = shopImage ? '<img class="shop-card__image" src="' + shopImage + '" alt="' + escapeHTML(p.name) + '">' : '<div class="shop-card__placeholder">SC</div>';
      var stock = p.stock == null ? 'Stock not listed' : (p.stock > 0 ? p.stock + ' available' : 'Out of stock');
      var actions = '';
      if (auth && auth.isAdmin){
        actions = '<div class="shop-card__actions"><button class="admin-action-btn admin-action-btn--gold" data-shop-edit="' + p.id + '">Edit</button><button class="admin-action-btn admin-action-btn--red" data-shop-delete="' + p.id + '">Delete</button></div>';
      }
      return '<article class="shop-card">' + image + '<div class="shop-card__body"><h3 class="shop-card__name">' + escapeHTML(p.name) + '</h3><div class="shop-card__price">BDT ' + p.price.toFixed(2) + '</div><p class="shop-card__desc">' + escapeHTML(p.description) + '</p><div class="shop-card__stock">' + escapeHTML(stock) + '</div>' + actions + '</div></article>';
    }).join('');
  }
  var shopOverlay = document.getElementById('shopOverlay');
  var shopModalClose = document.getElementById('shopModalClose');
  var shopCancel = document.getElementById('shopCancel');
  var shopForm = document.getElementById('shopForm');
  function openShopModal(id){
    if (!auth || !auth.isAdmin){ showToast('Only the administrator can manage the shop.'); return; }
    var p = id ? shopProducts.find(function(x){return x.id===id;}) : null;
    document.getElementById('shopModalTitle').textContent = p ? 'Edit Product' : 'Add Product';
    document.getElementById('shopProductId').value = p ? p.id : '';
    document.getElementById('shopProductName').value = p ? p.name : '';
    document.getElementById('shopProductPrice').value = p ? p.price : '';
    document.getElementById('shopProductStock').value = p && p.stock != null ? p.stock : '';
    document.getElementById('shopProductDescription').value = p ? p.description : '';
    document.getElementById('shopProductImage').value = p ? p.imageURL : '';
    shopOverlay.classList.add('is-open'); document.body.style.overflow='hidden';
  }
  function closeShopModal(){ shopOverlay.classList.remove('is-open'); document.body.style.overflow=''; }
  async function deleteShopProduct(id){
    if (!auth || !auth.isAdmin) return;
    var p = shopProducts.find(function(x){return x.id===id;});
    if (!p || !window.confirm('Delete ' + p.name + '?')) return;
    if (!firebaseReady){ showToast('Shop is not connected to Firebase.'); return; }
    fbDb.ref('shop/' + id).remove().then(function(){ showToast('Product deleted.'); loadShopProducts(); }).catch(function(err){showToast('Could not delete product: ' + err.message);});
  }
  if (document.getElementById('addShopProductBtn')) document.getElementById('addShopProductBtn').addEventListener('click', function(){ openShopModal(null); });
  if (shopModalClose) shopModalClose.addEventListener('click', closeShopModal);
  if (shopCancel) shopCancel.addEventListener('click', closeShopModal);
  if (shopOverlay) shopOverlay.addEventListener('click', function(e){ if(e.target===shopOverlay) closeShopModal(); });
  if (shopForm) shopForm.addEventListener('submit', function(e){
    e.preventDefault();
    if (!auth || !auth.isAdmin || !firebaseReady){ showToast('Only the verified administrator can save shop products.'); return; }
    var id = document.getElementById('shopProductId').value;
    var payload = {
      name:document.getElementById('shopProductName').value.trim(),
      price:Number(document.getElementById('shopProductPrice').value || 0),
      stock:document.getElementById('shopProductStock').value === '' ? null : Number(document.getElementById('shopProductStock').value),
      description:document.getElementById('shopProductDescription').value.trim(),
      imageURL:document.getElementById('shopProductImage').value.trim()
    };
    var promise = id ? fbDb.ref('shop/' + id).update(payload) : (payload.createdAt = firebase.database.ServerValue.TIMESTAMP, fbDb.ref('shop').push(payload));
    var btn = document.getElementById('shopSubmit'); btn.disabled=true;
    promise.then(function(){ closeShopModal(); loadShopProducts(); showToast(id ? 'Product updated.' : 'Product added.'); }).catch(function(err){showToast('Could not save product: ' + err.message);}).finally(function(){btn.disabled=false;});
  });

  /* ==========================================================
     POST DATA — Realtime Database-backed when configured, else
     the static seed above (read-only preview).
  ========================================================== */
  var listenerRefs = [];

  function startPostListeners(){
    if (!firebaseReady) { renderAllPosts(); return; }
    Object.keys(SECTION_LABELS).forEach(function(section){
      var ref = fbDb.ref('posts/' + section).orderByChild('order');
      ref.on('value', function(snapshot){
        var list = [];
        snapshot.forEach(function(child){
          var d = child.val() || {};
          list.push({ id: child.key, name: d.name || '', description: d.description || '',
                      imageURL: d.imageURL || '', pdfURL: d.pdfURL || '', videoURL: d.videoURL || '',
                      order: typeof d.order === 'number' ? d.order : 0 });
        });
        posts[section] = list;
        renderSection(section);
      }, function(err){
        console.error('Realtime DB listener error (' + section + '):', err);
        showToast('Could not load ' + SECTION_LABELS[section] + ' — check your Realtime Database rules.');
      });
      listenerRefs.push(ref);
    });
  }
  startPostListeners();

  /* ==========================================================
     VIDEO EMBED HELPER
  ========================================================== */
  function toEmbedVideoURL(url){
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1];
    var vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return 'https://player.vimeo.com/video/' + vimeo[1];
    return null; // treat as a direct video file
  }

  /* ==========================================================
     POST RENDERING
  ========================================================== */
  function escapeHTML(str){
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderSection(section){
    var grid = document.getElementById('grid-' + section);
    if (!grid) return;
    var list = (posts[section] || []).slice().sort(function(a,b){ return a.order - b.order; });
    var isAdmin = !!(auth && auth.isAdmin);

    if (list.length === 0){
      grid.innerHTML = '<div class="posts-empty">No posts yet' + (isAdmin ? ' — use “+ New Post” to add the first one.' : '.') + '</div>';
      return;
    }

    grid.innerHTML = list.map(function(post){
      var safePostImage = safeImageURL(post.imageURL);
      var imageHTML = safePostImage
        ? '<img class="post-card__image" src="' + safePostImage + '" alt="' + escapeHTML(post.name) + '">'
        : '';

      var videoHTML = '';
      if (post.videoURL){
        var embed = toEmbedVideoURL(post.videoURL);
        videoHTML = '<div class="post-card__video-wrap">' + (
          embed
            ? '<iframe src="' + embed + '" title="' + escapeHTML(post.name) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
            : '<video src="' + post.videoURL + '" controls preload="metadata"></video>'
        ) + '</div>';
      }

      var pdfHTML = post.pdfURL
        ? '<div class="post-card__pdf-wrap">' +
            '<iframe class="post-card__pdf-embed" src="' + post.pdfURL + '" title="' + escapeHTML(post.name) + ' PDF"></iframe>' +
            '<a class="post-card__pdf-openlink" href="' + post.pdfURL + '" target="_blank" rel="noopener">Open PDF in new tab ↗</a>' +
          '</div>'
        : '';

      var handleHTML = isAdmin ? '<span class="post-card__handle" title="Drag to reorder">⠿⠿</span>' : '';
      var adminHTML = isAdmin
        ? '<div class="post-card__admin">' +
            '<button class="post-card__edit" data-edit="' + post.id + '" data-section="' + section + '">Edit</button>' +
            '<button class="post-card__delete" data-delete="' + post.id + '" data-section="' + section + '">Delete</button>' +
          '</div>'
        : '';

      return '<article class="post-card' + (isAdmin ? ' post-card--draggable' : '') + '" data-id="' + post.id + '"' +
        (isAdmin ? ' draggable="true"' : '') + '>' +
        handleHTML + imageHTML + videoHTML +
        '<h3 class="post-card__name">' + escapeHTML(post.name) + '</h3>' +
        '<p class="post-card__desc">' + escapeHTML(post.description) + '</p>' +
        pdfHTML + adminHTML +
      '</article>';
    }).join('');

    if (isAdmin) wireDragToReorder(grid, section);
  }

  function renderAllPosts(){ Object.keys(SECTION_LABELS).forEach(renderSection); }

  /* ---------- drag-to-reorder (admin only) ---------- */
  function wireDragToReorder(grid, section){
    var dragEl = null;

    grid.querySelectorAll('.post-card--draggable').forEach(function(card){
      card.addEventListener('dragstart', function(){
        dragEl = card;
        setTimeout(function(){ card.classList.add('is-dragging'); }, 0);
      });
      card.addEventListener('dragend', function(){
        card.classList.remove('is-dragging');
        dragEl = null;
        var newOrderIds = Array.prototype.map.call(grid.querySelectorAll('.post-card'), function(el){ return el.getAttribute('data-id'); });
        persistOrder(section, newOrderIds);
      });
    });

    grid.addEventListener('dragover', function(e){
      e.preventDefault();
      if (!dragEl) return;
      var isVertical = grid.classList.contains('posts-grid--feed');
      var afterEl = getDragAfterElement(grid, e.clientY, e.clientX, isVertical);
      if (afterEl == null) grid.appendChild(dragEl); else grid.insertBefore(dragEl, afterEl);
    });
  }
  function getDragAfterElement(container, y, x, isVerticalList){
    var els = Array.prototype.slice.call(container.querySelectorAll('.post-card--draggable:not(.is-dragging)'));
    var closest = { offset: -Infinity, element: null };
    els.forEach(function(el){
      var box = el.getBoundingClientRect();
      var offset = isVerticalList
        ? y - box.top - box.height / 2
        : (Math.abs(y - (box.top + box.height/2)) < box.height ? x - box.left - box.width / 2 : -Infinity);
      if (offset < 0 && offset > closest.offset) closest = { offset: offset, element: el };
    });
    return closest.element;
  }
  function persistOrder(section, orderedIds){
    posts[section] = orderedIds.map(function(id, i){
      var p = posts[section].find(function(x){ return x.id === id; });
      if (p) p.order = i;
      return p;
    }).filter(Boolean);

    if (!firebaseReady){ showToast('Order updated (preview only).'); return; }
    var updates = {};
    orderedIds.forEach(function(id, i){ updates[id + '/order'] = i; });
    fbDb.ref('posts/' + section).update(updates)
      .then(function(){ showToast('Order updated.'); })
      .catch(function(err){ showToast('Could not save order: ' + err.message); });
  }

  /* ---------- edit / delete clicks (delegated) ---------- */
  document.getElementById('main').addEventListener('click', function(e){
    var editBtn = e.target.closest('[data-edit]');
    var delBtn = e.target.closest('[data-delete]');

    if (editBtn){
      var section = editBtn.getAttribute('data-section');
      var id = editBtn.getAttribute('data-edit');
      var post = (posts[section] || []).find(function(p){ return p.id === id; });
      if (post) openPostModal(section, post);
    }
    if (delBtn){
      var dsection = delBtn.getAttribute('data-section');
      var did = delBtn.getAttribute('data-delete');
      if (window.confirm('Delete this post? This cannot be undone.')){
        if (firebaseReady){
          fbDb.ref('posts/' + dsection + '/' + did).remove()
            .then(function(){ showToast('Post deleted.'); })
            .catch(function(err){ showToast('Could not delete: ' + err.message); });
        } else {
          posts[dsection] = (posts[dsection] || []).filter(function(p){ return p.id !== did; });
          renderSection(dsection);
          showToast('Post deleted (preview only).');
        }
      }
    }
  });

  document.querySelectorAll('[data-add]').forEach(function(btn){
    btn.addEventListener('click', function(){ openPostModal(btn.getAttribute('data-add'), null); });
  });

  /* ==========================================================
     POST EDITOR MODAL
  ========================================================== */
  var postOverlay = document.getElementById('postOverlay');
  var postModalClose = document.getElementById('postModalClose');
  var postModalTitle = document.getElementById('postModalTitle');
  var postModalSubtitle = document.getElementById('postModalSubtitle');
  var postForm = document.getElementById('postForm');
  var postIdInput = document.getElementById('postId');
  var postSectionInput = document.getElementById('postSection');
  var postNameInput = document.getElementById('postName');
  var postDescInput = document.getElementById('postDescription');
  var postCancel = document.getElementById('postCancel');
  var postSubmitBtn = document.getElementById('postSubmit');

  var fields = {
    image: { linkInput: document.getElementById('postImageLink'), preview: document.getElementById('postImagePreview'), removeBtn: document.getElementById('postImageRemove'), url:'', kind:'image' },
    pdf:   { linkInput: document.getElementById('postPdfLink'), preview: document.getElementById('postPdfPreview'), removeBtn: document.getElementById('postPdfRemove'), url:'', kind:'raw' },
    video: { linkInput: document.getElementById('postVideoLink'), preview: document.getElementById('postVideoPreview'), removeBtn: document.getElementById('postVideoRemove'), url:'', kind:'raw' }
  };
  var imagePreviewImg = document.getElementById('postImagePreviewImg');
  var pdfPreviewName = document.getElementById('postPdfPreviewName');
  var videoPreviewName = document.getElementById('postVideoPreviewName');

  function openPostModal(section, existingPost){
    postForm.reset();
    fields.image.url = existingPost ? (existingPost.imageURL || '') : '';
    fields.pdf.url = existingPost ? (existingPost.pdfURL || '') : '';
    fields.video.url = existingPost ? (existingPost.videoURL || '') : '';

    postSectionInput.value = section;
    postIdInput.value = existingPost ? existingPost.id : '';
    postModalSubtitle.textContent = SECTION_LABELS[section] || section;
    postModalTitle.textContent = existingPost ? 'Edit Post' : 'New Post';
    postNameInput.value = existingPost ? existingPost.name : '';
    postDescInput.value = existingPost ? existingPost.description : '';

    if (fields.image.linkInput) fields.image.linkInput.value = fields.image.url || '';
    if (fields.pdf.linkInput) fields.pdf.linkInput.value = fields.pdf.url || '';
    if (fields.video.linkInput) fields.video.linkInput.value = fields.video.url || '';
    ['image','pdf','video'].forEach(function(key){ updateFieldPreview(key); });

    postOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ postNameInput.focus(); }, 50);
  }
  function closePostModal(){
    postOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  if (postModalClose) postModalClose.addEventListener('click', closePostModal);
  if (postCancel) postCancel.addEventListener('click', closePostModal);
  if (postOverlay){ postOverlay.addEventListener('click', function(e){ if (e.target === postOverlay) closePostModal(); }); }

  /* ---------- Realtime Database only media links ---------- */
  ['image','pdf','video'].forEach(function(key){
    var f = fields[key];
    if (!f || !f.linkInput) return;
    f.linkInput.addEventListener('input', function(){ f.url = f.linkInput.value.trim(); updateFieldPreview(key); });
    if (f.removeBtn){ f.removeBtn.addEventListener('click', function(){ f.url=''; f.linkInput.value=''; updateFieldPreview(key); }); }
  });

  function updateFieldPreview(key){
    var f = fields[key]; if (!f.preview) return;
    if (!f.url){ f.preview.hidden = true; return; }
    f.preview.hidden = false;
    if (key === 'image' && imagePreviewImg) imagePreviewImg.src = safeImageURL(f.url);
    else if (key === 'pdf' && pdfPreviewName) pdfPreviewName.textContent = f.url;
    else if (key === 'video' && videoPreviewName) videoPreviewName.textContent = f.url;
  }

  /* ---------- save post ---------- */
  postForm.addEventListener('submit', function(e){
    e.preventDefault();
    if (!auth || !auth.isAdmin){
      showToast('Only the admin account can edit posts.');
      closePostModal();
      return;
    }
    var section = postSectionInput.value;
    var id = postIdInput.value;
    var name = postNameInput.value.trim();
    var description = postDescInput.value.trim();
    var payload = {
      section: section, name: name, description: description,
      imageURL: fields.image.url, pdfURL: fields.pdf.url, videoURL: fields.video.url
    };

    postSubmitBtn.disabled = true;

    if (!firebaseReady){
      // Preview-only fallback so the UI still works before Firebase is wired up.
      if (!posts[section]) posts[section] = [];
      if (id){
        var existing = posts[section].find(function(p){ return p.id === id; });
        if (existing) Object.assign(existing, payload);
      } else {
        payload.id = section + '_' + Date.now().toString(36);
        payload.order = posts[section].length;
        posts[section].push(payload);
      }
      renderSection(section);
      showToast((id ? 'Post updated' : 'Post published') + ' (preview only — connect Firebase to make this permanent).');
      postSubmitBtn.disabled = false;
      closePostModal();
      return;
    }

    var promise;
    if (id){
      promise = fbDb.ref('posts/' + section + '/' + id).update(payload);
    } else {
      payload.order = (posts[section] || []).length;
      payload.createdAt = firebase.database.ServerValue.TIMESTAMP;
      promise = fbDb.ref('posts/' + section).push(payload);
    }
    promise.then(function(){
      showToast(id ? 'Post updated.' : 'Post published.');
      closePostModal();
    }).catch(function(err){
      showToast('Could not save: ' + err.message);
    }).finally(function(){ postSubmitBtn.disabled = false; });
  });

  /* ==========================================================
     INIT
  ========================================================== */
  var hash = window.location.hash.replace('#','');
  if (VALID_TABS.indexOf(hash) !== -1) activateTab(hash);
  else loadShopProducts();
})();
