const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'modules');
const files = ['CampaignManager.tsx', 'CampaignDetails.tsx', 'Campaigns.tsx'];

let combinedBody = '';

// Known unified imports
let unifiedImports = `
import React, { useState, useEffect, useRef } from 'react';
import { format, subDays, startOfDay, isSunday, addDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../services/api';
import {
    Plus, Target, TrendingUp, TrendingDown, Calendar, ChevronRight, Search, 
    Filter, ArrowUpRight, ArrowDownRight, Loader2, Trophy, AlertCircle, 
    Upload, Users, Trash2, Edit3, X, Globe, Save, RefreshCw, ChevronLeft, Check, User
} from 'lucide-react';
`;

files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // We want to strip all lines from the start until we hit the first non-import line
    // or just use regex to remove `import { ... } from '...';`
    let stripped = content
        .replace(/import\s+.*?\s+from\s+['"].*?['"];?/gs, '') 
        // remove internal imports
        .replace(/import\s+.*?;\n/g, '')
        // strip "export default Component" except for Campaigns
        .replace(/export\s+default\s+(CampaignManager|CampaignDetails);?/g, '')
        
    combinedBody += `\n// ==================== ${file} ====================\n` + stripped.trim() + '\n';
});

const finalCode = unifiedImports.trim() + '\n\n' + combinedBody;

fs.writeFileSync(path.join(dir, 'CampaignSystem.tsx'), finalCode);
console.log('Campaigns combined.');

files.forEach(file => fs.unlinkSync(path.join(dir, file)));
console.log('Originals deleted.');
