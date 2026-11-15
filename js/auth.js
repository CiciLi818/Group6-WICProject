/* Week 2 UI adapter only. Replace with a real auth provider before using accounts. */
window.DemoAuth = (() => {
  const key = 'wic.demoSession.v1';
  const delay = () => new Promise(resolve => setTimeout(resolve, 300));
  function current() {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && typeof user.name === 'string' ? user : null;
  }
  async function login(email, password) {
    await delay();
    if (email.trim().toLowerCase() !== 'demo@example.com' || password !== 'demo-only-123') {
      throw new Error('Use demo@example.com and demo-only-123 to try this demo.');
    }
    const user = { name: 'Demo user' };
    sessionStorage.setItem(key, JSON.stringify(user));
    return user;
  }
  async function register(name) {
    await delay();
    const user = { name: name.trim() || 'Demo user' };
    sessionStorage.setItem(key, JSON.stringify(user));
    return user;
  }
  function logout() { sessionStorage.removeItem(key); }
  return { current, login, register, logout };
})();
