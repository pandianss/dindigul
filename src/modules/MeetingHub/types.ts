export interface Committee {
    id: string;
    nameEn: string;
    description?: string;
}

export interface Meeting {
    id: string;
    committeeId?: string | null;
    date: string;
    venue: string;
    status: string;
    minutesJson: string;
    attendees: string[]; // This will now store Absentee IDs
    signatories: string[];
    committee?: Committee | null;
    title?: string | null;
    participantDescription?: string | null;
}

export interface User {
    id: string;
    fullNameEn: string;
    designationEn: string;
    role: string;
}

export interface MeetingForm {
    date: string;
    venue: string;
    title: string;
    minutes: string;
    attendees: string[]; // Absentee IDs
    signatories: string[];
    committeeId?: string | null;
    participantDescription: string;
}
