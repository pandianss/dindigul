import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Campaign } from './types';

// Orchestrators
import { CampaignList } from './components/Discovery/CampaignList';
import { CampaignDetails } from './components/Explorer/CampaignDetails';
import { CampaignManager } from './components/Wizard/CampaignManager';

const CampaignSystem: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManager, setShowManager] = useState(false);
    const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await api.get('/campaigns');
            setCampaigns(res.data);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this campaign? All performance data will be lost.')) return;
        
        try {
            await api.delete(`/campaigns/${id}`);
            fetchCampaigns();
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            alert('Failed to delete campaign.');
        }
    };

    const handleEditCampaign = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditCampaignId(id);
        setShowManager(true);
    };

    if (selectedCampaignId) {
        return <CampaignDetails id={selectedCampaignId} onBack={() => setSelectedCampaignId(null)} />;
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <CampaignList 
                campaigns={campaigns}
                loading={loading}
                onSelect={setSelectedCampaignId}
                onEdit={handleEditCampaign}
                onDelete={handleDeleteCampaign}
                onLaunch={() => setShowManager(true)}
            />

            {(showManager || editCampaignId) && (
                <CampaignManager 
                    editId={editCampaignId || undefined}
                    onClose={() => {
                        setShowManager(false);
                        setEditCampaignId(null);
                    }} 
                    onSuccess={() => {
                        setShowManager(false);
                        setEditCampaignId(null);
                        fetchCampaigns();
                    }} 
                />
            )}
        </div>
    );
};

export default CampaignSystem;
