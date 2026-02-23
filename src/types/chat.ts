export type MessageType =
    | 'text'           // ordinary user message
    | 'mis_alert'      // system: status change after MIS upload
    | 'mis_snapshot'   // response to /snapshot query
    | 'ro_query'       // RO asking branch a structured question
    | 'branch_response'// branch replying to an ro_query
    | 'system_info'    // non-critical system notification
    | 'emergency';     // critical alert requiring acknowledgement

export interface ChatMessage {
    id: string;         // uuid - generated server-side
    type: MessageType;
    room: string;         // socket room id
    user: string;         // sender display name
    role: string;         // sender role: ADMIN | RO | BRANCH
    branchCode?: string;         // SOL code of sender's branch (BRANCH role only)
    text: string;         // always present - summary / fallback text
    payload?: Record<string, any>; // structured data (type-specific)
    timestamp: string;         // ISO 8601
    readBy?: string[];       // list of user names who have read
}
