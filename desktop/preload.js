// Bridge — the only door between the renderer and native MLX control.
// contextIsolation stays on; this is the sole surface exposed to the page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexNative", {
  mlxList: () => ipcRenderer.invoke("mlx:list"),
  mlxStart: (path) => ipcRenderer.invoke("mlx:start", path),
  mlxStop: () => ipcRenderer.invoke("mlx:stop"),
  mlxStatus: () => ipcRenderer.invoke("mlx:status"),
  pickFolder: () => ipcRenderer.invoke("native:pick-folder"),
});
