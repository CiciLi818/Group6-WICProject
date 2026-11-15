(() => {
  const main = document.querySelector('#main');
  const nav = document.querySelector('#nav');
  const logout = document.querySelector('#logout');
  const auth = window.DemoAuth;
  const routes = ['dashboard', 'check-in', 'calendar', 'trends', 'login', 'register'];
  let busy = false;
  const message = (node, text, error = false) => {
    node.textContent = text;
    node.className = 'message' + (error ? ' error' : '');
    node.setAttribute('role', error ? 'alert' : 'status');
  };
  function go(route) { if (location.hash === '#' + route) render(); else location.hash = route; }
  function authScreen(register) {
    main.innerHTML = `<section class="auth"><h1>${register ? 'Create an account' : 'Welcome back'}</h1><p class="muted">Your symptoms, at your own pace.</p><div class="card"><p>${register ? 'Registration preview: this opens a demo session. No account is created. Use a sample name and email.' : 'Try the demo with <strong>demo@example.com</strong> and <strong>demo-only-123</strong>.'}</p><form id="auth-form">${register ? '<label>Name<input name="name" autocomplete="off" maxlength="60" required></label>' : ''}<label>Email<input name="email" type="email" autocomplete="off" required></label><label>Password<input name="password" type="password" minlength="8" autocomplete="off" required aria-describedby="password-help"></label><p id="password-help" class="muted">Use a made-up password. Passwords are never saved.</p>${register ? '<label>Confirm password<input name="confirm" type="password" minlength="8" autocomplete="off" required></label>' : ''}<div id="feedback" class="message" aria-live="polite"></div><button class="primary wide" type="submit">${register ? 'Try registration demo' : 'Log in to demo'}</button></form></div><p>${register ? 'Already exploring? <a href="#login">Log in</a>' : 'New here? <a href="#register">View registration</a>'}</p></section>`;
    const form = main.querySelector('form');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const data = new FormData(form), feedback = main.querySelector('#feedback');
      if (register && data.get('password') !== data.get('confirm')) return message(feedback, 'Passwords do not match.', true);
      const button = form.querySelector('button');busy = true;button.disabled = true;form.setAttribute('aria-busy', 'true');
      message(feedback, register ? 'Opening demo session…' : 'Logging in…');
      try {
        if (register) await auth.register(data.get('name')); else await auth.login(data.get('email'), data.get('password'));
        form.reset();go('dashboard');
      } catch (error) { message(feedback, error.message || 'Unable to log in. Please try again.', true); }
      finally { busy = false;button.disabled = false;form.removeAttribute('aria-busy'); }
    });
  }
  function dashboard(user) {
    const result = SymptomStore.listEntries();
    if (!result.ok) throw new Error(Object.values(result.errors).join(' '));
    const today = SymptomStore.getEntryByDate(SymptomStore.todayString());
    main.innerHTML = `<h1>Home</h1><p id="welcome" class="muted"></p><section class="card"><p class="tag">Today's check-in</p><h2>${today ? 'Your check-in is saved.' : 'How are you feeling today?'}</h2><p>${today ? 'You can return to update your entry.' : 'Take a moment to record how you feel.'}</p><a class="action primary" href="#check-in">${today ? 'Edit today’s check-in' : 'Start daily check-in'} →</a></section><h2>Explore your records</h2><p class="muted">${result.data.length} saved ${result.data.length === 1 ? 'entry' : 'entries'} in this browser.</p><div class="grid"><a class="card" href="#calendar"><h2>Calendar</h2><p>Logged days · Coming next</p></a><a class="card" href="#trends"><h2>Trends</h2><p>Symptom patterns · Coming next</p></a></div>`;
    main.querySelector('#welcome').textContent = `Welcome, ${user.name}. Your symptoms, at your own pace.`;
  }
  function checkIn() {
    main.innerHTML = `<h1>Daily check-in</h1><p class="muted">Select a date to add or edit an entry.</p><form class="card" id="check-form"><label>Date<input name="entryDate" type="date" required></label><div class="grid"><label>Pain (0 = none, 10 = highest)<input name="pain" type="number" min="0" max="10" step="1" required></label><label>Mood (1 = low, 5 = good)<select name="mood" required><option value="">Choose a score</option>${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select></label></div><label>Energy (1 = low, 5 = high)<select name="energy" required><option value="">Choose a score</option>${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select></label><fieldset><legend>Symptoms (optional)</legend><div class="checks" id="symptoms"></div></fieldset><label>Notes (optional)<textarea name="notes" maxlength="1000"></textarea></label><div id="feedback" class="message" aria-live="polite"></div><div class="actions"><button class="primary" type="submit">Save check-in</button><button id="delete" type="button" hidden>Delete entry</button></div></form>`;
    const form = main.querySelector('form'), feedback = main.querySelector('#feedback'), remove = main.querySelector('#delete');
    for (const symptom of SymptomStore.SYMPTOMS) {
      const label = document.createElement('label'), input = document.createElement('input');
      input.type = 'checkbox';input.name = 'symptoms';input.value = symptom;label.append(input, document.createTextNode(symptom));main.querySelector('#symptoms').append(label);
    }
    const date = form.elements.entryDate;date.max = SymptomStore.todayString();date.value = date.max;
    let entry = null;
    function load() {
      entry = SymptomStore.getEntryByDate(date.value);
      for (const key of ['pain','mood','energy','notes']) form.elements[key].value = entry?.[key] ?? '';
      form.querySelectorAll('[name=symptoms]').forEach(el => el.checked = !!entry?.symptoms.includes(el.value));
      remove.hidden = !entry;message(feedback, entry ? 'Editing your saved entry.' : '');
    }
    date.addEventListener('change', load);load();
    form.addEventListener('submit', async event => {
      event.preventDefault();if (busy) return;
      const button = form.querySelector('[type=submit]');button.disabled = true;busy = true;message(feedback, 'Saving…');
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        const data = new FormData(form), payload = Object.fromEntries(data);payload.symptoms = data.getAll('symptoms');
        const result = entry ? SymptomStore.updateEntry(entry.id, payload) : SymptomStore.createEntry(payload);
        if (!result.ok) return message(feedback, Object.values(result.errors).join('\n'), true);
        entry = result.data;remove.hidden = false;message(feedback, 'Check-in saved. You can edit it anytime.');
      } catch (_) { message(feedback, 'Could not save your check-in. Please try again.', true); }
      finally {button.disabled = false;busy = false;}
    });
    remove.addEventListener('click', () => {
      if (busy || !entry || !confirm('Delete this entry? This cannot be undone.')) return;
      const result = SymptomStore.deleteEntry(entry.id);
      if (!result.ok) return message(feedback, Object.values(result.errors).join(' '), true);
      load();message(feedback, 'Entry deleted.');
    });
  }
  function render() {
    try {
      if (!auth || typeof SymptomStore === 'undefined') throw new Error('Some app files did not load. Reload to try again.');
      let route = location.hash.slice(1) || document.body.dataset.page || 'dashboard';
      if (!routes.includes(route)) route = 'dashboard';
      const user = auth.current();
      if (!user && !['login','register'].includes(route)) route = 'login';
      nav.hidden = logout.hidden = !user;
      nav.querySelectorAll('a').forEach(a => {if (a.hash === '#' + route) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
      if (route === 'login' || route === 'register') authScreen(route === 'register');
      else if (route === 'dashboard') dashboard(user);
      else if (route === 'check-in') checkIn();
      else main.innerHTML = `<h1>${route === 'calendar' ? 'Calendar' : 'Trends'}</h1><p class="muted">${route === 'calendar' ? 'Your logged days, at a glance.' : 'Patterns from your check-ins.'}</p><section class="card empty"><p class="tag">Week 2 placeholder</p><h2>${route === 'calendar' ? 'Your calendar is coming next.' : 'Your charts are coming next.'}</h2><p>${route === 'calendar' ? 'This page will show period days and saved entries.' : 'This page will show pain over time and symptom frequency.'}</p><a class="action" href="#check-in">Go to check-in</a></section>`;
      document.title = `${main.querySelector('h1').textContent} · Women's Health Tracker`;main.focus();
    } catch (error) {
      nav.hidden = logout.hidden = true;main.innerHTML = '<h1>Unable to load the tracker</h1><p id="error" role="alert"></p><button id="retry">Try again</button>';
      main.querySelector('#error').textContent = error.message + ' If browser storage is blocked, allow it for this site.';
      main.querySelector('#retry').onclick = () => location.reload();
    }
  }
  logout.addEventListener('click', () => {try {auth.logout();go('login');} catch (_) {alert('Unable to clear the demo session. Please close this tab.');}});
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
  window.addEventListener('hashchange', render);render();
})();
