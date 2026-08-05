"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    // Existing
    platform: process.platform,
    versions: process.versions,
    // Agent management
    scanAgents: () => electron_1.ipcRenderer.invoke('scan-agents'),
    validateAgent: (path) => electron_1.ipcRenderer.invoke('validate-agent', path),
    identifyAgent: (path) => electron_1.ipcRenderer.invoke('identify-agent', path),
    getAgents: () => electron_1.ipcRenderer.invoke('get-agents'),
    saveAgents: (agents) => electron_1.ipcRenderer.invoke('save-agents', agents),
    completeOnboarding: () => electron_1.ipcRenderer.invoke('complete-onboarding'),
    getOnboardingStatus: () => electron_1.ipcRenderer.invoke('get-onboarding-status'),
    launchAgent: (id) => electron_1.ipcRenderer.invoke('launch-agent', id),
});
//# sourceMappingURL=preload.js.map