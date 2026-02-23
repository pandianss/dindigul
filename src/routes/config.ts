import { lazy, LazyExoticComponent, ComponentType } from 'react';

export type PortalMode = 'landing' | 'guest' | 'region';

export interface ViewConfig {
    id: string;
    component: LazyExoticComponent<ComponentType<any>>;
    allowedModes: PortalMode[];
    requiresAuth: boolean;
    requiredRoles?: string[];
}

export const viewConfigs: ViewConfig[] = [
    {
        id: 'dashboard',
        component: lazy(() => import('../modules/Dashboard')),
        allowedModes: ['guest', 'region'],
        requiresAuth: false,
    },
    {
        id: 'noticeBoard',
        component: lazy(() => import('../modules/NoticeBoard')),
        allowedModes: ['guest', 'region'],
        requiresAuth: false,
    },
    {
        id: 'mis',
        component: lazy(() => import('../modules/BusinessSnapshot')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'officeNotes',
        component: lazy(() => import('../modules/OfficeNoteManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'settings',
        component: lazy(() => import('../modules/SettingsManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'assets',
        component: lazy(() => import('../modules/AssetManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'calendar',
        component: lazy(() => import('../modules/admin/CalendarManager')),
        allowedModes: ['guest', 'region'],
        requiresAuth: false,
    },
    {
        id: 'audit',
        component: lazy(() => import('../modules/AuditManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'committees',
        component: lazy(() => import('../modules/CommitteeManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'correspondence',
        component: lazy(() => import('../modules/CorrespondenceCenter')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'dispatch',
        component: lazy(() => import('../modules/DispatchManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'expenditure',
        component: lazy(() => import('../modules/ExpenditureManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'legal',
        component: lazy(() => import('../modules/LegalManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
    {
        id: 'magazine',
        component: lazy(() => import('../modules/MagazineGenerator')),
        allowedModes: ['guest', 'region'],
        requiresAuth: false,
    },
    {
        id: 'requests',
        component: lazy(() => import('../modules/RequestManager')),
        allowedModes: ['region'],
        requiresAuth: true,
    },
];
