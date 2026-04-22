export const MEETING_TEMPLATES = {
    performance: `<h1>PERFORMANCE REVIEW COMMITTEE</h1>
<h2>1. Key Parameters Analysis</h2>
<p><strong>SB:</strong> [Data]<br><strong>CD:</strong> [Data]<br><strong>CASA:</strong> [Data]<br><strong>TD:</strong> [Data]<br><strong>ADV:</strong> [Data]<br><strong>BUSINESS:</strong> [Data]</p>
<h2>2. Strategic Discussion</h2>
<p>Deliberations were held on the current performance trajectory...</p>
<h2>3. Action Points</h2>
<ul><li>[Task 1] - Action by: [Dept]</li><li>[Task 2] - Action by: [Dept]</li></ul>`,
    general: `<h1>GENERAL ADDRESS / COMMITTEE MEETING</h1>
<h2>1. Introduction</h2>
<p>The committee convened to discuss general administrative and operational matters...</p>
<h2>2. Proceedings</h2>
<p>Record major discussion points here...</p>
<h2>3. Final Decisions</h2>
<p>Summary of resolutions passed during the meeting...</p>`,
    audit: `<h1>AUDIT & COMPLIANCE REVIEW</h1>
<h2>1. Pendency Analysis</h2>
<p>Detailed review of pending audit observations and compliance status...</p>
<h2>2. Risk Mitigation</h2>
<p>Discussion on operational risk exceptions and mitigation strategies...</p>`
};

export const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ],
};

export const QUILL_STYLE = `
  .quill { 
    background: white;
    border: none !important;
  }
  .ql-toolbar { 
    border: none !important; 
    border-bottom: 1px solid #f1f5f9 !important; 
    background: #ffffff;
    padding: 8px 12px !important;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .ql-container { 
    border: none !important;
    min-height: 600px;
    font-family: 'Outfit', sans-serif;
  }
  .ql-editor { 
    font-size: 15px;
    line-height: 1.8;
    color: #1e293b;
    padding: 40px !important;
  }
  .ql-editor h1 { font-size: 24px; font-weight: 800; color: #1e3a5f; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
  .ql-editor h2 { font-size: 18px; font-weight: 700; color: #254aa0; margin-top: 25px; margin-bottom: 12px; }
  .ql-editor p { margin-bottom: 15px; }
`;
