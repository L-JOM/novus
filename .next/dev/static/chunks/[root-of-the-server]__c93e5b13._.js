(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NovusLogo",
    ()=>NovusLogo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/shield.js [client] (ecmascript) <export default as Shield>");
;
;
const NovusLogo = ({ size = "default" })=>{
    const sizeClasses = {
        small: "text-lg",
        default: "text-2xl",
        large: "text-4xl"
    };
    const iconSizes = {
        small: 16,
        default: 24,
        large: 36
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        size: iconSizes[size],
                        className: "text-primary",
                        strokeWidth: 1.5
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx",
                        lineNumber: 19,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-primary/20 blur-lg"
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `font-mono font-semibold tracking-[0.3em] ${sizeClasses[size]}`,
                children: "NOVUS"
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = NovusLogo;
var _c;
__turbopack_context__.k.register(_c, "NovusLogo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SystemStatus",
    ()=>SystemStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/activity.js [client] (ecmascript) <export default as Activity>");
;
;
const SystemStatus = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative flex items-center justify-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-2 h-2 bg-success rounded-full"
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
                        lineNumber: 7,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute w-2 h-2 bg-success rounded-full animate-ping"
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
                        lineNumber: 8,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
                lineNumber: 6,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-xs font-mono text-muted-foreground uppercase tracking-wider",
                children: "System Operational"
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                size: 12,
                className: "text-muted-foreground ml-1"
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = SystemStatus;
var _c;
__turbopack_context__.k.register(_c, "SystemStatus");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RoleSelector",
    ()=>RoleSelector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/user.js [client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/shield.js [client] (ecmascript) <export default as Shield>");
;
;
const RoleSelector = ({ currentRole, onRoleChange })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>onRoleChange('sales_rep'),
                className: `flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border ${currentRole === 'sales_rep' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                        size: 14
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    "Sales Rep"
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>onRoleChange('manager'),
                className: `flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors border ${currentRole === 'manager' ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        size: 14
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx",
                        lineNumber: 31,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    "Manager"
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = RoleSelector;
var _c;
__turbopack_context__.k.register(_c, "RoleSelector");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/EmptyState.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmptyState",
    ()=>EmptyState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/inbox.js [client] (ecmascript) <export default as Inbox>");
;
;
const EmptyState = ({ message })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card-grid p-12 flex flex-col items-center justify-center text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-16 h-16 flex items-center justify-center bg-secondary mb-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__["Inbox"], {
                    size: 24,
                    className: "text-muted-foreground"
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/novus/EmptyState.tsx",
                    lineNumber: 11,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/EmptyState.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-muted-foreground max-w-sm",
                children: message
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/EmptyState.tsx",
                lineNumber: 13,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/EmptyState.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = EmptyState;
var _c;
__turbopack_context__.k.register(_c, "EmptyState");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/clsx/dist/clsx.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/tailwind-merge/dist/bundle-mjs.mjs [client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/button.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/@radix-ui/react-slot/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/class-variance-authority/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, variant, size, asChild = false, ...props }, ref)=>{
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ref: ref,
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/button.tsx",
        lineNumber: 42,
        columnNumber: 12
    }, ("TURBOPACK compile-time value", void 0));
});
_c1 = Button;
Button.displayName = "Button";
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Button$React.forwardRef");
__turbopack_context__.k.register(_c1, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/dialog.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Dialog",
    ()=>Dialog,
    "DialogClose",
    ()=>DialogClose,
    "DialogContent",
    ()=>DialogContent,
    "DialogDescription",
    ()=>DialogDescription,
    "DialogFooter",
    ()=>DialogFooter,
    "DialogHeader",
    ()=>DialogHeader,
    "DialogOverlay",
    ()=>DialogOverlay,
    "DialogPortal",
    ()=>DialogPortal,
    "DialogTitle",
    ()=>DialogTitle,
    "DialogTrigger",
    ()=>DialogTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/@radix-ui/react-dialog/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/x.js [client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
;
;
;
;
const Dialog = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Root"];
const DialogTrigger = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Trigger"];
const DialogPortal = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Portal"];
const DialogClose = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Close"];
const DialogOverlay = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Overlay"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 19,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c = DialogOverlay;
DialogOverlay.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Overlay"].displayName;
const DialogContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c1 = ({ className, children, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogPortal, {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogOverlay, {}, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
                lineNumber: 35,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Content"], {
                ref: ref,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className),
                ...props,
                children: [
                    children,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Close"], {
                        className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
                                lineNumber: 46,
                                columnNumber: 9
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Close"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
                                lineNumber: 47,
                                columnNumber: 9
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
                        lineNumber: 45,
                        columnNumber: 7
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
                lineNumber: 36,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 34,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c2 = DialogContent;
DialogContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Content"].displayName;
const DialogHeader = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col space-y-1.5 text-center sm:text-left", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 55,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c3 = DialogHeader;
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 60,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
_c4 = DialogFooter;
DialogFooter.displayName = "DialogFooter";
const DialogTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c5 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Title"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("text-lg font-semibold leading-none tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 68,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c6 = DialogTitle;
DialogTitle.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Title"].displayName;
const DialogDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c7 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Description"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/dialog.tsx",
        lineNumber: 80,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c8 = DialogDescription;
DialogDescription.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Description"].displayName;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8;
__turbopack_context__.k.register(_c, "DialogOverlay");
__turbopack_context__.k.register(_c1, "DialogContent$React.forwardRef");
__turbopack_context__.k.register(_c2, "DialogContent");
__turbopack_context__.k.register(_c3, "DialogHeader");
__turbopack_context__.k.register(_c4, "DialogFooter");
__turbopack_context__.k.register(_c5, "DialogTitle$React.forwardRef");
__turbopack_context__.k.register(_c6, "DialogTitle");
__turbopack_context__.k.register(_c7, "DialogDescription$React.forwardRef");
__turbopack_context__.k.register(_c8, "DialogDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/tabs.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Tabs",
    ()=>Tabs,
    "TabsContent",
    ()=>TabsContent,
    "TabsList",
    ()=>TabsList,
    "TabsTrigger",
    ()=>TabsTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/@radix-ui/react-tabs/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
;
;
;
const Tabs = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Root"];
const TabsList = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["List"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/tabs.tsx",
        lineNumber: 12,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = TabsList;
TabsList.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["List"].displayName;
const TabsTrigger = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Trigger"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/tabs.tsx",
        lineNumber: 27,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = TabsTrigger;
TabsTrigger.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Trigger"].displayName;
const TabsContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Content"], {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/tabs.tsx",
        lineNumber: 42,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = TabsContent;
TabsContent.displayName = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tabs$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["Content"].displayName;
;
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "TabsList$React.forwardRef");
__turbopack_context__.k.register(_c1, "TabsList");
__turbopack_context__.k.register(_c2, "TabsTrigger$React.forwardRef");
__turbopack_context__.k.register(_c3, "TabsTrigger");
__turbopack_context__.k.register(_c4, "TabsContent$React.forwardRef");
__turbopack_context__.k.register(_c5, "TabsContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/table.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Table",
    ()=>Table,
    "TableBody",
    ()=>TableBody,
    "TableCaption",
    ()=>TableCaption,
    "TableCell",
    ()=>TableCell,
    "TableFooter",
    ()=>TableFooter,
    "TableHead",
    ()=>TableHead,
    "TableHeader",
    ()=>TableHeader,
    "TableRow",
    ()=>TableRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
;
;
const Table = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative w-full overflow-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            ref: ref,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("w-full caption-bottom text-sm", className),
            ...props
        }, void 0, false, {
            fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
            lineNumber: 8,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = Table;
Table.displayName = "Table";
const TableHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("[&_tr]:border-b", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 15,
        columnNumber: 37
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = TableHeader;
TableHeader.displayName = "TableHeader";
const TableBody = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("[&_tr:last-child]:border-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = TableBody;
TableBody.displayName = "TableBody";
const TableFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tfoot", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = TableFooter;
TableFooter.displayName = "TableFooter";
const TableRow = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = TableRow;
TableRow.displayName = "TableRow";
const TableHead = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 46,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = TableHead;
TableHead.displayName = "TableHead";
const TableCell = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c12 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("p-4 align-middle [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 60,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c13 = TableCell;
TableCell.displayName = "TableCell";
const TableCaption = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c14 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("caption", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("mt-4 text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/table.tsx",
        lineNumber: 67,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c15 = TableCaption;
TableCaption.displayName = "TableCaption";
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14, _c15;
__turbopack_context__.k.register(_c, "Table$React.forwardRef");
__turbopack_context__.k.register(_c1, "Table");
__turbopack_context__.k.register(_c2, "TableHeader$React.forwardRef");
__turbopack_context__.k.register(_c3, "TableHeader");
__turbopack_context__.k.register(_c4, "TableBody$React.forwardRef");
__turbopack_context__.k.register(_c5, "TableBody");
__turbopack_context__.k.register(_c6, "TableFooter$React.forwardRef");
__turbopack_context__.k.register(_c7, "TableFooter");
__turbopack_context__.k.register(_c8, "TableRow$React.forwardRef");
__turbopack_context__.k.register(_c9, "TableRow");
__turbopack_context__.k.register(_c10, "TableHead$React.forwardRef");
__turbopack_context__.k.register(_c11, "TableHead");
__turbopack_context__.k.register(_c12, "TableCell$React.forwardRef");
__turbopack_context__.k.register(_c13, "TableCell");
__turbopack_context__.k.register(_c14, "TableCaption$React.forwardRef");
__turbopack_context__.k.register(_c15, "TableCaption");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SalesRepDashboard",
    ()=>SalesRepDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$EmptyState$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/EmptyState.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/sonner/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/button.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/dialog.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/tabs.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/table.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
// Mock requests for demo
const mockRequests = [
    {
        id: "1",
        name: "Marcus Chen",
        email: "m.chen@enterprise.io",
        phone: "+1 (415) 555-0142",
        status: "eligible",
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        summary: "This request meets eligibility criteria for human follow-up.",
        intakeResponses: [
            {
                question: "Primary use case",
                answer: "Outbound qualification and lead routing."
            },
            {
                question: "Team size",
                answer: "14 SDRs across two regions."
            },
            {
                question: "Timeline",
                answer: "Pilot in 30 days, full rollout in Q2."
            }
        ]
    },
    {
        id: "2",
        name: "Sarah Okonkwo",
        email: "sarah.o@techcorp.com",
        phone: "+1 (312) 555-0198",
        status: "eligible",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        summary: "This request meets eligibility criteria for human follow-up.",
        intakeResponses: [
            {
                question: "Primary use case",
                answer: "Qualify inbound demo requests."
            },
            {
                question: "Current CRM",
                answer: "Salesforce, plus Gong."
            },
            {
                question: "Target launch",
                answer: "End of this quarter."
            }
        ]
    },
    {
        id: "3",
        name: "Diego Ruiz",
        email: "d.ruiz@midmarket.co",
        phone: "+1 (646) 555-0131",
        status: "deferred",
        timestamp: new Date(Date.now() - 1000 * 60 * 90),
        summary: "Needs additional verification before outreach.",
        intakeResponses: [
            {
                question: "Primary use case",
                answer: "Routing inbound web leads."
            },
            {
                question: "Budget",
                answer: "Under review by finance."
            },
            {
                question: "Decision maker",
                answer: "VP of Revenue Ops."
            }
        ]
    },
    {
        id: "4",
        name: "Avery Patel",
        email: "avery@startup.example",
        phone: "+1 (213) 555-0109",
        status: "rejected",
        timestamp: new Date(Date.now() - 1000 * 60 * 140),
        summary: "Failed the required qualification criteria.",
        intakeResponses: [
            {
                question: "Primary use case",
                answer: "Cold outreach automation."
            },
            {
                question: "Monthly volume",
                answer: "Under 50 leads."
            },
            {
                question: "Timeline",
                answer: "No defined plan."
            }
        ]
    }
];
const SalesRepDashboard = ()=>{
    _s();
    const [requests, setRequests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(mockRequests);
    const [activeRequest, setActiveRequest] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const handleAction = (requestId, action)=>{
        setRequests((prev)=>prev.filter((r)=>r.id !== requestId));
        const actionMessages = {
            accept: "Request accepted. Contact initiated.",
            contacted: "Request marked as contacted.",
            no_response: "Request marked as no response."
        };
        __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].success(actionMessages[action], {
            className: "font-mono text-xs"
        });
    };
    const eligibleRequests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SalesRepDashboard.useMemo[eligibleRequests]": ()=>requests.filter({
                "SalesRepDashboard.useMemo[eligibleRequests]": (request)=>request.status === "eligible"
            }["SalesRepDashboard.useMemo[eligibleRequests]"])
    }["SalesRepDashboard.useMemo[eligibleRequests]"], [
        requests
    ]);
    const formatTimestamp = (timestamp)=>{
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }).format(timestamp);
    };
    const statusClasses = {
        eligible: "status-badge status-eligible",
        deferred: "status-badge status-deferred",
        rejected: "status-badge status-rejected"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "system-header mb-1",
                            children: "Sales Rep Queue"
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 109,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-muted-foreground",
                            children: [
                                eligibleRequests.length,
                                " eligible · ",
                                requests.length,
                                " total in queue"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 110,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                    lineNumber: 108,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glow-line"
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Tabs"], {
                defaultValue: "all",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsList"], {
                        className: "bg-muted/30 border border-border",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                value: "all",
                                className: "font-mono text-xs uppercase tracking-wider",
                                children: [
                                    "All (",
                                    requests.length,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                value: "eligible",
                                className: "font-mono text-xs uppercase tracking-wider",
                                children: [
                                    "Eligible (",
                                    eligibleRequests.length,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                lineNumber: 123,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                        value: "all",
                        className: "mt-6",
                        children: requests.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$EmptyState$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                            message: "No requests are currently in the queue."
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 130,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-lg border border-border bg-card",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Table"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHeader"], {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Lead"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 136,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Status"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 137,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Received"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 138,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Email"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 139,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Phone"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 140,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Intake"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 141,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header text-right",
                                                    children: "Action"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 142,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 135,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                        lineNumber: 134,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableBody"], {
                                        children: requests.map((request)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "font-medium text-foreground",
                                                        children: request.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 148,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: statusClasses[request.status],
                                                            children: request.status
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 150,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 149,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: formatTimestamp(request.timestamp)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 152,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: request.email
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 153,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: request.phone
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 154,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "sm",
                                                            variant: "outline",
                                                            className: "font-mono text-xs uppercase tracking-wider",
                                                            onClick: ()=>setActiveRequest(request),
                                                            children: "View Intake"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 156,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 155,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "text-right",
                                                        children: request.status === "eligible" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-end gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    onClick: ()=>handleAction(request.id, "accept"),
                                                                    children: "Accept"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 168,
                                                                    columnNumber: 29
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    variant: "secondary",
                                                                    onClick: ()=>handleAction(request.id, "contacted"),
                                                                    children: "Contacted"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 169,
                                                                    columnNumber: 29
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    variant: "ghost",
                                                                    onClick: ()=>handleAction(request.id, "no_response"),
                                                                    children: "No Response"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 176,
                                                                    columnNumber: 29
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 167,
                                                            columnNumber: 27
                                                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: "—"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 185,
                                                            columnNumber: 27
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 165,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, request.id, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                lineNumber: 147,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                        lineNumber: 145,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                lineNumber: 133,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 132,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                        value: "eligible",
                        className: "mt-6",
                        children: eligibleRequests.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$EmptyState$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                            message: "No requests are currently eligible for human review."
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 198,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-lg border border-border bg-card",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Table"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHeader"], {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Lead"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 204,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Status"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 205,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Received"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 206,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Email"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 207,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Phone"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header",
                                                    children: "Intake"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                    className: "system-header text-right",
                                                    children: "Action"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 210,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 203,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                        lineNumber: 202,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableBody"], {
                                        children: eligibleRequests.map((request)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "font-medium text-foreground",
                                                        children: request.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 216,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: statusClasses[request.status],
                                                            children: request.status
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 218,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: formatTimestamp(request.timestamp)
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: request.email
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 221,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "data-cell",
                                                        children: request.phone
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 222,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "sm",
                                                            variant: "outline",
                                                            className: "font-mono text-xs uppercase tracking-wider",
                                                            onClick: ()=>setActiveRequest(request),
                                                            children: "View Intake"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 224,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                        className: "text-right",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-end gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    onClick: ()=>handleAction(request.id, "accept"),
                                                                    children: "Accept"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 235,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    variant: "secondary",
                                                                    onClick: ()=>handleAction(request.id, "contacted"),
                                                                    children: "Contacted"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 236,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                                    size: "sm",
                                                                    variant: "ghost",
                                                                    onClick: ()=>handleAction(request.id, "no_response"),
                                                                    children: "No Response"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                                    lineNumber: 243,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                            lineNumber: 234,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                        lineNumber: 233,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, request.id, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                lineNumber: 215,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                        lineNumber: 213,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                lineNumber: 201,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 200,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                        lineNumber: 196,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Dialog"], {
                open: !!activeRequest,
                onOpenChange: (open)=>!open ? setActiveRequest(null) : undefined,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                    className: "max-w-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["DialogHeader"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                className: "font-mono text-xs uppercase tracking-wider text-muted-foreground",
                                children: "Intake Responses"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                lineNumber: 264,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 263,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        activeRequest ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-wrap items-center gap-3 text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-medium text-foreground",
                                            children: activeRequest.name
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 271,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted-foreground",
                                            children: activeRequest.email
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 272,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted-foreground",
                                            children: activeRequest.phone
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 273,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: statusClasses[activeRequest.status],
                                            children: activeRequest.status
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 274,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                    lineNumber: 270,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3",
                                    children: (activeRequest.intakeResponses ?? []).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground",
                                        children: "No intake responses available."
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                        lineNumber: 278,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)) : activeRequest.intakeResponses?.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-md border border-border p-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs uppercase tracking-wider text-muted-foreground font-mono",
                                                    children: item.question
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 282,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-2 text-sm text-foreground",
                                                    children: item.answer
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, `${activeRequest.id}-${index}`, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                            lineNumber: 281,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                                    lineNumber: 276,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                            lineNumber: 269,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                    lineNumber: 262,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
                lineNumber: 261,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx",
        lineNumber: 106,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(SalesRepDashboard, "SqnTmCX+t5uG60OBMBHL233Mtow=");
_c = SalesRepDashboard;
var _c;
__turbopack_context__.k.register(_c, "SalesRepDashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SystemEventLog",
    ()=>SystemEventLog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/trending-down.js [client] (ecmascript) <export default as TrendingDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/eye.js [client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$power$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Power$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/power.js [client] (ecmascript) <export default as Power>");
;
;
const eventIcons = {
    confidence_decay: __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__["TrendingDown"],
    eligibility_change: __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"],
    internal_review: __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"],
    kill_switch: __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$power$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Power$3e$__["Power"]
};
const eventColors = {
    confidence_decay: "text-warning",
    eligibility_change: "text-primary",
    internal_review: "text-muted-foreground",
    kill_switch: "text-destructive"
};
const SystemEventLog = ({ events })=>{
    const formatTime = (date)=>{
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card-grid",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-4 py-3 border-b border-border",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "system-header",
                    children: "System Events"
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                    lineNumber: 35,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "divide-y divide-border",
                children: events.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 py-8 text-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "No system events recorded."
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                        lineNumber: 40,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                    lineNumber: 39,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : events.map((event)=>{
                    const Icon = eventIcons[event.type];
                    const colorClass = eventColors[event.type];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-3 flex items-start gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                size: 14,
                                className: `mt-0.5 ${colorClass}`
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                                lineNumber: 51,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-foreground",
                                        children: event.message
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                                        lineNumber: 53,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "data-cell text-xs",
                                        children: formatTime(event.timestamp)
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                                        lineNumber: 54,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                                lineNumber: 52,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, event.id, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                        lineNumber: 50,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = SystemEventLog;
var _c;
__turbopack_context__.k.register(_c, "SystemEventLog");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/card.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
;
;
const Card = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg border bg-card text-card-foreground shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = Card;
Card.displayName = "Card";
const CardHeader = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col space-y-1.5 p-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = CardHeader;
CardHeader.displayName = "CardHeader";
const CardTitle = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("text-2xl font-semibold leading-none tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c5 = CardTitle;
CardTitle.displayName = "CardTitle";
const CardDescription = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c7 = CardDescription;
CardDescription.displayName = "CardDescription";
const CardContent = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c8 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 32,
        columnNumber: 37
    }, ("TURBOPACK compile-time value", void 0)));
_c9 = CardContent;
CardContent.displayName = "CardContent";
const CardFooter = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c10 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center p-6 pt-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/card.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0)));
_c11 = CardFooter;
CardFooter.displayName = "CardFooter";
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "Card$React.forwardRef");
__turbopack_context__.k.register(_c1, "Card");
__turbopack_context__.k.register(_c2, "CardHeader$React.forwardRef");
__turbopack_context__.k.register(_c3, "CardHeader");
__turbopack_context__.k.register(_c4, "CardTitle$React.forwardRef");
__turbopack_context__.k.register(_c5, "CardTitle");
__turbopack_context__.k.register(_c6, "CardDescription$React.forwardRef");
__turbopack_context__.k.register(_c7, "CardDescription");
__turbopack_context__.k.register(_c8, "CardContent$React.forwardRef");
__turbopack_context__.k.register(_c9, "CardContent");
__turbopack_context__.k.register(_c10, "CardFooter$React.forwardRef");
__turbopack_context__.k.register(_c11, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/ui/chart.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChartContainer",
    ()=>ChartContainer,
    "ChartLegend",
    ()=>ChartLegend,
    "ChartLegendContent",
    ()=>ChartLegendContent,
    "ChartStyle",
    ()=>ChartStyle,
    "ChartTooltip",
    ()=>ChartTooltip,
    "ChartTooltipContent",
    ()=>ChartTooltipContent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/component/ResponsiveContainer.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/component/Tooltip.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/component/Legend.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/lib/utils.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
;
;
;
// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
    light: "",
    dark: ".dark"
};
const ChartContext = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"](null);
function useChart() {
    _s();
    const context = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"](ChartContext);
    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />");
    }
    return context;
}
_s(useChart, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const ChartContainer = /*#__PURE__*/ _s1(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = _s1(({ id, className, children, config, ...props }, ref)=>{
    _s1();
    const uniqueId = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useId"]();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ChartContext.Provider, {
        value: {
            config
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            "data-chart": chartId,
            ref: ref,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none", className),
            ...props,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ChartStyle, {
                    id: chartId,
                    config: config
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                    lineNumber: 53,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                    children: children
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                    lineNumber: 54,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
            lineNumber: 44,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
}, "j7NPILheLIfrWAvm8S/GM4Sml/8=")), "j7NPILheLIfrWAvm8S/GM4Sml/8=");
_c1 = ChartContainer;
ChartContainer.displayName = "Chart";
const ChartStyle = ({ id, config })=>{
    const colorConfig = Object.entries(config).filter(([_, config])=>config.theme || config.color);
    if (!colorConfig.length) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
        dangerouslySetInnerHTML: {
            __html: Object.entries(THEMES).map(([theme, prefix])=>`
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig])=>{
                    const color = itemConfig.theme?.[theme] || itemConfig.color;
                    return color ? `  --color-${key}: ${color};` : null;
                }).join("\n")}
}
`).join("\n")
        }
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c2 = ChartStyle;
const ChartTooltip = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"];
const ChartTooltipContent = /*#__PURE__*/ _s2(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c3 = _s2(({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey }, ref)=>{
    _s2();
    const { config } = useChart();
    const tooltipLabel = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "ChartTooltipContent.useMemo[tooltipLabel]": ()=>{
            if (hideLabel || !payload?.length) {
                return null;
            }
            const [item] = payload;
            const key = `${labelKey || item.dataKey || item.name || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const value = !labelKey && typeof label === "string" ? config[label]?.label || label : itemConfig?.label;
            if (labelFormatter) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("font-medium", labelClassName),
                    children: labelFormatter(value, payload)
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                    lineNumber: 137,
                    columnNumber: 16
                }, ("TURBOPACK compile-time value", void 0));
            }
            if (!value) {
                return null;
            }
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("font-medium", labelClassName),
                children: value
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                lineNumber: 144,
                columnNumber: 14
            }, ("TURBOPACK compile-time value", void 0));
        }
    }["ChartTooltipContent.useMemo[tooltipLabel]"], [
        label,
        labelFormatter,
        payload,
        hideLabel,
        labelClassName,
        config,
        labelKey
    ]);
    if (!active || !payload?.length) {
        return null;
    }
    const nestLabel = payload.length === 1 && indicator !== "dot";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className),
        children: [
            !nestLabel ? tooltipLabel : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-1.5",
                children: payload.map((item, index)=>{
                    const key = `${nameKey || item.name || item.dataKey || "value"}`;
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);
                    const indicatorColor = color || item.payload.fill || item.color;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center"),
                        children: formatter && item?.value !== undefined && item.name ? formatter(item.value, item.name, item, index, item.payload) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                itemConfig?.icon ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(itemConfig.icon, {}, void 0, false, {
                                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                    lineNumber: 181,
                                    columnNumber: 23
                                }, ("TURBOPACK compile-time value", void 0)) : !hideIndicator && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                                        "h-2.5 w-2.5": indicator === "dot",
                                        "w-1": indicator === "line",
                                        "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                                        "my-0.5": nestLabel && indicator === "dashed"
                                    }),
                                    style: {
                                        "--color-bg": indicatorColor,
                                        "--color-border": indicatorColor
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                    lineNumber: 184,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center"),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid gap-1.5",
                                            children: [
                                                nestLabel ? tooltipLabel : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-muted-foreground",
                                                    children: itemConfig?.label || item.name
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 25
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                            lineNumber: 206,
                                            columnNumber: 23
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        item.value && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-mono font-medium tabular-nums text-foreground",
                                            children: item.value.toLocaleString()
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                            lineNumber: 211,
                                            columnNumber: 25
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                                    lineNumber: 200,
                                    columnNumber: 21
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true)
                    }, item.dataKey, false, {
                        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                        lineNumber: 169,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                lineNumber: 162,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
        lineNumber: 154,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
}, "nRMgiGinpZEd+NE7/dAtqF0Z2iA=", false, function() {
    return [
        useChart
    ];
})), "nRMgiGinpZEd+NE7/dAtqF0Z2iA=", false, function() {
    return [
        useChart
    ];
});
_c4 = ChartTooltipContent;
ChartTooltipContent.displayName = "ChartTooltip";
const ChartLegend = __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Legend"];
const ChartLegendContent = /*#__PURE__*/ _s3(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["forwardRef"](_c5 = _s3(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref)=>{
    _s3();
    const { config } = useChart();
    if (!payload?.length) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className),
        children: payload.map((item)=>{
            const key = `${nameKey || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$lib$2f$utils$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"),
                children: [
                    itemConfig?.icon && !hideIcon ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(itemConfig.icon, {}, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                        lineNumber: 259,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-2 w-2 shrink-0 rounded-[2px]",
                        style: {
                            backgroundColor: item.color
                        }
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                        lineNumber: 261,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0)),
                    itemConfig?.label
                ]
            }, item.value, true, {
                fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
                lineNumber: 254,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0));
        })
    }, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/components/ui/chart.tsx",
        lineNumber: 245,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
}, "qnidj+dVqj1Euuv2nRBc6D+LeAA=", false, function() {
    return [
        useChart
    ];
})), "qnidj+dVqj1Euuv2nRBc6D+LeAA=", false, function() {
    return [
        useChart
    ];
});
_c6 = ChartLegendContent;
ChartLegendContent.displayName = "ChartLegend";
// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config, payload, key) {
    if (typeof payload !== "object" || payload === null) {
        return undefined;
    }
    const payloadPayload = "payload" in payload && typeof payload.payload === "object" && payload.payload !== null ? payload.payload : undefined;
    let configLabelKey = key;
    if (key in payload && typeof payload[key] === "string") {
        configLabelKey = payload[key];
    } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") {
        configLabelKey = payloadPayload[key];
    }
    return configLabelKey in config ? config[configLabelKey] : config[key];
}
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "ChartContainer$React.forwardRef");
__turbopack_context__.k.register(_c1, "ChartContainer");
__turbopack_context__.k.register(_c2, "ChartStyle");
__turbopack_context__.k.register(_c3, "ChartTooltipContent$React.forwardRef");
__turbopack_context__.k.register(_c4, "ChartTooltipContent");
__turbopack_context__.k.register(_c5, "ChartLegendContent$React.forwardRef");
__turbopack_context__.k.register(_c6, "ChartLegendContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ManagerDashboard",
    ()=>ManagerDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SystemEventLog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/SystemEventLog.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/button.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$power$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Power$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/power.js [client] (ecmascript) <export default as Power>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/clock.js [client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/mic.js [client] (ecmascript) <export default as Mic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/sonner/dist/index.mjs [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/card.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/tabs.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/chart.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/cartesian/Bar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/chart/BarChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/cartesian/CartesianGrid.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/cartesian/Line.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/chart/LineChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/cartesian/XAxis.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/recharts/es6/cartesian/YAxis.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
;
const timelineData = [
    {
        day: "Mon",
        volume: 42,
        eligible: 14,
        deferred: 18,
        rejected: 10
    },
    {
        day: "Tue",
        volume: 55,
        eligible: 19,
        deferred: 23,
        rejected: 13
    },
    {
        day: "Wed",
        volume: 63,
        eligible: 22,
        deferred: 25,
        rejected: 16
    },
    {
        day: "Thu",
        volume: 49,
        eligible: 17,
        deferred: 20,
        rejected: 12
    },
    {
        day: "Fri",
        volume: 71,
        eligible: 24,
        deferred: 30,
        rejected: 17
    },
    {
        day: "Sat",
        volume: 38,
        eligible: 11,
        deferred: 16,
        rejected: 11
    },
    {
        day: "Sun",
        volume: 46,
        eligible: 15,
        deferred: 19,
        rejected: 12
    }
];
const metricCards = [
    {
        label: "Total Volume",
        value: "364",
        delta: "+8.2%"
    },
    {
        label: "Eligible Rate",
        value: "32.7%",
        delta: "+2.1%"
    },
    {
        label: "Avg Response Time",
        value: "14m",
        delta: "-1.8m"
    },
    {
        label: "Human Follow-ups",
        value: "81",
        delta: "+6"
    }
];
const chartConfig = {
    volume: {
        label: "Total Volume",
        color: "hsl(var(--primary))"
    },
    eligible: {
        label: "Eligible",
        color: "hsl(var(--success))"
    },
    deferred: {
        label: "Deferred",
        color: "hsl(var(--warning))"
    },
    rejected: {
        label: "Rejected",
        color: "hsl(var(--destructive))"
    }
};
const mockEvents = [
    {
        id: "1",
        type: "eligibility_change",
        message: "Eligibility threshold adjusted: confidence decay detected",
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
        id: "2",
        type: "internal_review",
        message: "System-initiated review completed for batch #4782",
        timestamp: new Date(Date.now() - 1000 * 60 * 23)
    },
    {
        id: "3",
        type: "confidence_decay",
        message: "Pattern degradation observed in segment A-3",
        timestamp: new Date(Date.now() - 1000 * 60 * 67)
    }
];
const ManagerDashboard = ()=>{
    _s();
    const [intakeEnabled, setIntakeEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [voiceEnabled, setVoiceEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [activeMetric, setActiveMetric] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("volume");
    const [range, setRange] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("7d");
    const barData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ManagerDashboard.useMemo[barData]": ()=>{
            return timelineData.map({
                "ManagerDashboard.useMemo[barData]": (item)=>({
                        day: item.day,
                        eligible: item.eligible,
                        deferred: item.deferred,
                        rejected: item.rejected
                    })
            }["ManagerDashboard.useMemo[barData]"]);
        }
    }["ManagerDashboard.useMemo[barData]"], []);
    const handleKillSwitch = ()=>{
        setIntakeEnabled(false);
        __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].warning("Intake paused. All incoming requests are now held.", {
            className: "font-mono text-xs"
        });
    };
    const handleEnableIntake = ()=>{
        setIntakeEnabled(true);
        __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].success("Intake resumed. System is now accepting requests.", {
            className: "font-mono text-xs"
        });
    };
    const toggleVoice = ()=>{
        setVoiceEnabled(!voiceEnabled);
        __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$client$5d$__$28$ecmascript$29$__["toast"].info(`Voice intake ${!voiceEnabled ? 'enabled' : 'disabled'}.`, {
            className: "font-mono text-xs"
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center justify-between gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "system-header",
                                        children: "Analytics"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 105,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xl font-semibold mt-1",
                                        children: "Intake performance"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 106,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-muted-foreground",
                                        children: "Explore the pipeline with quick toggles and timeline views."
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 107,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 104,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    {
                                        value: "7d",
                                        label: "7D"
                                    },
                                    {
                                        value: "30d",
                                        label: "30D"
                                    },
                                    {
                                        value: "90d",
                                        label: "90D"
                                    }
                                ].map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: range === option.value ? "default" : "outline",
                                        size: "sm",
                                        onClick: ()=>setRange(option.value),
                                        className: "font-mono text-xs uppercase tracking-wider",
                                        children: option.label
                                    }, option.value, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 111,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 103,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Tabs"], {
                        defaultValue: "numbers",
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsList"], {
                                className: "bg-muted/30 border border-border",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                        value: "numbers",
                                        className: "font-mono text-xs uppercase tracking-wider",
                                        children: "Numbers"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 132,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                        value: "timeline",
                                        className: "font-mono text-xs uppercase tracking-wider",
                                        children: "Timeline"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 135,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                        value: "status",
                                        className: "font-mono text-xs uppercase tracking-wider",
                                        children: "Status Mix"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 138,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 131,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                                value: "numbers",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid gap-4 md:grid-cols-4",
                                    children: metricCards.map((metric)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Card"], {
                                            className: "card-grid",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                                className: "p-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-muted-foreground font-mono uppercase tracking-wider",
                                                        children: metric.label
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 148,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-2xl font-semibold mt-2",
                                                        children: metric.value
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 149,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-muted-foreground mt-1",
                                                        children: [
                                                            metric.delta,
                                                            " vs last ",
                                                            range
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 150,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 147,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, metric.label, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 146,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)))
                                }, void 0, false, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                    lineNumber: 144,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 143,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                                value: "timeline",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Card"], {
                                    className: "card-grid",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    className: "text-lg",
                                                    children: "Timeline view"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 160,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-muted-foreground",
                                                    children: "Toggle which series is highlighted."
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 161,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 159,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                            className: "space-y-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap gap-2",
                                                    children: Object.keys(chartConfig).map((key)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "sm",
                                                            variant: activeMetric === key ? "default" : "outline",
                                                            className: "font-mono text-xs uppercase tracking-wider",
                                                            onClick: ()=>setActiveMetric(key),
                                                            children: chartConfig[key].label
                                                        }, key, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 168,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 166,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartContainer"], {
                                                    config: chartConfig,
                                                    className: "w-full h-56",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LineChart"], {
                                                        data: timelineData,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                                                strokeDasharray: "4 4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 181,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                                                dataKey: "day"
                                                            }, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 182,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {}, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 183,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartTooltip"], {
                                                                content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartTooltipContent"], {}, void 0, false, {
                                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                    lineNumber: 184,
                                                                    columnNumber: 44
                                                                }, void 0)
                                                            }, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 184,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Line"], {
                                                                type: "monotone",
                                                                dataKey: activeMetric,
                                                                stroke: `var(--color-${activeMetric})`,
                                                                strokeWidth: 2,
                                                                dot: false
                                                            }, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 185,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 180,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 179,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 165,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                    lineNumber: 158,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 157,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$tabs$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                                value: "status",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Card"], {
                                    className: "card-grid",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    className: "text-lg",
                                                    children: "Status mix"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 201,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-muted-foreground",
                                                    children: "How each day breaks down by decision."
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 202,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 200,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartContainer"], {
                                                config: chartConfig,
                                                className: "w-full h-56",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BarChart"], {
                                                    data: barData,
                                                    stackOffset: "expand",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                                            strokeDasharray: "4 4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 209,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                                            dataKey: "day"
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 210,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                                            tickFormatter: (value)=>`${Math.round(value * 100)}%`
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 211,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartTooltip"], {
                                                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartTooltipContent"], {}, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 212,
                                                                columnNumber: 44
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartLegend"], {
                                                            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$chart$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ChartLegendContent"], {}, void 0, false, {
                                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                                lineNumber: 213,
                                                                columnNumber: 43
                                                            }, void 0)
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 213,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Bar"], {
                                                            dataKey: "eligible",
                                                            stackId: "status",
                                                            fill: "var(--color-eligible)",
                                                            radius: [
                                                                4,
                                                                4,
                                                                0,
                                                                0
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 214,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Bar"], {
                                                            dataKey: "deferred",
                                                            stackId: "status",
                                                            fill: "var(--color-deferred)",
                                                            radius: [
                                                                0,
                                                                0,
                                                                0,
                                                                0
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 215,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Bar"], {
                                                            dataKey: "rejected",
                                                            stackId: "status",
                                                            fill: "var(--color-rejected)",
                                                            radius: [
                                                                0,
                                                                0,
                                                                4,
                                                                4
                                                            ]
                                                        }, void 0, false, {
                                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 207,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 206,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                    lineNumber: 199,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "glow-line"
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "system-header mb-1",
                                children: "Intake Studio"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 229,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-muted-foreground",
                                children: "Manage prompts, questions, and analytics for the intake process."
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 230,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 228,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                        asChild: true,
                        className: "font-mono text-xs uppercase tracking-wider",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/manager/intake",
                            children: "Open Intake Studio"
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                            lineNumber: 235,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 234,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                lineNumber: 227,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid lg:grid-cols-3 gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "lg:col-span-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SystemEventLog$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["SystemEventLog"], {
                            events: mockEvents
                        }, void 0, false, {
                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                            lineNumber: 241,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 240,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "card-grid p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "system-header block mb-4",
                                        children: "Governance Controls"
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 246,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-3",
                                        children: [
                                            intakeEnabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "destructive",
                                                className: "w-full font-mono text-xs tracking-wide justify-start",
                                                onClick: handleKillSwitch,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$power$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Power$3e$__["Power"], {
                                                        size: 14,
                                                        className: "mr-2"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 255,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "PAUSE INTAKE (KILL SWITCH)"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 250,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "default",
                                                className: "w-full font-mono text-xs tracking-wide justify-start",
                                                onClick: handleEnableIntake,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$power$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Power$3e$__["Power"], {
                                                        size: 14,
                                                        className: "mr-2"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 264,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "RESUME INTAKE"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 259,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "outline",
                                                className: "w-full font-mono text-xs tracking-wide justify-start",
                                                onClick: toggleVoice,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__["Mic"], {
                                                        size: 14,
                                                        className: "mr-2"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 274,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    voiceEnabled ? 'DISABLE' : 'ENABLE',
                                                    " VOICE INTAKE"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 269,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                                variant: "ghost",
                                                className: "w-full font-mono text-xs tracking-wide justify-start text-muted-foreground",
                                                disabled: true,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                                        size: 14,
                                                        className: "mr-2"
                                                    }, void 0, false, {
                                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "ADJUST TIME WINDOWS"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                lineNumber: 278,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                        lineNumber: 248,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 245,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            !intakeEnabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "card-grid p-4 border-destructive bg-destructive/5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                            size: 16,
                                            className: "text-destructive mt-0.5"
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 292,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm font-medium text-destructive",
                                                    children: "Intake Paused"
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 294,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-muted-foreground mt-1",
                                                    children: "All incoming requests are being held. Resume when ready."
                                                }, void 0, false, {
                                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                                    lineNumber: 295,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                            lineNumber: 293,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                    lineNumber: 291,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                                lineNumber: 290,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                        lineNumber: 244,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
                lineNumber: 239,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx",
        lineNumber: 101,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(ManagerDashboard, "Elb4cDw7BwC4+8KrHtDLlzzZ5Mo=");
_c = ManagerDashboard;
var _c;
__turbopack_context__.k.register(_c, "ManagerDashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/views/Index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$NovusLogo$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/NovusLogo.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SystemStatus$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/SystemStatus.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$RoleSelector$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/RoleSelector.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SalesRepDashboard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/SalesRepDashboard.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$ManagerDashboard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/novus/ManagerDashboard.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/components/ui/button.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
const Index = ()=>{
    _s();
    const [currentRole, setCurrentRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('sales_rep');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-background",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-6 py-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$NovusLogo$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["NovusLogo"], {}, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                lineNumber: 20,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SystemStatus$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["SystemStatus"], {}, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                        lineNumber: 22,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$RoleSelector$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["RoleSelector"], {
                                        currentRole: currentRole,
                                        onRoleChange: setCurrentRole
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                        lineNumber: 23,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Button"], {
                                        asChild: true,
                                        variant: "outline",
                                        className: "font-mono text-xs uppercase tracking-wider",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/intake",
                                            children: "Open Intake"
                                        }, void 0, false, {
                                            fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                            lineNumber: 25,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                        lineNumber: 24,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                lineNumber: 21,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                        lineNumber: 19,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative h-px overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0 bg-primary/30 animate-scan-line"
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "container mx-auto px-6 py-8",
                children: currentRole === 'sales_rep' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$SalesRepDashboard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["SalesRepDashboard"], {}, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                    lineNumber: 40,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$components$2f$novus$2f$ManagerDashboard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["ManagerDashboard"], {}, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                    lineNumber: 42,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "border-t border-border mt-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-6 py-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between text-xs text-muted-foreground font-mono",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "NOVUS v1.0.0"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                lineNumber: 50,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "PRE-QUALIFICATION & DATA SAFETY SYSTEM"
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                lineNumber: 51,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: new Date().toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })
                            }, void 0, false, {
                                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                                lineNumber: 52,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                        lineNumber: 49,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/sales-rep-manager/src/views/Index.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Index, "DGjDZXGpWF9dC8SKwbMId5fteHs=");
_c = Index;
const __TURBOPACK__default__export__ = Index;
var _c;
__turbopack_context__.k.register(_c, "Index");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sales-rep-manager/src/pages/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$views$2f$Index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sales-rep-manager/src/views/Index.tsx [client] (ecmascript)");
;
;
const Home = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$sales$2d$rep$2d$manager$2f$src$2f$views$2f$Index$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/sales-rep-manager/src/pages/index.tsx",
        lineNumber: 5,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Home;
const __TURBOPACK__default__export__ = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/sales-rep-manager/src/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/sales-rep-manager/src/pages/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/sales-rep-manager/src/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/sales-rep-manager/src/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__c93e5b13._.js.map