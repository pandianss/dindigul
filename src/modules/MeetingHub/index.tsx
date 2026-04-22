import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/handleError';

// Types
import { Committee, Meeting, User, MeetingForm } from './types';

// Components
import { CommitteeSidebar } from './components/Sidebar/CommitteeSidebar';
import { MeetingsList } from './components/Dashboard/MeetingsList';
import { WizardOrchestrator } from './components/Wizard/WizardOrchestrator';
import { DateStep } from './components/Wizard/Steps/DateStep';
import { MetadataStep } from './components/Wizard/Steps/MetadataStep';
import { VenueStep } from './components/Wizard/Steps/VenueStep';
import { MinutesStep } from './components/Wizard/Steps/MinutesStep';
import { StaffingStep } from './components/Wizard/Steps/StaffingStep';

// Utils
import { handleDownloadPDF } from './utils';

const MeetingHub: React.FC = () => {
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    
    // Wizard Form State
    const [currentStep, setCurrentStep] = useState(1);
    const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [venue, setVenue] = useState('Regional Office Dindigul');
    const [minutesHtml, setMinutesHtml] = useState('');
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]); // These are now ABSENTEES
    const [participantDescription, setParticipantDescription] = useState('All Branch Heads, 2nd Line Officers, Regional Office Staff');
    const [selectedSignatories, setSelectedSignatories] = useState<string[]>([]);

    useEffect(() => {
        fetchCommittees();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedCommitteeId) {
            fetchMeetings(selectedCommitteeId);
        }
    }, [selectedCommitteeId]);

    const fetchCommittees = async () => {
        try {
            const res = await api.get('/meetings/committees');
            const committeeData = res.data || [];
            setCommittees(committeeData);
            
            if (!selectedCommitteeId) {
                if (committeeData.length > 0) {
                    setSelectedCommitteeId(committeeData[0].id);
                } else {
                    setSelectedCommitteeId('GENERAL');
                }
            }
        } catch (err) {
            console.error('Failed to fetch committees');
            setSelectedCommitteeId('GENERAL');
        }
    };

    const fetchMeetings = async (cid: string) => {
        setIsLoading(true);
        try {
            const endpoint = cid === 'GENERAL' 
                ? '/meetings/committee/GENERAL/meetings' 
                : `/meetings/committee/${cid}/meetings`;
            const res = await api.get(endpoint);
            setMeetings(res.data);
        } catch (err) {
            console.error('Failed to fetch meetings');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users?limit=1000');
            // Support both paginated { data, meta } and flat [user] structures
            setUsers(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    const handleSaveMeeting = async () => {
        // committeeId is now optional
        const committeeId = selectedCommitteeId === 'GENERAL' ? null : selectedCommitteeId;
        
        const payload = {
            committeeId: committeeId,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            venue,
            title: meetingTitle || (selectedCommitteeId !== 'GENERAL' ? committees.find(c => c.id === selectedCommitteeId)?.nameEn : 'Meeting Record') || 'Meeting Record',
            minutes: minutesHtml,
            attendees: selectedAttendees,
            participantDescription: participantDescription || 'All Participants',
            signatories: selectedSignatories,
            status: 'FINAL'
};

        try {
            let meetingId = currentMeetingId;
            if (currentMeetingId) {
                await api.put(`/meetings/${currentMeetingId}`, payload);
            } else {
                const res = await api.post('/meetings', payload);
                meetingId = res.data.id;
            }
            
            if (meetingId) {
                await handleDownloadPDF(meetingId, committees.find(c => c.id === selectedCommitteeId)?.nameEn || 'Meeting');
            }

            setIsEditing(false);
            if (selectedCommitteeId) fetchMeetings(selectedCommitteeId);
            resetForm();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const resetForm = () => {
        setCurrentStep(1);
        setCurrentMeetingId(null);
        setMeetingTitle('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setVenue('Regional Office Dindigul');
        setMinutesHtml('');
        setSelectedAttendees([]);
        setParticipantDescription('All Branch Heads, 2nd Line Officers, Regional Office Staff');
        setSelectedSignatories([]);
    };

    const handleEditMeeting = (m: Meeting) => {
        setCurrentMeetingId(m.id);
        setDate(format(new Date(m.date), 'yyyy-MM-dd'));
        setVenue(m.venue);
        setMeetingTitle(m.title || '');
        
        const rawMinutes = JSON.parse(m.minutesJson || '""');
        if (typeof rawMinutes === 'string') {
            setMinutesHtml(rawMinutes);
        } else if (Array.isArray(rawMinutes)) {
            const legacyHtml = rawMinutes.map(row => `
                <div style="margin-bottom: 20px;">
                    <p><strong>Proceedings:</strong> ${row.content || row.discussion || ''}</p>
                    ${row.decision ? `<p><strong>Decision:</strong> ${row.decision}</p>` : ''}
                    ${row.responsibility ? `<p><small>Responsibility: ${row.responsibility}</small></p>` : ''}
                </div>
            `).join('');
            setMinutesHtml(legacyHtml);
        }
        
        setSelectedAttendees(m.attendees || []);
        setParticipantDescription(m.participantDescription || '');
        setSelectedSignatories(m.signatories || []);
        setIsEditing(true);
    };

    const isValid = minutesHtml.trim().length > 0 && selectedSignatories.length > 0;

    return (
        <div className="flex bg-[#f8fafc] rounded-3xl border border-white shadow-2xl overflow-hidden h-[calc(100vh-140px)]">
            {!isEditing && (
                <CommitteeSidebar 
                    committees={committees}
                    selectedCommitteeId={selectedCommitteeId}
                    onSelect={setSelectedCommitteeId}
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {!isEditing ? (
                    <MeetingsList 
                        meetings={meetings}
                        isLoading={isLoading}
                        onNewMeeting={() => { resetForm(); setIsEditing(true); }}
                        onEditMeeting={handleEditMeeting}
                        onDownloadPDF={handleDownloadPDF}
                    />
                ) : (
                    <WizardOrchestrator
                        currentStep={currentStep}
                        setCurrentStep={setCurrentStep}
                        onClose={() => setIsEditing(false)}
                        onSave={handleSaveMeeting}
                        isValid={isValid}
                    >
                        {currentStep === 1 && <DateStep date={date} setDate={setDate} />}
                        {currentStep === 2 && (
                            <MetadataStep 
                                meetingTitle={meetingTitle}
                                setMeetingTitle={setMeetingTitle}
                                selectedCommitteeId={selectedCommitteeId}
                                setSelectedCommitteeId={setSelectedCommitteeId}
                                committees={committees}
                            />
                        )}
                        {currentStep === 3 && <VenueStep venue={venue} setVenue={setVenue} />}
                        {currentStep === 4 && <MinutesStep minutesHtml={minutesHtml} setMinutesHtml={setMinutesHtml} />}
                        {currentStep === 5 && (
                            <StaffingStep 
                                users={users}
                                selectedSignatories={selectedSignatories}
                                setSelectedSignatories={setSelectedSignatories}
                                selectedAttendees={selectedAttendees}
                                setSelectedAttendees={setSelectedAttendees}
                                participantDescription={participantDescription}
                                setParticipantDescription={setParticipantDescription}
                            />
                        )}
                    </WizardOrchestrator>
                )}
            </div>
        </div>
    );
};

export default MeetingHub;
