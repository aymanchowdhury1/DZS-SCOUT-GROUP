(function(){
  "use strict";

  var SECTION_LABELS = { leaders: 'Leaders', promotions: 'Promotions', books: 'Books', leaks: 'Leaks' };

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
  var fbAuth, fbDb, fbStorage;

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
      fbStorage = firebase.storage();
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

  function activateTab(name){
    tabButtons.forEach(function(btn){ btn.classList.toggle('is-active', btn.getAttribute('data-tab') === name); });
    panels.forEach(function(panel){ panel.classList.toggle('is-active', panel.getAttribute('data-panel') === name); });
    if (drawer) drawer.classList.remove('is-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
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
      var password = signupForm.querySelector('[name="password"]').value;
      var submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      fbAuth.createUserWithEmailAndPassword(email, password).then(function(cred){
        return cred.user.updateProfile({ displayName: username || fullname }).then(function(){
          return fbDb.ref('users/' + cred.user.uid).set({
            fullname: fullname, username: username, email: email,
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
  var userPillName = document.getElementById('userPillName');
  var userPillNameMobile = document.getElementById('userPillNameMobile');

  function renderAuthUI(){
    var isLoggedIn = !!auth;
    if (loggedOutDesktop) loggedOutDesktop.hidden = isLoggedIn;
    if (loggedInDesktop) loggedInDesktop.hidden = !isLoggedIn;
    if (loggedOutMobile) loggedOutMobile.hidden = isLoggedIn;
    if (loggedInMobile) loggedInMobile.hidden = !isLoggedIn;

    if (isLoggedIn){
      var label = auth.isAdmin ? 'Admin' : (auth.name || auth.email);
      var initial = (auth.name || auth.email || 'U').trim().charAt(0).toUpperCase();
      if (userPillBadge) userPillBadge.textContent = initial;
      if (userPillName) userPillName.textContent = label;
      if (userPillNameMobile) userPillNameMobile.textContent = label;
    }
    document.querySelectorAll('.admin-only').forEach(function(el){ el.hidden = !(auth && auth.isAdmin); });

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
      } else {
        auth = null;
        currentFirebaseUser = null;
      }
      renderAuthUI();
      renderAllPosts();
    });
  } else {
    renderAuthUI();
  }

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
      var imageHTML = post.imageURL
        ? '<img class="post-card__image" src="' + post.imageURL + '" alt="' + escapeHTML(post.name) + '">'
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
    image: { fileInput: document.getElementById('postImageFile'), linkInput: document.getElementById('postImageLink'),
              preview: document.getElementById('postImagePreview'), removeBtn: document.getElementById('postImageRemove'),
              url: '', kind: 'image' },
    pdf:   { fileInput: document.getElementById('postPdfFile'), linkInput: document.getElementById('postPdfLink'),
              preview: document.getElementById('postPdfPreview'), removeBtn: document.getElementById('postPdfRemove'),
              url: '', kind: 'raw' },
    video: { fileInput: document.getElementById('postVideoFile'), linkInput: document.getElementById('postVideoLink'),
              preview: document.getElementById('postVideoPreview'), removeBtn: document.getElementById('postVideoRemove'),
              url: '', kind: 'raw' }
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

    ['image','pdf','video'].forEach(function(key){ resetModeToggle(key); updateFieldPreview(key); });

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

  /* ---------- upload/link toggle (shared for image / pdf / video) ---------- */
  document.querySelectorAll('.toggle-pair').forEach(function(pair){
    var group = pair.getAttribute('data-toggle-for');
    pair.querySelectorAll('.toggle-pair__btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        pair.querySelectorAll('.toggle-pair__btn').forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var mode = btn.getAttribute('data-mode');
        document.querySelectorAll('[data-mode-group="' + group + '"]').forEach(function(input){
          input.hidden = input.getAttribute('data-mode') !== mode;
        });
      });
    });
  });
  function resetModeToggle(group){
    var pair = document.querySelector('.toggle-pair[data-toggle-for="' + group + '"]');
    if (!pair) return;
    pair.querySelectorAll('.toggle-pair__btn').forEach(function(b){ b.classList.toggle('is-active', b.getAttribute('data-mode') === 'upload'); });
    document.querySelectorAll('[data-mode-group="' + group + '"]').forEach(function(input){
      input.hidden = input.getAttribute('data-mode') !== 'upload';
      if (input.type === 'url' || input.type === 'file') input.value = '';
    });
  }

  function updateFieldPreview(key){
    var f = fields[key];
    if (!f.url){ f.preview.hidden = true; return; }
    f.preview.hidden = false;
    if (key === 'image'){ imagePreviewImg.src = f.url; }
    else if (key === 'pdf'){ pdfPreviewName.textContent = f.url; }
    else if (key === 'video'){ videoPreviewName.textContent = f.url; }
  }

  ['image','pdf','video'].forEach(function(key){
    var f = fields[key];

    f.linkInput.addEventListener('input', function(){
      f.url = f.linkInput.value.trim();
      updateFieldPreview(key);
    });

    f.removeBtn.addEventListener('click', function(){
      f.url = '';
      f.fileInput.value = '';
      f.linkInput.value = '';
      updateFieldPreview(key);
    });

    f.fileInput.addEventListener('change', function(){
      var file = f.fileInput.files[0];
      if (!file) return;
      var maxMB = key === 'video' ? 50 : (key === 'pdf' ? 10 : 5);
      if (file.size > maxMB * 1024 * 1024){
        showToast(SECTION_LABELS[key] || key + ' file is over ' + maxMB + 'MB — try a smaller file or use a link instead.');
        f.fileInput.value = '';
        return;
      }
      if (!firebaseReady){
        showToast('File uploads need Firebase Storage configured — see the setup banner.');
        f.fileInput.value = '';
        return;
      }
      uploadToStorage(key, file);
    });
  });

  function uploadToStorage(key, file){
    var section = postSectionInput.value || 'misc';
    var path = 'uploads/' + section + '/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
    var ref = fbStorage.ref(path);
    showToast('Uploading ' + file.name + '…');
    ref.put(file).then(function(snapshot){
      return snapshot.ref.getDownloadURL();
    }).then(function(url){
      fields[key].url = url;
      updateFieldPreview(key);
      showToast('Upload complete.');
    }).catch(function(err){
      showToast('Upload failed: ' + err.message);
    });
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
  var validTabs = ['home','leaders','promotions','books','leaks'];
  if (validTabs.indexOf(hash) !== -1) activateTab(hash);
})();
