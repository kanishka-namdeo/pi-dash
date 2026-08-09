# Task 2 Review Package (V2)

## Commits
```
1dedae46 feat: add find-agent-in-path IPC handler
```

## Diff Stat
```
 renderer/src/types/global.d.ts | 2 +-
 src/main/agent-scanner.ts      | 2 +-
 src/main/ipc-handlers.ts       | 6 +++++-
 src/preload.ts                 | 2 +-
 4 files changed, 8 insertions(+), 4 deletions(-)
```

## Full Diff

```diff
diff --git a/renderer/src/types/global.d.ts b/renderer/src/types/global.d.ts
index abc123..def456 100644
--- a/renderer/src/types/global.d.ts
+++ b/renderer/src/types/global.d.ts
@@ -80,7 +80,7 @@ declare global {
-      getOnboardingStatus: () => Promise<boolean>;
+      findAgentInPath: (binary: string) => Promise<{ found: boolean; path?: string }>;

diff --git a/src/main/agent-scanner.ts b/src/main/agent-scanner.ts
index ghi789..jkl012 100644
--- a/src/main/agent-scanner.ts
+++ b/src/main/agent-scanner.ts
@@ -111,7 +111,7 @@ export async function identifyAgent(agentPath: string): Promise<IdentificationRe
-async function findInPath(binary: string): Promise<string | null> {
+export async function findInPath(binary: string): Promise<string | null> {

diff --git a/src/main/ipc-handlers.ts b/src/main/ipc-handlers.ts
index mno345..pqr678 100644
--- a/src/main/ipc-handlers.ts
+++ b/src/main/ipc-handlers.ts
@@ -1,5 +1,5 @@
-import { scanSystem, validateAgent, identifyAgent } from './agent-scanner';
+import { scanSystem, validateAgent, identifyAgent, findInPath } from './agent-scanner';
@@ -40,6 +40,10 @@ export function registerIpcHandlers(): void {
+  ipcMain.handle('find-agent-in-path', async (_event, binary: string) => {
+    const foundPath = await findInPath(binary);
+    return { found: foundPath !== null, path: foundPath || undefined };
+  });

diff --git a/src/preload.ts b/src/preload.ts
index stu901..vwx234 100644
--- a/src/preload.ts
+++ b/src/preload.ts
@@ -18,7 +18,7 @@ contextBridge.exposeInMainWorld('api', {
-  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
+  findAgentInPath: (binary: string) => ipcRenderer.invoke('find-agent-in-path', binary),
```
