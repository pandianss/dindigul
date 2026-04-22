import React from 'react';
import { getStaticUrl } from '../../../../services/api';
import { LeadershipMember } from '../../types';

interface LeadershipNodeProps {
    member: LeadershipMember;
    isMainHead?: boolean;
}

export const LeadershipNode: React.FC<LeadershipNodeProps> = ({ member, isMainHead }) => {
    return (
        <div className={`bg-white ${isMainHead ? 'border-2 border-[#00AEEF]' : 'border border-[#D0DCF0]'} p-6 w-full flex flex-col items-center text-center shadow-xl rounded-lg transform transition-transform hover:scale-105`}>
            <div className={`${isMainHead ? 'w-20 h-20 text-3xl' : 'w-16 h-16 text-2xl'} bg-[#E0F4FB] text-[#0090C8] rounded-full flex justify-center items-center font-black mb-4 border-4 border-white shadow-md overflow-hidden relative group`}>
                {member.photoUrl ? (
                    <img 
                        src={getStaticUrl(member.photoUrl)} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    member.name.charAt(0)
                )}
            </div>
            <h3 className={`${isMainHead ? 'text-lg' : 'text-base underline-offset-4'} font-black text-[#1B3A6B] leading-tight`}>{member.name}</h3>
            <p className={`${isMainHead ? 'text-[0.65rem]' : 'text-[0.58rem]'} text-[#0090C8] font-bold mt-1 uppercase tracking-[0.15em]`}>
                {member.designation.replace(/\s*-\s*I{1,2}\s*line$/i, '').trim()}
            </p>
            {isMainHead && (
                <div className="mt-4 flex items-center gap-2">
                    <div className="bg-[#00AEEF] text-white text-[0.6rem] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        Regional Head
                    </div>
                    <span className="text-[0.6rem] font-black bg-[#1B3A6B] text-white px-1.5 py-0.5 rounded">I</span>
                </div>
            )}
            {!isMainHead && member.isSecondLine && (
                <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[0.45rem] font-black bg-[#5A708A] text-white px-1 rounded-sm shadow-sm uppercase">2nd Line</span>
                </div>
            )}
        </div>
    );
};
