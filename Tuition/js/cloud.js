// Multi-user cloud sync. Each user logs in and gets a private copy of the data.
// Data is kept in localStorage as before, and copied to Firestore at users/{uid}.
// The teacher profile is stored in the same Firestore document (field: profile).


// Paste your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyA-Kz_ot-RuidJwlAmIGOty3NbgaY0bynY",
  authDomain: "tuition-b8c81.firebaseapp.com",
  projectId: "tuition-b8c81",
  storageBucket: "tuition-b8c81.firebasestorage.app",
  messagingSenderId: "670569633046",
  appId: "1:670569633046:web:38083261d74536798c6c37"
};
(function () {
  const KEY = 'tuition_data';          // key used by the app
  const TS_KEY = 'tuition_updated';    // time of the last local change
  const OWNER_KEY = 'tuition_owner';   // uid of the user who owns the local data
  const PROFILE_KEY = 'tuition_profile'; // teacher profile (cached locally)
  const PENDING_KEY = 'tuition_pending_sync';
  const PROFILE_PENDING_KEY = 'tuition_profile_pending';
  const rawSet = Storage.prototype.setItem;


  // ---------- Inline SVG icons (no emojis) ----------
  const SVG_ATTR = ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const LOGO_SVG = '<svg width="26" height="26"' + SVG_ATTR + '><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>';
  const X_SVG = '<svg width="18" height="18"' + SVG_ATTR + '><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const BACK_SVG = '<svg width="15" height="15"' + SVG_ATTR + ' style="vertical-align:-2px"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
  const LOGOUT_SVG = '<svg width="17" height="17"' + SVG_ATTR + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';


  let chip = null, overlay = null, avatarBtn = null, profileBox = null;
  let ref = null, ready = false, syncing = false, syncRetryRequested = false, currentUser = null;
  let pushQueue = Promise.resolve(), profilePushQueue = Promise.resolve();
  let creating = false;   // true while a new account is being created


  // ---------- Sync status ----------
  // Tap the status chip to retry cloud sync.
  function setStatus(text, ok, kind) {
    if (kind === 'syncing') {
      if (chip) chip.style.display = 'none';
      return;
    }
    if (ok) {
      if (chip) chip.style.display = 'none';
      return;
    }
    if (!chip) {
      chip = document.createElement('div');
      chip.style.cssText =
        'position:fixed;left:8px;bottom:8px;z-index:99997;padding:6px 10px;' +
        'border-radius:14px;font:12px sans-serif;color:#fff;opacity:.95;' +
        'max-width:90vw;cursor:pointer;background:#dc2626';
      chip.onclick = function () { sync(); };
      document.body.appendChild(chip);
    }
    chip.style.display = 'block';
    chip.style.background = kind === 'offline' ? '#b45309' :
      kind === 'syncing' ? '#2563eb' : '#dc2626';
    chip.textContent = text;
  }

  function showOfflineStatus() {
    if (ref) setStatus('Offline: changes are saved on this device and will sync when online.', false, 'offline');
  }


  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }


  // ---------- Checks ----------
  if (typeof firebase === 'undefined') {
    setStatus('Cloud: Firebase script not loaded (check internet / index.html)', false);
    return;
  }
  if (firebaseConfig.apiKey === 'PASTE_HERE') {
    setStatus('Cloud: config not filled in cloud.js', false);
    return;
  }


  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const fdb = firebase.firestore();


  // ---------- Styles (login screen + profile) ----------
  function injectStyles() {
    if (document.getElementById('cl_styles')) return;
    const st = document.createElement('style');
    st.id = 'cl_styles';
    st.textContent = `
      @keyframes clFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      @keyframes clSpin { to{transform:rotate(360deg)} }


      #cl_overlay { position:fixed; inset:0; z-index:100000; display:flex; align-items:center;
        justify-content:center; padding:16px; background:#f4f6fb;
        font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
        transition:opacity .3s ease; overflow-y:auto; }
      #cl_overlay.fade { opacity:0; pointer-events:none; }


      .cl-card { background:#fff; border:1px solid #e5e9f2; border-radius:16px; padding:32px 28px;
        width:100%; max-width:380px; box-shadow:0 10px 30px rgba(15,23,42,.08);
        animation:clFade .4s ease both; }
      .cl-logo { width:52px; height:52px; margin:0 auto 14px; border-radius:14px; background:#4f46e5;
        color:#fff; display:flex; align-items:center; justify-content:center;
        box-shadow:0 6px 16px rgba(79,70,229,.3); }
      .cl-title { margin:0; text-align:center; color:#0f172a; font-size:22px; font-weight:700; }
      .cl-sub { margin:6px 0 22px; text-align:center; color:#64748b; font-size:14px; }


      .cl-panel { display:none; }
      .cl-panel.active { display:block; animation:clFade .25s ease both; }


      .cl-label { display:block; margin:14px 0 6px; color:#334155; font-size:13px; font-weight:600; }
      .cl-field { position:relative; }
      .cl-input { width:100%; padding:12px 14px; border:1px solid #cbd5e1; border-radius:10px;
        font-size:16px; color:#0f172a; background:#fff; box-sizing:border-box; outline:none;
        transition:border-color .15s, box-shadow .15s; }
      .cl-input.pw { padding-right:62px; }
      .cl-input:focus { border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.14); }
      .cl-input.err { border-color:#dc2626; }
      .cl-input:disabled { background:#f1f5f9; color:#64748b; }
      .cl-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); border:0;
        background:none; color:#4f46e5; font-size:13px; font-weight:600; cursor:pointer; padding:6px; }


      .cl-msg { min-height:20px; margin:12px 0 0; font-size:13px; color:#dc2626; text-align:center; }
      .cl-msg.ok { color:#059669; }


      .cl-btn { width:100%; padding:13px; margin-top:12px; border-radius:10px; font-size:15px;
        font-weight:600; cursor:pointer; transition:background .15s, opacity .15s; }
      .cl-btn.primary { border:0; background:#4f46e5; color:#fff; }
      .cl-btn.primary:hover { background:#4338ca; }
      .cl-btn.outline { border:1px solid #cbd5e1; background:#fff; color:#334155; }
      .cl-btn.outline:hover { background:#f8fafc; }
      .cl-btn.danger { display:flex; align-items:center; justify-content:center; gap:8px;
        border:1px solid #fecaca; background:#fff; color:#dc2626; }
      .cl-btn.danger:hover { background:#fef2f2; }
      .cl-btn.loading { opacity:.75; pointer-events:none; }
      .cl-btn.loading::after { content:''; display:inline-block; width:13px; height:13px; margin-left:10px;
        vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent;
        border-radius:50%; animation:clSpin .7s linear infinite; }


      .cl-divider { display:flex; align-items:center; gap:10px; margin:18px 0 6px; color:#94a3b8; font-size:12px; }
      .cl-divider::before, .cl-divider::after { content:''; flex:1; height:1px; background:#e5e9f2; }
      .cl-link { display:block; text-align:center; margin-top:16px; color:#4f46e5; font-size:13px;
        font-weight:500; cursor:pointer; text-decoration:none; }
      .cl-link:hover { text-decoration:underline; }


      /* Teacher profile */
      #pf_btn { position:fixed; top:9px; right:14px; z-index:99998; width:38px; height:38px;
        border-radius:50%; border:2px solid #fff; background:#4f46e5; color:#fff; font-size:16px;
        font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(15,23,42,.25); padding:0; }
      #pf_btn:hover { background:#4338ca; }
      #pf_overlay { position:fixed; inset:0; z-index:100001; display:none; align-items:center;
        justify-content:center; padding:16px; background:rgba(15,23,42,.5); overflow-y:auto;
        font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
      #pf_overlay .cl-card { position:relative; max-width:400px; max-height:calc(100vh - 32px);
        overflow-y:auto; -webkit-overflow-scrolling:touch; padding:28px 24px; margin:auto; }
      .pf-x { position:absolute; top:10px; right:10px; width:36px; height:36px; border:0; border-radius:10px;
        background:none; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; }
      .pf-x:hover { background:#f1f5f9; color:#0f172a; }
      .pf-big { width:64px; height:64px; margin:0 auto 12px; border-radius:50%; background:#4f46e5;
        color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; }
    `;
    document.head.appendChild(st);
  }


  // ---------- Login / Sign up screen ----------
  function friendly(e) {
    const c = e.code || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found')
      return 'Wrong email or password.';
    if (c === 'auth/email-already-in-use') return 'Account already exists. Please use Login.';
    if (c === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (c === 'auth/invalid-email') return 'Please enter a valid email.';
    if (c === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
    if (c === 'auth/network-request-failed') return 'No internet connection.';
    if (c === 'auth/operation-not-allowed') return 'Email/Password sign-in is not enabled in Firebase.';
    if (c === 'auth/unauthorized-domain') return 'This domain is not added in Firebase Authorized domains.';
    return e.message || String(e);
  }


  function $id(id) { return document.getElementById(id); }


  // Show a message under the form. id = 'cl_msg_login' or 'cl_msg_signup'
  function msg(id, text, ok, isError) {
    const m = $id(id);
    m.className = 'cl-msg' + (ok ? ' ok' : '');
    m.textContent = text || '';
    // Red border on the inputs of that panel when there is an error
    const panel = m.parentNode;
    panel.querySelectorAll('.cl-input').forEach(function (i) {
      i.classList.toggle('err', !!isError);
    });
  }


  function setLoading(btn, on, label) {
    btn.classList.toggle('loading', on);
    btn.textContent = on ? 'Please wait' : label;
  }


  // Switch between the 'login' and 'signup' panels
  function switchPanel(name) {
    const login = $id('cl_p_login'), signup = $id('cl_p_signup');
    const show = name === 'login' ? login : signup;
    const hide = name === 'login' ? signup : login;
    hide.classList.remove('active');
    show.classList.remove('active');
    void show.offsetWidth;   // restart the fade animation
    show.classList.add('active');
    msg('cl_msg_login', '');
    msg('cl_msg_signup', '');
  }


  function eyeToggle(inputIds, btn) {
    btn.onclick = function () {
      const type = $id(inputIds[0]).type === 'password' ? 'text' : 'password';
      inputIds.forEach(function (i) { $id(i).type = type; });
      btn.textContent = type === 'password' ? 'Show' : 'Hide';
    };
  }


  function buildLogin() {
    injectStyles();
    overlay = document.createElement('div');
    overlay.id = 'cl_overlay';


    overlay.innerHTML =
      '<div class="cl-card" id="cl_card">' +
        '<div class="cl-logo">' + LOGO_SVG + '</div>' +
        '<h1 class="cl-title">Tuition Manager</h1>' +


        // Login panel
        '<div class="cl-panel active" id="cl_p_login">' +
          '<p class="cl-sub">Login to your account</p>' +
          '<label class="cl-label" for="cl_email">Email</label>' +
          '<div class="cl-field"><input class="cl-input" id="cl_email" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
          '<label class="cl-label" for="cl_pass">Password</label>' +
          '<div class="cl-field"><input class="cl-input pw" id="cl_pass" type="password" placeholder="Enter your password" autocomplete="current-password">' +
            '<button type="button" class="cl-eye" id="cl_eye1">Show</button></div>' +
          '<div class="cl-msg" id="cl_msg_login"></div>' +
          '<button class="cl-btn primary" id="cl_login">Login</button>' +
          '<a class="cl-link" id="cl_forgot">Forgot password?</a>' +
          '<div class="cl-divider">New here?</div>' +
          '<button class="cl-btn outline" id="cl_to_signup" style="margin-top:8px">Create new account</button>' +
        '</div>' +


        // Sign up panel
        '<div class="cl-panel" id="cl_p_signup">' +
          '<p class="cl-sub">Create your account</p>' +
          '<label class="cl-label" for="cl_s_email">Email</label>' +
          '<div class="cl-field"><input class="cl-input" id="cl_s_email" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
          '<label class="cl-label" for="cl_s_pass">Password</label>' +
          '<div class="cl-field"><input class="cl-input pw" id="cl_s_pass" type="password" placeholder="At least 6 characters" autocomplete="new-password">' +
            '<button type="button" class="cl-eye" id="cl_eye2">Show</button></div>' +
          '<label class="cl-label" for="cl_s_pass2">Confirm password</label>' +
          '<div class="cl-field"><input class="cl-input" id="cl_s_pass2" type="password" placeholder="Re-enter password" autocomplete="new-password"></div>' +
          '<div class="cl-msg" id="cl_msg_signup"></div>' +
          '<button class="cl-btn primary" id="cl_signup">Create account</button>' +
          '<a class="cl-link" id="cl_to_login">' + BACK_SVG + ' Back to Login</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);


    eyeToggle(['cl_pass'], $id('cl_eye1'));
    eyeToggle(['cl_s_pass', 'cl_s_pass2'], $id('cl_eye2'));


    $id('cl_to_signup').onclick = function () {
      $id('cl_s_email').value = $id('cl_email').value;
      switchPanel('signup');
    };
    $id('cl_to_login').onclick = function () { switchPanel('login'); };


    // ----- Login -----
    const loginBtn = $id('cl_login');
    loginBtn.onclick = function () {
      const email = $id('cl_email').value.trim();
      const pass = $id('cl_pass').value;
      if (!email || !pass) return msg('cl_msg_login', 'Enter email and password.', false, true);
      msg('cl_msg_login', '');
      setLoading(loginBtn, true, 'Login');
      auth.signInWithEmailAndPassword(email, pass).catch(function (e) {
        setLoading(loginBtn, false, 'Login');
        msg('cl_msg_login', friendly(e), false, true);
      });
    };


    // ----- Create account: after creating, go back to the Login panel -----
    const signBtn = $id('cl_signup');
    signBtn.onclick = async function () {
      const email = $id('cl_s_email').value.trim();
      const p1 = $id('cl_s_pass').value;
      const p2 = $id('cl_s_pass2').value;
      if (!email || !p1) return msg('cl_msg_signup', 'Enter email and password.', false, true);
      if (p1.length < 6) return msg('cl_msg_signup', 'Password must be at least 6 characters.', false, true);
      if (p1 !== p2) return msg('cl_msg_signup', 'Passwords do not match.', false, true);


      msg('cl_msg_signup', '');
      setLoading(signBtn, true, 'Create account');
      creating = true;   // stops the app from logging in automatically
      try {
        await auth.createUserWithEmailAndPassword(email, p1);
        await auth.signOut();
        creating = false;
        setLoading(signBtn, false, 'Create account');
        $id('cl_s_pass').value = '';
        $id('cl_s_pass2').value = '';
        $id('cl_email').value = email;
        $id('cl_pass').value = '';
        switchPanel('login');
        msg('cl_msg_login', 'Account created! Please login.', true);
        $id('cl_pass').focus();
      } catch (e) {
        creating = false;
        setLoading(signBtn, false, 'Create account');
        msg('cl_msg_signup', friendly(e), false, true);
      }
    };


    // ----- Forgot password -----
    $id('cl_forgot').onclick = function () {
      const email = $id('cl_email').value.trim();
      if (!email) return msg('cl_msg_login', 'Type your email above first.', false, true);
      auth.sendPasswordResetEmail(email)
        .then(function () { msg('cl_msg_login', 'Reset link sent. Check your email (and spam).', true); })
        .catch(function (e) { msg('cl_msg_login', friendly(e), false, true); });
    };


    // Enter key submits the form
    [['cl_email', loginBtn], ['cl_pass', loginBtn],
     ['cl_s_email', signBtn], ['cl_s_pass', signBtn], ['cl_s_pass2', signBtn]]
      .forEach(function (p) {
        $id(p[0]).addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') p[1].click();
        });
      });
  }


  function showLogin() {
    if (chip) chip.style.display = 'none';
    hideProfileUI();
    if (!overlay) buildLogin();
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.remove('fade');
  }


  function hideLogin() {
    if (!overlay) return;
    overlay.classList.add('fade');
    setTimeout(function () {
      if (overlay.classList.contains('fade')) overlay.style.display = 'none';
    }, 330);
  }


  // ---------- Teacher profile ----------
  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch (e) { return {}; }
  }


  // First letter shown on the avatar (name first, then email)
  function initial() {
    const p = getProfile();
    const s = (p.name || (currentUser && currentUser.email) || '?').trim();
    return s.charAt(0).toUpperCase() || '?';
  }


  function refreshAvatar() {
    if (avatarBtn) avatarBtn.textContent = initial();
    const big = $id('pf_big');
    if (big) big.textContent = initial();
    const t = $id('pf_title');
    if (t) t.textContent = getProfile().name || 'My Profile';
  }


  function pfMsg(text, ok) {
    const m = $id('pf_msg');
    m.className = 'cl-msg' + (ok ? ' ok' : '');
    m.textContent = text || '';
  }


  function fillProfileForm() {
    const p = getProfile();
    $id('pf_name').value = p.name || '';
    $id('pf_phone').value = p.phone || '';
    $id('pf_inst').value = p.institute || '';
    $id('pf_city').value = p.city || '';
    $id('pf_email').value = (currentUser && currentUser.email) || '';
    pfMsg('');
    refreshAvatar();
  }


  function buildProfile() {
    injectStyles();
    profileBox = document.createElement('div');
    profileBox.id = 'pf_overlay';
    profileBox.innerHTML =
      '<div class="cl-card">' +
        '<button class="pf-x" id="pf_close" title="Close">' + X_SVG + '</button>' +
        '<div class="pf-big" id="pf_big">T</div>' +
        '<h1 class="cl-title" id="pf_title">My Profile</h1>' +
        '<p class="cl-sub" style="margin-bottom:6px">Your details</p>' +


        '<label class="cl-label" for="pf_name">Full name</label>' +
        '<input class="cl-input" id="pf_name" type="text" placeholder="e.g. Rahul Sharma" autocomplete="name">' +
        '<label class="cl-label" for="pf_phone">Phone</label>' +
        '<input class="cl-input" id="pf_phone" type="tel" placeholder="e.g. 9876543210" autocomplete="tel">' +
        '<label class="cl-label" for="pf_inst">Tuition / Institute name</label>' +
        '<input class="cl-input" id="pf_inst" type="text" placeholder="e.g. Sharma Classes">' +
        '<label class="cl-label" for="pf_city">City</label>' +
        '<input class="cl-input" id="pf_city" type="text" placeholder="e.g. Guwahati">' +
        '<label class="cl-label" for="pf_email">Email (login)</label>' +
        '<input class="cl-input" id="pf_email" type="email" disabled>' +

        '<div class="cl-msg" id="pf_msg"></div>' +
        '<button class="cl-btn primary" id="pf_save">Save Profile</button>' +
        '<div style="border-top:1px solid #e5e9f2;margin-top:18px;padding-top:14px">' +
          '<p class="cl-label" style="margin-top:0">Backup &amp; Restore</p>' +
          '<p class="cl-sub" style="margin:0 0 8px">Save a backup file or restore your tuition data.</p>' +
          '<button type="button" class="cl-btn outline" id="pf_backup">' + ic('download', 16) + ' Download Backup</button>' +
          '<button type="button" class="cl-btn outline" id="pf_restore">' + ic('upload', 16) + ' Restore Backup</button>' +
        '</div>' +
        '<button class="cl-btn danger" id="pf_logout">' + LOGOUT_SVG + ' Logout</button>' +
      '</div>';
    document.body.appendChild(profileBox);


    $id('pf_close').onclick = closeProfile;
    profileBox.addEventListener('click', function (ev) {
      if (ev.target === profileBox) closeProfile();   // tap outside the card
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeProfile();
    });
    $id('pf_logout').onclick = logout;
    $id('pf_backup').onclick = exportData;
    $id('pf_restore').onclick = function () { $id('importFile').click(); };


    const saveBtn = $id('pf_save');
    saveBtn.onclick = function () {
      const p = {
        name: $id('pf_name').value.trim(),
        phone: $id('pf_phone').value.trim(),
        institute: $id('pf_inst').value.trim(),
        city: $id('pf_city').value.trim()
      };
      rawSet.call(localStorage, PROFILE_KEY, JSON.stringify(p));
      refreshAvatar();
      if (!ref) return pfMsg('Saved on this device only (not logged in to cloud).', false);
      rawSet.call(localStorage, PROFILE_PENDING_KEY, '1');
      if (!navigator.onLine || !ready) {
        pfMsg('Saved on this device. It will sync when internet returns.', true);
        if (!navigator.onLine) showOfflineStatus();
        return;
      }
      setLoading(saveBtn, true, 'Save Profile');
      pushProfile().then(function (ok) {
        setLoading(saveBtn, false, 'Save Profile');
        pfMsg(ok ? 'Profile saved.' : 'Saved on this device. It will sync when internet returns.', ok);
      });
    };
  }


  function openProfile() {
    if (!profileBox) buildProfile();
    fillProfileForm();
    profileBox.style.display = 'flex';
  }


  function closeProfile() {
    if (profileBox) profileBox.style.display = 'none';
  }


  function hideProfileUI() {
    closeProfile();
    if (avatarBtn) avatarBtn.style.display = 'none';
  }


  function showAvatar() {
    injectStyles();
    if (!avatarBtn) {
      avatarBtn = document.createElement('button');
      avatarBtn.id = 'pf_btn';
      avatarBtn.title = 'My profile';
      avatarBtn.onclick = openProfile;
      document.body.appendChild(avatarBtn);
    }
    avatarBtn.textContent = initial();
    avatarBtn.style.display = 'block';
  }


  // ---------- Logout ----------
  async function logout() {
    if (!confirm('Logout from this device?')) return;
    if (ref && (localStorage.getItem(PENDING_KEY) === '1' ||
                localStorage.getItem(PROFILE_PENDING_KEY) === '1')) {
      const dataOk = await push();
      const profileOk = await pushProfile();
      if (!dataOk || !profileOk) {
        alert('Unsynced changes are saved on this device. Reconnect to the internet before logging out.');
        return;
      }
    }
    localStorage.removeItem(KEY);
    localStorage.removeItem(TS_KEY);
    localStorage.removeItem(OWNER_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(PROFILE_PENDING_KEY);
    auth.signOut().then(function () { location.reload(); });
  }


  // ---------- Sync ----------
  // Send the local data to the cloud. Resolves true on success.
  // merge:true keeps the profile field untouched.
  function push() {
    const targetRef = ref;
    if (!targetRef) return Promise.resolve(false);
    const send = function () {
      const json = localStorage.getItem(KEY);
      if (!json) {
        localStorage.removeItem(PENDING_KEY);
        return Promise.resolve(true);
      }
      if (!navigator.onLine) {
        showOfflineStatus();
        return Promise.resolve(false);
      }
      const ts = String(Number(localStorage.getItem(TS_KEY) || Date.now()));
      return targetRef.set({ json: json, updatedAt: Number(ts) }, { merge: true }).then(function () {
        if (targetRef !== ref) return false;
        if (localStorage.getItem(KEY) !== json || localStorage.getItem(TS_KEY) !== ts) return send();
        localStorage.removeItem(PENDING_KEY);
        setStatus('Cloud: saved ' + now(), true);
        return true;
      }).catch(function (e) {
        setStatus('Cloud save failed: ' + (e.message || e), false);
        return false;
      });
    };
    const task = pushQueue.then(send, send);
    pushQueue = task.then(function () {}, function () {});
    return task;
  }

  function pushProfile() {
    const targetRef = ref;
    if (!targetRef) return Promise.resolve(false);
    const send = function () {
      const json = localStorage.getItem(PROFILE_KEY);
      if (!json) {
        localStorage.removeItem(PROFILE_PENDING_KEY);
        return Promise.resolve(true);
      }
      if (!navigator.onLine) {
        showOfflineStatus();
        return Promise.resolve(false);
      }
      let profile;
      try {
        profile = JSON.parse(json);
      } catch (e) {
        setStatus('Profile sync failed: ' + (e.message || e), false);
        return Promise.resolve(false);
      }
      return targetRef.set({ profile: profile }, { merge: true }).then(function () {
        if (targetRef !== ref) return false;
        if (localStorage.getItem(PROFILE_KEY) !== json) return send();
        localStorage.removeItem(PROFILE_PENDING_KEY);
        setStatus('Cloud: saved ' + now(), true);
        return true;
      }).catch(function (e) {
        setStatus('Profile sync failed: ' + (e.message || e), false);
        return false;
      });
    };
    const task = profilePushQueue.then(send, send);
    profilePushQueue = task.then(function () {}, function () {});
    return task;
  }


  // Watch every save the app makes
  Storage.prototype.setItem = function (k, v) {
    rawSet.call(this, k, v);
    if (this === localStorage && k === KEY && ref) {
      rawSet.call(localStorage, TS_KEY, String(Date.now()));
      rawSet.call(localStorage, PENDING_KEY, '1');
      if (ready && navigator.onLine) push();
      else if (!navigator.onLine) showOfflineStatus();
    }
  };


  // Compare local and cloud data, keep the newer one
  async function sync() {
    if (!ref) return;
    if (syncing) {
      syncRetryRequested = true;
      return;
    }
    if (!navigator.onLine) {
      showOfflineStatus();
      return;
    }
    syncing = true;
    setStatus('Cloud: syncing...', false, 'syncing');
    try {
      const snap = await ref.get();
      const localTs = Number(localStorage.getItem(TS_KEY) || 0);
      const hasPendingData = localStorage.getItem(PENDING_KEY) === '1';
      const hasPendingProfile = localStorage.getItem(PROFILE_PENDING_KEY) === '1';
      const cloudData = snap.exists ? snap.data() : null;

      if (cloudData) {
        // Profile: the cloud copy is used on every device
        if (cloudData.profile && !hasPendingProfile) {
          rawSet.call(localStorage, PROFILE_KEY, JSON.stringify(cloudData.profile));
          refreshAvatar();
        }
      }
      if (hasPendingProfile) await pushProfile();

      if (cloudData) {
        if (cloudData.json && hasPendingData) {
          await push();
        } else if (cloudData.json && cloudData.updatedAt > localTs) {
          // Cloud is newer: take it and reload once
          rawSet.call(localStorage, KEY, cloudData.json);
          rawSet.call(localStorage, TS_KEY, String(cloudData.updatedAt));
          localStorage.removeItem(PENDING_KEY);
          location.reload();
          return;
        } else if (cloudData.json && cloudData.updatedAt < localTs) {
          rawSet.call(localStorage, PENDING_KEY, '1');
          await push();
        } else if (!cloudData.json && localStorage.getItem(KEY)) {
          // Document has only a profile so far: upload the data
          rawSet.call(localStorage, TS_KEY, String(Date.now()));
          rawSet.call(localStorage, PENDING_KEY, '1');
          await push();
        } else if (!hasPendingData) setStatus('Cloud: up to date ' + now(), true);
      } else if (localStorage.getItem(KEY)) {
        // First run for this account: upload what this device has
        rawSet.call(localStorage, TS_KEY, String(Date.now()));
        rawSet.call(localStorage, PENDING_KEY, '1');
        await push();
      } else {
        setStatus('Cloud: connected, no data yet', true);
      }
      ready = true;
    } catch (e) {
      if (!navigator.onLine) showOfflineStatus();
      else setStatus('Cloud error: ' + (e.message || e), false);
    } finally {
      syncing = false;
      if (syncRetryRequested) {
        syncRetryRequested = false;
        if (navigator.onLine) sync();
      }
    }
  }


  // ---------- Login state ----------
  auth.onAuthStateChanged(function (user) {
    // A new account was just created: ignore, it is signed out right after
    if (creating) return;


    if (!user) {
      ref = null;
      ready = false;
      currentUser = null;
      showLogin();
      return;
    }


    // Local data belongs to a different user: wipe it and reload
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== user.uid) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(TS_KEY);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(PROFILE_PENDING_KEY);
      rawSet.call(localStorage, OWNER_KEY, user.uid);
      location.reload();
      return;
    }
    rawSet.call(localStorage, OWNER_KEY, user.uid);


    currentUser = user;
    ref = fdb.collection('users').doc(user.uid);
    hideLogin();
    showAvatar();
    sync();
  });


  // Check again when you come back to the app tab
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') sync();
  });
  window.addEventListener('offline', showOfflineStatus);
  window.addEventListener('online', function () {
    if (!ref) return;
    setStatus('Connection restored. Syncing...', false, 'syncing');
    sync();
  });
})();