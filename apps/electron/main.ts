import { app, BrowserWindow } from 'electron';

const defaultUrl = process.env.STARTLANG_WEB_URL ?? 'http://localhost:3000';

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
  });

  window.loadURL(defaultUrl).catch(() => {
    window.loadURL(
      'data:text/html;charset=UTF-8,' +
        encodeURIComponent(
          '<h1>Startlang Desktop</h1><p>Run the web app and set STARTLANG_WEB_URL to connect this shell.</p>'
        )
    );
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
