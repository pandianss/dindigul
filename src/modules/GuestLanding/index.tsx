import React, { useEffect, useState } from 'react';
import { SetupData } from './types';
import { Navbar } from './components/Layout/Navbar';
import { Footer } from './components/Layout/Footer';
import { HeroSection } from './components/Hero/HeroSection';
import { MetricsBand } from './components/Metrics/MetricsBand';
import { OverviewSection } from './components/Content/OverviewSection';
import { SectorsGrid } from './components/Content/SectorsGrid';
import { TourismHighlights } from './components/Content/TourismHighlights';
import { OrgTree } from './components/Organization/OrgTree';
import { AchievementsTimeline } from './components/Feeds/AchievementsTimeline';
import { EventsCalendar } from './components/Feeds/EventsCalendar';

interface GuestLandingProps {
    onExitPortal: () => void;
}

const GuestLanding: React.FC<GuestLandingProps> = ({ onExitPortal }) => {
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Add Inter font to document head if not present
        if (!document.getElementById('inter-font')) {
            const link = document.createElement('link');
            link.id = 'inter-font';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
            document.head.appendChild(link);
        }

        const fetchSetupData = async () => {
            try {
                const response = await fetch('/api/public/setup');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setSetupData(data.setup);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch setup data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSetupData();
    }, []);

    // Intersection Observer for scroll animations runs after loading changes
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.05, rootMargin: "50px" }
        );

        const timer = setTimeout(() => {
            const revealElements = document.querySelectorAll('.reveal');
            revealElements.forEach(el => observer.observe(el));
        }, 100);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [loading, setupData]);

    return (
        <div className="guest-portal-wrapper antialiased text-[#1A2D4F] bg-[#F5F7FA] font-['Inter',sans-serif] text-[15px] leading-[1.6] pt-[72px]">
            <Navbar onExitPortal={onExitPortal} />
            
            <HeroSection />
            
            <MetricsBand setupData={setupData} loading={loading} />
            
            <OverviewSection />
            
            <SectorsGrid />
            
            <TourismHighlights />
            
            <OrgTree setupData={setupData} />
            
            {setupData?.achievements && (
                <AchievementsTimeline achievements={setupData.achievements} />
            )}
            
            {setupData?.events && (
                <EventsCalendar events={setupData.events} />
            )}
            
            <Footer />
        </div>
    );
};

export default GuestLanding;
