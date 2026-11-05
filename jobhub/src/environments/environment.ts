// One file for every place the app runs. The address in the browser decides which settings apply,
// so there is nothing to switch by hand: `ng serve` on your computer uses the local backend,
// and the deployed website uses the hosted one.
const runningLocally = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const environment = {
  production: !runningLocally,

  // Local: the Flask server from /backend. Deployed: paste your hosted backend address (it must end with /api).
  apiUrl: runningLocally ? 'http://localhost:5000/api' : 'https://YOUR-BACKEND.onrender.com/api',

  // The navbar "Demo accounts" menu and the demo logins hint on the login page.
  // Handy while testing; off by default on a deployed site (change to true if you want visitors to try the demo).
  showDemoAccounts: runningLocally,
};
