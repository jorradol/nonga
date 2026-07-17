import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/auth/AuthContext.tsx';
import { APP_TITLE } from './utils/appBranding';
import { isUiFixtureBuild } from './fixture/uiFixtureMode';
import './index.css';

async function bootstrap() {
  if (isUiFixtureBuild) {
    document.title = `${APP_TITLE} (UI Fixture)`;
    const [
      { installFixtureNetworkGuard },
      { FixtureQaChrome },
      fixtureRoles,
    ] = await Promise.all([
      import('./fixture/fixtureNetworkGuard'),
      import('./fixture/FixtureQaChrome'),
      import('./fixture/fixtureRoles'),
    ]);
    // Stash before first React paint so AuthProvider can sync role without RouteGuard flash.
    (window as Window & { __nongaFixtureRoles?: typeof fixtureRoles }).__nongaFixtureRoles =
      fixtureRoles;
    installFixtureNetworkGuard();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AuthProvider>
          <FixtureQaChrome />
          <App />
        </AuthProvider>
      </StrictMode>,
    );
    return;
  }

  document.title = APP_TITLE;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

void bootstrap();
