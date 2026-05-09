// ScopeBridge AI — Pipeshift compatibility shim
// All logic lives in kimi.ts. This file re-exports so existing imports continue to work.
export { callModel, callKimi, isPipeshiftAvailable } from "./kimi";
