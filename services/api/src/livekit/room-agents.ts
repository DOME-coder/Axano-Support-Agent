// Single source of truth for the agent_names that we expect to be
// dispatched into every widget-session livekit room. The python
// workers (services/agent + services/vision-worker) register with
// matching agent_name in their WorkerOptions; any drift here breaks
// dispatch silently.
//
// Used by both:
//  - room-service.factory.ts → passes them to createRoom so the
//    server-side room is born with the dispatch config
//  - token-issuer.service.ts → embeds them in the token's
//    RoomConfiguration as a backup path for first-time auto-create
//    (does NOT cover the case where the room already exists; that's
//    why room creation must also carry them, not just the token)

export const ROOM_AGENT_NAMES = ['conversational-agent', 'vision-worker'] as const;
export type RoomAgentName = (typeof ROOM_AGENT_NAMES)[number];
